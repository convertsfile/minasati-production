package telemetry

import (
	"fmt"
	"log/slog"
	"time"
)

// ResourceSample represents a single resource measurement at a point in time.
type ResourceSample struct {
	Timestamp  time.Time
	CPUPct     float64 // From /proc/<pid>/stat (utime+stime) / elapsed
	RSSMB      int64   // From /proc/<pid>/status VmRSS
	ReadBytes  int64   // From /proc/<pid>/io read_bytes
	WriteBytes int64   // From /proc/<pid>/io write_bytes
}

// JobTelemetry collects per-job resource telemetry during encoding.
type JobTelemetry struct {
	JobID       string
	LectureID   string
	Quality     string
	Samples     []ResourceSample
	StartTime   time.Time
	EndTime     time.Time

	// Computed on completion
	CPUAvgPct   float64
	CPUPeakPct  float64
	RAMAvgMB    float64
	RAMPeakMB   float64
	DiskReadMB  int64
	DiskWriteMB int64

	// External summaries supplied at completion
	EncodingDurationS float64
	DownloadSpeedMbps float64
	UploadSpeedMbps   float64
	TotalSizeMB       float64
	SegmentsCount     int
	RetryCount        int
	FinalStatus       string

	// NEW FIELDS (TEL-01 through TEL-06)
	TeacherID        string  // TEL-02
	QueueWaitTimeS   float64 // TEL-01
	EncodingSpeedFPS float64 // TEL-03
	ExitReason       string  // TEL-04
	VideoDurationS   float64 // TEL-05
}

// NewJobTelemetry creates a new JobTelemetry with the given metadata.
func NewJobTelemetry(jobID, lectureID, quality string) *JobTelemetry {
	return &JobTelemetry{
		JobID:     jobID,
		LectureID: lectureID,
		Quality:   quality,
		StartTime: time.Now(),
	}
}

// AddSample appends a resource sample to the telemetry.
func (jt *JobTelemetry) AddSample(sample ResourceSample) {
	jt.Samples = append(jt.Samples, sample)
}

// Compute calculates aggregate statistics from all collected samples.
// Must be called after encoding completes and after EndTime is set.
func (jt *JobTelemetry) Compute() {
	if len(jt.Samples) == 0 {
		return
	}

	var totalCPU, totalRAM float64
	var peakCPU, peakRAM float64
	var maxRead, maxWrite int64

	for _, s := range jt.Samples {
		totalCPU += s.CPUPct
		totalRAM += float64(s.RSSMB)

		if s.CPUPct > peakCPU {
			peakCPU = s.CPUPct
		}
		if float64(s.RSSMB) > peakRAM {
			peakRAM = float64(s.RSSMB)
		}
		if s.ReadBytes > maxRead {
			maxRead = s.ReadBytes
		}
		if s.WriteBytes > maxWrite {
			maxWrite = s.WriteBytes
		}
	}

	count := float64(len(jt.Samples))
	jt.CPUAvgPct = totalCPU / count
	jt.CPUPeakPct = peakCPU
	jt.RAMAvgMB = totalRAM / count
	jt.RAMPeakMB = peakRAM

	// Disk I/O is the last sample's cumulative totals (total bytes since process start)
	if last := jt.Samples[len(jt.Samples)-1]; last.ReadBytes > 0 {
		jt.DiskReadMB = last.ReadBytes / (1024 * 1024)
	}
	if last := jt.Samples[len(jt.Samples)-1]; last.WriteBytes > 0 {
		jt.DiskWriteMB = last.WriteBytes / (1024 * 1024)
	}

	if !jt.EndTime.IsZero() && !jt.StartTime.IsZero() {
		jt.EncodingDurationS = jt.EndTime.Sub(jt.StartTime).Seconds()
	}
}

// ToLogEvent returns variadic slog.Attr with event at the JSON top level.
// Use with: slog.LogAttrs(ctx, slog.LevelInfo, "pipeline.telemetry", telemetry.ToLogEvent()...)
func (jt *JobTelemetry) ToLogEvent() []slog.Attr {
	return []slog.Attr{
		slog.String("event", "pipeline.telemetry"), // LOG-04: renamed from job.telemetry
		slog.String("lecture_id", jt.LectureID),
		slog.String("teacher_id", jt.TeacherID),      // NEW (TEL-02)
		slog.String("quality", jt.Quality),
		slog.Float64("queue_wait_time_s", jt.QueueWaitTimeS), // NEW (TEL-01)
		slog.Float64("encoding_duration_s", jt.EncodingDurationS),
		slog.Float64("video_duration_s", jt.VideoDurationS),   // NEW (TEL-05)
		slog.Float64("encoding_speed_fps", jt.EncodingSpeedFPS), // NEW (TEL-03)
		slog.Float64("cpu_avg_pct", jt.CPUAvgPct),
		slog.Float64("cpu_peak_pct", jt.CPUPeakPct),
		slog.Float64("ram_avg_mb", jt.RAMAvgMB),
		slog.Float64("ram_peak_mb", jt.RAMPeakMB),
		slog.Int64("disk_read_mb", jt.DiskReadMB),
		slog.Int64("disk_write_mb", jt.DiskWriteMB),
		slog.Float64("download_speed_mbps", jt.DownloadSpeedMbps),
		slog.Float64("upload_speed_mbps", jt.UploadSpeedMbps),
		slog.Float64("total_size_mb", jt.TotalSizeMB),
		slog.Int("segments_count", jt.SegmentsCount),
		slog.Int("retry_count", jt.RetryCount),
		slog.String("exit_reason", jt.ExitReason),    // NEW (TEL-04)
		slog.String("final_status", jt.FinalStatus),
	}
}

// Serialize returns a map for JSON encoding.
func (jt *JobTelemetry) Serialize() map[string]interface{} {
	return map[string]interface{}{
		"event":               "pipeline.telemetry",
		"lecture_id":          jt.LectureID,
		"teacher_id":          jt.TeacherID,
		"quality":             jt.Quality,
		"queue_wait_time_s":   jt.QueueWaitTimeS,
		"encoding_duration_s": jt.EncodingDurationS,
		"video_duration_s":    jt.VideoDurationS,
		"encoding_speed_fps":  jt.EncodingSpeedFPS,
		"cpu_avg_pct":         jt.CPUAvgPct,
		"cpu_peak_pct":        jt.CPUPeakPct,
		"ram_avg_mb":          jt.RAMAvgMB,
		"ram_peak_mb":         jt.RAMPeakMB,
		"disk_read_mb":        jt.DiskReadMB,
		"disk_write_mb":       jt.DiskWriteMB,
		"download_speed_mbps": jt.DownloadSpeedMbps,
		"upload_speed_mbps":   jt.UploadSpeedMbps,
		"total_size_mb":       jt.TotalSizeMB,
		"segments_count":      jt.SegmentsCount,
		"retry_count":         jt.RetryCount,
		"exit_reason":         jt.ExitReason,
		"final_status":        jt.FinalStatus,
	}
}

// String returns a concise summary of the telemetry.
func (jt *JobTelemetry) String() string {
	return fmt.Sprintf("telemetry[%s/%s] cpu(avg=%.1f%%, peak=%.1f%%) ram(avg=%.0fMB, peak=%.0fMB) disk(r=%dMB w=%dMB) dur=%.1fs fps=%.1f exit=%s",
		jt.LectureID, jt.Quality,
		jt.CPUAvgPct, jt.CPUPeakPct,
		jt.RAMAvgMB, jt.RAMPeakMB,
		jt.DiskReadMB, jt.DiskWriteMB,
		jt.EncodingDurationS,
		jt.EncodingSpeedFPS,
		jt.ExitReason,
	)
}
