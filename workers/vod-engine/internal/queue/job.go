package queue

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/logging"
)

// JobStatus represents the current state of a job.
type JobStatus string

const (
	StatusPending              JobStatus = "pending"
	StatusRunning              JobStatus = "running"
	StatusInterrupted          JobStatus = "interrupted"
	StatusDeadLetter           JobStatus = "dead_letter"
	StatusCompleted            JobStatus = "completed"
	StatusWaitingCircuitBreaker JobStatus = "waiting: circuit_breaker" // CB-05
)

// Priority tier: lower number = higher priority.
type Priority int

const (
	Priority480p Priority = 1
	Priority360p Priority = 2
	Priority720p Priority = 3
)

// SubJob is a single rendition encoding task (e.g., "480p" for one lecture).
type SubJob struct {
	ID          string    `json:"id"`
	LectureID   string    `json:"lecture_id"`
	RawKey      string    `json:"raw_key"`
	Quality     string    `json:"quality"`
	Priority    Priority  `json:"priority"`
	JobGroup    string    `json:"job_group"`
	Status      JobStatus `json:"status"`
	RetryCount  int       `json:"retry_count"`
	MaxRetries  int       `json:"max_retries"`
	NextRetryAt time.Time `json:"next_retry_at,omitempty"`
	ErrorMsg    string    `json:"error_msg,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// SharedInput indicates whether the downloaded input file is shared
	// across sub-jobs in the same job group.
	SharedInput bool `json:"shared_input"`

	// NEW FIELDS (TEL-02, LOG-01)
	TeacherID     string `json:"teacher_id,omitempty"`     // TEL-02
	CorrelationID string `json:"correlation_id,omitempty"` // LOG-01
}

// EnqueueRequest is what Laravel sends to POST /api/v1/video/process.
type EnqueueRequest struct {
	LectureID string   `json:"lecture_id"`
	RawKey    string   `json:"raw_key"`
	Qualities []string `json:"qualities"`
	TeacherID string   `json:"teacher_id,omitempty"` // NEW (TEL-02, SEC-01)
}

// QualityToPriority maps a quality string to its priority tier.
func QualityToPriority(q string) Priority {
	switch q {
	case "480p":
		return Priority480p
	case "360p":
		return Priority360p
	case "720p":
		return Priority720p
	default:
		return Priority720p
	}
}

// NewSubJobs creates a slice of SubJobs from an enqueue request.
func NewSubJobs(req EnqueueRequest, maxRetries int, teacherID string) []*SubJob {
	jobGroup := fmt.Sprintf("lecture_%s", req.LectureID)
	now := time.Now().UTC()
	subJobs := make([]*SubJob, 0, len(req.Qualities))

	// Generate a single correlation ID for the whole job group (LOG-01)
	correlationID := logging.NewCorrelationID()

	for _, q := range req.Qualities {
		subJobs = append(subJobs, &SubJob{
			ID:            newID(),
			LectureID:     req.LectureID,
			RawKey:        req.RawKey,
			Quality:       q,
			Priority:      QualityToPriority(q),
			JobGroup:      jobGroup,
			Status:        StatusPending,
			RetryCount:    0,
			MaxRetries:    maxRetries,
			CreatedAt:     now,
			UpdatedAt:     now,
			SharedInput:   true,
			TeacherID:     teacherID,     // NEW
			CorrelationID: correlationID, // NEW
		})
	}

	return subJobs
}

// Serialize converts a SubJob to JSON bytes.
func (j *SubJob) Serialize() ([]byte, error) {
	return json.Marshal(j)
}

// DeserializeSubJob parses JSON bytes into a SubJob.
func DeserializeSubJob(data []byte) (*SubJob, error) {
	var j SubJob
	if err := json.Unmarshal(data, &j); err != nil {
		return nil, err
	}
	return &j, nil
}

func newID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
