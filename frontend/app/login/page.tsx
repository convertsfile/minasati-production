"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie"; // 🚀 مكتبة التعامل الآمن مع الكوكيز
import Navbar from '../components/Navbar';
import { LockIcon, BookIcon } from '../components/Icons';
import api from "@/lib/axios"; // 🚀 العميل المركزي
import { useAuthStore } from "@/store/useAuthStore"; // 🚀 الذاكرة المركزية
import { useSearchParams } from "next/navigation";

const EyeIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  
  // 🚀 استدعاء الحالة المركزية لمنع الطالب المسجل من رؤية صفحة الدخول
  const { isAuthenticated, isLoading: authLoading, fetchUser } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        let deviceId = localStorage.getItem("device_id");
        if (!deviceId) {
            deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
            localStorage.setItem("device_id", deviceId);
        }

        const response: any = await api.post("/auth/login", { 
          email, 
          password, 
          device_id: deviceId
        });

        // 1. استخراج التوكن بشكل آمن تماماً أياً كانت طريقة تغليف الاستجابة من Laravel
        // const payload = response.data || response;
        const token = response.data?.token;
        const user = response.data?.user;

        if (token) {
            // 2. السر هنا: إزالة secure مؤقتاً وتحديد المسار (path) لإجبار المتصفح على الحفظ
            Cookies.set('token', token, {
              expires: 30, 
              path: '/',
              secure: process.env.NODE_ENV === 'production', // يعمل Secure في الإنتاج فقط
              sameSite: 'lax' 
            });
            
            await fetchUser();
            showToast("تم تسجيل الدخول بنجاح! جاري التوجيه...", "success");
            
            setTimeout(() => {
              const status = user?.status;
              const isAdmin = user?.role === 'admin';
              
              if (isAdmin) {
                  router.push("/admin");
                } else if (status === 'pending') {
                  router.push("/waiting-room");
                } else if (status === 'rejected') {
                  if (user?.rejection_reason) {
                    localStorage.setItem('rejection_reason', user.rejection_reason);
                  }
                  router.push("/resubmit");
                } else {
                  router.push(redirectUrl ? redirectUrl : "/dashboard");
                }
            }, 500);
        }

    } catch (err: any) {
        const errorCode = err?.code;
        const errorMessage = err?.message || "فشل تسجيل الدخول. تأكد من صحة البريد أو كلمة المرور.";

        if (errorCode === 'ERR_ACCOUNT_PENDING') {
            router.push("/waiting-room");
        } else if (errorCode === 'ERR_ACCOUNT_REJECTED') {
            if (err?.data?.rejection_reason) {
                localStorage.setItem('rejection_reason', err.data.rejection_reason);
            }
            router.push("/resubmit");
        } else {
            showToast(errorMessage, "error");
        }
    } finally {
        setLoading(false);
    }
  };

  if (authLoading || isAuthenticated) {
    return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="spinner spinner-lg"></div></div>;
  }

  return (
    <>
      <Navbar />

      <div className={`toast-container${toast.visible ? ' show' : ''}`}>
        <div className={`toast-content ${toast.type}`}>
          {toast.message}
        </div>
      </div>

      <div className="split-layout">
        <div className="split-branding">
          <div className="branding-content text-center">
            <BookIcon size={64} color="white" />
            <h1 className="branding-title" style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem' }}>منصتنا</h1>
            <p className="branding-subtitle" style={{ fontSize: '1.25rem', opacity: 0.9, maxWidth: '400px', margin: '0 auto' }}>منصتك التعليمية الذكية لتطوير مهاراتك والتفوق في دراستك</p>
          </div>
        </div>

        <div className="split-form">
          <div className="split-card">
            <div className="split-card-header">
              <div className="icon-circle">
                <LockIcon size={24} />
              </div>
              <h2 className="split-card-title">تسجيل الدخول</h2>
              <p className="split-card-subtitle">سجل دخولك للمتابعة في رحلتك التعليمية</p>
            </div>

            <form onSubmit={handleSubmit} className="split-card-form">

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field text-right"
                  placeholder="example@email.com"
                  autoComplete="email"
                  dir="ltr"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  كلمة المرور
                </label>
                <div className="password-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-field text-right"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="btn btn-primary btn-block btn-lg"
              >
                {loading ? <span className="spinner spinner-white"></span> : "تسجيل دخول"}
              </button>
            </form>

            <div className="split-card-footer">
              <p>ليس لديك حساب؟{" "}</p>
              <Link href="/register" className="link-primary">
                أنشئ حساباً الآن
              </Link>
            </div>
          </div>
        </div>

        <style jsx>{`
          /* كافة أكواد الـ CSS الخاصة بك محفوظة كما هي لضمان عدم كسر التصميم */
          .icon-circle {
            width: 64px;
            height: 64px;
            border-radius: 1rem;
            background: var(--gradient-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            color: white;
            box-shadow: 0 10px 15px -3px rgba(11, 79, 108, 0.3);
          }
          .split-card-header {
            text-align: center;
            margin-bottom: 2rem;
          }
          .split-card-title {
            font-family: var(--font-display);
            font-size: 1.75rem;
            font-weight: 800;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
          }
          .split-card-subtitle {
            font-family: var(--font-body);
            font-size: 0.9375rem;
            color: var(--text-secondary);
          }
          .split-card-form {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }
          .split-card-footer {
            text-align: center;
            margin-top: 1.5rem;
            color: var(--text-secondary);
            font-size: 0.9375rem;
          }
          .link-primary {
            color: var(--primary);
            text-decoration: none;
            font-weight: 700;
            transition: color 0.3s;
            display: inline-block;
          }
          .link-primary:hover {
            color: var(--primary-dark);
          }
          .password-wrapper {
            position: relative;
          }
          .password-toggle {
            position: absolute;
            inset-inline-start: 1rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 0.25rem;
            transition: color 0.3s;
          }
          .password-toggle:hover {
            color: var(--primary);
          }
          @media (max-width: 768px) {
            .split-branding {
              display: none;
            }
          }
        `}</style>
      </div>
    </>
  );
}