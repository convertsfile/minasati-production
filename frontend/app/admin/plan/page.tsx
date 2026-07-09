'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { TrendingUpIcon, UsersIcon, DownloadIcon, VideoIcon, KeyIcon, MessageIcon, AwardIcon, AlertTriangleIcon } from '../../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface LimitInfo {
  plan: string;
  planName: string;
  students: { current: number; max: number; percentage: number };
  storage: { current_bytes: number; max_bytes: number; percentage: number };
  warning: boolean;
}

export default function AdminPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [limits, setLimits] = useState<LimitInfo | null>(null);

  useEffect(() => {
    checkAdminAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAuth = async () => {
    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const authRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (!authRes.ok) {
        router.push('/login');
        return;
      }

      const userData = await authRes.json();
      const user = userData.data?.user || userData.data || userData;
      const isAdmin = user?.is_admin === true || user?.is_admin === 1 || user?.isAdmin === true || user?.role === 'admin';

      if (!isAdmin) {
        router.push('/');
        return;
      }

      setAuthorized(true);
      fetchPlanLimits(token);
    } catch {
      router.push('/login');
    }
  };

  const fetchPlanLimits = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/limits`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setLimits(data.data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch plan limits:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="spinner spinner-lg" />
        </main>
      </div>
    );
  }

  if (!authorized || !limits) {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 75) return '#f59e0b';
    return '#10b981';
  };

  const getAllowedQualities = (plan: string): string[] => {
    if (plan === 'professional') {
      return ['480p (SD)', '720p (HD)'];
    }
    return ['480p (SD)'];
  };

  const whatsappLink = "https://api.whatsapp.com/send/?phone=201067473845&text=%D8%AD%D8%A7%D8%A8%D8%A8+%D8%A7%D8%B1%D9%81%D8%B9+%D8%A7%D9%84%D8%A8%D8%A7%D9%82%D8%A9&type=phone_number&app_absent=0";

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-content">
        <div className="max-w-3xl mx-auto">
          
          <div className="page-header">
            <h1 className="page-title">
              <AwardIcon size={28} />
              باقة المنصة واستهلاك الموارد
            </h1>
            <p className="page-subtitle">
              تتبع استهلاك الموارد المتاحة في باقتك الحالية وتواصل معنا للترقية لتجنب التوقف.
            </p>
          </div>

          <div className="card mb-8 overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--gradient-primary), #0B4F6C)', color: 'white', border: 'none' }}>
            <div className="relative" style={{ zIndex: 1 }}>
              <div className="absolute top-[-20px] left-[-20px] w-[120px] h-[120px] rounded-full" style={{ background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <p className="text-sm uppercase tracking-wider opacity-85 mb-1">الباقة الحالية للمنصة</p>
                  <h2 className="text-3xl font-extrabold m-0">{limits.planName}</h2>
                </div>
                <div className="flex items-center gap-2 py-3 px-5 rounded-lg font-semibold text-sm" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <KeyIcon size={16} />
                  باقة مدارة برمجياً
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 mb-8">
            
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg flex items-center gap-2">
                  <UsersIcon size={20} />
                  عدد الطلاب المشتركين
                </span>
                <span className="font-semibold text-muted">
                  {limits.students.current} / {limits.students.max} طالب
                </span>
              </div>
              <div className="h-3 rounded-full mb-3" style={{ background: 'var(--background)', overflow: 'hidden' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(limits.students.percentage, 100)}%`, background: getPercentageColor(limits.students.percentage) }} />
              </div>
              <div className="flex justify-between text-sm text-muted">
                <span>نسبة الاستهلاك: {limits.students.percentage.toFixed(1)}%</span>
                {limits.students.percentage >= 80 && (
                  <span className="flex items-center gap-1 font-bold" style={{ color: '#ef4444' }}>
                    <AlertTriangleIcon size={14} />
                    قارب حد الطلاب على النفاد!
                  </span>
                )}
              </div>
            </div>

            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg flex items-center gap-2">
                  <DownloadIcon size={20} />
                  المساحة المستخدمة للفيديوهات
                </span>
                <span className="font-semibold text-muted">
                  {formatBytes(limits.storage.current_bytes)} / {formatBytes(limits.storage.max_bytes)}
                </span>
              </div>
              <div className="h-3 rounded-full mb-3" style={{ background: 'var(--background)', overflow: 'hidden' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(limits.storage.percentage, 100)}%`, background: getPercentageColor(limits.storage.percentage) }} />
              </div>
              <div className="flex justify-between text-sm text-muted">
                <span>نسبة الاستهلاك: {limits.storage.percentage.toFixed(1)}%</span>
                {limits.storage.percentage >= 80 && (
                  <span className="flex items-center gap-1 font-bold" style={{ color: '#ef4444' }}>
                    <AlertTriangleIcon size={14} />
                    قاربت المساحة التخزينية على الامتلاء!
                  </span>
                )}
              </div>
            </div>

          </div>

          <div className="card p-6 mb-8">
            <h3 className="font-bold text-lg mb-5 flex items-center gap-2">
              <VideoIcon size={20} />
              ميزات التشفير والبث المتاحة
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted">جودة تشفير الفيديوهات:</span>
                <div className="flex gap-2">
                  {getAllowedQualities(limits.plan).map((q, idx) => (
                    <span key={idx} className="badge text-sm" style={{ background: 'rgba(11, 79, 108, 0.1)', color: 'var(--primary)' }}>
                      {q}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted">وضع التخزين السحابي:</span>
                <span className="font-semibold flex items-center gap-1">
                  Backblaze B2 مع شبكة Cloudflare CDN <TrendingUpIcon size={16} />
                </span>
              </div>
            </div>
          </div>

          <div className="card p-8 text-center" style={{ border: '1px dashed #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
            <h3 className="font-extrabold text-xl mb-2" style={{ color: '#047857' }}>
              هل ترغب في ترقية باقتك أو تعديل الموارد؟
            </h3>
            <p className="text-muted text-sm mb-6 max-w-lg mx-auto">
              تستطيع رفع باقتك في أي وقت لتوفير مساحة لرفع محاضرات أكثر، أو زيادة أعداد الطلاب الذين يمكنهم التسجيل في منصتك.
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn inline-flex items-center gap-3 text-white font-bold text-base no-underline shadow-lg hover:-translate-y-0.5 transition-all"
              style={{ background: '#10b981', padding: '0.75rem 2rem' }}
            >
              <MessageIcon size={20} />
              تواصل معنا على الواتساب لترقية الباقة
            </a>
          </div>

        </div>
      </main>
    </div>
  );
}
