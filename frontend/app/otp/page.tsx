"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from '../components/Navbar';
import { PhoneIcon, CheckCircleIcon, XIcon } from '../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

function OTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tempUserId = searchParams.get("tempUserId");

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    if (!tempUserId) {
      showToast("رابط التحقق غير صالح", "error");
      return;
    }

    const storedDevOtp = sessionStorage.getItem('dev_otp');
    if (storedDevOtp) {
      setDevOtp(storedDevOtp);
    }

    // ⚠️ Trigger Firebase phone auth: the backend now requires the firebase
    // ID token issued by Firebase, not a 6-digit OTP. We call
    // signInWithPhoneNumber against the phone number stored during
    // registration and cache the confirmationResult on window so the
    // submit handler can exchange the 6-digit code for an ID token.
    //
    // If Firebase is not configured in this build (no env vars), the import
    // will fail and the user will see a clear error on submit.
    (async () => {
      try {
        const { getAuth, RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
        const auth = getAuth();
        // Phone number is stored in sessionStorage by the register page.
        const phoneNumber = sessionStorage.getItem('register_phone');
        if (!phoneNumber) {
          // No phone available — cannot kick off Firebase phone auth.
          return;
        }
        if (typeof window !== 'undefined' && !window.__firebaseRecaptchaVerifier) {
          window.__firebaseRecaptchaVerifier = new RecaptchaVerifier(auth, 'firebase-recaptcha-container', {
            size: 'invisible',
          });
        }
        const appVerifier = window.__firebaseRecaptchaVerifier;
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        window.__firebaseConfirmationResult = confirmationResult;
      } catch (fbErr) {
        // Silent failure: the submit handler will surface a clear error if
        // firebase_token cannot be produced.
        console.warn('Firebase phone auth init failed (likely missing config):', fbErr);
      }
    })();
  }, [tempUserId]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      showToast("يرجى إدخال الكود كاملاً", "error");
      return;
    }
    if (!tempUserId) {
      showToast("رابط التحقق غير صالح", "error");
      return;
    }

    setLoading(true);

    try {
      // ⚠️ The backend /api/auth/verify-otp endpoint requires
      // { temp_user_id, firebase_token } — the firebase_token is the
      // Firebase phone-auth ID token obtained from
      //   signInWithPhoneNumber(...) → confirmationResult.confirm(code) →
      //   user.getIdToken()
      // The previous implementation sent a 6-digit OTP code, which the
      // backend rejects with 422 ERR_VERIFICATION_FAILED.
      //
      // If Firebase is configured (env vars present), we trigger the
      // confirmation flow against the cached confirmationResult and exchange
      // the resulting ID token. Otherwise we surface a clear error and ask
      // the user to contact support.
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      // The confirmationResult is stashed on the window by the recaptcha /
      // phone-auth flow that runs in a useEffect on mount.
      const confirmationResult = window.__firebaseConfirmationResult;

      let firebaseToken: string | null = null;
      if (confirmationResult && typeof confirmationResult.confirm === 'function') {
        try {
          const credential = await confirmationResult.confirm(otpCode);
          firebaseToken = await credential.user.getIdToken();
        } catch (confirmErr: any) {
          throw new Error(confirmErr?.message || 'كود التحقق غير صحيح');
        }
      } else {
        // Firebase is not configured in this build, or the user did not
        // trigger the SMS-send step. Surface a clear message rather than
        // sending the wrong body shape to the backend.
        throw new Error(
          'تعذر إكمال التحقق عبر Firebase. يرجى إعادة إرسال الكود من صفحة التسجيل والمحاولة مرة أخرى.'
        );
      }

      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ temp_user_id: tempUserId, firebase_token: firebaseToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "فشل التحقق من الكود");
      }

      if (data.data?.token) {
        localStorage.setItem("token", data.data.token);
        document.cookie = `token=${data.data.token}; path=/; max-age=2592000`;
        sessionStorage.removeItem('dev_otp');
      }

      showToast("تم التحقق بنجاح!", "success");
      router.push("/waiting-room");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "فشل التحقق من الكود";
      showToast(message, "error");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!tempUserId || !canResend) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ temp_user_id: tempUserId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "فشل إرسال الكود الجديد");
      }

      if (data.data?.dev_otp) {
        setDevOtp(data.data.dev_otp);
        sessionStorage.setItem('dev_otp', data.data.dev_otp);
        console.log('Development OTP Code (Resent):', data.data.dev_otp);
      }

      showToast("تم إرسال كود جديد إلى هاتفك بنجاح", "success");
      setCountdown(60);
      setCanResend(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "فشل إرسال الكود الجديد";
      showToast(message, "error");
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
          <div className="branding-content">
            <Link href="/" className="branding-logo">
              <span className="logo-icon" style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: '800' }}>M</span>
              <span className="logo-text">
                Minassati<span>.</span>
              </span>
            </Link>
            <h1 className="branding-title">منصتنا</h1>
            <p className="branding-subtitle">منصتك التعليمية الذكية</p>
          </div>
        </div>

        <div className="split-form">
          <div className="split-card">
            <div className="split-card-header">
              <div className="icon-circle">
                <PhoneIcon size={24} />
              </div>
              <h2 className="split-card-title">تحقق من رقم الهاتف</h2>
              <p className="split-card-subtitle">
                أدخل الكود المكون من 6 أرقام المرسل إلى هاتفك
              </p>
            </div>

            <form onSubmit={handleSubmit} className="split-card-form">

              {devOtp && (
                <div className="dev-otp-banner">
                  <div className="dev-otp-header">
                    <span>Development Mode</span>
                  </div>
                  <div className="dev-otp-code">{devOtp}</div>
                  <div className="dev-otp-note">This is only visible in development mode</div>
                </div>
              )}

              <div className="otp-inputs" onPaste={handlePaste} dir="ltr">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      if (el) inputRefs.current[index] = el;
                    }}
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
                className="btn btn-primary btn-block"
              >
                {loading ? <span className="spinner spinner-white"></span> : "تحقق من الكود"}
              </button>
            </form>

            <div className="otp-resend">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="resend-link"
                >
                  إرسال كود جديد
                </button>
              ) : (
                <p className="resend-text">
                  يمكنك إعادة إرسال الكود خلال{" "}
                  <span className="countdown" dir="ltr">{countdown}</span>
                  {" "}ثانية
                </p>
              )}
            </div>

            <div className="text-center mt-6">
              <Link href="/register" className="back-link" style={{ fontSize: '0.875rem' }}>
                → العودة لصفحة التسجيل
              </Link>
            </div>
          </div>
        </div>

        <style jsx>{`
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
            margin-bottom: 1.5rem;
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
          .dev-otp-banner {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
            border-radius: 1rem;
            padding: 1.25rem;
            text-align: center;
          }
          .dev-otp-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: #92400e;
            font-weight: 700;
            margin-bottom: 0.75rem;
          }
          .dev-otp-code {
            font-size: 2.5rem;
            font-weight: 900;
            color: var(--primary);
            letter-spacing: 0.5rem;
            font-family: monospace;
          }
          .dev-otp-note {
            font-size: 0.75rem;
            color: #92400e;
            margin-top: 0.5rem;
          }
          .otp-inputs {
            display: flex;
            justify-content: center;
            gap: 0.75rem;
          }
          .otp-input {
            width: 55px;
            height: 65px;
            text-align: center;
            font-size: 1.75rem;
            font-weight: 800;
            font-family: var(--font-display);
            border: 2px solid var(--border);
            border-radius: 1rem;
            background: var(--surface);
            color: var(--text-primary);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .otp-input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 4px rgba(27, 189, 212, 0.15);
            transform: scale(1.05);
          }
          .otp-resend {
            text-align: center;
            margin-top: 1.5rem;
          }
          .resend-text {
            color: var(--text-secondary);
            font-size: 0.9375rem;
          }
          .countdown {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 2rem;
            background: var(--primary);
            color: white;
            border-radius: 0.5rem;
            font-weight: 700;
            padding: 0.25rem 0.5rem;
            font-family: monospace;
            font-size: 1rem;
          }
          .resend-link {
            background: none;
            border: none;
            color: var(--primary);
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            transition: all 0.3s;
          }
          .resend-link:hover {
            background: rgba(11, 79, 108, 0.1);
            transform: scale(1.05);
          }
          .resend-link:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .btn-block {
            width: 100%;
            padding: 1rem;
            font-size: 1.1rem;
          }
          @media (max-width: 768px) {
            .split-branding {
              display: none;
            }
            .otp-input {
              width: 45px;
              height: 55px;
              font-size: 1.5rem;
            }
          }
        `}</style>
      </div>
      {/* Invisible reCAPTCHA container required by Firebase phone auth */}
      <div id="firebase-recaptcha-container" />
    </>
  );
}

export default function OTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="spinner spinner-lg"></div>
      </div>
    }>
      <OTPContent />
    </Suspense>
  );
}
