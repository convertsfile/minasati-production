package queue

import (
	"container/heap"
	"sync"
	"time"
)

// priorityQueueItem wraps a SubJob with its index in the heap.
type priorityQueueItem struct {
	job   *SubJob
	index int // Index in the heap array (for heap.Interface)
}

// priorityQueueHeap implements heap.Interface.
// Ordering: lowest priority number first (480p=1 before 360p=2 before 720p=3).
// Within the same priority, FIFO by CreatedAt.
type priorityQueueHeap []*priorityQueueItem

func (pq priorityQueueHeap) Len() int { return len(pq) }

func (pq priorityQueueHeap) Less(i, j int) bool {
	if pq[i].job.Priority != pq[j].job.Priority {
		return pq[i].job.Priority < pq[j].job.Priority
	}
	return pq[i].job.CreatedAt.Before(pq[j].job.CreatedAt)
}

func (pq priorityQueueHeap) Swap(i, j int) {
	pq[i], pq[j] = pq[j], pq[i]
	pq[i].index = i
	pq[j].index = j
}

func (pq *priorityQueueHeap) Push(x interface{}) {
	n := len(*pq)
	item := x.(*priorityQueueItem)
	item.index = n
	*pq = append(*pq, item)
}

func (pq *priorityQueueHeap) Pop() interface{} {
	old := *pq
	n := len(old)
	item := old[n-1]
	old[n-1] = nil
	item.index = -1
	*pq = old[0 : n-1]
	return item
}

// PriorityQueue is a thread-safe priority FIFO queue.
type PriorityQueue struct {
	mu   sync.Mutex
	heap priorityQueueHeap
}

// NewPriorityQueue creates an empty priority queue.
func NewPriorityQueue() *PriorityQueue {
	pq := &PriorityQueue{}
	heap.Init(&pq.heap)
	return pq
}

// Push adds a job to the queue.
func (pq *PriorityQueue) Push(job *SubJob) {
	pq.mu.Lock()
	defer pq.mu.Unlock()
	heap.Push(&pq.heap, &priorityQueueItem{job: job})
}

// Pop removes and returns the highest-priority oldest job.
// Returns nil if the queue is empty.
func (pq *PriorityQueue) Pop() *SubJob {
	pq.mu.Lock()
	defer pq.mu.Unlock()
	if pq.heap.Len() == 0 {
		return nil
	}
	item := heap.Pop(&pq.heap).(*priorityQueueItem)
	return item.job
}

// Peek returns the highest-priority oldest job without removing it.
// Returns nil if the queue is empty.
func (pq *PriorityQueue) Peek() *SubJob {
	pq.mu.Lock()
	defer pq.mu.Unlock()
	if pq.heap.Len() == 0 {
		return nil
	}
	return pq.heap[0].job
}

// Len returns the number of jobs in the queue.
func (pq *PriorityQueue) Len() int {
	pq.mu.Lock()
	defer pq.mu.Unlock()
	return pq.heap.Len()
}

// Drain returns all jobs in the queue (for shutdown persistence).
func (pq *PriorityQueue) Drain() []*SubJob {
	pq.mu.Lock()
	defer pq.mu.Unlock()
	jobs := make([]*SubJob, 0, pq.heap.Len())
	for pq.heap.Len() > 0 {
		item := heap.Pop(&pq.heap).(*priorityQueueItem)
		jobs = append(jobs, item.job)
	}
	return jobs
}

// HasHigherPriority checks if there is any pending job with a lower
// (higher-priority) priority number than the given quality string.
func (pq *PriorityQueue) HasHigherPriority(thanQuality string) bool {
	thanPri := QualityToPriority(thanQuality)
	pq.mu.Lock()
	defer pq.mu.Unlock()

	for _, item := range pq.heap {
		if item.job.Status == StatusPending && item.job.Priority < thanPri {
			return true
		}
	}
	return false
}

// Snapshot returns a copy of all jobs (for monitoring/health).
func (pq *PriorityQueue) Snapshot() []*SubJob {
	pq.mu.Lock()
	defer pq.mu.Unlock()

	jobs := make([]*SubJob, 0, pq.heap.Len())
	for _, item := range pq.heap {
		jobs = append(jobs, item.job)
	}
	return jobs
}

// Duration returns the age of the oldest pending job, or 0 if empty.
func (pq *PriorityQueue) Duration() time.Duration {
	pq.mu.Lock()
	defer pq.mu.Unlock()

	if pq.heap.Len() == 0 {
		return 0
	}

	oldest := pq.heap[0]
	return time.Since(oldest.job.CreatedAt)
}
