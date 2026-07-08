package worker

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
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
	"github.com/a_ashraf_tech/vod-engine/internal/encoding"
	"github.com/a_ashraf_tech/vod-engine/internal/guardian"
	"github.com/a_ashraf_tech/vod-engine/internal/metrics"
	"github.com/a_ashraf_tech/vod-engine/internal/monitor"
	"github.com/a_ashraf_tech/vod-engine/internal/queue"
	"github.com/a_ashraf_tech/vod-engine/internal/telemetry"
)

// activeGroupEntry tracks per-group metadata for job group lifecycle (QUEUE-01, fix M-01).
type activeGroupEntry struct {
	count     int
	createdAt time.Time
}

// Scheduler manages the job lifecycle: queue → guardian → pipeline → result.
type Scheduler struct {
	cfg       *config.Config
	b2Client  *b2.Client
	queue     *queue.PriorityQueue
	persist   *queue.Persistence
	guardian  *guardian.PredictiveGuardian
	pipeline  *encoding.Pipeline

	mc            *metrics.MetricsCollector // OPS-16: Prometheus metrics
	activeJob     *queue.SubJob
	activeJobMu   sync.Mutex
	shuttingDown  bool
	shutdownMu    sync.Mutex
	shutdownWg    sync.WaitGroup

	// Track active job groups with shared input files
	activeGroups   map[string]activeGroupEntry // jobGroup -> entry with count + timestamp (QUEUE-01, fix M-01)
	activeGroupsMu sync.Mutex

	// Progress throttling
	progressTicker map[string]time.Time
	progressMu     sync.Mutex

	// OPS-18: hot-reload poll interval on SIGHUP
	reconfigCh chan time.Duration

	// Per-lecture mutex for idempotency (OPS-20, M-04)
	jobMu   map[string]*sync.Mutex
	jobMuMu sync.Mutex

	// Circuit breakers (CB-01, CB-03)
	b2CircuitBreaker  *circuitbreaker.CircuitBreaker
	apiCircuitBreaker *circuitbreaker.CircuitBreaker
	webhookBuffer     *circuitbreaker.WebhookBuffer
}

// NewPool creates a new scheduler (named Pool for backward compatibility).
func NewPool(cfg *config.Config, b2Client *b2.Client, queue *queue.PriorityQueue, persist *queue.Persistence) *Scheduler {
	g := guardian.New(cfg, nil)
	g.SetB2Client(b2Client)
	return &Scheduler{
		cfg:            cfg,
		b2Client:       b2Client,
		queue:          queue,
		persist:        persist,
		guardian:       nil, // Set later via SetPredictiveGuardian
		pipeline:       encoding.NewPipeline(cfg, b2Client),
		activeGroups:   make(map[string]activeGroupEntry),
		progressTicker: make(map[string]time.Time),
		reconfigCh:     make(chan time.Duration, 1),
		jobMu:         make(map[string]*sync.Mutex),
	}
}

// SetMonitor is called after the monitor is created (circular dependency).
func (s *Scheduler) SetMonitor(m *monitor.Monitor) {
	g := guardian.New(s.cfg, m)
	g.SetB2Client(s.b2Client)
	if s.guardian != nil {
		s.guardian.Inner = g
	} else {
		s.guardian = guardian.NewPredictiveGuardian(g, s.cfg)
	}
}

// SetPredictiveGuardian sets the predictive guardian for trend-based protection.
func (s *Scheduler) SetPredictiveGuardian(pg *guardian.PredictiveGuardian) {
	s.guardian = pg
}

// SetCircuitBreakers attaches circuit breakers to the scheduler (CB-01, CB-03).
func (s *Scheduler) SetCircuitBreakers(b2CB *circuitbreaker.CircuitBreaker, apiCB *circuitbreaker.CircuitBreaker, wb *circuitbreaker.WebhookBuffer) {
	s.b2CircuitBreaker = b2CB
	s.apiCircuitBreaker = apiCB
	s.webhookBuffer = wb
	s.pipeline.SetCircuitBreakers(b2CB, apiCB, wb)
}

// SetMetricsCollector sets the Prometheus metrics collector (OPS-16).
// Must be called before Start().
func (s *Scheduler) SetMetricsCollector(mc *metrics.MetricsCollector) {
	s.mc = mc
	s.pipeline.SetMetricsCollector(mc)
	if s.guardian != nil {
		s.guardian.SetMetricsCollector(mc)
	}
}

// Start begins the scheduling loop.
func (s *Scheduler) Start(ctx context.Context) {
	slog.Info("Scheduler starting",
		"max_concurrent", s.cfg.MaxConcurrentJobs,
		"max_retries", s.cfg.MaxRetries,
		"retry_base_delay_s", s.cfg.RetryBaseDelayS,
	)

	s.shutdownWg.Add(1)
	go s.scheduleLoop(ctx)
}

// AddJob adds a job to the queue (from the HTTP handler).
func (s *Scheduler) AddJob(subJobs []*queue.SubJob) error {
	if s.queue.Len()+len(subJobs) > s.cfg.MaxQueueSize {
		return fmt.Errorf("queue full: %d items exceeds max %d", s.queue.Len()+len(subJobs), s.cfg.MaxQueueSize)
	}

	lectureID := subJobs[0].LectureID
	s.lockLecture(lectureID)
	defer s.unlockLecture(lectureID)

	filtered := make([]*queue.SubJob, 0, len(subJobs))
	for _, sj := range subJobs {
		if s.hasExistingJob(sj.LectureID, sj.Quality) {
			slog.Info("Skipping duplicate job (idempotency)",
				"lecture_id", sj.LectureID,
				"quality", sj.Quality,
			)
			continue
		}
		filtered = append(filtered, sj)
	}

	if len(filtered) == 0 {
		slog.Info("All sub-jobs already exist in queue, returning idempotent success",
			"lecture_id", lectureID,
		)
		return nil
	}

	for _, sj := range filtered {
		if err := s.persist.SavePending(sj); err != nil {
			return fmt.Errorf("persist job: %w", err)
		}
		s.queue.Push(sj)

		slog.Info("Job enqueued",
			"lecture_id", sj.LectureID,
			"quality", sj.Quality,
			"priority", sj.Priority,
			"job_id", sj.ID,
			"correlation_id", sj.CorrelationID,
		)
	}

	if s.mc != nil {
		s.mc.GaugeSet("vod_engine_pending_jobs", float64(s.queue.Len()))
	}

	return nil
}

// StopWait gracefully shuts down the scheduler.
func (s *Scheduler) StopWait() {
	s.shutdownMu.Lock()
	s.shuttingDown = true
	s.shutdownMu.Unlock()

	slog.Info("Scheduler stopping gracefully...")

	s.shutdownWg.Wait()
	slog.Info("Scheduler stopped")
}

// Reconfigure hot-reloads the resource poll interval (OPS-18).
func (s *Scheduler) Reconfigure(pollInterval time.Duration) {
	select {
	case s.reconfigCh <- pollInterval:
	default:
		slog.Warn("Scheduler reconfiguration channel full, dropping stale interval",
			"stale_interval_seconds", pollInterval.Seconds(),
		)
	}
}

// ActiveJobCount returns the number of currently active jobs (0 or 1).
func (s *Scheduler) ActiveJobCount() int {
	s.activeJobMu.Lock()
	defer s.activeJobMu.Unlock()
	if s.activeJob != nil {
		return 1
	}
	return 0
}

// IsShuttingDown returns true if the scheduler is in shutdown mode.
func (s *Scheduler) IsShuttingDown() bool {
	s.shutdownMu.Lock()
	defer s.shutdownMu.Unlock()
	return s.shuttingDown
}

// lockLecture acquires the per-lecture mutex for serializing AddJob calls.
func (s *Scheduler) lockLecture(lectureID string) {
	s.jobMuMu.Lock()
	mu, ok := s.jobMu[lectureID]
	if !ok {
		mu = &sync.Mutex{}
		s.jobMu[lectureID] = mu
	}
	s.jobMuMu.Unlock()
	mu.Lock()
}

// unlockLecture releases the per-lecture mutex.
func (s *Scheduler) unlockLecture(lectureID string) {
	s.jobMuMu.Lock()
	mu, ok := s.jobMu[lectureID]
	s.jobMuMu.Unlock()
	if ok {
		mu.Unlock()
	}
}

// cleanupLectureMutex removes the per-lecture mutex from the map.
func (s *Scheduler) cleanupLectureMutex(lectureID string) {
	s.jobMuMu.Lock()
	delete(s.jobMu, lectureID)
	s.jobMuMu.Unlock()
}

// scheduleLoop is the main scheduling goroutine.
func (s *Scheduler) scheduleLoop(ctx context.Context) {
	defer s.shutdownWg.Done()

	pollInterval := time.Duration(s.cfg.ResourcePollIntervalS) * time.Second
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	// Metrics refresh ticker (every 15 seconds, OPS-16)
	metricsTicker := time.NewTicker(15 * time.Second)
	defer metricsTicker.Stop()

	// Active groups GC ticker (QUEUE-01)
	gcInterval := time.Duration(s.cfg.ActiveGroupsGCIntervalM) * time.Minute
	if gcInterval <= 0 {
		gcInterval = 60 * time.Minute // default to 60 minutes
	}
	gcTicker := time.NewTicker(gcInterval)
	defer gcTicker.Stop()

	// Initial attempt
	s.tryDequeue(ctx)
	s.refreshMetricsGauges()

	for {
		select {
		case <-ticker.C:
			if s.IsShuttingDown() {
				return
			}
			s.tryDequeue(ctx)
		case <-metricsTicker.C:
			s.refreshMetricsGauges()
		case <-gcTicker.C:
			s.gcActiveGroups() // QUEUE-01
		case newInterval := <-s.reconfigCh:
			ticker.Stop()
			pollInterval = newInterval
			ticker = time.NewTicker(newInterval)
			slog.Info("Scheduler poll interval reconfigured via SIGHUP",
				"new_interval_seconds", newInterval.Seconds(),
			)
		case <-ctx.Done():
			slog.Info("Scheduler context cancelled, stopping")
			return
		}
	}
}

// gcActiveGroups sweeps stale activeGroups entries using per-group timestamps (QUEUE-01, fix M-01).
// Only evicts entries older than MaxJobAgeHours to avoid premature removal of long-running groups.
func (s *Scheduler) gcActiveGroups() {
	s.activeGroupsMu.Lock()
	defer s.activeGroupsMu.Unlock()

	cutoff := time.Now().Add(-time.Duration(s.cfg.MaxJobAgeHours) * time.Hour)

	for group, entry := range s.activeGroups {
		if entry.count > 0 && entry.createdAt.Before(cutoff) {
			slog.Warn("Active groups GC: removing stale group (possible leak)",
				"job_group", group,
				"count", entry.count,
				"age_hours", time.Since(entry.createdAt).Hours(),
				"cutoff_hours", s.cfg.MaxJobAgeHours,
			)
			delete(s.activeGroups, group)
		}
	}
}

// refreshMetricsGauges updates periodic Prometheus gauges (OPS-16).
func (s *Scheduler) refreshMetricsGauges() {
	if s.mc == nil {
		return
	}

	pending, dead := s.QueueStats()
	s.mc.GaugeSet("vod_engine_pending_jobs", float64(pending))
	s.mc.GaugeSet("vod_engine_dead_letter_jobs", float64(dead))

	if job := s.queue.Peek(); job != nil {
		age := time.Since(job.CreatedAt).Seconds()
		if age < 0 {
			age = 0
		}
		s.mc.GaugeSet("vod_engine_queue_oldest_age_seconds", age)
	}
}

// tryDequeue attempts to dequeue and start the next job.
func (s *Scheduler) tryDequeue(ctx context.Context) {
	s.activeJobMu.Lock()
	if s.activeJob != nil {
		s.activeJobMu.Unlock()
		return
	}
	s.activeJobMu.Unlock()

	// CB-04/CB-05: Check B2 circuit state BEFORE popping from queue.
	// If the circuit is open, we Peek (not Pop) the job, log the delay, and return
	// so the job remains in the pending_jobs gauge and is not lost from the queue.
	if s.b2CircuitBreaker != nil && s.b2CircuitBreaker.State() == circuitbreaker.StateOpen {
		if peeked := s.queue.Peek(); peeked != nil {
			slog.Warn("B2 circuit open, delaying job (CB-05 waiting: circuit_breaker)",
				"job_id", peeked.ID,
				"lecture_id", peeked.LectureID,
				"quality", peeked.Quality,
				"delay_s", s.cfg.CBB2JobDelayS,
			)
		}
		time.Sleep(time.Duration(s.cfg.CBB2JobDelayS) * time.Second)
		return
	}

	job := s.findReadyJob()
	if job == nil {
		return
	}

	// Check resource guardian (system-level thresholds + predictive)
	if s.guardian != nil {
		if result := s.guardian.CanStart(); result != nil {
			s.guardian.LogBlock(result)
			s.reEnqueueJob(job)
			if s.mc != nil {
				s.mc.CounterInc("vod_engine_resource_blocked_total{resource=\"" + result.Resource + "\"}")
			}
			return
		}
	}

	if result := s.guardian.Inner.CanStartJob(job); result != nil {
		s.guardian.LogBlock(result)
		slog.Warn("Job blocked by per-job disk quota",
			"lecture_id", job.LectureID,
			"quality", job.Quality,
			"estimated", result.Current,
			"max", result.Threshold,
		)
		job.RetryCount++
		job.ErrorMsg = result.Description
		if job.RetryCount >= job.MaxRetries {
			failureReport := map[string]interface{}{
				"lecture_id":   job.LectureID,
				"quality":      job.Quality,
				"errors":       []string{result.Description},
				"error_code":   "ERR_DISK_QUOTA_EXCEEDED",
				"retries":      job.RetryCount,
				"final_status": "dead_letter",
				"timestamp":    time.Now().UTC(),
			}
			if err := s.persist.MoveToDead(job, failureReport); err != nil {
				slog.Error("Failed to move job to dead-letter queue", "error", err)
			}

			// MAJOR-01: Emit telemetry with exit_reason="disk_quota_exceeded" (TEL-04)
			jobTelemetry := telemetry.NewJobTelemetry(job.ID, job.LectureID, job.Quality)
			jobTelemetry.TeacherID = job.TeacherID
			jobTelemetry.QueueWaitTimeS = time.Since(job.CreatedAt).Seconds()
			jobTelemetry.FinalStatus = "dead_letter"
			jobTelemetry.RetryCount = job.RetryCount
			jobTelemetry.ExitReason = "disk_quota_exceeded"
			jobTelemetry.EndTime = time.Now()
			jobTelemetry.Compute()
			slog.LogAttrs(ctx, slog.LevelInfo, "pipeline.telemetry", jobTelemetry.ToLogEvent()...)

			if s.mc != nil {
				s.mc.CounterInc("vod_engine_jobs_processed_total{status=\"dead_letter\"}")
				s.mc.GaugeSet("vod_engine_dead_letter_jobs", float64(s.persist.CountDead()))
			}
		} else {
			s.reEnqueueJob(job)
		}
		return
	}

	// Start the job
	s.startJob(ctx, job)
}

// findReadyJob peeks at the queue and returns a job whose retry timer has expired.
func (s *Scheduler) findReadyJob() *queue.SubJob {
	job := s.queue.Pop()
	if job == nil {
		return nil
	}

	if job.Status == queue.StatusDeadLetter {
		return nil
	}

	// CB-05: If the job is waiting for circuit breaker recovery, check if the circuit
	// has transitioned to CLOSED or HALF_OPEN. Since tryDequeue now checks the circuit
	// before popping, by the time we pop a waiting job the circuit should be available.
	if job.Status == queue.StatusWaitingCircuitBreaker {
		// Reset to pending so the job runs normally
		job.Status = queue.StatusPending
		job.NextRetryAt = time.Time{}
		return job
	}

	if job.Status == queue.StatusPending && !job.NextRetryAt.IsZero() && time.Now().Before(job.NextRetryAt) {
		s.queue.Push(job)
		return nil
	}

	return job
}

// reEnqueueJob pushes a job back onto the queue and updates the pending gauge.
func (s *Scheduler) reEnqueueJob(job *queue.SubJob) {
	s.queue.Push(job)
	if s.mc != nil {
		s.mc.GaugeSet("vod_engine_pending_jobs", float64(s.queue.Len()))
	}
}

// hasExistingJob checks if a job with the given lecture_id and quality already exists.
func (s *Scheduler) hasExistingJob(lectureID, quality string) bool {
	for _, job := range s.queue.Snapshot() {
		if job.LectureID == lectureID && job.Quality == quality {
			switch job.Status {
			case queue.StatusPending, queue.StatusRunning, queue.StatusInterrupted, queue.StatusDeadLetter, queue.StatusWaitingCircuitBreaker:
				return true
			}
		}
	}

	s.activeJobMu.Lock()
	if s.activeJob != nil && s.activeJob.LectureID == lectureID && s.activeJob.Quality == quality {
		switch s.activeJob.Status {
		case queue.StatusPending, queue.StatusRunning, queue.StatusInterrupted, queue.StatusDeadLetter, queue.StatusWaitingCircuitBreaker:
			s.activeJobMu.Unlock()
			return true
		}
	}
	s.activeJobMu.Unlock()

	pendingJobs, err := s.persist.LoadPending()
	if err != nil {
		return false
	}
	for _, job := range pendingJobs {
		if job.LectureID == lectureID && job.Quality == quality {
			switch job.Status {
			case queue.StatusPending, queue.StatusRunning, queue.StatusInterrupted, queue.StatusDeadLetter, queue.StatusWaitingCircuitBreaker:
				return true
			}
		}
	}

	return false
}

// startJob runs a sub-job through the pipeline.
func (s *Scheduler) startJob(ctx context.Context, job *queue.SubJob) {
	s.activeJobMu.Lock()
	s.activeJob = job
	s.activeJobMu.Unlock()

	job.Status = queue.StatusRunning
	s.persist.SavePending(job)

	// Track job group with creation timestamp (QUEUE-01, fix M-01)
	s.activeGroupsMu.Lock()
	entry, ok := s.activeGroups[job.JobGroup]
	if !ok {
		entry = activeGroupEntry{createdAt: time.Now()}
	}
	entry.count++
	s.activeGroups[job.JobGroup] = entry
	s.activeGroupsMu.Unlock()

	slog.Info("Job started",
		"lecture_id", job.LectureID,
		"quality", job.Quality,
		"job_id", job.ID,
		"retry_count", job.RetryCount,
		"teacher_id", job.TeacherID,
		"correlation_id", job.CorrelationID,
	)

	// Update metrics (OBS-03: worker state = 1=downloading)
	if s.mc != nil {
		s.mc.GaugeSet("vod_engine_active_jobs", 1)
		s.mc.GaugeSet("vod_engine_pending_jobs", float64(s.queue.Len()))
		s.mc.GaugeSet("vod_engine_worker_state", 1) // OBS-03: downloading
		s.mc.GaugeSet("vod_engine_encoding_stage", 1) // OBS-04: downloading
	}

	// Send initial progress
	s.sendProgress(job.LectureID, "initializing", 5)

	// Run the pipeline
	result, err := s.pipeline.Run(ctx, job, func(pct int) {
		// Update encoding stage gauge (OBS-04) and worker state gauge (OBS-03)
		if s.mc != nil {
			if pct < 30 {
				s.mc.GaugeSet("vod_engine_encoding_stage", 1) // downloading
				s.mc.GaugeSet("vod_engine_worker_state", 1)   // downloading
			} else if pct < 70 {
				s.mc.GaugeSet("vod_engine_encoding_stage", 2) // encoding
				s.mc.GaugeSet("vod_engine_worker_state", 2)   // encoding
			} else if pct < 85 {
				s.mc.GaugeSet("vod_engine_encoding_stage", 3) // uploading
				s.mc.GaugeSet("vod_engine_worker_state", 3)   // uploading
			} else {
				s.mc.GaugeSet("vod_engine_encoding_stage", 4) // webhook
				s.mc.GaugeSet("vod_engine_worker_state", 4)   // cleaning
			}
		}
		// Throttled progress updates
		s.sendProgressThrottled(job.LectureID, "encoding", pct)
	})

	// Update worker state back to idle
	if s.mc != nil {
		s.mc.GaugeSet("vod_engine_worker_state", 0) // OBS-03: idle
		s.mc.GaugeSet("vod_engine_encoding_stage", 0) // OBS-04: waiting
	}

	if err != nil {
		s.handleJobFailure(ctx, job, err)
		return
	}

	// Success
	s.handleJobSuccess(ctx, job, result)
}

// handleJobSuccess processes a successful encoding.
func (s *Scheduler) handleJobSuccess(ctx context.Context, job *queue.SubJob, result *encoding.PipelineResult) {
	slog.Info("Job completed successfully",
		"lecture_id", job.LectureID,
		"quality", job.Quality,
		"duration_s", result.EncodingDuration.Seconds(),
		"files_uploaded", result.FilesUploaded,
	)

	// Update metrics: success (OBS-05: retry count histogram)
	if s.mc != nil {
		s.mc.CounterInc("vod_engine_jobs_processed_total{status=\"success\"}")
		s.mc.GaugeSet("vod_engine_active_jobs", 0)
		s.mc.GaugeSet("vod_engine_pending_jobs", float64(s.queue.Len()))
		s.mc.HistogramObserve("vod_engine_retry_count", float64(job.RetryCount)) // OBS-05
		if result.EncodingDuration.Seconds() > 0 {
			s.mc.HistogramObserve("vod_engine_encoding_duration_seconds", result.EncodingDuration.Seconds())
		}
	}

	// Send completion webhook
	s.sendProgress(job.LectureID, "completed", 100)
	s.cleanupProgressTicker(job.LectureID)

	// Use circuit breaker for completion webhook (CB-03)
	s.sendCompletionWebhookWithCB(job, result)

	// Clean up the sub-job from the pending queue
	s.persist.CleanupJobGroup(job.JobGroup)

	// Decrement job group counter with timestamp check (QUEUE-01, fix M-01)
	s.activeGroupsMu.Lock()
	entry, ok := s.activeGroups[job.JobGroup]
	if ok {
		entry.count--
		if entry.count <= 0 {
			delete(s.activeGroups, job.JobGroup)
			cleanupLectureID := job.LectureID
			s.cleanupLectureMutex(cleanupLectureID)
			go func() {
				defer func() {
					if r := recover(); r != nil {
						slog.Error("CleanupJobGroup goroutine panicked", "lecture_id", cleanupLectureID, "panic", r)
					}
				}()
				cleanupCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
				defer cancel()
				s.pipeline.CleanupJobGroup(cleanupCtx, cleanupLectureID, job.RawKey)
			}()
		} else {
			s.activeGroups[job.JobGroup] = entry
		}
	}
	s.activeGroupsMu.Unlock()

	// Clear active job
	s.activeJobMu.Lock()
	s.activeJob = nil
	s.activeJobMu.Unlock()
}

// handleJobFailure processes a failed encoding job.
func (s *Scheduler) handleJobFailure(ctx context.Context, job *queue.SubJob, err error) {
	errStr := err.Error()

	slog.Error("Job failed",
		"lecture_id", job.LectureID,
		"quality", job.Quality,
		"retry_count", job.RetryCount,
		"max_retries", job.MaxRetries,
		"error", errStr,
	)

	job.RetryCount++
	job.ErrorMsg = errStr

	// Detect circuit breaker errors (M-02)
	isCircuitBreakerError := errors.Is(err, circuitbreaker.ErrCircuitOpen)

	isB2Error := strings.Contains(errStr, "B2") ||
		strings.Contains(errStr, "b2") || // lower-case for circuit breaker "b2 circuit is open"
		strings.Contains(errStr, "unreachable") ||
		strings.Contains(errStr, "connection refused") ||
		strings.Contains(errStr, "no such host") ||
		strings.Contains(errStr, "timeout")

	// Build telemetry for this failure (TEL-04)
	jobTelemetry := telemetry.NewJobTelemetry(job.ID, job.LectureID, job.Quality)
	jobTelemetry.TeacherID = job.TeacherID
	jobTelemetry.QueueWaitTimeS = time.Since(job.CreatedAt).Seconds()
	jobTelemetry.FinalStatus = "failed"
	jobTelemetry.RetryCount = job.RetryCount

	// Classify exit_reason based on error (TEL-04)
	// M-02: Circuit breaker errors get "circuit_breaker:{service}" classification
	if isCircuitBreakerError {
		if strings.Contains(errStr, "b2") || strings.Contains(errStr, "B2") {
			jobTelemetry.ExitReason = "circuit_breaker:b2"
		} else if strings.Contains(errStr, "api") || strings.Contains(errStr, "API") {
			jobTelemetry.ExitReason = "circuit_breaker:api"
		} else {
			jobTelemetry.ExitReason = "circuit_breaker:unknown"
		}
	} else if isB2Error {
		// Determine B2 operation: download or upload
		if strings.Contains(errStr, "download") || strings.Contains(errStr, "Download") {
			jobTelemetry.ExitReason = "b2_failure:download"
		} else if strings.Contains(errStr, "upload") || strings.Contains(errStr, "Upload") {
			jobTelemetry.ExitReason = "b2_failure:upload"
		} else {
			jobTelemetry.ExitReason = "b2_failure:unknown"
		}
	} else if strings.Contains(errStr, "ffmpeg") || strings.Contains(errStr, "encoding") {
		jobTelemetry.ExitReason = "encoding_failure"
	} else {
		jobTelemetry.ExitReason = "max_retries_exceeded"
	}

	// CB-05 / M-01: Circuit breaker errors get special "waiting: circuit_breaker" handling
	// The job stays pending and is re-checked at each poll interval
	if isCircuitBreakerError {
		// Do NOT increment retry count for circuit breaker failures
		job.RetryCount-- // revert the increment above
		job.Status = queue.StatusWaitingCircuitBreaker
		job.NextRetryAt = time.Now().Add(time.Duration(s.cfg.CBB2JobDelayS) * time.Second)

		slog.Warn("Job waiting for circuit breaker recovery (CB-05)",
			"lecture_id", job.LectureID,
			"quality", job.Quality,
			"status", queue.StatusWaitingCircuitBreaker,
			"retry_delay_s", s.cfg.CBB2JobDelayS,
		)

		s.persist.SavePending(job)
		s.queue.Push(job)

		// Emit telemetry for circuit breaker delay
		jobTelemetry.EndTime = time.Now()
		jobTelemetry.Compute()
		slog.LogAttrs(ctx, slog.LevelInfo, "pipeline.telemetry", jobTelemetry.ToLogEvent()...)

		encoding.SendProgressWebhook(s.cfg.LaravelURL, s.cfg.JWTSecret, job.LectureID, "waiting: circuit_breaker", 0)

		if s.mc != nil {
			s.mc.CounterInc("vod_engine_jobs_processed_total{status=\"circuit_breaker\"}")
			s.mc.GaugeSet("vod_engine_active_jobs", 0)
			s.mc.GaugeSet("vod_engine_pending_jobs", float64(s.queue.Len()))
		}

		// Clean up activeGroups and activeJob same as other paths
		s.activeGroupsMu.Lock()
		entry, ok := s.activeGroups[job.JobGroup]
		if ok {
			entry.count--
			if entry.count <= 0 {
				delete(s.activeGroups, job.JobGroup)
				s.cleanupLectureMutex(job.LectureID)
			} else {
				s.activeGroups[job.JobGroup] = entry
			}
		}
		s.activeGroupsMu.Unlock()

		s.activeJobMu.Lock()
		s.activeJob = nil
		s.activeJobMu.Unlock()
		return
	}

	if job.RetryCount < job.MaxRetries {
		delay := time.Duration(s.cfg.RetryBaseDelayS*(1<<uint(job.RetryCount-1))) * time.Second
		job.NextRetryAt = time.Now().Add(delay)
		job.Status = queue.StatusPending

		slog.Info("Job will be retried",
			"lecture_id", job.LectureID,
			"attempt", job.RetryCount,
			"delay_s", delay.Seconds(),
		)

		s.persist.SavePending(job)
		s.queue.Push(job)

		// Log queue.requeue event (LOG-04)
		slog.Info("queue.requeue",
			"lecture_id", job.LectureID,
			"quality", job.Quality,
			"retry_count", job.RetryCount,
			"delay_s", delay.Seconds(),
		)

		// Emit telemetry for retried failure (TEL-04, TEL-06)
		jobTelemetry.EndTime = time.Now()
		jobTelemetry.Compute()
		slog.LogAttrs(ctx, slog.LevelInfo, "pipeline.telemetry", jobTelemetry.ToLogEvent()...)

		encoding.SendProgressWebhook(s.cfg.LaravelURL, s.cfg.JWTSecret, job.LectureID, "retrying", 0)

		if s.mc != nil {
			s.mc.CounterInc("vod_engine_jobs_processed_total{status=\"failed\"}")
			s.mc.GaugeSet("vod_engine_active_jobs", 0)
			s.mc.GaugeSet("vod_engine_pending_jobs", float64(s.queue.Len()))
			s.mc.HistogramObserve("vod_engine_retry_count", float64(job.RetryCount)) // OBS-05
		}
	} else {
		slog.Error("Job reached max retries, moving to dead-letter queue",
			"lecture_id", job.LectureID,
			"quality", job.Quality,
		)

		errors := []string{errStr}
		errorCode := "ERR_MAX_RETRIES"

		if isB2Error {
			errorCode = "ERR_B2_UNREACHABLE"
			slog.Warn("B2 unreachable, job moved to dead-letter with ERR_B2_UNREACHABLE code",
				"lecture_id", job.LectureID,
				"quality", job.Quality,
			)
			jobTelemetry.ExitReason = "b2_failure:upload" // B2 unreachable during final attempt
		}

		// Emit telemetry before moving to dead-letter (TEL-04, M-01)
		jobTelemetry.EndTime = time.Now()
		jobTelemetry.Compute()
		slog.LogAttrs(ctx, slog.LevelInfo, "pipeline.telemetry", jobTelemetry.ToLogEvent()...)

		failureReport := map[string]interface{}{
			"lecture_id":   job.LectureID,
			"quality":      job.Quality,
			"errors":       errors,
			"error_code":   errorCode,
			"retries":      job.RetryCount,
			"final_status": "dead_letter",
			"timestamp":    time.Now().UTC(),
		}

		if err := s.persist.MoveToDead(job, failureReport); err != nil {
			slog.Error("Failed to move job to dead-letter queue", "error", err)
		}

		// Use circuit breaker for completion webhook (CB-03)
		s.sendCompletionWebhookWithCB(job, &encoding.PipelineResult{
			LectureID: job.LectureID,
		})

		s.sendProgress(job.LectureID, "failed", 0)
		s.cleanupProgressTicker(job.LectureID)

		if s.mc != nil {
			s.mc.CounterInc("vod_engine_jobs_processed_total{status=\"dead_letter\"}")
			s.mc.GaugeSet("vod_engine_dead_letter_jobs", float64(s.persist.CountDead()))
			s.mc.GaugeSet("vod_engine_active_jobs", 0)
			s.mc.GaugeSet("vod_engine_pending_jobs", float64(s.queue.Len()))
			s.mc.HistogramObserve("vod_engine_retry_count", float64(job.RetryCount)) // OBS-05
		}
	}

	s.activeGroupsMu.Lock()
	entry, ok := s.activeGroups[job.JobGroup]
	if ok {
		entry.count--
		if entry.count <= 0 {
			delete(s.activeGroups, job.JobGroup)
			s.cleanupLectureMutex(job.LectureID)
		} else {
			s.activeGroups[job.JobGroup] = entry
		}
	}
	s.activeGroupsMu.Unlock()

	s.activeJobMu.Lock()
	s.activeJob = nil
	s.activeJobMu.Unlock()
}

// sendCompletionWebhookWithCB sends the completion webhook using the circuit breaker (CB-03).
// SEC-05: Does NOT pass encryption key — Laravel fetches it independently via lecture_id.
func (s *Scheduler) sendCompletionWebhookWithCB(job *queue.SubJob, result *encoding.PipelineResult) {
	if s.apiCircuitBreaker != nil {
		err := s.apiCircuitBreaker.Execute(func() error {
			encoding.SendCompletionWebhook(
				s.cfg.LaravelURL, s.cfg.JWTSecret,
				job.LectureID, result.M3U8Path, "completed",
				result.TotalSizeBytes,
			)
			return nil
		})
		if err != nil {
			// Circuit is open or half-open, buffer the webhook
			if s.webhookBuffer != nil {
				s.webhookBuffer.Push(circuitbreaker.WebhookEntry{
					LectureID:      job.LectureID,
					Status:         "completed",
					M3U8Path:       result.M3U8Path,
					TotalSizeBytes: result.TotalSizeBytes,
					Timestamp:      time.Now(),
				})
				slog.Warn("Webhook buffered due to API circuit breaker",
					"lecture_id", job.LectureID,
				)
			}
		} else {
			// Circuit closed — flush any buffered webhooks
			s.flushWebhookBuffer()
		}
	} else {
		// No circuit breaker, send directly
		encoding.SendCompletionWebhook(
			s.cfg.LaravelURL, s.cfg.JWTSecret,
			job.LectureID, result.M3U8Path, "completed",
			result.TotalSizeBytes,
		)
	}
}

// FlushWebhookBuffer sends all buffered webhooks (CB-03). Public version for main.go.
func (s *Scheduler) FlushWebhookBuffer() {
	s.flushWebhookBuffer()
}

// flushWebhookBuffer sends all buffered webhooks (CB-03).
// SEC-05: Does NOT pass encryption key — Laravel fetches it independently via lecture_id.
func (s *Scheduler) flushWebhookBuffer() {
	if s.webhookBuffer == nil {
		return
	}
	entries := s.webhookBuffer.Drain()
	for _, entry := range entries {
		encoding.SendCompletionWebhook(
			s.cfg.LaravelURL, s.cfg.JWTSecret,
			entry.LectureID, entry.M3U8Path, entry.Status,
			entry.TotalSizeBytes,
		)
	}
}

// sendProgress sends an immediate progress update.
func (s *Scheduler) sendProgress(lectureID, phase string, percent int) {
	encoding.SendProgressWebhook(s.cfg.LaravelURL, s.cfg.JWTSecret, lectureID, phase, percent)
}

// sendProgressThrottled sends progress at most once every 3 seconds per lecture.
func (s *Scheduler) sendProgressThrottled(lectureID, phase string, percent int) {
	s.progressMu.Lock()
	defer s.progressMu.Unlock()

	lastSent, exists := s.progressTicker[lectureID]
	now := time.Now()

	if phase == "completed" || phase == "failed" || phase == "initializing" {
		s.sendProgress(lectureID, phase, percent)
		s.progressTicker[lectureID] = now
		return
	}

	if !exists || now.Sub(lastSent) >= 3*time.Second {
		s.sendProgress(lectureID, phase, percent)
		s.progressTicker[lectureID] = now
	}
}

// cleanupProgressTicker removes the progressTicker entry for a lecture ID.
func (s *Scheduler) cleanupProgressTicker(lectureID string) {
	s.progressMu.Lock()
	delete(s.progressTicker, lectureID)
	s.progressMu.Unlock()
}

// PersistQueueOnShutdown writes all pending jobs to disk before exit.
func (s *Scheduler) PersistQueueOnShutdown() {
	jobs := s.queue.Drain()
	slog.Info("Persisting queue on shutdown", "count", len(jobs))

	for _, job := range jobs {
		job.Status = queue.StatusInterrupted
		if err := s.persist.SavePending(job); err != nil {
			slog.Error("Failed to persist job on shutdown", "job_id", job.ID, "error", err)
		}
	}
}

// OrphanCleanup kills any orphaned FFmpeg processes and cleans stale temp files.
func (s *Scheduler) OrphanCleanup() {
	slog.Info("Running orphan cleanup...")

	pidfilePath := filepath.Join(s.cfg.VODWorkDir, "active.pid")
	data, err := os.ReadFile(pidfilePath)
	if err == nil {
		pidStr := strings.TrimSpace(string(data))
		pid, err := strconv.Atoi(pidStr)
		if err == nil {
			slog.Info("Found active.pid, checking for orphan FFmpeg", "pid", pid)
			commPath := fmt.Sprintf("/proc/%d/comm", pid)
			comm, err := os.ReadFile(commPath)
			if err == nil && strings.TrimSpace(string(comm)) == "ffmpeg" {
				slog.Warn("Killing orphan FFmpeg process", "pid", pid)
				exec.Command("kill", "-TERM", strconv.Itoa(pid)).Run()
				time.Sleep(5 * time.Second)
				exec.Command("kill", "-KILL", strconv.Itoa(pid)).Run()
				slog.Info("Orphan FFmpeg killed", "pid", pid)
			}
		}
		os.Remove(pidfilePath)
	}

	threshold := time.Now().Add(-24 * time.Hour)
	filepath.WalkDir(s.cfg.VODWorkDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if path == s.cfg.VODQueueDir {
				return filepath.SkipDir
			}
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return nil
		}
		if info.ModTime().Before(threshold) {
			os.Remove(path)
			slog.Debug("Cleaned stale temp file", "path", path)
		}
		return nil
	})

	slog.Info("Orphan cleanup complete")
}

// RequeueDeadLetter handles the POST /api/v1/video/requeue API call.
func (s *Scheduler) RequeueDeadLetter(lectureID string) error {
	return s.persist.Requeue(lectureID)
}

// MaxRetries returns the configured max retry count.
func (s *Scheduler) MaxRetries() int {
	return s.cfg.MaxRetries
}

// QueueStats returns snapshot statistics for the health endpoint.
func (s *Scheduler) QueueStats() (pending, dead int) {
	pending = s.queue.Len()
	dead = s.persist.CountDead()
	return
}
