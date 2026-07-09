'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuthGuard } from '../hooks/useAuthGuard';
import {
  UserIcon,
  BookIcon,
  KeyIcon,
  BellIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CreditCardIcon,
  BarChartIcon,
  ClockIcon,
  CheckIcon,
  AwardIcon,
  TrendingUpIcon,
  GraduationCapIcon,
  WalletIcon,
  SparklesIcon,
  CalendarIcon,
} from '../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Section = 'profile' | 'schedule' | 'exam-results' | 'center-code' | 'notifications';

interface UserData {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  parentPhone: string;
  studentNumber: string;
  school: string;
  governorate: string;
  academicYear: string;
  parentJob: string;
  walletBalance: number;
  status: string;
}

interface ScheduleCourse {
  courseId: number;
  courseTitle: string;
  completedLectures: number;
  totalLectures: number;
  progressPercent: number;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

export default function StudentDashboard() {
  const router = useRouter();
  const { isChecking } = useAuthGuard();

  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [schedule, setSchedule] = useState<ScheduleCourse[]>([]);
  const [examAttempts, setExamAttempts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // 🛑 Audit fix (C-5): explicit error state so the student sees a
  // visible retry card instead of an infinite spinner when /auth/me or
  // the dashboard data endpoints fail.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    if (activeSection === 'notifications' && unreadCount > 0) {
      const markAllAsRead = async () => {
        try {
          const token = getToken();
          if (!token) return;
          const res = await fetch(`${API_URL}/api/notifications/mark-all-read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          });
          if (res.ok) {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
          }
        } catch (e) {
          console.error('Failed to mark all notifications as read', e);
        }
      };
      markAllAsRead();
    }
  }, [activeSection, unreadCount]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const token = getToken();
      if (!token) return;

      // 🛑 Audit fix (C-4): bound the request with a 22s timeout so a dead
      // backend cannot leave the dashboard on a perpetual spinner, while
      // still leaving enough headroom for slow first-paint on cold
      // connections (e.g. dev env warming up Laravel Octane).
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 22000);

      let userRes: Response;
      try {
        userRes = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      } finally {
        // /me is short-lived enough to keep the timeout alive.
      }
      if (userRes.ok) {
        const userDataJson = await userRes.json();
        // /auth/me returns {status:"success", data:UserResource} →
        // UserResource is {success, message, data:User}. Unwrap twice.
        const data = userDataJson?.data?.data ?? userDataJson?.data ?? userDataJson;
        if (data?.status === 'pending') { router.replace('/waiting-room'); return; }
        setUserData({
          ...data,
          fullName: data?.full_name || data?.name || data?.fullName || '',
          studentNumber: data?.student_number || data?.studentNumber || '',
          phone: data?.phone || '',
          parentPhone: data?.parent_phone || data?.parentPhone || '',
          academicYear: data?.academic_year || data?.academicYear || '',
          parentJob: data?.parent_job || data?.parentJob || '',
          school: data?.school || '',
          governorate: data?.governorate || '',
          walletBalance: data?.wallet_balance || data?.balance || data?.walletBalance || 0,
        });
      } else if (userRes.status === 401) {
        // /auth/me is an auth endpoint; honor the global redirect here.
        window.location.href = '/login?session_expired=true';
        return;
      } else {
        setLoadError('تعذّر الوصول إلى بيانات حسابك من الخادم.');
      }

      const progressRes = await fetch(`${API_URL}/api/courses/my-courses`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (progressRes.ok) {
        const progData = await progressRes.json();
        const coursesArray = progData.data?.courses || progData.data || [];
        setSchedule(coursesArray.map((c: any) => {
          const total = parseInt(c.lectures_count ?? c.total_lectures ?? c.totalLectures ?? '0', 10);
          const completed = parseInt(c.completed_lectures_count ?? c.completed_lectures ?? c.completedLectures ?? c.progress_count ?? '0', 10);
          return {
            courseId: c.courseId || c.id,
            courseTitle: c.courseTitle || c.title || c.name,
            completedLectures: completed,
            totalLectures: total,
            progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
          };
        }));
      }

      const notifRes = await fetch(`${API_URL}/api/notifications`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.data?.notifications || notifData.data || []);
        setUnreadCount(notifData.data?.unreadCount || 0);
      }

      const examsRes = await fetch(`${API_URL}/api/exams/my-results`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (examsRes.ok) {
        const examsData = await examsRes.json();
        setExamAttempts(examsData.data || []);
      }
      window.clearTimeout(timeoutId);
    } catch (err: any) {
      console.error("Fetch Data Error:", err);
      setLoadError(
        err?.name === 'AbortError'
          ? 'استغرق تحميل لوحة التحكم وقتاً طويلاً. تحقق من اتصالك وحاول مجدداً.'
          : 'حدث خطأ أثناء تحميل لوحة التحكم.'
      );
    }
    finally { setLoading(false); }
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;
    setProcessing(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/center-codes/redeem`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: redeemCode }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('تم تفعيل الكود بنجاح! الكورس الآن متاح في خطتك.', 'success');
        setCodeSuccess(true);
        setRedeemCode('');
        setTimeout(() => setCodeSuccess(false), 2000);
        fetchData();
      } else {
        showToast(data.error || data.message || 'الكود غير صحيح أو مستخدم مسبقاً', 'error');
      }
    } catch { showToast('خطأ في الاتصال بالخادم، حاول مجدداً', 'error'); }
    finally { setProcessing(false); }
  };

  const initials = (name?: string) => {
    if (!name) return 'م';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  };

  /* ─── Loading ─── */
  // Wait on the auth-guard check, the initial fetch, AND the userData
  // object being non-null. Without the `!userData` clause, the dashboard
  // would render an empty shell with "---" / "م" placeholders for ~3.5s
  // while the API call is in flight. That looked broken in the screenshot
  // audit. Now the full-page spinner is shown until real data arrives.
  if (isChecking || loading || !userData) {
    return (
      <div className="page-container" dir="rtl">
        <Navbar />
        <div className="loading-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner spinner-lg"></div>
        </div>
      </div>
    );
  }

  // 🛑 Audit fix (C-5): when the data endpoints failed but the user
  // object somehow resolved (or the dashboard data is unusable), show a
  // visible retry card instead of an empty shell.
  if (loadError) {
    return (
      <div className="page-container" dir="rtl">
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card bg-white border border-red-100 shadow-xl rounded-3xl max-w-md w-full p-8 text-center">
            <div className="flex justify-center mb-5">
              <AlertCircleIcon size={56} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3">تعذّر تحميل لوحة التحكم</h2>
            <p className="text-gray-600 font-medium leading-relaxed mb-7">{loadError}</p>
            <button
              onClick={() => { setLoadError(null); setLoading(true); fetchData(); }}
              className="btn btn-primary px-6 py-3 font-bold rounded-xl shadow-lg shadow-blue-200"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sections: { id: Section; label: string; icon: ReactNode; count?: number }[] = [
    { id: 'profile', label: 'حسابي', icon: <UserIcon size={19} /> },
    { id: 'schedule', label: 'الكورسات', icon: <BarChartIcon size={19} />, count: schedule.length },
    { id: 'exam-results', label: 'نتائج الاختبارات', icon: <AwardIcon size={19} />, count: examAttempts.length || undefined },
    { id: 'center-code', label: 'تفعيل كود', icon: <KeyIcon size={19} /> },
    { id: 'notifications', label: 'الإشعارات', icon: <BellIcon size={19} />, count: unreadCount || undefined },
  ];

  return (
    <div className="dash" dir="rtl">
      <Navbar />

      <div className={`dash-toast ${toast.visible ? 'dash-toast-show' : ''} ${toast.type === 'success' ? 'dash-toast-ok' : 'dash-toast-err'}`}>
        {toast.type === 'success' ? <CheckCircleIcon size={17} /> : <AlertCircleIcon size={17} />}
        <span>{toast.message}</span>
      </div>

      <div className="dash-layout">
        {/* ═══ SIDEBAR ═══ */}
        <aside className="dash-side">
          <div className="dash-side-top">
            <div className="dash-side-av">{initials(userData?.fullName)}</div>
            <div className="dash-side-user">
              <span className="dash-side-name">{userData?.fullName}</span>
              <span className="dash-side-id">{userData?.studentNumber}</span>
            </div>
          </div>
          <nav className="dash-nav">
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`dash-btn ${activeSection === s.id ? 'dash-btn-on' : ''}`}>
                <span className="dash-btn-icon">{s.icon}</span>
                <span className="dash-btn-label">{s.label}</span>
                {s.count !== undefined && (
                  <span className={`dash-btn-cnt ${activeSection === s.id ? 'dash-btn-cnt-on' : ''}`}>{s.count}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="dash-side-foot">منصتنا</div>
        </aside>

        {/* ═══ MAIN ═══ */}
        <main className="dash-main">
          {activeSection === 'profile' && renderProfile()}
          {activeSection === 'schedule' && renderSchedule()}
          {activeSection === 'exam-results' && renderExamResults()}
          {activeSection === 'center-code' && renderCenterCode()}
          {activeSection === 'notifications' && renderNotifications()}
        </main>
      </div>

      <style jsx>{`
        /* ════════════════════════════════════════
           DASHBOARD  —  منصتنا
           ════════════════════════════════════════ */

        /* ===== LAYOUT ===== */
        .dash {
          min-height: 100vh;
          background: var(--background, #F0F7FA);
          font-family: var(--font-body);
        }
        .dash-layout {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.5rem;
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        /* ===== TOAST ===== */
        .dash-toast {
          position: fixed; top: 1rem; left: 50%;
          transform: translateX(-50%) translateY(-1rem);
          z-index: 9999; padding: 0.65rem 1.25rem;
          border-radius: 10px;
          font-size: 0.85rem; font-weight: 600;
          display: flex; align-items: center; gap: 0.5rem;
          color: #fff; opacity: 0; pointer-events: none;
          transition: all 0.35s ease;
          box-shadow: 0 6px 24px rgba(0,0,0,0.12);
          white-space: nowrap;
        }
        .dash-toast-show { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
        .dash-toast-ok { background: #10B981; }
        .dash-toast-err { background: #EF4444; }

        /* ===== SIDEBAR ===== */
        .dash-side {
          position: sticky; top: 5.5rem;
          background: var(--surface, #fff);
          border: 1px solid var(--border, #DCE5EB);
          border-radius: 18px;
          padding: 1.25rem;
          box-shadow: 0 1px 4px rgba(11,79,108,0.04);
        }
        .dash-side-top {
          display: flex; align-items: center; gap: 0.75rem;
          padding-bottom: 1rem; margin-bottom: 1rem;
          border-bottom: 1px solid var(--border-light, #E8F0F4);
        }
        .dash-side-av {
          width: 44px; height: 44px; min-width: 44px;
          border-radius: 13px;
          background: linear-gradient(135deg, #0B4F6C, #0B7A8A);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 1rem;
          box-shadow: 0 3px 10px rgba(11,79,108,0.2);
        }
        .dash-side-user { display: flex; flex-direction: column; min-width: 0; }
        .dash-side-name {
          font-size: 0.85rem; font-weight: 700;
          color: var(--text-primary, #0A1628);
          word-break: break-word;
          line-height: 1.3;
        }
        .dash-side-id {
          font-size: 0.7rem; color: var(--text-muted, #8A9BAB);
          direction: ltr; text-align: right; font-family: monospace;
        }

        .dash-nav { display: flex; flex-direction: column; gap: 0.25rem; }
        .dash-btn {
          display: flex; align-items: center; gap: 0.75rem;
          width: 100%; padding: 0.7rem 1rem;
          border: none; background: transparent;
          border-radius: 11px;
          font-size: 0.85rem; font-weight: 600;
          font-family: var(--font-body);
          color: var(--text-secondary, #4A5B6E);
          cursor: pointer; transition: all 0.2s ease;
          text-align: right;
        }
        .dash-btn:hover { background: var(--soft-bg, rgba(11,79,108,0.04)); color: var(--primary, #0B4F6C); }
        .dash-btn-on {
          background: linear-gradient(135deg, #0B4F6C, #0B7A8A) !important;
          color: #fff !important;
          box-shadow: 0 3px 12px rgba(11,79,108,0.2);
        }
        .dash-btn-icon { display: flex; flex-shrink: 0; }
        .dash-btn-label { flex: 1; text-align: right; }
        .dash-btn-cnt {
          padding: 0.1rem 0.45rem; border-radius: 99px;
          font-size: 0.65rem; font-weight: 700;
          background: rgba(11,79,108,0.1); color: var(--primary, #0B4F6C);
        }
        .dash-btn-cnt-on { background: rgba(255,255,255,0.2); color: #fff; }
        .dash-side-foot {
          margin-top: 1rem; padding-top: 1rem;
          border-top: 1px solid var(--border-light, #E8F0F4);
          text-align: center; font-size: 0.65rem;
          color: var(--text-muted, #8A9BAB); opacity: 0.5;
        }

        .dash-main { min-height: 50vh; }

        /* ===== SECTION HEADER ===== */
        .sec-head {
          display: flex; align-items: center; gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .sec-head-icon {
          width: 38px; height: 38px; border-radius: 11px;
          background: linear-gradient(135deg, rgba(11,79,108,0.08), rgba(11,122,138,0.08));
          display: flex; align-items: center; justify-content: center;
          color: var(--primary, #0B4F6C); flex-shrink: 0;
        }
        .sec-head-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary, #0A1628); margin: 0; }
        .sec-head-sub { font-size: 0.78rem; color: var(--text-muted, #8A9BAB); margin: 0.1rem 0 0; }
        .notif-pill {
          margin-right: auto;
          padding: 0.2rem 0.6rem; border-radius: 99px;
          font-size: 0.7rem; font-weight: 700;
          background: linear-gradient(135deg, #0B4F6C, #0B7A8A); color: #fff;
        }

        /* ===== EMPTY STATE ===== */
        .empty-s { text-align: center; padding: 3.5rem 1rem; }
        .empty-icon {
          width: 72px; height: 72px; margin: 0 auto 1.25rem;
          border-radius: 18px;
          background: var(--muted-bg, rgba(11,79,108,0.06));
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted, #8A9BAB);
        }
        .empty-s h4 { font-size: 1rem; font-weight: 700; color: var(--text-primary, #0A1628); margin: 0 0 0.35rem; }
        .empty-s p { font-size: 0.82rem; color: var(--text-secondary, #4A5B6E); margin: 0; }

        /* ════════════════════════════════════════
           PROFILE  —  حسابي
           ════════════════════════════════════════ */

        /* Banner */
        .prof-banner {
          position: relative; overflow: hidden;
          border-radius: 20px; padding: 1.5rem 1.75rem;
          margin-bottom: 1.25rem;
          background: linear-gradient(135deg, #0B4F6C 0%, #0B7A8A 60%, #0A5A72 100%);
          box-shadow: 0 6px 24px rgba(11,79,108,0.2);
        }
        .prof-banner-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .prof-banner-blob {
          position: absolute; border-radius: 50%; filter: blur(50px); opacity: 0.2;
        }
        .prof-banner-blob-1 { width: 300px; height: 300px; background: rgba(27,189,212,0.25); top: -40%; right: -10%; }
        .prof-banner-blob-2 { width: 200px; height: 200px; background: rgba(255,255,255,0.08); bottom: -30%; left: -5%; }
        .prof-banner-inner { position: relative; z-index: 2; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .prof-avatar {
          width: 52px; height: 52px; border-radius: 15px;
          background: rgba(255,255,255,0.12); backdrop-filter: blur(10px);
          border: 2px solid rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .prof-avatar-text { font-size: 1.35rem; font-weight: 800; color: #fff; }
        .prof-banner-info { flex: 1; min-width: 0; }
        .prof-greeting { font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0; line-height: 1.3; }
        .prof-meta {
          font-size: 0.78rem; color: rgba(255,255,255,0.7);
          margin: 0.2rem 0 0; display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;
        }
        .prof-dot { opacity: 0.4; }
        .prof-status {
          display: inline-flex; align-items: center; gap: 0.3rem;
          padding: 0.3rem 0.85rem; border-radius: 99px;
          font-size: 0.72rem; font-weight: 600;
        }
        .prof-status-ok { background: rgba(16,185,129,0.18); color: #6EE7B7; border: 1px solid rgba(16,185,129,0.2); }
        .prof-status-wait { background: rgba(245,158,11,0.18); color: #FCD34D; border: 1px solid rgba(245,158,11,0.2); }

        /* Stats */
        .prof-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.85rem; margin-bottom: 1.25rem; }
        .pstat {
          background: var(--surface, #fff);
          border: 1px solid var(--border, #DCE5EB);
          border-radius: 16px; padding: 1rem 1rem;
          display: flex; align-items: center; gap: 0.85rem;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(11,79,108,0.04);
        }
        .pstat:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(11,79,108,0.08); }
        .pstat-icon {
          width: 44px; height: 44px; min-width: 44px;
          border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
        }
        .pstat-icon-wallet { background: rgba(11,79,108,0.08); color: var(--primary, #0B4F6C); }
        .pstat-icon-book { background: rgba(27,189,212,0.08); color: var(--accent, #1BBDD4); }
        .pstat-icon-bell { background: rgba(245,158,11,0.08); color: var(--warning, #F59E0B); }
        .pstat-body { display: flex; flex-direction: column; gap: 0.1rem; }
        .pstat-num { font-size: 1.5rem; font-weight: 800; color: var(--text-primary, #0A1628); line-height: 1.1; }
        .pstat-unit { font-size: 0.7rem; font-weight: 600; color: var(--text-muted, #8A9BAB); margin-right: 0.2rem; }
        .pstat-label { font-size: 0.72rem; color: var(--text-muted, #8A9BAB); font-weight: 500; }

        /* Personal Info — Table Style */
        .pinfo {
          background: var(--surface, #fff);
          border: 1px solid var(--border, #DCE5EB);
          border-radius: 18px; overflow: hidden;
          box-shadow: 0 1px 3px rgba(11,79,108,0.04);
        }
        .pinfo-head {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.9rem 1.25rem;
          border-bottom: 1px solid var(--border, #DCE5EB);
          font-weight: 700; color: var(--text-primary, #0A1628);
          background: var(--soft-bg, rgba(11,79,108,0.02));
        }
        .pinfo-head svg { color: var(--primary, #0B4F6C); }
        .pinfo-head h3 { font-size: 0.9rem; font-weight: 700; color: var(--text-primary, #0A1628); margin: 0; }
        .pinfo-table { width: 100%; }
        .pinfo-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid var(--border, #DCE5EB);
        }
        .pinfo-row:last-child {
          border-bottom: none;
        }
        .pinfo-cell {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          padding: 0.85rem 1.25rem;
          min-width: 0;
          border-left: 1px solid var(--border, #DCE5EB);
        }
        .pinfo-cell:last-child {
          border-left: none;
        }
        .pinfo-label {
          font-size: 0.68rem;
          color: var(--text-muted, #8A9BAB);
          font-weight: 600;
        }
        .pinfo-val {
          font-size: 0.9rem;
          color: var(--text-primary, #0A1628);
          font-weight: 600;
          word-break: break-word;
        }

        /* ════════════════════════════════════════
           SCHEDULE  —  الكورسات
           ════════════════════════════════════════ */
        .sched-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .sched-card {
          background: var(--surface, #fff);
          border: 1px solid var(--border, #DCE5EB);
          border-radius: 16px; padding: 1.15rem 1.25rem;
          transition: all 0.3s var(--ease-out);
          box-shadow: 0 1px 3px rgba(11,79,108,0.04);
          position: relative;
        }
        .sched-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(11,79,108,0.1);
          border-color: rgba(27,189,212,0.2);
        }
        .sched-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
        .sched-num {
          width: 32px; height: 32px; min-width: 32px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0B4F6C, #0B7A8A);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 800;
          box-shadow: 0 2px 8px rgba(11,79,108,0.2);
        }
        .sched-info { flex: 1; min-width: 0; }
        .sched-title { font-size: 0.92rem; font-weight: 700; color: var(--text-primary, #0A1628); margin: 0; }
        .sched-meta { font-size: 0.72rem; color: var(--text-muted, #8A9BAB); }
        .sched-pct {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 48px; padding: 0.25rem 0.5rem;
          border-radius: 99px;
          font-size: 0.85rem; font-weight: 800;
          background: rgba(11,79,108,0.06); color: var(--primary, #0B4F6C);
        }
        .sched-bar-track { height: 6px; background: var(--border-light, #E8F0F4); border-radius: 99px; overflow: hidden; margin-top: 0.5rem; }
        .sched-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #0B7A8A, #1BBDD4); transition: width 0.8s ease; }
        .sched-done {
          position: absolute; top: 0.65rem; left: 0.65rem;
          display: inline-flex; align-items: center; gap: 0.25rem;
          padding: 0.2rem 0.6rem; border-radius: 99px;
          font-size: 0.65rem; font-weight: 700;
          background: rgba(16,185,129,0.1); color: #10B981;
          border: 1px solid rgba(16,185,129,0.2);
        }

        /* ════════════════════════════════════════
           CODE  —  تفعيل كود
           ════════════════════════════════════════ */
        .code-wrap { display: flex; justify-content: center; padding-top: 0.5rem; }
        .code-box {
          background: var(--surface, #fff);
          border: 1px solid var(--border, #DCE5EB);
          border-radius: 20px; padding: 2rem 2rem;
          text-align: center; max-width: 420px; width: 100%;
          box-shadow: 0 2px 12px rgba(11,79,108,0.05);
        }
        .code-badge {
          width: 64px; height: 64px; margin: 0 auto 1.25rem;
          border-radius: 18px;
          background: linear-gradient(135deg, #0B4F6C, #0B7A8A);
          display: flex; align-items: center; justify-content: center;
          color: #fff; box-shadow: 0 6px 20px rgba(11,79,108,0.2);
        }
        .code-title { font-size: 1.15rem; font-weight: 700; color: var(--text-primary, #0A1628); margin: 0 0 0.35rem; }
        .code-desc { font-size: 0.82rem; color: var(--text-secondary, #4A5B6E); margin: 0 0 1.5rem; }
        .code-form { display: flex; flex-direction: column; gap: 0.85rem; }
        .code-inp-wrap { position: relative; }
        .code-inp {
          width: 100%; padding: 0.85rem 1rem;
          border: 2px solid var(--border, #DCE5EB);
          border-radius: 12px;
          font-family: 'Courier New', monospace;
          font-size: 1.35rem; font-weight: 700;
          letter-spacing: 0.12em; text-align: center;
          background: var(--background, #F0F7FA);
          color: var(--text-primary, #0A1628);
          outline: none; transition: all 0.25s;
          direction: ltr;
        }
        .code-inp:focus { border-color: var(--accent, #1BBDD4); box-shadow: 0 0 0 3px rgba(27,189,212,0.1); background: var(--surface, #fff); }
        .code-inp::placeholder { font-size: 0.85rem; letter-spacing: 0.08em; color: var(--text-muted, #8A9BAB); }
        .code-ok { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #10B981; }
        .code-btn {
          width: 100%; padding: 0.9rem 1.5rem;
          border: 2px solid rgba(255,255,255,0.15); border-radius: 14px;
          font-size: 1rem; font-weight: 700;
          font-family: var(--font-body);
          color: #fff;
          background: linear-gradient(135deg, #0B4F6C, #0B7A8A);
          cursor: pointer; transition: all 0.3s var(--ease-out);
          box-shadow: 0 4px 16px rgba(11,79,108,0.25);
          position: relative; overflow: hidden;
        }
        .code-btn::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent);
          pointer-events: none;
        }
        .code-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(11,79,108,0.35);
          border-color: rgba(255,255,255,0.3);
        }
        .code-btn:active:not(:disabled) { transform: scale(0.97); }
        .code-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .code-btn-ok { background: linear-gradient(135deg, #10B981, #059669) !important; box-shadow: 0 4px 16px rgba(16,185,129,0.3) !important; border-color: transparent !important; }
        .code-btn-inner { display: inline-flex; align-items: center; gap: 0.4rem; justify-content: center; }
        .code-foot { font-size: 0.68rem; color: var(--text-muted, #8A9BAB); margin: 1rem 0 0; }
        .sp16 { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }

        /* ════════════════════════════════════════
           NOTIFICATIONS  —  الإشعارات
           ════════════════════════════════════════ */
        .notif-list { display: flex; flex-direction: column; gap: 0.625rem; }
        .notif-row {
          background: var(--surface, #fff);
          border: 1px solid var(--border, #DCE5EB);
          border-radius: 14px;
          padding: 1rem 1.15rem;
          transition: all 0.25s ease;
          box-shadow: 0 1px 3px rgba(11,79,108,0.03);
          position: relative;
        }
        .notif-row:hover {
          box-shadow: 0 3px 12px rgba(11,79,108,0.08);
          border-color: var(--primary-light, #1A6B8A);
        }
        .notif-unread {
          border-color: var(--accent, #1BBDD4);
          background: linear-gradient(135deg, var(--surface, #fff), rgba(27,189,212,0.03));
        }
        .notif-read { opacity: 0.7; }
        .notif-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.35rem; }
        .notif-title { font-size: 0.85rem; font-weight: 700; color: var(--text-primary, #0A1628); margin: 0; }
        .notif-time { font-size: 0.68rem; color: var(--text-muted, #8A9BAB); white-space: nowrap; flex-shrink: 0; }
        .notif-text { font-size: 0.8rem; color: var(--text-secondary, #4A5B6E); margin: 0; line-height: 1.65; }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 1024px) {
          .dash-layout { grid-template-columns: 1fr; padding: 1rem; gap: 1rem; }
          .dash-side { position: relative; top: 0; }
          .dash-nav { flex-direction: row; flex-wrap: wrap; gap: 0.3rem; }
          .dash-btn { flex: 1; min-width: calc(50% - 0.2rem); justify-content: center; padding: 0.6rem; font-size: 0.78rem; }
          .dash-btn-label { text-align: center; }
          .dash-side-foot { display: none; }
          .prof-stats { gap: 0.65rem; }
          .pinfo-row { grid-template-columns: 1fr; }
          .pinfo-cell { border-left: none !important; border-bottom: 1px solid var(--border, #DCE5EB); }
          .pinfo-cell:last-child { border-bottom: none; }
        }
        @media (max-width: 640px) {
          .dash-layout { padding: 0.75rem; }
          .dash-btn { min-width: calc(50% - 0.2rem); padding: 0.5rem; font-size: 0.72rem; }
          .dash-side-top {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1rem;
            border-bottom: 1px solid var(--border-light, #E8F0F4);
            padding-bottom: 0.75rem;
          }
          .prof-banner { padding: 1.15rem; }
          .prof-avatar { width: 44px; height: 44px; border-radius: 12px; }
          .prof-avatar-text { font-size: 1.1rem; }
          .prof-greeting { font-size: 1.05rem; }
          .prof-status { width: 100%; justify-content: center; }
          .prof-stats { grid-template-columns: 1fr; gap: 0.5rem; }
          .sched-card { padding: 0.85rem 1rem; }
          .code-box { padding: 1.5rem 1.25rem; }
          .code-inp { font-size: 1.1rem; }
          .notif-row { padding: 0.75rem 0.85rem; }
        }

        /* ===== CUSTOM NOTIF ITERATION HOVER ===== */
        .notif-item:hover {
          background-color: var(--soft-bg-hover, rgba(11,79,108,0.06)) !important;
        }
        .notif-unread-state {
          background-color: rgba(27, 189, 212, 0.02);
        }
        .notif-read-state {
          opacity: 0.85;
        }
      `}</style>
    </div>
  );

  /* ════════════════════════════════════════
     PROFILE
     ════════════════════════════════════════ */
  function renderProfile() {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Personal Info - Modern Table Layout */}
        <div className="pinfo card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
          <div className="pinfo-head flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <UserIcon size={20} className="text-primary" />
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)', margin: 0 }}>البيانات الشخصية</h3>
          </div>
          
          <div className="table-container" style={{ margin: 0, border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <table className="table" style={{ margin: 0, borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="font-bold text-sm" style={{ padding: '1rem 1.25rem', width: '30%', backgroundColor: 'var(--soft-bg)', color: 'var(--text-secondary)' }}>الاسم الكامل</td>
                  <td className="text-sm font-semibold" style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }}>{userData?.fullName || '---'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="font-bold text-sm" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--soft-bg)', color: 'var(--text-secondary)' }}>رقم الهاتف</td>
                  <td className="text-sm font-mono" style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }} dir="ltr">{userData?.phone || '---'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="font-bold text-sm" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--soft-bg)', color: 'var(--text-secondary)' }}>رقم هاتف ولي الأمر</td>
                  <td className="text-sm font-mono" style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }} dir="ltr">{userData?.parentPhone || '---'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="font-bold text-sm" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--soft-bg)', color: 'var(--text-secondary)' }}>السنة الدراسية</td>
                  <td className="text-sm font-semibold" style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }}>{userData?.academicYear || '---'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="font-bold text-sm" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--soft-bg)', color: 'var(--text-secondary)' }}>المدرسة</td>
                  <td className="text-sm font-semibold" style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }}>{userData?.school || '---'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="font-bold text-sm" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--soft-bg)', color: 'var(--text-secondary)' }}>المحافظة</td>
                  <td className="text-sm font-semibold" style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }}>{userData?.governorate || '---'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="font-bold text-sm" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--soft-bg)', color: 'var(--text-secondary)' }}>وظيفة ولي الأمر</td>
                  <td className="text-sm font-semibold" style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }}>{userData?.parentJob || '---'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="font-bold text-sm" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--soft-bg)', color: 'var(--text-secondary)' }}>حالة الحساب</td>
                  <td className="text-sm font-semibold" style={{ padding: '1rem 1.25rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '99px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      backgroundColor: userData?.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                      color: userData?.status === 'active' ? '#10B981' : '#F59E0B',
                      border: userData?.status === 'active' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(245,158,11,0.2)'
                    }}>
                      {userData?.status === 'active' ? 'نشط' : 'معلق'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="font-bold text-sm" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--soft-bg)', color: 'var(--text-secondary)' }}>رصيد المحفظة</td>
                  <td className="text-sm font-bold" style={{ padding: '1rem 1.25rem', color: 'var(--primary)' }}>
                    {userData?.walletBalance || 0} ج.م
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════
     SCHEDULE
     ════════════════════════════════════════ */
  function renderSchedule() {
    return (
      <div className="animate-fade-in">
        <div className="sec-head">
          <div className="sec-head-icon"><BarChartIcon size={17} /></div>
          <div>
            <h3 className="sec-head-title">كورساتي</h3>
            <p className="sec-head-sub">تابع تقدمك وابدأ حضور محاضراتك</p>
          </div>
        </div>

        {schedule.length === 0 ? (
          <div className="empty-s card">
            <div className="empty-icon"><BookIcon size={40} /></div>
            <h4>لم تشترك في أي كورس بعد</h4>
            <p>فعّل كود السنتر المطبوع أو اشترك في الكورسات المتاحة للبدء فوراً.</p>
          </div>
        ) : (
          <div className="sched-list">
            {schedule.map((item, idx) => (
              <div key={item.courseId} className="sched-card card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="sched-icon-box" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--soft-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <BookIcon size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-base" style={{ color: 'var(--text-primary)', margin: 0 }}>{item.courseTitle}</h4>
                      <p className="text-xs text-muted" style={{ margin: '0.25rem 0 0' }}>تم إنجاز {item.completedLectures} من أصل {item.totalLectures} محاضرة</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="font-bold text-lg" style={{ color: 'var(--primary)' }}>{item.progressPercent}%</span>
                  </div>
                </div>

                <div className="sched-progress-container" style={{ width: '100%' }}>
                  <div className="sched-bar-track" style={{ height: '8px', background: 'var(--border-light)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div className="sched-bar-fill" style={{ width: `${item.progressPercent}%`, height: '100%', borderRadius: '999px', background: 'var(--gradient-accent)' }} />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ClockIcon size={14} />
                    {item.progressPercent === 100 ? 'مكتمل بنسبة 100%' : 'قيد الدراسة'}
                  </span>
                  
                  <Link href={`/courses/${item.courseId}`} className="btn btn-sm btn-primary" style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem' }}>
                    متابعة التعلم
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ─── EXAM RESULTS ─── */
  function renderExamResults() {
    return (
      <div className="animate-fade-in">
        <div className="sec-head">
          <div className="sec-head-icon"><AwardIcon size={17} /></div>
          <div>
            <h3 className="sec-head-title">نتائج الاختبارات</h3>
            <p className="sec-head-sub">استعرض درجاتك وراجع أخطاءك في الامتحانات السابقة</p>
          </div>
        </div>

        {examAttempts.length === 0 ? (
          <div className="empty-s card">
            <div className="empty-icon"><AwardIcon size={40} /></div>
            <h4>لا توجد نتائج اختبارات بعد</h4>
            <p>عندما تنهي أي اختبار، ستظهر تفاصيل درجاتك وإجاباتك هنا.</p>
          </div>
        ) : (
          <div className="table-container" style={{ margin: 0, border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table" style={{ margin: 0, borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: 'var(--soft-bg)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 'bold' }}>الكورس</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 'bold' }}>المحاضرة</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>النموذج</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>الدرجة</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>الحالة</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>تاريخ المحاولة</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>العمليات</th>
                  </tr>
                </thead>
                <tbody>
                  {examAttempts.map((attempt) => (
                    <tr key={attempt.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td className="text-sm font-semibold" style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }}>{attempt.courseTitle}</td>
                      <td className="text-sm font-semibold" style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }}>{attempt.lectureTitle}</td>
                      <td className="text-sm text-center" style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>#{attempt.formIndex}</td>
                      <td className="text-sm font-bold text-center" style={{ padding: '1rem 1.25rem', color: 'var(--primary)' }}>{attempt.score}%</td>
                      <td className="text-sm text-center" style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '99px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          backgroundColor: attempt.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: attempt.passed ? '#10B981' : '#EF4444',
                          border: attempt.passed ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)'
                        }}>
                          {attempt.passed ? 'ناجح' : 'راسب'}
                        </span>
                      </td>
                      <td className="text-sm text-center" style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                        {new Date(attempt.completedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                      </td>
                      <td className="text-sm text-center" style={{ padding: '1rem 1.25rem' }}>
                        <Link href={`/exams/${attempt.lectureId}?review=true&attempt_id=${attempt.id}`} className="btn btn-sm btn-outline">
                          مراجعة
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════
     CENTER CODE
     ════════════════════════════════════════ */
  function renderCenterCode() {
    return (
      <div className="code-wrap animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%' }}>
        <div className="code-box card" style={{ padding: '2.5rem 2rem', border: '1px solid var(--border)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="code-badge" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <KeyIcon size={28} />
          </div>
          <h3 className="code-title" style={{ fontSize: '1.25rem', fontWeight: 800, textAlign: 'center', margin: '0 0 0.5rem' }}>تفعيل كود السنتر</h3>
          <p className="code-desc" style={{ textAlign: 'center', margin: '0 0 1.5rem' }}>أدخل كود التفعيل المطبوع المكون من 12 رقماً لفتح كورس أو محاضرة جديدة.</p>
          <form onSubmit={handleRedeemCode} className="code-form" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
            <div className="code-inp-wrap" style={{ width: '100%', maxWidth: '340px', position: 'relative' }}>
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className="code-inp"
                required dir="ltr" maxLength={14}
                style={{
                  width: '100%',
                  border: '2px solid var(--border)',
                  borderRadius: '14px',
                  padding: '0.85rem 1rem',
                  fontSize: '1.4rem',
                  fontFamily: 'Courier New, monospace',
                  textAlign: 'center',
                  letterSpacing: '0.1em',
                  fontWeight: 'bold',
                  background: 'var(--soft-bg)',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
              />
              {codeSuccess && <span className="code-ok" style={{ left: '1.25rem' }}><CheckIcon size={20} /></span>}
            </div>
            <button
              type="submit"
              disabled={processing || !redeemCode.trim()}
              style={{
                width: '100%',
                maxWidth: '220px',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                color: '#fff',
                background: codeSuccess 
                  ? 'linear-gradient(135deg, #10B981, #059669)' 
                  : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                border: 'none',
                cursor: processing || !redeemCode.trim() ? 'not-allowed' : 'pointer',
                boxShadow: codeSuccess 
                  ? '0 4px 12px rgba(16,185,129,0.25)' 
                  : '0 4px 12px rgba(11,79,108,0.2)',
                transition: 'all 0.3s ease',
                opacity: processing || !redeemCode.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {processing ? (
                <>
                  <span style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block'
                  }} />
                  جاري التحقق...
                </>
              ) : codeSuccess ? (
                <>
                  <CheckIcon size={14} />
                  تم التفعيل!
                </>
              ) : (
                'تفعيل الكود'
              )}
            </button>
          </form>
          <p className="code-foot" style={{ marginTop: '1.25rem' }}>مثال للكود المقبول: 1234-5678-9012</p>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════
     NOTIFICATIONS
     ════════════════════════════════════════ */
  function renderNotifications() {
    return (
      <div className="animate-fade-in">
        <div className="sec-head">
          <div className="sec-head-icon"><BellIcon size={17} /></div>
          <div>
            <h3 className="sec-head-title">الإشعارات</h3>
            <p className="sec-head-sub">آخر التحديثات والتنبيهات المستلمة</p>
          </div>
          {unreadCount > 0 && <span className="notif-pill">{unreadCount}</span>}
        </div>

        {notifications.length === 0 ? (
          <div className="empty-s card">
            <div className="empty-icon"><BellIcon size={40} /></div>
            <h4>صندوق الوارد فارغ</h4>
            <p>لا توجد إشعارات جديدة أو تنبيهات في الوقت الحالي.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div className="notif-list-container" style={{ display: 'flex', flexDirection: 'column' }}>
              {notifications.map((n, idx) => (
                <div 
                  key={n.id} 
                  className={`notif-item ${n.read ? 'notif-read-state' : 'notif-unread-state'}`}
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: idx === notifications.length - 1 ? 'none' : '1px solid var(--border)',
                    display: 'flex',
                    gap: '1.25rem',
                    transition: 'all 0.25s ease',
                    position: 'relative'
                  }}
                >
                  {/* Indicator Dot */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '0.3rem' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: n.read ? 'var(--text-muted)' : 'var(--accent)',
                      boxShadow: n.read ? 'none' : '0 0 8px var(--accent)',
                      flexShrink: 0
                    }} />
                  </div>
                  
                  {/* Notification Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{n.title}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(n.createdAt)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.65' }}>{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}
