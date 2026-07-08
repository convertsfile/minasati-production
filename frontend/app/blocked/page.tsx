"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from '../components/Navbar';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { ShieldIcon, LogoutIcon, XIcon, PhoneIcon, AlertTriangleIcon, MessageIcon } from '../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface UserData {
  fullName: string;
}

export default function BlockedPage() {
  useAuthGuard();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(`${API_URL}/api/auth/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          },
        });

        if (response.ok) {
          const data = await response.json();
          const user = data.data?.user || data.data || data;
          setUserData({
            fullName: user.full_name || user.fullName || '',
          });
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };

    fetchUser();
  }, []);

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

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '201000000000';
  const whatsappMessage = encodeURIComponent(
    `مرحباً، أنا الطالب ${userData?.fullName || ''}، تم حظر حسابي وأريد مراجعة الحالة.`
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-8" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(220, 38, 38, 0.08))' }}>
        <div className="blob blob-red-1"></div>
        <div className="blob blob-red-2"></div>

        <div className="float-icon" style={{ top: '10%', insetInlineStart: '10%', animationDelay: '0s' }}>
          <XIcon size={64} />
        </div>
        <div className="float-icon" style={{ top: '25%', insetInlineEnd: '15%', animationDelay: '0.5s' }}>
          <AlertTriangleIcon size={48} />
        </div>
        <div className="float-icon" style={{ bottom: '30%', insetInlineStart: '15%', animationDelay: '1s' }}>
          <ShieldIcon size={40} />
        </div>
        <div className="float-icon" style={{ bottom: '15%', insetInlineEnd: '25%', animationDelay: '1.5s' }}>
          <ShieldIcon size={48} />
        </div>

        <div className="card animate-fade-in-scale" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem', textAlign: 'center', border: '2px solid rgba(239, 68, 68, 0.3)', position: 'relative', zIndex: 10 }}>
          <div className="blocked-icon-wrapper">
            <XIcon size={48} />
          </div>

          <div className="blocked-badge">
            <ShieldIcon size={18} />
            <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.9rem' }}>
              حساب محظور
            </span>
          </div>

          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#dc2626',
            marginBottom: '1rem',
            fontFamily: 'var(--font-display)'
          }}>
            تم حظر حسابك
          </h1>

          <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            lineHeight: '1.7',
            fontSize: '1.05rem'
          }}>
            تم حظر حسابك بسبب محاولات متكررة لانتهاك سياسة الأمان الخاصة بالمنصة.
            <br />
            قد يتضمن ذلك: محاولة تحميل الفيديوهات، استخدام أدوات المطور، أو اختراق النظام.
          </p>

          <div className="support-box">
            <h3 className="support-box-title">
              <PhoneIcon size={18} />
              للتواصل مع الإدارة:
            </h3>
            <ul style={{ color: '#92400e', fontSize: '0.9rem', paddingInlineStart: '1.2rem', lineHeight: '1.9' }}>
              <li>تواصل معنا عبر واتساب لإعادة النظر في حالتك.</li>
              <li>سيتم مراجعة السجلات، وفي حال ثبوت الخطأ سيتم رفع الحظر.</li>
              <li>يُرجى الالتزام بسياسة الاستخدام الصارمة مستقبلاً.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success w-full"
              style={{ boxShadow: '0 4px 0 #1e8c4e' }}
            >
              <MessageIcon size={18} />
              تواصل عبر واتساب
            </a>

            <button
              onClick={handleLogout}
              className="btn btn-outline w-full"
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
            >
              <LogoutIcon size={18} />
              تسجيل الخروج من الحساب
            </button>
          </div>

          <div className="support-footer">
            <p className="support-footer-text">
              <PhoneIcon size={14} />
              رقم الدعم: <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }} dir="ltr">{whatsappNumber}</span>
            </p>
          </div>
        </div>

        <style>{`
          .blob {
            position: absolute;
            animation: blob 10s ease-in-out infinite;
          }
          .blob-red-1 {
            width: 500px;
            height: 500px;
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15));
            top: -15%;
            inset-inline-start: -15%;
          }
          .blob-red-2 {
            width: 350px;
            height: 350px;
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
            background: linear-gradient(135deg, rgba(11, 79, 108, 0.1), rgba(239, 68, 68, 0.1));
            bottom: 5%;
            inset-inline-end: -10%;
            animation-delay: -3s;
          }
          .float-icon {
            position: absolute;
            animation: floatSoft 3s ease-in-out infinite;
            filter: drop-shadow(0 15px 25px rgba(239, 68, 68, 0.3));
            color: rgba(239, 68, 68, 0.4);
          }
          .blocked-icon-wrapper {
            width: 110px;
            height: 110px;
            margin: 0 auto 1.5rem;
            border-radius: 50%;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 8px 0 #b91c1c;
            animation: pulse 2s ease-in-out infinite;
          }
          .blocked-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(239, 68, 68, 0.1);
            padding: 0.5rem 1rem;
            border-radius: var(--radius-full);
            margin-bottom: 1rem;
          }
          .support-box {
            background: rgba(245, 158, 11, 0.1);
            border: 2px solid rgba(245, 158, 11, 0.3);
            border-radius: var(--radius-md);
            padding: 1.25rem;
            margin-bottom: 1.5rem;
            text-align: start;
          }
          .support-box-title {
            font-size: 1rem;
            font-weight: 700;
            color: #b45309;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .support-footer {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 2px dashed var(--border);
          }
          .support-footer-text {
            font-size: 0.875rem;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
          }
          @keyframes blob {
            0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
            50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
      </div>
    </>
  );
}
