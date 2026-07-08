interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  variant = 'primary',
  className = ''
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={className}>
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{
            width: `${percentage}%`,
            background: variant === 'primary' 
              ? 'var(--gradient-primary)'
              : variant === 'success'
              ? 'var(--success)'
              : variant === 'warning'
              ? 'var(--warning)'
              : 'var(--error)'
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}