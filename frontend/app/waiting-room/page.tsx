"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from '../components/Navbar';
import { ClockIcon, LogoutIcon, CheckIcon, AlertCircleIcon } from '../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

export default function WaitingRoomPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    const token = getToken();
    if (token) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error("Logout failed on server", e);
      }
    }

    localStorage.removeItem("token");
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push("/login");
  };

  useEffect(() => {
    const checkStatus = async () => {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        // /api/auth/status is DEAD; use /api/auth/me. The /me endpoint returns
        // a non-standard envelope {status:"success", data:UserResource}.
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        // Unwrap nested envelopes: {status,data:UserResource} → UserResource → User
        const user = data?.data?.data ?? data?.data ?? data;

        if (user && user.status === "active") {
          router.push("/dashboard");
        } else if (user && user.status === "rejected") {
          router.push("/resubmit");
        }
      } catch (e) {
        console.error("Status check error", e);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkStatus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--gradient-surface)' }}>
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="card flex flex-col items-center gap-6 p-12">
            <div className="spinner spinner-lg"></div>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
              جارٍ التحقق...
            </p>
          </div>
        </div>
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

        <div className="card animate-fade-in-scale text-center" style={{ maxWidth: '420px', width: '100%', padding: '3rem' }}>
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
            سيُحولك تلقائياً للوحة التحكم عند الموافقة
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-outline w-full"
          >
            <LogoutIcon size={18} />
            تسجيل الخروج
          </button>
        </div>

        <style>{`
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
          .blob-2 {
            width: 300px;
            height: 300px;
            background: linear-gradient(135deg, rgba(27, 189, 212, 0.15), rgba(16, 185, 129, 0.15));
            bottom: 10%;
            inset-inline-end: -5%;
            animation-delay: -2s;
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
        `}</style>
      </div>
    </>
  );
}
