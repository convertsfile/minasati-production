'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
import api from '@/lib/axios'; // 🚀 العميل الذكي
import { 
  TrendingUpIcon, UsersIcon, DownloadIcon, 
  VideoIcon, KeyIcon, MessageIcon, 
  AwardIcon, AlertTriangleIcon, CheckCircleIcon, AlertCircleIcon 
} from '../../components/Icons';

interface LimitInfo {
  plan: string;
  planName: string;
  students: { current: number; max: number; percentage: number };
  storage: { current_bytes: number; max_bytes: number; percentage: number };
  warning: boolean;
}

export default function AdminPlanPage() {
  const router = useRouter();
  
  // 🚀 درع الحماية: يطرد أي شخص ليس أدمن فوراً ويعرض شاشة التحميل
  const { isChecking } = useAuthGuard(['admin']);
  
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<LimitInfo | null>(null);

  // 🚀 نظام التنبيهات الموحد والاحترافي بدلاً من الدالة الوهمية
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  useEffect(() => {
    // 🚀 لا نطلب البيانات إلا بعد التأكد من أن المستخدم أدمن
    if (!isChecking) {
      fetchPlanLimits();
    }
  }, [isChecking]);

  const fetchPlanLimits = async () => {
    try {
      const response: any = await api.get('/admin/limits');
      const data = response.data || response;
      
      if (data) {
        // 🚀 تنظيف وتوحيد البيانات (Sanitization) لمنع مشكلة NaN نهائياً
        const safeLimits: LimitInfo = {
          plan: data.plan || 'startup',
          planName: data.planName || data.plan_name || 'باقة النشأة',
          students: {
            current: Number(data.students?.current) || 0,
            max: Number(data.students?.max) || 1, // لمنع القسمة على صفر
            percentage: Number(data.students?.percentage) || 0,
          },
          storage: {
            // دعم كلا التسميتين من الباك إند
            current_bytes: Number(data.storage?.current_bytes ?? data.storage?.currentBytes) || 0,
            max_bytes: Number(data.storage?.max_bytes ?? data.storage?.maxBytes) || 1,
            percentage: Number(data.storage?.percentage) || 0,
          },
          warning: !!data.warning
        };
        setLimits(safeLimits);
      }
    } catch (e: any) {
      console.error('Failed to fetch plan limits:', e);
      showToast('تعذر جلب بيانات الباقة، يرجى تحديث الصفحة', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 دالة ذكية تحمي من أي قيمة غير صالحة
  const formatBytes = (bytes: any): string => {
    const num = Number(bytes);
    if (isNaN(num)) return '0.00 GB';
    const gb = num / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const getPercentageColor = (percentage: number): string => {
    if (isNaN(percentage)) return '#10b981'; // حماية إضافية
    if (percentage >= 90) return '#ef4444'; // أحمر (خطر)
    if (percentage >= 75) return '#f59e0b'; // برتقالي (تحذير)
    return '#10b981'; // أخضر (آمن)
  };

  const getAllowedQualities = (plan: string): string[] => {
    if (plan === 'professional' || plan === 'enterprise') {
      return ['480p (SD)', '720p (HD)', '1080p (FHD)'];
    }
    return ['480p (SD)'];
  };

  const whatsappLink = "https://api.whatsapp.com/send/?phone=201067473845&text=%D8%AD%D8%A7%D8%A8%D8%A8+%D8%A7%D8%B1%D9%81%D8%B9+%D8%A7%D9%84%D8%A8%D8%A7%D9%82%D8%A9&type=phone_number&app_absent=0";

  if (isChecking || loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="spinner spinner-lg mb-4 mx-auto" />
            <p className="text-muted font-bold">جاري تحميل بيانات الاستهلاك...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!limits) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangleIcon size={48} className="mx-auto mb-4 text-error opacity-50" />
            <p className="text-error font-bold text-lg">حدث خطأ في جلب بيانات الباقة.</p>
            <button onClick={() => window.location.reload()} className="btn btn-outline mt-4 font-bold">
              تحديث الصفحة
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      <AdminSidebar />

      {/* 🚀 إشعار عائم في أعلى منتصف الشاشة */}
      <div 
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
        style={{ 
          opacity: toast.visible ? 1 : 0, 
          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
          pointerEvents: toast.visible ? 'auto' : 'none' 
        }}
      >
        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
          <span>{toast.message}</span>
        </div>
      </div>

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

          <div className="card mb-8 overflow-hidden relative shadow-md" style={{ background: 'linear-gradient(135deg, var(--gradient-primary), #0B4F6C)', color: 'white', border: 'none' }}>
            <div className="relative" style={{ zIndex: 1 }}>
              <div className="absolute top-[-20px] left-[-20px] w-[120px] h-[120px] rounded-full" style={{ background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <p className="text-sm uppercase tracking-wider opacity-85 mb-1 font-bold">الباقة الحالية للمنصة</p>
                  <h2 className="text-3xl font-extrabold m-0">{limits.planName}</h2>
                </div>
                <div className="flex items-center gap-2 py-3 px-5 rounded-lg font-semibold text-sm" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <KeyIcon size={16} />
                  باقة مدارة برمجياً (Enterprise)
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 mb-8">
            {/* قسم الطلاب */}
            <div className="card p-6 shadow-sm border border-gray-100 bg-white rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg flex items-center gap-2 text-gray-800">
                  <UsersIcon size={20} className="text-primary" />
                  عدد الطلاب المشتركين
                </span>
                <span className="font-semibold text-gray-600 font-mono bg-gray-50 px-3 py-1 rounded-lg" dir="ltr">
                  {limits.students.current} / {limits.students.max}
                </span>
              </div>
              <div className="h-3 rounded-full mb-3" style={{ background: 'var(--soft-bg)', overflow: 'hidden' }}>
                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(limits.students.percentage || 0, 100)}%`, background: getPercentageColor(limits.students.percentage) }} />
              </div>
              <div className="flex justify-between text-sm font-bold text-muted">
                <span>نسبة الاستهلاك: {(limits.students.percentage || 0).toFixed(1)}%</span>
                {limits.students.percentage >= 80 && (
                  <span className="flex items-center gap-1 font-bold text-error animate-pulse">
                    <AlertTriangleIcon size={14} />
                    قارب حد الطلاب على النفاد!
                  </span>
                )}
              </div>
            </div>

            {/* قسم التخزين */}
            <div className="card p-6 shadow-sm border border-gray-100 bg-white rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg flex items-center gap-2 text-gray-800">
                  <DownloadIcon size={20} className="text-secondary" />
                  المساحة المستخدمة للفيديوهات
                </span>
                <span className="font-semibold text-gray-600 font-mono bg-gray-50 px-3 py-1 rounded-lg" dir="ltr">
                  {formatBytes(limits.storage.current_bytes)} / {formatBytes(limits.storage.max_bytes)}
                </span>
              </div>
              <div className="h-3 rounded-full mb-3" style={{ background: 'var(--soft-bg)', overflow: 'hidden' }}>
                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(limits.storage.percentage || 0, 100)}%`, background: getPercentageColor(limits.storage.percentage) }} />
              </div>
              <div className="flex justify-between text-sm font-bold text-muted">
                <span>نسبة الاستهلاك: {(limits.storage.percentage || 0).toFixed(1)}%</span>
                {limits.storage.percentage >= 80 && (
                  <span className="flex items-center gap-1 font-bold text-error animate-pulse">
                    <AlertTriangleIcon size={14} />
                    قاربت المساحة التخزينية على الامتلاء!
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6 mb-8 shadow-sm border border-gray-100 rounded-2xl bg-white">
            <h3 className="font-bold text-lg mb-5 flex items-center gap-2 text-gray-800">
              <VideoIcon size={20} className="text-primary" />
              ميزات التشفير والبث المتاحة
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-muted font-bold">جودة تشفير الفيديوهات:</span>
                <div className="flex gap-2">
                  {getAllowedQualities(limits.plan).map((q, idx) => (
                    <span key={idx} className="badge text-sm font-bold" style={{ background: 'rgba(11, 79, 108, 0.1)', color: 'var(--primary)' }}>
                      {q}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted font-bold">وضع التخزين السحابي:</span>
                <span className="font-bold flex items-center gap-1 text-gray-800">
                  Backblaze B2 مع شبكة Cloudflare CDN <TrendingUpIcon size={16} className="text-success" />
                </span>
              </div>
            </div>
          </div>

          <div className="card p-8 text-center rounded-2xl" style={{ border: '2px dashed #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
            <h3 className="font-extrabold text-xl mb-2" style={{ color: '#047857' }}>
              هل ترغب في ترقية باقتك أو تعديل الموارد؟
            </h3>
            <p className="text-muted text-sm mb-6 max-w-lg mx-auto font-medium">
              تستطيع رفع باقتك في أي وقت لتوفير مساحة لرفع محاضرات أكثر، أو زيادة أعداد الطلاب الذين يمكنهم التسجيل في منصتك.
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn inline-flex items-center gap-3 text-white font-bold text-base no-underline shadow-lg hover:-translate-y-1 transition-all rounded-xl"
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