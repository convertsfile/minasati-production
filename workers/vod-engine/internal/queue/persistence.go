package queue

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	pendingDir = "pending"
	deadDir    = "dead"
)

// Persistence handles reading/writing jobs to disk.
type Persistence struct {
	queueDir string
}

// NewPersistence creates a Persistence and ensures queue directories exist.
func NewPersistence(queueDir string) (*Persistence, error) {
	p := &Persistence{queueDir: queueDir}

	dirs := []string{
		filepath.Join(queueDir, pendingDir),
		filepath.Join(queueDir, deadDir),
	}
	for _, d := range dirs {
		if err := os.MkdirAll(d, 0700); err != nil {
			return nil, fmt.Errorf("create queue dir %s: %w", d, err)
		}
	}

	return p, nil
}

// SavePending writes a sub-job to the pending directory atomically.
func (p *Persistence) SavePending(job *SubJob) error {
	jobDir := filepath.Join(p.queueDir, pendingDir, job.JobGroup)
	if err := os.MkdirAll(jobDir, 0700); err != nil {
		return fmt.Errorf("mkdir job dir: %w", err)
	}

	jobPath := filepath.Join(jobDir, fmt.Sprintf("%s.json", job.ID))
	return p.writeAtomically(jobPath, job)
}

// LoadPending scans the pending directory and returns all jobs.
func (p *Persistence) LoadPending() ([]*SubJob, error) {
	pendingPath := filepath.Join(p.queueDir, pendingDir)
	return p.scanDir(pendingPath)
}

// MoveToDead moves a job from pending to the dead-letter directory.
func (p *Persistence) MoveToDead(job *SubJob, failureReport map[string]interface{}) error {
	// Remove from pending
	srcPath := filepath.Join(p.queueDir, pendingDir, job.JobGroup, fmt.Sprintf("%s.json", job.ID))
	os.Remove(srcPath) // Best effort; may not exist if already moved

	// Save to dead
	deadGroupDir := filepath.Join(p.queueDir, deadDir, job.JobGroup)
	if err := os.MkdirAll(deadGroupDir, 0700); err != nil {
		return fmt.Errorf("mkdir dead dir: %w", err)
	}

	job.Status = StatusDeadLetter
	destPath := filepath.Join(deadGroupDir, fmt.Sprintf("%s.json", job.ID))
	if err := p.writeAtomically(destPath, job); err != nil {
		return err
	}

	// Write failure report
	if failureReport != nil {
		reportPath := filepath.Join(deadGroupDir, "failure_report.json")
		reportData, _ := json.MarshalIndent(failureReport, "", "  ")
		if err := p.writeAtomicallyRaw(reportPath, reportData); err != nil {
			slog.Warn("Failed to write failure report", "path", reportPath, "error", err)
		}
	}

	return nil
}

// Requeue moves a job from dead back to pending with retry count reset.
func (p *Persistence) Requeue(lectureID string) error {
	jobGroup := fmt.Sprintf("lecture_%s", lectureID)
	deadGroupDir := filepath.Join(p.queueDir, deadDir, jobGroup)

	entries, err := os.ReadDir(deadGroupDir)
	if err != nil {
		return fmt.Errorf("read dead dir for %s: %w", lectureID, err)
	}

	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".json") || entry.Name() == "failure_report.json" {
			continue
		}

		data, err := os.ReadFile(filepath.Join(deadGroupDir, entry.Name()))
		if err != nil {
			slog.Warn("Failed to read dead job file", "file", entry.Name(), "error", err)
			continue
		}

		job, err := DeserializeSubJob(data)
		if err != nil {
			slog.Warn("Failed to deserialize dead job", "file", entry.Name(), "error", err)
			continue
		}

		job.RetryCount = 0
		job.Status = StatusPending
		job.ErrorMsg = ""
		job.NextRetryAt = timeZero()

		if err := p.SavePending(job); err != nil {
			slog.Error("Failed to requeue job", "lecture_id", lectureID, "error", err)
			continue
		}

		os.Remove(filepath.Join(deadGroupDir, entry.Name()))
		slog.Info("Job requeued from dead to pending", "lecture_id", lectureID, "job_id", job.ID)
	}

	return nil
}

// CleanupJobGroup removes all files for a job group from pending.
func (p *Persistence) CleanupJobGroup(jobGroup string) {
	dir := filepath.Join(p.queueDir, pendingDir, jobGroup)
	os.RemoveAll(dir)
}

// CountPending returns the number of pending job files in the pending directory.
func (p *Persistence) CountPending() int {
	jobs, err := p.scanDir(filepath.Join(p.queueDir, pendingDir))
	if err != nil {
		return 0
	}
	return len(jobs)
}

// CountDead returns the number of job files in the dead-letter directory.
func (p *Persistence) CountDead() int {
	jobs, err := p.scanDir(filepath.Join(p.queueDir, deadDir))
	if err != nil {
		return 0
	}
	return len(jobs)
}

// scanDir recursively scans a directory for .json job files.
func (p *Persistence) scanDir(dir string) ([]*SubJob, error) {
	var jobs []*SubJob

	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(d.Name(), ".json") {
			return nil
		}

		data, readErr := os.ReadFile(path)
		if readErr != nil {
			slog.Warn("Failed to read job file", "path", path, "error", readErr)
			return nil
		}

		job, parseErr := DeserializeSubJob(data)
		if parseErr != nil {
			slog.Warn("Failed to parse job file", "path", path, "error", parseErr)
			return nil
		}

		jobs = append(jobs, job)
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("scan dir %s: %w", dir, err)
	}

	return jobs, nil
}

// writeAtomically writes a job to disk atomically using .tmp + rename.
func (p *Persistence) writeAtomically(path string, job *SubJob) error {
	data, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("marshal job: %w", err)
	}
	return p.writeAtomicallyRaw(path, data)
}

func (p *Persistence) writeAtomicallyRaw(path string, data []byte) error {
	tmpPath := path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0600); err != nil {
		return fmt.Errorf("write tmp: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("rename tmp -> target: %w", err)
	}
	return nil
}

func timeZero() time.Time {
	return time.Time{}
}
