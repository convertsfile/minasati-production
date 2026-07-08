import Link from 'next/link';
import { VideoIcon, UsersIcon } from './Icons';
import Badge from './Badge';
import ProgressBar from './ProgressBar';

interface CourseCardProps {
  id: number;
  title: string;
  description: string;
  pricePoints: number;
  icon?: string;
  enrolledCount?: number;
  progress?: number;
  isPurchased?: boolean;
}

export default function CourseCard({
  id,
  title,
  description,
  pricePoints,
  enrolledCount,
  progress,
  isPurchased = false,
}: CourseCardProps) {
  return (
    <div className="card overflow-hidden">
      <div className="course-card-cover">
        <div className="course-card-cover-icon">
          <VideoIcon size={48} />
        </div>

        <div className="course-card-badge">
          <Badge variant={isPurchased ? 'success' : 'primary'}>
            {isPurchased ? 'مسجل' : `${pricePoints} نقطة`}
          </Badge>
        </div>
      </div>

      <div className="course-card-body">
        <h3 className="course-card-body-title">{title}</h3>

        <p className="course-card-desc">{description}</p>

        <div className="course-card-meta">
          <span className="course-card-meta-item">
            <UsersIcon size={16} />
            {enrolledCount || 0} طالب
          </span>
        </div>

        {isPurchased && progress !== undefined && (
          <div className="course-card-progress">
            <ProgressBar value={progress} showLabel />
          </div>
        )}

        <Link href={`/courses/${id}`} className="btn btn-outline btn-lg btn-outline-cta btn-block">
          {isPurchased ? 'متابعة التعلم' : 'عرض التفاصيل'}
        </Link>
      </div>

      <style jsx>{`
        .card {
          padding: 0;
        }

        .course-card-cover {
          height: 140px;
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .course-card-cover::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        .course-card-cover-icon {
          position: relative;
          z-index: 1;
          opacity: 0.9;
        }

        .course-card-badge {
          position: absolute;
          top: 1rem;
          inset-inline-end: 1rem;
          z-index: 1;
        }

        .course-card-body {
          padding: var(--space-lg);
        }

        .course-card-body-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .course-card-desc {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .course-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .course-card-meta-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .course-card-progress {
          margin-bottom: 1rem;
        }


      `}</style>
    </div>
  );
}
