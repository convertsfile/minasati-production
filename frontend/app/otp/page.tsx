// app/otp/page.tsx (أو المسار الخاص بك)
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase"; // استدعاء فايربيز الذي أنشأناه
import Navbar from '../components/Navbar';
import { PhoneIcon, CheckCircleIcon, XIcon } from '../components/Icons';
import api from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";

function OTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempUserId = searchParams.get("tempUserId");

  const { isAuthenticated, fetchUser } = useAuthStore();

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);
  
  // 🚀 حالة جديدة لحفظ مرجع فايربيز بعد إرسال الرسالة
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    if (isAuthenticated || Cookies.get('token')) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  // ==========================================
  // 🚀 المحرك 1: تهيئة الكابتشا وإرسال الرسالة
  // ==========================================
  const setupRecaptchaAndSendOTP = async () => {
    const phone = sessionStorage.getItem('pending_phone');
    
    if (!phone) {
      showToast("رقم الهاتف مفقود، يرجى التسجيل من جديد", "error");
      setTimeout(() => router.push('/register'), 2000);
      return;
    }

    try {
      setLoading(true);

      // تنظيف الكابتشا القديمة إن وجدت (لمنع مشاكل إعادة الإرسال)
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible', // مخفي لكي لا يزعج الطالب
          callback: () => { console.log("reCAPTCHA solved"); }
        });
      }

      // تحويل الرقم للصيغة الدولية التي تفهمها جوجل (مهم جداً)
      const formattedPhone = phone.startsWith('0') ? `+2${phone}` : phone;

      // إطلاق أمر الإرسال من خوادم جوجل
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      
      setConfirmationResult(confirmation);
      showToast("تم إرسال كود التحقق إلى هاتفك", "success");
      
      // بدء العداد
      setCountdown(60);
      setCanResend(false);

    } catch (error: any) {
      console.error("Firebase Error:", error);
      showToast("فشل إرسال الرسالة، يرجى المحاولة لاحقاً", "error");
      
      // إعادة ضبط الكابتشا في حالة الفشل
      if (window.recaptchaVerifier && document.getElementById('recaptcha-container')) {
        try {
          window.recaptchaVerifier.render().then((widgetId: any) => {
            grecaptcha.reset(widgetId);
          });
        } catch (e) {
          console.warn("Recaptcha reset skipped");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // إرسال الرسالة فور دخول الطالب للصفحة
  useEffect(() => {
    // التأكد من وجود الـ ID وأن الكود لم يعمل من قبل
    if (tempUserId && !initialized.current) {
      initialized.current = true; // نغلق الباب فوراً لمنع التكرار
      setupRecaptchaAndSendOTP();
    }
  }, [tempUserId]);

  // إدارة عداد الوقت
  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;
    const newOtp = pastedData.split("").concat(Array(6).fill("")).slice(0, 6);
    setOtp(newOtp);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  // ==========================================
  // 🚀 المحرك 2: التحقق من الكود وإصدار التوكن
  // ==========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    
    if (otpCode.length !== 6 || !tempUserId || !confirmationResult) {
      showToast("يرجى إدخال الكود كاملاً", "error");
      return;
    }

    setLoading(true);

    try {
      // 1. إرسال الكود لجوجل للتأكد منه
      const result = await confirmationResult.confirm(otpCode);
      
      // 2. إذا نجح، نستخرج التوكن السري العالي التشفير
      const firebaseToken = await result.user.getIdToken();

      // 3. إرسال التوكن للباك إند الخاص بك (Laravel) ليفحصه ويفعل الحساب
      const response = await api.post('/auth/verify-otp', { 
        temp_user_id: tempUserId, 
        firebase_token: firebaseToken 
      });

      if (response?.data?.token || response?.token) {
        const backendToken = response.data?.token || response.token;
        const user = response.data?.user || response.user;

        Cookies.set('token', backendToken, { 
          expires: 30, 
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' 
        });
        await fetchUser();
        
        // تنظيف البيانات المؤقتة
        sessionStorage.removeItem('pending_phone');
        
        showToast("تم التحقق بنجاح! جاري توجيهك...", "success");

        setTimeout(() => {
            if (user?.status === 'pending') {
              router.replace("/waiting-room");
            } else {
              router.replace("/dashboard");
            }
        }, 500);
      }

    } catch (err: any) {
      console.error(err);
      console.log("Laravel Validation Errors:", err.errors || err);
      // معالجة أخطاء فايربيز (كود خاطئ) أو أخطاء الباك إند
      const message = err.code === 'auth/invalid-verification-code' 
        ? "الكود الذي أدخلته غير صحيح." 
        : err.code === 'auth/code-expired'
        ? "انتهت صلاحية الكود، يرجى طلب كود جديد."
        : err?.message || "حدث خطأ أثناء التحقق.";
        
      showToast(message, "error");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
        <div className={`toast-content ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <XIcon size={20} />}
          {toast.message}
        </div>
      </div>

      <div className="split-layout">
        <div className="split-branding">
           {/* ... نفس تصميمك السابق للـ Branding ... */}
        </div>

        <div className="split-form">
          <div className="split-card">
            <div className="split-card-header">
              <div className="icon-circle">
                <PhoneIcon size={28} />
              </div>
              <h2 className="split-card-title">تأكيد رقم الهاتف</h2>
              <p className="split-card-subtitle">
                أدخل الكود المكون من 6 أرقام المرسل إلى هاتفك
              </p>
            </div>

            <form onSubmit={handleSubmit} className="split-card-form">
              {/* 🚀 حاوية الكابتشا المخفية (ضرورية لعمل فايربيز) */}
              <div id="recaptcha-container"></div>

              <div className="otp-inputs" onPaste={handlePaste} dir="ltr">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { if (el) inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="otp-input"
                    disabled={loading}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join("").length !== 6}
                className="btn btn-primary btn-block btn-lg mt-6"
              >
                {loading ? <span className="spinner spinner-white"></span> : "تأكيد الحساب"}
              </button>
            </form>

            <div className="otp-resend">
              {canResend ? (
                <button type="button" onClick={setupRecaptchaAndSendOTP} disabled={loading} className="resend-link">
                  إرسال كود جديد
                </button>
              ) : (
                <p className="resend-text">
                  يمكنك إعادة إرسال الكود خلال <span className="countdown" dir="ltr">{countdown}</span> ثانية
                </p>
              )}
            </div>

          </div>
        </div>
        <style jsx>{`
          .split-layout {
            display: flex;
            min-height: 100vh;
            background-color: var(--background);
          }
          .split-branding {
            flex: 1;
            background: var(--gradient-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .split-form {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background-color: var(--background);
          }
          .split-card {
            width: 100%;
            max-width: 420px;
            background: var(--surface);
            padding: 2.5rem;
            border-radius: 1.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
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
          
          /* 🚀 أكواد الـ OTP السحرية */
          .otp-inputs {
            display: flex;
            justify-content: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            direction: ltr; /* ضروري جداً لكي تبدأ الأرقام من اليسار لليمين */
          }
          .otp-input {
            width: 3.5rem;
            height: 4rem;
            text-align: center;
            font-size: 1.5rem;
            font-weight: 800;
            border-radius: 0.75rem;
            border: 2px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.03);
            color: var(--text-primary);
            transition: all 0.3s ease;
          }
          .otp-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(11, 79, 108, 0.2);
            background: rgba(11, 79, 108, 0.05);
            transform: translateY(-2px);
          }
          .otp-input:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .otp-resend { text-align: center; margin-top: 2rem; }
          .resend-text { color: var(--text-secondary); font-size: 0.9375rem; }
          .countdown { 
            display: inline-flex; 
            align-items: center; 
            justify-content: center; 
            min-width: 2.5rem; 
            background: rgba(11, 79, 108, 0.15); 
            color: var(--primary-light, #1bb0ce); 
            border-radius: 0.5rem; 
            font-weight: 800; 
            padding: 0.25rem 0.5rem; 
            font-family: monospace; 
            font-size: 1rem; 
            margin: 0 0.25rem; 
          }
          .resend-link { 
            background: none; 
            border: none; 
            color: var(--primary-light, #1bb0ce); 
            font-size: 1rem; 
            font-weight: 700; 
            cursor: pointer; 
            padding: 0.5rem 1rem; 
            border-radius: 0.5rem; 
            transition: all 0.3s; 
          }
          .resend-link:hover { background: rgba(11, 79, 108, 0.1); }
          .resend-link:disabled { opacity: 0.5; cursor: not-allowed; }

          @media (max-width: 768px) {
            .split-branding { display: none; }
            .otp-input { width: 2.75rem; height: 3.25rem; font-size: 1.25rem; gap: 0.5rem; }
          }
        `}</style>
      </div>
    </>
  );
}

// Global Declaration for reCAPTCHA
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default function OTPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner spinner-lg"></div></div>}>
      <OTPContent />
    </Suspense>
  );
}