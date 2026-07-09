import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة | Minassati',
  description: 'لم نعثر على الصفحة التي تبحث عنها.',
};

/**
 * App-level 404 page. Replaces the stock Next.js "This page could
 * not be found" text with a designed surface that uses the
 * project's existing tokens (gradient hero, surface card, primary
 * teal accent) so any future broken link looks intentional rather
 * than a raw framework text leak.
 */
export default function NotFound() {
  return (
    <main className="not-found-shell">
      <div className="not-found-card">
        <div className="not-found-eyebrow" dir="ltr">404</div>
        <h1 className="not-found-title">الصفحة غير موجودة</h1>
        <p className="not-found-subtitle">
          لم نعثر على الصفحة التي تبحث عنها. ربما تم نقلها أو حذفها، أو أن الرابط غير صحيح.
        </p>

        <div className="not-found-actions">
          <Link href="/" className="not-found-btn not-found-btn-primary">
            العودة إلى الرئيسية
          </Link>
          <Link href="/login" className="not-found-btn not-found-btn-ghost">
            تسجيل الدخول
          </Link>
        </div>
      </div>

      <style>{`
        .not-found-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          background: var(--gradient-hero, var(--gradient-primary));
          font-family: var(--font-body, 'IBM Plex Sans Arabic', system-ui, sans-serif);
          direction: rtl;
        }
        .not-found-card {
          width: 100%;
          max-width: 480px;
          background: var(--surface);
          border-radius: var(--radius-xl, 1.25rem);
          padding: 2.75rem 2rem;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(7, 18, 26, 0.45);
          border: 1px solid var(--border);
        }
        .not-found-eyebrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display, 'IBM Plex Sans Arabic', system-ui, sans-serif);
          font-weight: 900;
          font-size: 4rem;
          line-height: 1;
          letter-spacing: -0.04em;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          margin-bottom: 1rem;
        }
        .not-found-title {
          font-family: var(--font-display, 'IBM Plex Sans Arabic', system-ui, sans-serif);
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 0.75rem;
          letter-spacing: -0.01em;
        }
        .not-found-subtitle {
          font-size: 1rem;
          color: var(--text-secondary);
          line-height: 1.8;
          margin: 0 0 2rem;
        }
        .not-found-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: stretch;
        }
        .not-found-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.875rem 1.5rem;
          font-size: 1rem;
          font-weight: 700;
          border-radius: 0.75rem;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          font-family: inherit;
        }
        .not-found-btn-primary {
          background: var(--gradient-primary);
          color: #ffffff;
          box-shadow: 0 10px 25px -10px rgba(11, 79, 108, 0.6);
        }
        .not-found-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px -10px rgba(11, 79, 108, 0.7);
          color: #ffffff;
        }
        .not-found-btn-ghost {
          background: transparent;
          color: var(--primary);
          border: 1.5px solid var(--border);
        }
        .not-found-btn-ghost:hover {
          background: rgba(11, 79, 108, 0.06);
          color: var(--primary);
        }
      `}</style>
    </main>
  );
}
