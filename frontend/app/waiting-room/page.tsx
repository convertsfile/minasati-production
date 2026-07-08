"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from '../components/Navbar';
import { ClockIcon, LogoutIcon, AlertCircleIcon } from '../components/Icons';
import { useAuthStore } from "@/store/useAuthStore"; // 🚀 العقل المدبر للحالة

export default function WaitingRoomPage() {
  const router = useRouter();
  
  // 🚀 جلب البيانات والدوال المركزية من Zustand
  const { user, isAuthenticated, isLoading, logout, fetchUser } = useAuthStore();

  // 1. حارس البوابة الذكي (Smart Routing Guard)
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (user?.status === "active") {
        router.replace("/dashboard");
      } else if (user?.status === "rejected") {
        router.replace("/resubmit");
      }
      // إذا كان معلقاً (pending)، يبقى هنا
    }
  }, [isLoading, isAuthenticated, user, router]);

  // 2. الاستعلام الذكي (Reactive Polling) في الخلفية
  useEffect(() => {
    // لا نستعلم إذا لم يكن الطالب مسجلاً ومعلقاً
    if (!isAuthenticated || user?.status !== 'pending') return;

    // تحديث بيانات المستخدم كل 15 ثانية بصمت
    const interval = setInterval(() => {
      fetchUser(); 
    }, 15000);

    // تحديث البيانات فوراً عندما يعود الطالب للمتصفح (Tab Active)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUser();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isAuthenticated, user?.status, fetchUser]);

  const handleLogout = async () => {
    await logout(); // 🚀 الدالة المركزية تتكفل بتنظيف كل شيء (Cookies + API)
    router.push("/login");
  };

  // 🚀 منع وميض الشاشة (FOUC) وعرض التحميل أثناء الفحص
  if (isLoading || (isAuthenticated && user?.status !== 'pending')) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--gradient-surface)' }}>
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="card flex flex-col items-center gap-6 p-12 relative z-10">
            <div className="spinner spinner-lg"></div>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
              جارٍ التحقق...
            </p>
          </div>
        </div>
        <style jsx>{`
          .blob { position: absolute; border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; animation: blob 8s ease-in-out infinite; }
          .blob-1 { width: 400px; height: 400px; background: linear-gradient(135deg, rgba(11, 79, 108, 0.15), rgba(11, 122, 138, 0.15)); top: -10%; inset-inline-start: -10%; }
          .blob-2 { width: 300px; height: 300px; background: linear-gradient(135deg, rgba(27, 189, 212, 0.15), rgba(16, 185, 129, 0.15)); bottom: 10%; inset-inline-end: -5%; animation-delay: -2s; }
          @keyframes blob { 0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; } 50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; } }
        `}</style>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-8" style={{ background: 'var(--gradient-surface)' }}>
        <div className="blob blob-1"></div>
        <div className="blob blob-3"></div>

        <div className="pending-icon" style={{ top: '15%', insetInlineStart: '15%' }}>
          <ClockIcon size={48} />
        </div>
        <div className="pending-icon" style={{ top: '25%', insetInlineEnd: '12%', animationDelay: '0.5s', fontSize: '2.5rem' }}>
          <AlertCircleIcon size={40} />
        </div>        

        <div className="card animate-fade-in-scale text-center relative z-10" style={{ maxWidth: '420px', width: '100%', padding: '3rem' }}>
          <div className="waiting-icon-wrapper">
            <ClockIcon size={44} />
          </div>

          <div className="status-badge">
            <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
              قيد المراجعة
            </span>
          </div>

          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '1rem',
            fontFamily: 'var(--font-display)'
          }}>
            في انتظار الموافقة
          </h1>

          <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            lineHeight: '1.7',
            fontSize: '1.05rem'
          }}>
            شكراً لتسجيلك! حسابك قيد المراجعة من الإدارة حالياً.
            <br />
            سنُبلغك فوراً عند الموافقة على طلبك.
          </p>

          <div className="banner banner-info mb-6 justify-center" style={{ borderStyle: 'dashed' }}>
            <AlertCircleIcon size={18} />
            سيتم تحويلك تلقائياً للوحة التحكم عند الموافقة
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-outline w-full"
          >
            <LogoutIcon size={18} />
            تسجيل الخروج
          </button>
        </div>

        <style jsx>{`
          .blob {
            position: absolute;
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
            animation: blob 8s ease-in-out infinite;
          }
          .blob-1 {
            width: 400px;
            height: 400px;
            background: linear-gradient(135deg, rgba(11, 79, 108, 0.15), rgba(11, 122, 138, 0.15));
            top: -10%;
            inset-inline-start: -10%;
          }
          .blob-3 {
            width: 300px;
            height: 300px;
            background: linear-gradient(135deg, rgba(11, 122, 138, 0.15), rgba(27, 189, 212, 0.15));
            bottom: 10%;
            inset-inline-end: -5%;
            animation-delay: -2s;
          }
          .pending-icon {
            position: absolute;
            animation: floatSoft 3s ease-in-out infinite;
            filter: drop-shadow(0 10px 20px rgba(11, 79, 108, 0.2));
            color: var(--primary);
          }
          .waiting-icon-wrapper {
            width: 100px;
            height: 100px;
            margin: 0 auto 1.5rem;
            border-radius: 50%;
            background: var(--gradient-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 8px 0 var(--primary-dark);
            animation: bounce 2s ease-in-out infinite;
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(11, 79, 108, 0.1);
            padding: 0.5rem 1rem;
            border-radius: var(--radius-full);
            margin-bottom: 1rem;
          }
          @keyframes blob {
            0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
            50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes floatSoft {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
          }
        `}</style>
      </div>
    </>
  );
}