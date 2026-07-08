// Package circuitbreaker implements a state machine for external service health
// (CB-01 through CB-05). Supports CLOSED → OPEN → HALF_OPEN transitions
// with configurable thresholds and auto-recovery via probes.
package circuitbreaker

import (
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/a_ashraf_tech/vod-engine/internal/logging"
	"github.com/a_ashraf_tech/vod-engine/internal/metrics"
)

// ErrCircuitOpen is returned when the circuit is open and the operation is fast-failed.
var ErrCircuitOpen = errors.New("circuit breaker: circuit is open")

// State represents the circuit breaker state.
type State int32

const (
	StateClosed   State = 0
	StateHalfOpen State = 1
	StateOpen     State = 2
)

func (s State) String() string {
	switch s {
	case StateClosed:
		return "closed"
	case StateHalfOpen:
		return "half_open"
	case StateOpen:
		return "open"
	default:
		return "unknown"
	}
}

// CircuitBreaker implements a state machine for external service health.
type CircuitBreaker struct {
	name             string
	state            int32 // atomic: 0=closed, 1=half_open, 2=open
	failureThreshold int32
	recoveryTimeout  time.Duration
	halfOpenMaxReqs  int32

	failureCount    int32
	lastFailureTime time.Time
	halfOpenReqs    int32
	mu              sync.Mutex

	mc *metrics.MetricsCollector
}

// NewCircuitBreaker creates a new CircuitBreaker.
// name: service name (e.g., "b2", "api").
// threshold: consecutive failures before opening.
// timeout: duration to wait before transitioning to half-open.
// halfOpenMax: max requests allowed in half-open state.
// mc: optional metrics collector.
func NewCircuitBreaker(name string, threshold int, timeout time.Duration, halfOpenMax int, mc *metrics.MetricsCollector) *CircuitBreaker {
	cb := &CircuitBreaker{
		name:             name,
		state:            int32(StateClosed),
		failureThreshold: int32(threshold),
		recoveryTimeout:  timeout,
		halfOpenMaxReqs:  int32(halfOpenMax),
		mc:               mc,
	}

	// Register initial metrics
	if mc != nil {
		mc.CounterRegister(fmt.Sprintf("vod_engine_circuit_breaker_total{service=%q,state=%q}", name, "open"),
			fmt.Sprintf("Circuit breaker %s open count", name))
		mc.CounterRegister(fmt.Sprintf("vod_engine_circuit_breaker_total{service=%q,state=%q}", name, "half_open"),
			fmt.Sprintf("Circuit breaker %s half-open count", name))
		mc.CounterRegister(fmt.Sprintf("vod_engine_circuit_breaker_total{service=%q,state=%q}", name, "closed"),
			fmt.Sprintf("Circuit breaker %s closed count", name))
		mc.GaugeRegister(fmt.Sprintf("vod_engine_circuit_breaker_current_state{service=%q}", name),
			fmt.Sprintf("Circuit breaker %s current state: 0=closed 1=half_open 2=open", name))
	}

	return cb
}

// State returns the current circuit state (thread-safe via atomic load).
func (cb *CircuitBreaker) State() State {
	return State(atomic.LoadInt32(&cb.state))
}

// setState atomically sets the state and updates metrics (CB-01, CB-02).
func (cb *CircuitBreaker) setState(newState State) {
	old := State(atomic.SwapInt32(&cb.state, int32(newState)))
	if old != newState {
		slog.Info("circuit_breaker.state_change",
			slog.String("service", cb.name),
			slog.String("from", old.String()),
			slog.String("to", newState.String()),
		)
	}
	if cb.mc != nil {
		cb.mc.GaugeSet(fmt.Sprintf("vod_engine_circuit_breaker_current_state{service=%q}", cb.name), float64(newState))
	}
}

// ForceState sets the circuit state directly (for testing primarily).
func (cb *CircuitBreaker) ForceState(state State) {
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.setState(state)
	if state == StateClosed {
		atomic.StoreInt32(&cb.failureCount, 0)
		atomic.StoreInt32(&cb.halfOpenReqs, 0)
	}
	if cb.mc != nil {
		cb.mc.CounterInc(fmt.Sprintf("vod_engine_circuit_breaker_total{service=%q,state=%q}", cb.name, state.String()))
	}
}

// Execute runs fn if the circuit allows; tracks success/failure (CB-01, CB-02).
// Returns ErrCircuitOpen if circuit is OPEN without calling fn.
func (cb *CircuitBreaker) Execute(fn func() error) error {
	state := cb.State()

	switch state {
	case StateOpen:
		// Check if recovery timeout has elapsed → transition to half-open (CB-02)
		cb.mu.Lock()
		if time.Since(cb.lastFailureTime) >= cb.recoveryTimeout {
			cb.setState(StateHalfOpen)
			atomic.StoreInt32(&cb.halfOpenReqs, 0)
			if cb.mc != nil {
				cb.mc.CounterInc(fmt.Sprintf("vod_engine_circuit_breaker_total{service=%q,state=%q}", cb.name, "half_open"))
			}
			state = StateHalfOpen
		}
		cb.mu.Unlock()

		if state == StateOpen {
			return fmt.Errorf("%w: %s circuit is open", ErrCircuitOpen, cb.name)
		}

	case StateHalfOpen:
		// Check if we've exceeded the max half-open probes (CB-02)
		if atomic.LoadInt32(&cb.halfOpenReqs) >= cb.halfOpenMaxReqs {
			return fmt.Errorf("%w: %s circuit half-open, max probes reached", ErrCircuitOpen, cb.name)
		}
	}

	// Execute the operation
	err := fn()

	cb.recordResult(err)
	return err
}

// recordResult processes the outcome of an operation (CB-01, CB-02).
func (cb *CircuitBreaker) recordResult(err error) {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	if err == nil {
		// Success
		switch State(atomic.LoadInt32(&cb.state)) {
		case StateHalfOpen:
			// Probe succeeded → close circuit (CB-02)
			cb.setState(StateClosed)
			atomic.StoreInt32(&cb.failureCount, 0)
			atomic.StoreInt32(&cb.halfOpenReqs, 0)
			if cb.mc != nil {
				cb.mc.CounterInc(fmt.Sprintf("vod_engine_circuit_breaker_total{service=%q,state=%q}", cb.name, "closed"))
			}
			slog.Info("circuit_breaker.recovered",
				slog.String("service", cb.name),
				slog.String("message", "Circuit closed after successful probe"),
			)
		case StateClosed:
			// Normal success — reset failure count
			atomic.StoreInt32(&cb.failureCount, 0)
		}
	} else {
		// Failure
		atomic.AddInt32(&cb.failureCount, 1)
		cb.lastFailureTime = time.Now()

		if State(atomic.LoadInt32(&cb.state)) == StateHalfOpen {
			atomic.AddInt32(&cb.halfOpenReqs, 1)
		}

		failureCount := atomic.LoadInt32(&cb.failureCount)

		if failureCount >= cb.failureThreshold {
			// Transition to OPEN (CB-01)
			cb.setState(StateOpen)
			if cb.mc != nil {
				cb.mc.CounterInc(fmt.Sprintf("vod_engine_circuit_breaker_total{service=%q,state=%q}", cb.name, "open"))
			}
			slog.Warn("circuit_breaker.opened",
				slog.String("service", cb.name),
				slog.Int("failure_count", int(failureCount)),
				slog.Int("threshold", int(cb.failureThreshold)),
				logging.SeverityCritical(),
			)
		}
	}
}

// CountFailures returns the current failure count (for testing/exposition).
func (cb *CircuitBreaker) CountFailures() int32 {
	return atomic.LoadInt32(&cb.failureCount)
}
