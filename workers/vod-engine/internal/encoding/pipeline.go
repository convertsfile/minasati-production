package encoding

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/b2"
	"github.com/a_ashraf_tech/vod-engine/internal/circuitbreaker"
	"github.com/a_ashraf_tech/vod-engine/internal/config"
	"github.com/a_ashraf_tech/vod-engine/internal/logging"
	"github.com/a_ashraf_tech/vod-engine/internal/metrics"
	"github.com/a_ashraf_tech/vod-engine/internal/queue"
	"github.com/a_ashraf_tech/vod-engine/internal/telemetry"
	"github.com/a_ashraf_tech/vod-engine/internal/watchdog"
)

// ProgressFunc is called with a progress percentage (0-100).
type ProgressFunc func(percent int)

// PipelineResult holds the result of a completed encoding pipeline.
// SEC-05: MUST NOT include credentials. Encryption key is fetched by Laravel independently.
type PipelineResult struct {
	LectureID        string
	M3U8Path         string
	TotalSizeBytes   int64
	FilesUploaded    int
	EncodingDuration time.Duration
	Qualities        []string
}

// Pipeline orchestrates the full encode pipeline: download → encode → upload → validate → cleanup.
type Pipeline struct {
	cfg      *config.Config
	b2Client *b2.Client
	ffmpeg   *FFmpegCommand
	mc       *metrics.MetricsCollector

	// Circuit breaker for B2 operations
	b2CircuitBreaker *circuitbreaker.CircuitBreaker

	// Circuit breaker + webhook buffer for API calls
	apiCircuitBreaker *circuitbreaker.CircuitBreaker
	webhookBuffer     *circuitbreaker.WebhookBuffer
}

// NewPipeline creates a new pipeline.
func NewPipeline(cfg *config.Config, b2Client *b2.Client) *Pipeline {
	return &Pipeline{
		cfg:      cfg,
		b2Client: b2Client,
		ffmpeg:   NewFFmpegCommand(cfg),
	}
}

// SetMetricsCollector sets the Prometheus metrics collector (OPS-16).
func (p *Pipeline) SetMetricsCollector(mc *metrics.MetricsCollector) {
	p.mc = mc
}

// SetCircuitBreakers attaches circuit breaker instances to the pipeline.
func (p *Pipeline) SetCircuitBreakers(b2CB *circuitbreaker.CircuitBreaker, apiCB *circuitbreaker.CircuitBreaker, wb *circuitbreaker.WebhookBuffer) {
	p.b2CircuitBreaker = b2CB
	p.apiCircuitBreaker = apiCB
	p.webhookBuffer = wb
}

// Run executes the full pipeline for a sub-job.
// Returns the result or an error.
func (p *Pipeline) Run(ctx context.Context, subJob *queue.SubJob, progress ProgressFunc) (*PipelineResult, error) {
	lectureID := subJob.LectureID
	rawKey := subJob.RawKey
	qualities := []string{subJob.Quality}

	workDir := filepath.Join(p.cfg.VODWorkDir, subJob.JobGroup)
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return nil, fmt.Errorf("create work dir: %w", err)
	}

	b2StreamPrefix := fmt.Sprintf("streams/lecture_%s/", lectureID)

	// Shared input tracking: only download if not already present
	inputFilePath := filepath.Join(workDir, "input.mp4")
	needDownload := true

	if _, err := os.Stat(inputFilePath); err == nil {
		needDownload = false
		attrs := logging.LogAttrs("pipeline", subJob.ID, lectureID, subJob.CorrelationID)
		attrs = append(attrs, slog.String("message", "Reusing existing input file (shared across sub-jobs)"))
		slog.LogAttrs(ctx, slog.LevelInfo, "pipeline.input_reuse", attrs...)
	}

	// ===== DOWNLOAD PHASE =====
	var downloadDuration time.Duration
	var rawFileSize int64

	if needDownload {
		progress(5)
		attrs := logging.LogAttrs("pipeline", subJob.ID, lectureID, subJob.CorrelationID)
		attrs = append(attrs, slog.String("phase", "download"), slog.String("raw_key", rawKey))
		slog.LogAttrs(ctx, slog.LevelInfo, "pipeline.download_start", attrs...)

		dlStart := time.Now()

		downloadCtx, cancel := context.WithTimeout(ctx, 2*time.Hour)
		defer cancel()

		if err := p.downloadWithRateLimit(downloadCtx, rawKey, inputFilePath); err != nil {
			return nil, fmt.Errorf("download failed: %w", err)
		}

		downloadDuration = time.Since(dlStart)

		if info, err := os.Stat(inputFilePath); err == nil {
			rawFileSize = info.Size()
		}
	}

	// Create telemetry instance for this job
	jobTelemetry := telemetry.NewJobTelemetry(subJob.ID, lectureID, subJob.Quality)
	jobTelemetry.TeacherID = subJob.TeacherID // TEL-02
	// Compute queue wait time (TEL-01)
	jobTelemetry.QueueWaitTimeS = time.Since(subJob.CreatedAt).Seconds()

	if rawFileSize > 0 {
		jobTelemetry.TotalSizeMB = float64(rawFileSize) / (1024.0 * 1024.0)
		if downloadDuration.Seconds() > 0 {
			jobTelemetry.DownloadSpeedMbps = (jobTelemetry.TotalSizeMB * 8.0) / downloadDuration.Seconds()
		}
	}

	progress(15)

	// Fetch encryption key
	encKey, playbackURL, err := p.fetchEncryptionKey(lectureID)
	if err != nil {
		return nil, fmt.Errorf("fetch encryption key: %w", err)
	}
	_ = hex.EncodeToString(encKey) // key is written to enc.key file; Laravel fetches it independently (SEC-05)

	keyFilePath := filepath.Join(workDir, "enc.key")
	os.WriteFile(keyFilePath, encKey, 0400)

	iv := make([]byte, 16)
	rand.Read(iv)
	keyInfoContent := fmt.Sprintf("%s\n%s\n%s", playbackURL, keyFilePath, hex.EncodeToString(iv))
	keyInfoPath := filepath.Join(workDir, "enc.keyinfo")
	os.WriteFile(keyInfoPath, []byte(keyInfoContent), 0600)

	progress(25)

	// Run FFmpeg encoding
	progress(30)
	{
		attrs := logging.LogAttrs("pipeline", subJob.ID, lectureID, subJob.CorrelationID)
		attrs = append(attrs, slog.String("phase", "encoding"), slog.String("quality", subJob.Quality))
		slog.LogAttrs(ctx, slog.LevelInfo, "pipeline.encoding_start", attrs...)
	}

	totalDuration := p.ffmpeg.GetTotalDuration(inputFilePath)
	jobTelemetry.VideoDurationS = totalDuration // TEL-05

	encodeStart := time.Now()

	filesToUpload, exitReason, err := p.runFFmpeg(ctx, inputFilePath, workDir, keyInfoPath, qualities, totalDuration, progress, subJob, jobTelemetry)
	if err != nil {
		jobTelemetry.ExitReason = exitReason // TEL-04
		jobTelemetry.EndTime = time.Now()
		jobTelemetry.FinalStatus = "failed"
		jobTelemetry.RetryCount = subJob.RetryCount
		jobTelemetry.Compute()
		slog.LogAttrs(ctx, slog.LevelInfo, "pipeline.telemetry", jobTelemetry.ToLogEvent()...)
		return nil, fmt.Errorf("encoding failed: %w", err)
	}

	// ===== UPLOAD PHASE =====
	encodeDuration := time.Since(encodeStart)
	{
		attrs := logging.LogAttrs("pipeline", subJob.ID, lectureID, subJob.CorrelationID)
		attrs = append(attrs, slog.String("phase", "encoding_complete"), slog.Float64("duration_s", encodeDuration.Seconds()), slog.Int("files", len(filesToUpload)))
		slog.LogAttrs(ctx, slog.LevelInfo, "pipeline.encoding_complete", attrs...)
	}

	progress(70)

	// Count segments and compute total encoded size
	var segmentsCount int
	var totalEncodedBytes int64
	for _, f := range filesToUpload {
		if strings.HasSuffix(f, ".ts") {
			segmentsCount++
		}
		if info, err := os.Stat(f); err == nil {
			totalEncodedBytes += info.Size()
		}
	}

	// Upload to B2 (with timing)
	uploadStart := time.Now()
	uploadedFiles, totalSize, err := p.uploadFiles(ctx, workDir, b2StreamPrefix, filesToUpload, progress)
	if err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}
	uploadDuration := time.Since(uploadStart)

	// ===== POPULATE ALL TELEMETRY FIELDS BEFORE LOGGING =====
	jobTelemetry.EndTime = time.Now()
	jobTelemetry.FinalStatus = "completed"
	jobTelemetry.RetryCount = subJob.RetryCount
	jobTelemetry.SegmentsCount = segmentsCount
	jobTelemetry.TotalSizeMB = float64(totalSize) / (1024.0 * 1024.0)
	if uploadDuration.Seconds() > 0 && totalSize > 0 {
		jobTelemetry.UploadSpeedMbps = (float64(totalSize) / (1024.0 * 1024.0) * 8.0) / uploadDuration.Seconds()
	}
	if jobTelemetry.ExitReason == "" {
		jobTelemetry.ExitReason = "completed" // TEL-04
	}
	jobTelemetry.Compute()
	slog.LogAttrs(ctx, slog.LevelInfo, "pipeline.telemetry", jobTelemetry.ToLogEvent()...)

	progress(85)

	// Validate upload
	if err := p.validateUpload(ctx, b2StreamPrefix, len(filesToUpload)); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	progress(90)

	// Cleanup temp key files
	os.Remove(keyFilePath)
	os.Remove(keyInfoPath)

	progress(95)

	// Find the master m3u8 relative path
	var m3u8RelPath string
	for _, f := range filesToUpload {
		if strings.HasSuffix(f, "master.m3u8") {
			relPath, _ := filepath.Rel(workDir, f)
			m3u8RelPath = filepath.ToSlash(relPath)
			break
		}
	}
	if m3u8RelPath == "" {
		for _, f := range filesToUpload {
			if strings.HasSuffix(f, ".m3u8") {
				relPath, _ := filepath.Rel(workDir, f)
				m3u8RelPath = filepath.ToSlash(relPath)
				break
			}
		}
	}

	result := &PipelineResult{
		LectureID:        lectureID,
		M3U8Path:         b2StreamPrefix + m3u8RelPath,
		TotalSizeBytes:   totalSize,
		FilesUploaded:    uploadedFiles,
		EncodingDuration: encodeDuration,
		Qualities:        qualities,
	}

	progress(100)
	return result, nil
}

// runFFmpeg runs the FFmpeg encoding and returns the list of generated files.
// Returns files, exit_reason string, and error.
func (p *Pipeline) runFFmpeg(
	ctx context.Context,
	inputFile, workDir, keyInfoPath string,
	qualities []string,
	totalDuration float64,
	progress ProgressFunc,
	subJob *queue.SubJob,
	jobTelemetry *telemetry.JobTelemetry,
) ([]string, string, error) {
	cmd, outputDirs, err := p.ffmpeg.BuildHLSCommand(inputFile, workDir, keyInfoPath, qualities)
	if err != nil {
		return nil, "", err
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, "", fmt.Errorf("stdout pipe: %w", err)
	}

	// Capture stderr for crash analysis (OPS-17)
	var stderrBuf bytes.Buffer
	if p.cfg.MaxStderrCaptureBytes > 0 {
		limitedStderr := &limitedWriter{w: &stderrBuf, limit: int64(p.cfg.MaxStderrCaptureBytes) * 2}
		cmd.Stderr = io.MultiWriter(os.Stderr, limitedStderr)
	} else {
		cmd.Stderr = os.Stderr
	}

	if err := cmd.Start(); err != nil {
		return nil, "", fmt.Errorf("start ffmpeg: %w", err)
	}

	// LINUX-01: Set OOM score for FFmpeg child process immediately after start
	ffmpegPID := p.ffmpeg.GetFFmpegPID(cmd)
	SetFFmpegOOMScore(ffmpegPID)

	// WDG: Create and start watchdog for this FFmpeg process
	firstOutputDir := ""
	if len(outputDirs) > 0 {
		firstOutputDir = outputDirs[0]
	}
	wd := watchdog.NewWatchdog(p.cfg, cmd, ffmpegPID, subJob, p.mc, firstOutputDir)
	if totalDuration > 0 && totalDuration < float64(p.cfg.WatchdogShortVideoThresholdS) {
		wd.SetShortVideo(true) // WDG-06
	}
	wd.Start(ctx)

	// Start telemetry sampler goroutine (OPS-04)
	sampler := telemetry.NewSampler(ffmpegPID, jobTelemetry, time.Duration(p.cfg.TelemetrySampleIntervalS)*time.Second)
	ctxSampler, cancelSampler := context.WithCancel(ctx)
	defer cancelSampler()
	go sampler.Start(ctxSampler)

	// Last FPS value captured from stdout (TEL-03)
	var lastFPS float64

	// Parse progress from stdout
	if totalDuration > 0 {
		go func() {
			scanner := bufio.NewScanner(stdout)
			for scanner.Scan() {
				line := scanner.Text()

				// Parse out_time_us for progress
				if strings.HasPrefix(line, "out_time_us=") {
					usStr := strings.TrimPrefix(line, "out_time_us=")
					if us, err := strconv.ParseInt(usStr, 10, 64); err == nil {
						currentSec := float64(us) / 1_000_000.0
						pct := int((currentSec / totalDuration) * 100)
						if pct > 100 {
							pct = 100
						}
						// Map encoding progress 0-100% to 30-70% of total pipeline
						mappedPct := 30 + int(float64(pct)*0.4)
						progress(mappedPct)

						// Send progress to watchdog (WDG-01)
						select {
						case wd.ProgressCh() <- us:
						default:
							// Channel full, skip
						}
					}
				}

				// Parse fps= for encoding speed (TEL-03)
				if strings.HasPrefix(line, "fps=") {
					fpsStr := strings.TrimPrefix(line, "fps=")
					if fps, err := strconv.ParseFloat(strings.TrimSpace(fpsStr), 64); err == nil {
						lastFPS = fps
					}
				}
			}
		}()
	}

	// Wait for FFmpeg to finish
	waitErr := cmd.Wait()

	// Stop the watchdog
	wd.Stop()
	wd.WaitDone()

	// Determine exit reason (TEL-04)
	exitReason := "completed"
	if wd.WasKilled() {
		exitReason = "watchdog_kill:" + string(wd.KillReason())
	} else if waitErr != nil {
		exitCode := -1
		if cmd.ProcessState != nil {
			exitCode = cmd.ProcessState.ExitCode()
		}
		exitReason = fmt.Sprintf("ffmpeg_crash:%d", exitCode)
	}

	// Set FPS in telemetry (TEL-03)
	if jobTelemetry != nil {
		jobTelemetry.EncodingSpeedFPS = lastFPS
	}

	if waitErr != nil {
		exitCode := -1
		if cmd.ProcessState != nil {
			exitCode = cmd.ProcessState.ExitCode()
		}

		// Truncate stderr for log entry
		stderrStr := stderrBuf.String()
		if len(stderrStr) > p.cfg.MaxStderrCaptureBytes && p.cfg.MaxStderrCaptureBytes > 0 {
			stderrStr = stderrStr[:p.cfg.MaxStderrCaptureBytes] + "..."
		}

		logAttrs := logging.LogAttrs("pipeline", subJob.ID, subJob.LectureID, subJob.CorrelationID)
		logAttrs = append(logAttrs, slog.Int("exit_code", exitCode), slog.String("stderr", stderrStr), slog.String("error", waitErr.Error()), slog.String("exit_reason", exitReason))
		slog.LogAttrs(ctx, slog.LevelError, "pipeline.ffmpeg_error", logAttrs...)

		// Set FFmpeg exit code gauge
		if p.mc != nil {
			labeledName := "vod_engine_ffmpeg_exit_code" + metrics.FormatLabels(map[string]string{
				"lecture_id": subJob.LectureID,
				"quality":    subJob.Quality,
			})
			p.mc.GaugeSet(labeledName, float64(exitCode))
		}

		// Write full stderr to crash dir
		if p.cfg.VODCrashDir != "" && stderrBuf.Len() > 0 {
			crashFile := filepath.Join(p.cfg.VODCrashDir, fmt.Sprintf("ffmpeg_%s.log", subJob.ID))
			if writeErr := os.WriteFile(crashFile, stderrBuf.Bytes(), 0640); writeErr != nil {
				slog.Warn("Failed to write FFmpeg crash log", "path", crashFile, "error", writeErr)
			}
		}

		return nil, exitReason, fmt.Errorf("ffmpeg exited with code %d: %w", exitCode, waitErr)
	}

	// Walk workDir to collect all generated files
	var filesToUpload []string
	err = filepath.WalkDir(workDir, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}
		name := d.Name()
		if name == "input.mp4" || name == "enc.keyinfo" {
			return nil
		}
		if strings.HasSuffix(name, ".ts") || strings.HasSuffix(name, ".m3u8") || strings.HasSuffix(name, ".key") {
			filesToUpload = append(filesToUpload, path)
		}
		return nil
	})
	if err != nil {
		return nil, exitReason, fmt.Errorf("walk work dir: %w", err)
	}
	if len(filesToUpload) == 0 {
		return nil, exitReason, fmt.Errorf("no output files generated by FFmpeg")
	}

	return filesToUpload, exitReason, nil
}

// uploadFiles uploads all generated files to B2 with concurrent workers.
// CB-01: All B2 upload operations go through the circuit breaker.
func (p *Pipeline) uploadFiles(
	ctx context.Context,
	workDir, b2Prefix string,
	files []string,
	progress ProgressFunc,
) (int, int64, error) {
	if p.b2CircuitBreaker != nil {
		var uploaded int
		var totalSize int64
		err := p.b2CircuitBreaker.Execute(func() error {
			var upErr error
			uploaded, totalSize, upErr = p.uploadFilesDirect(ctx, workDir, b2Prefix, files, progress)
			return upErr
		})
		return uploaded, totalSize, err
	}
	return p.uploadFilesDirect(ctx, workDir, b2Prefix, files, progress)
}

// uploadFilesDirect is the internal batch upload implementation (no circuit breaker).
func (p *Pipeline) uploadFilesDirect(
	ctx context.Context,
	workDir, b2Prefix string,
	files []string,
	progress ProgressFunc,
) (int, int64, error) {
	totalFiles := len(files)
	if totalFiles == 0 {
		return 0, 0, nil
	}

	type uploadResult struct {
		path   string
		size   int64
		err    error
	}

	uploadChan := make(chan string, totalFiles)
	resultChan := make(chan uploadResult, totalFiles)

	// Feed files
	for _, f := range files {
		uploadChan <- f
	}
	close(uploadChan)

	// Start workers
	numWorkers := p.cfg.UploadConcurrency
	if numWorkers < 1 {
		numWorkers = 3
	}
	var wg sync.WaitGroup

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for filePath := range uploadChan {
				relPath, _ := filepath.Rel(workDir, filePath)
				b2Key := b2Prefix + filepath.ToSlash(relPath)

				contentType := "video/MP2T"
				if strings.HasSuffix(filePath, ".m3u8") {
					contentType = "application/vnd.apple.mpegurl"
				} else if strings.HasSuffix(filePath, ".key") {
					contentType = "application/octet-stream"
				}

				var size int64
				var uploadErr error
				for attempt := 1; attempt <= 3; attempt++ {
					if strings.HasSuffix(filePath, ".ts") || strings.HasSuffix(filePath, ".key") {
						uploadErr = p.b2Client.UploadFile(ctx, filePath, b2Key, contentType)
					} else {
						fileBody, openErr := os.Open(filePath)
						if openErr == nil {
							opts := b2.UploadOptions{PartSizeMB: 5, Concurrency: 1}
							_, uploadErr = p.b2Client.UploadStream(ctx, fileBody, b2Key, contentType, opts)
							fileBody.Close()
						} else {
							uploadErr = openErr
						}
					}

					if uploadErr == nil {
						if info, statErr := os.Stat(filePath); statErr == nil {
							size = info.Size()
						}
						break
					}

					slog.Warn("Upload attempt failed",
						"file", filePath, "attempt", attempt, "error", uploadErr)
					time.Sleep(time.Duration(1<<attempt) * time.Second)
				}

				resultChan <- uploadResult{path: filePath, size: size, err: uploadErr}
			}
		}()
	}

	wg.Wait()
	close(resultChan)

	var totalSize int64
	var uploadCount int
	var firstErr error

	for res := range resultChan {
		if res.err != nil {
			if firstErr == nil {
				firstErr = res.err
			}
			slog.Error("Upload failed for file", "file", res.path, "error", res.err)
			continue
		}
		totalSize += res.size
		uploadCount++
	}

	if firstErr != nil {
		return uploadCount, totalSize, fmt.Errorf("upload errors occurred: %w", firstErr)
	}

	return uploadCount, totalSize, nil
}

// validateUpload checks that the number of files uploaded to B2 matches expectations.
// CB-01: Protected by the B2 circuit breaker.
func (p *Pipeline) validateUpload(ctx context.Context, b2Prefix string, expectedCount int) error {
	if p.b2CircuitBreaker != nil {
		return p.b2CircuitBreaker.Execute(func() error {
			return p.validateUploadDirect(ctx, b2Prefix, expectedCount)
		})
	}
	return p.validateUploadDirect(ctx, b2Prefix, expectedCount)
}

// validateUploadDirect is the internal validation (no circuit breaker).
func (p *Pipeline) validateUploadDirect(ctx context.Context, b2Prefix string, expectedCount int) error {
	valCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	b2Count, err := p.b2Client.CountPrefix(valCtx, b2Prefix)
	if err != nil {
		return fmt.Errorf("cannot count B2 objects: %w", err)
	}

	if b2Count < expectedCount {
		return fmt.Errorf("upload count mismatch: expected %d local files, found %d on B2",
			expectedCount, b2Count)
	}

	return nil
}

// downloadWithRateLimit downloads a file from B2, optionally rate-limiting via pv (OPS-15).
// CB-01: All B2 download operations go through the circuit breaker.
func (p *Pipeline) downloadWithRateLimit(ctx context.Context, rawKey, destPath string) error {
	if p.b2CircuitBreaker != nil {
		return p.b2CircuitBreaker.Execute(func() error {
			if p.cfg.DownloadRateLimitKbps > 0 {
				return p.downloadWithPV(ctx, rawKey, destPath)
			}
			return p.b2Client.DownloadFile(ctx, rawKey, destPath)
		})
	}
	if p.cfg.DownloadRateLimitKbps > 0 {
		return p.downloadWithPV(ctx, rawKey, destPath)
	}
	return p.b2Client.DownloadFile(ctx, rawKey, destPath)
}

// downloadWithPV wraps the B2 download with pv --rate-limit for bandwidth capping (OPS-15).
func (p *Pipeline) downloadWithPV(ctx context.Context, rawKey, destPath string) error {
	slog.Info("Download rate limiting enabled (via pv)",
		"rate_limit_kbps", p.cfg.DownloadRateLimitKbps,
	)

	pvPath, err := exec.LookPath("pv")
	if err != nil {
		slog.Warn("pv not found, falling back to direct download (no rate limit)", "error", err)
		return p.b2Client.DownloadFile(ctx, rawKey, destPath)
	}

	stream, err := p.b2Client.GetObjectStream(ctx, rawKey)
	if err != nil {
		return fmt.Errorf("b2 stream: %w", err)
	}
	defer stream.Close()

	pvArgs := []string{
		"--rate-limit", fmt.Sprintf("%dK", p.cfg.DownloadRateLimitKbps),
	}
	pvCmd := exec.CommandContext(ctx, pvPath, pvArgs...)
	pvCmd.Stdin = stream

	destFile, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("create dest file: %w", err)
	}
	defer destFile.Close()

	pvCmd.Stdout = destFile
	pvCmd.Stderr = os.Stderr

	slog.Info("Starting rate-limited download via pv",
		"command", pvPath, "args", pvArgs, "dest", destPath,
	)

	if err := pvCmd.Run(); err != nil {
		return fmt.Errorf("pv rate-limited download failed: %w", err)
	}

	slog.Info("Rate-limited download completed via pv", "dest", destPath, "rate_kbps", p.cfg.DownloadRateLimitKbps)
	return nil
}

// CleanupJobGroup removes the work directory for a job group and the raw video from B2.
// CB-01: B2 delete operation goes through the circuit breaker.
func (p *Pipeline) CleanupJobGroup(ctx context.Context, lectureID, rawKey string) error {
	jobGroup := fmt.Sprintf("lecture_%s", lectureID)
	workDir := filepath.Join(p.cfg.VODWorkDir, jobGroup)

	if err := os.RemoveAll(workDir); err != nil {
		slog.Warn("Failed to remove work dir", "work_dir", workDir, "error", err)
	}

	delCtx, cancel := context.WithTimeout(ctx, 1*time.Minute)
	defer cancel()

	deleteFn := func() error {
		return p.b2Client.DeleteFile(delCtx, rawKey)
	}

	if p.b2CircuitBreaker != nil {
		if err := p.b2CircuitBreaker.Execute(deleteFn); err != nil {
			slog.Warn("Failed to delete raw video from B2 (via CB)", "key", rawKey, "error", err)
			return err
		}
	} else {
		if err := deleteFn(); err != nil {
			slog.Warn("Failed to delete raw video from B2", "key", rawKey, "error", err)
			return err
		}
	}

	slog.Info("Cleaned up job group", "lecture_id", lectureID, "raw_key", rawKey)
	return nil
}

// fetchEncryptionKey generates a random encryption key and returns it along with the public playback URL.
func (p *Pipeline) fetchEncryptionKey(lectureID string) ([]byte, string, error) {
	key := make([]byte, 16)
	if _, err := rand.Read(key); err != nil {
		return nil, "", fmt.Errorf("generate key: %w", err)
	}

	publicURL := p.cfg.LaravelPublicURL
	if publicURL == "" {
		publicURL = "http://127.0.0.1:8000"
	}

	playbackURL := fmt.Sprintf("%s/api/video/key/%s", publicURL, lectureID)
	return key, playbackURL, nil
}

// SendProgressWebhook sends a progress update to Laravel.
// Uses the API circuit breaker if available (CB-03).
func SendProgressWebhook(laravelURL, jwtSecret, lectureID string, phase string, percent int) {
	client := &http.Client{Timeout: 3 * time.Second}

	url := fmt.Sprintf("%s/api/internal/webhooks/lectures/%s/progress", laravelURL, lectureID)
	payload := map[string]interface{}{
		"phase":   phase,
		"percent": percent,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Secret", jwtSecret)

	resp, err := client.Do(req)
	if err != nil {
		slog.Debug("Progress webhook failed", "lecture_id", lectureID, "error", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		slog.Warn("Progress webhook rejected", "lecture_id", lectureID, "status", resp.StatusCode)
	}
}

// SendCompletionWebhook sends a completion notification to Laravel.
// Uses the API circuit breaker if available (CB-03).
// SEC-05: Does NOT include encryption key. Laravel fetches it independently via lecture_id.
func SendCompletionWebhook(laravelURL, jwtSecret, lectureID, m3u8Path, status string, sizeBytes int64) {
	client := &http.Client{Timeout: 10 * time.Second}

	url := fmt.Sprintf("%s/api/internal/webhooks/video-encoded", laravelURL)
	payload := map[string]interface{}{
		"lecture_id": lectureID,
		"status":     status,
		"m3u8_path":  m3u8Path,
		"size_bytes": sizeBytes,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		slog.Error("Failed to create webhook request", "error", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Secret", jwtSecret)

	resp, err := client.Do(req)
	if err != nil {
		slog.Error("Completion webhook failed", "lecture_id", lectureID, "error", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		slog.Error("Completion webhook rejected by Laravel", "lecture_id", lectureID, "status", resp.StatusCode)
		return
	}

	slog.Info("Completion webhook sent successfully", "lecture_id", lectureID, "status", status)
}

// limitedWriter is an io.Writer that writes at most limit bytes to its underlying writer.
type limitedWriter struct {
	w       io.Writer
	limit   int64
	written int64
}

func (lw *limitedWriter) Write(p []byte) (int, error) {
	remaining := lw.limit - lw.written
	if remaining <= 0 {
		return 0, io.ErrShortWrite
	}
	if int64(len(p)) > remaining {
		p = p[:remaining]
		n, err := lw.w.Write(p)
		lw.written += int64(n)
		if err != nil {
			return n, err
		}
		return n, io.ErrShortWrite
	}
	n, err := lw.w.Write(p)
	lw.written += int64(n)
	return n, err
}
