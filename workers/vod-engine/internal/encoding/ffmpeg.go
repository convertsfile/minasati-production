package encoding

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/a_ashraf_tech/vod-engine/internal/config"
)

// FFmpegCommand builds an FFmpeg command with strict resource limits.
type FFmpegCommand struct {
	cfg *config.Config
}

// NewFFmpegCommand creates a command builder.
func NewFFmpegCommand(cfg *config.Config) *FFmpegCommand {
	return &FFmpegCommand{cfg: cfg}
}

// QualityConfig holds encoding parameters for a specific quality.
type QualityConfig struct {
	Scale   string
	Bitrate string
	Maxrate string
	Bufsize string
}

// QualityConfigs returns the encoding parameters for each supported quality.
func QualityConfigs() map[string]QualityConfig {
	return map[string]QualityConfig{
		"720p": {Scale: "scale=-2:720", Bitrate: "2500k", Maxrate: "2750k", Bufsize: "4000k"},
		"480p": {Scale: "scale=-2:480", Bitrate: "1000k", Maxrate: "1200k", Bufsize: "1500k"},
		"360p": {Scale: "scale=-2:360", Bitrate: "600k", Maxrate: "800k", Bufsize: "1000k"},
	}
}

// BuildHLSCommand builds an FFmpeg command for multi-quality HLS encoding.
// It returns the *exec.Cmd and a list of expected output directories.
func (fc *FFmpegCommand) BuildHLSCommand(
	inputFile string,
	workDir string,
	keyInfoPath string,
	qualities []string,
) (*exec.Cmd, []string, error) {
	configMap := QualityConfigs()

	var activeQualities []string
	for _, candidate := range []string{"720p", "480p", "360p"} {
		for _, jq := range qualities {
			if jq == candidate {
				activeQualities = append(activeQualities, candidate)
				break
			}
		}
	}
	if len(activeQualities) == 0 {
		activeQualities = []string{"480p"}
	}

	var outputDirs []string
	for i := range activeQualities {
		dir := filepath.Join(workDir, fmt.Sprintf("v%d", i))
		os.MkdirAll(dir, 0755)
		outputDirs = append(outputDirs, dir)
	}

	var filters []string
	var varStreamMaps []string
	var maps []string
	var bitrates []string
	var audioConfigs []string

	// Check if input has audio
	hasAudio := fc.hasAudioStream(inputFile)

	for i, q := range activeQualities {
		cfg := configMap[q]
		filters = append(filters, fmt.Sprintf("[0:v]%s[v%dout]", cfg.Scale, i))

		if hasAudio {
			maps = append(maps, "-map", fmt.Sprintf("[v%dout]", i), "-map", "0:a:0")
			audioConfigs = append(audioConfigs,
				fmt.Sprintf("-c:a:%d", i), "aac",
				fmt.Sprintf("-b:a:%d", i), "128k",
				fmt.Sprintf("-ac:%d", i), "2",
			)
			varStreamMaps = append(varStreamMaps, fmt.Sprintf("v:%d,a:%d", i, i))
		} else {
			maps = append(maps, "-map", fmt.Sprintf("[v%dout]", i))
			varStreamMaps = append(varStreamMaps, fmt.Sprintf("v:%d", i))
		}

		bitrates = append(bitrates,
			fmt.Sprintf("-b:v:%d", i), cfg.Bitrate,
			fmt.Sprintf("-maxrate:v:%d", i), cfg.Maxrate,
			fmt.Sprintf("-bufsize:v:%d", i), cfg.Bufsize,
		)
	}

	args := []string{
		"-y", "-i", inputFile,

		// Resource limits per FFMPEG-01: -threads set from config (default 4)
		"-threads", fmt.Sprintf("%d", fc.cfg.FFmpegThreads),
		"-preset", fc.cfg.FFmpegPreset,

		"-progress", "pipe:1",
		"-keyint_min", fmt.Sprintf("%d", fc.cfg.HLSKeyframeInterval),
		"-g", fmt.Sprintf("%d", fc.cfg.HLSKeyframeInterval),
		"-sc_threshold", "0",

		"-filter_complex", strings.Join(filters, ";"),
	}
	args = append(args, maps...)
	args = append(args, audioConfigs...)
	args = append(args,
		"-c:v", "libx264", "-pix_fmt", "yuv420p",
	)
	args = append(args, bitrates...)
	args = append(args,
		"-f", "hls",
		"-hls_time", fmt.Sprintf("%d", fc.cfg.HLSSegmentDurationS),
		"-hls_playlist_type", "vod",
		"-hls_list_size", "0",
		"-hls_key_info_file", keyInfoPath,
		"-hls_flags", "independent_segments",

		"-master_pl_name", "master.m3u8",
		"-hls_segment_filename", filepath.Join(workDir, "v%v/segment_%03d.ts"),
		"-var_stream_map", strings.Join(varStreamMaps, " "),
		filepath.Join(workDir, "v%v/index.m3u8"),
	)

	cmd := exec.Command("ffmpeg", args...)

	// Apply resource limits
	fc.applyResourceLimits(cmd)

	return cmd, outputDirs, nil
}

// GetFFmpegPID returns the PID of the running FFmpeg process.
// Returns 0 if the process has not been started yet or has exited.
func (fc *FFmpegCommand) GetFFmpegPID(cmd *exec.Cmd) int {
	if cmd != nil && cmd.Process != nil {
		return cmd.Process.Pid
	}
	return 0
}

// SetFFmpegOOMScore sets the OOM score adjustment for the FFmpeg child process
// by writing "500" to /proc/<pid>/oom_score_adj (LINUX-01).
func SetFFmpegOOMScore(pid int) {
	if pid <= 0 {
		return
	}
	oomPath := fmt.Sprintf("/proc/%d/oom_score_adj", pid)
	if err := os.WriteFile(oomPath, []byte("500"), 0644); err != nil {
		slog.Warn("Failed to set FFmpeg OOM score (non-fatal, LINUX-01)",
			"pid", pid,
			"error", err,
		)
	}
}

// BuildSingleQualityCommand builds an FFmpeg command for a single quality rendition.
func (fc *FFmpegCommand) BuildSingleQualityCommand(
	inputFile string,
	outputDir string,
	quality string,
	keyInfoPath string,
) (*exec.Cmd, error) {
	configMap := QualityConfigs()
	cfg, ok := configMap[quality]
	if !ok {
		return nil, fmt.Errorf("unsupported quality: %s", quality)
	}

	os.MkdirAll(outputDir, 0755)

	hasAudio := fc.hasAudioStream(inputFile)

	args := []string{
		"-y", "-i", inputFile,
		"-threads", fmt.Sprintf("%d", fc.cfg.FFmpegThreads),
		"-preset", fc.cfg.FFmpegPreset,
		"-progress", "pipe:1",
		"-keyint_min", fmt.Sprintf("%d", fc.cfg.HLSKeyframeInterval),
		"-g", fmt.Sprintf("%d", fc.cfg.HLSKeyframeInterval),
		"-sc_threshold", "0",
		"-vf", cfg.Scale,
		"-c:v", "libx264", "-pix_fmt", "yuv420p",
		"-b:v", cfg.Bitrate,
		"-maxrate", cfg.Maxrate,
		"-bufsize", cfg.Bufsize,
	}

	if hasAudio {
		args = append(args,
			"-c:a", "aac",
			"-b:a", "128k",
			"-ac", "2",
		)
	}

	args = append(args,
		"-f", "hls",
		"-hls_time", fmt.Sprintf("%d", fc.cfg.HLSSegmentDurationS),
		"-hls_playlist_type", "vod",
		"-hls_list_size", "0",
		"-hls_key_info_file", keyInfoPath,
		"-hls_flags", "independent_segments",
		"-hls_segment_filename", filepath.Join(outputDir, "segment_%03d.ts"),
		filepath.Join(outputDir, "index.m3u8"),
	)

	cmd := exec.Command("ffmpeg", args...)
	fc.applyResourceLimits(cmd)

	return cmd, nil
}

// applyResourceLimits sets process-level resource limits for FFmpeg.
func (fc *FFmpegCommand) applyResourceLimits(cmd *exec.Cmd) {
	// Nice level: lower CPU priority
	cmd.SysProcAttr = setSysProcAttr()

	affinityMask := fc.cfg.CPUAffinityMask
	niceLevel := fc.cfg.FFmpegNice
	ioClass := fc.cfg.FFmpegIoniceClass
	ioLevel := fc.cfg.FFmpegIoniceLevel

	// Build wrapper chain, validating each wrapper exists before adding it (M-02).
	var wrapperArgs []string
	var wrapperPath string // resolved path of the first wrapper (m-02)

	// CPU affinity via taskset
	if affinityMask != "" {
		if path, err := exec.LookPath("taskset"); err != nil {
			slog.Warn("taskset not found, skipping CPU affinity wrapper", "error", err)
		} else {
			if wrapperPath == "" {
				wrapperPath = path
			}
			wrapperArgs = append(wrapperArgs, path, "-c", affinityMask)
		}
	}

	// Nice level
	if niceLevel != 0 {
		if path, err := exec.LookPath("nice"); err != nil {
			slog.Warn("nice not found, skipping nice wrapper", "nice_level", niceLevel, "error", err)
		} else {
			if wrapperPath == "" {
				wrapperPath = path
			}
			wrapperArgs = append(wrapperArgs, path, "-n", fmt.Sprintf("%d", niceLevel))
		}
	}

	// Ionice
	if ioClass != 0 {
		if path, err := exec.LookPath("ionice"); err != nil {
			slog.Warn("ionice not found, skipping ionice wrapper", "io_class", ioClass, "error", err)
		} else {
			if wrapperPath == "" {
				wrapperPath = path
			}
			wrapperArgs = append(wrapperArgs, path, "-c", fmt.Sprintf("%d", ioClass), "-n", fmt.Sprintf("%d", ioLevel))
		}
	}

	// If we have wrappers, restructure the command
	if len(wrapperArgs) > 0 {
		oldArgs := cmd.Args
		cmd.Path = wrapperPath
		cmd.Args = append(wrapperArgs, oldArgs...)
	}
}

// hasAudioStream checks if the input file has any audio streams.
func (fc *FFmpegCommand) hasAudioStream(inputFile string) bool {
	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-select_streams", "a",
		"-show_entries", "stream=codec_type",
		"-of", "default=noprint_wrappers=1:nokey=1",
		inputFile,
	)
	out, err := cmd.Output()
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(out)) == "audio"
}

// GetTotalDuration returns the total duration of a video file in seconds.
func (fc *FFmpegCommand) GetTotalDuration(inputFile string) float64 {
	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		inputFile,
	)
	out, err := cmd.Output()
	if err != nil {
		return 0
	}

	var duration float64
	fmt.Sscanf(strings.TrimSpace(string(out)), "%f", &duration)
	return duration
}
