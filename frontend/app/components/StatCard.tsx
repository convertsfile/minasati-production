import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'secondary';
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'primary',
  className = ''
}: StatCardProps) {
  const colorMap = {
    primary: { bg: 'rgba(124, 58, 237, 0.1)', border: 'var(--primary)' },
    success: { bg: 'rgba(16, 185, 129, 0.1)', border: 'var(--success)' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'var(--warning)' },
    error: { bg: 'rgba(239, 68, 68, 0.1)', border: 'var(--error)' },
    secondary: { bg: 'rgba(59, 130, 246, 0.1)', border: 'var(--secondary)' },
  };

  const colors = colorMap[color];

  return (
    <div
      className="card"
      style={{
        borderColor: colors.border,
        borderWidth: '2px',
        background: `linear-gradient(135deg, ${colors.bg} 0%, var(--surface) 100%)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ 
            color: 'var(--text-muted)', 
            fontSize: '0.875rem', 
            marginBottom: '0.5rem',
            fontWeight: 600
          }}>
            {title}
          </p>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text-primary)'
          }}>
            {value}
          </h3>
          {trend && (
            <p style={{
              fontSize: '0.75rem',
              marginTop: '0.5rem',
              color: trend.isPositive ? 'var(--success)' : 'var(--error)',
              fontWeight: 600
            }}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: 'var(--radius-md)',
            background: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem'
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}