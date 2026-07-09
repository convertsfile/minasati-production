'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import {
  ArrowRightIcon, ArrowLeftIcon, KeyIcon, CodeIcon,
  CheckCircleIcon, GraduationCapIcon, PlayCircleIcon,
  AlertTriangleIcon, FileTextIcon, BookIcon, LockIcon
} from '../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface SuccessData {
  message: string;
  course: {
    id: number;
    title: string;
  };
}

export default function RedeemCodePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SuccessData | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      // /api/auth/status is DEAD; use /api/auth/me. The /me endpoint returns
      // a non-standard envelope {status:"success", data:UserResource}.
      const statusRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        // Unwrap nested envelopes to reach the User object
        const user = statusData?.data?.data ?? statusData?.data ?? statusData;
        if (user && user.status === 'pending') {
          router.replace('/waiting-room');
        }
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setLoading(true);

    try {
      const token = getToken();

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/center-codes/redeem`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess({
          message: data.data?.message || data.message || 'تم تفعيل الكورس بنجاح',
          course: data.data?.course || data.course
        });
        setCode('');
      } else {
        setError(data.error || data.message || 'الكود غير صحيح أو مستخدم مسبقاً');
      }
    } catch (err) {
      console.error('Redemption failed:', err);
      setError('حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Navbar />

      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          background: 'linear-gradient(135deg, rgba(11, 79, 108, 0.12) 0%, rgba(27, 189, 212, 0.12) 100%)',
          top: -80,
          insetInlineEnd: -80,
          animation: 'blob 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: 250,
          height: 250,
          borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
          bottom: '20%',
          insetInlineStart: -50,
          animation: 'blob 10s ease-in-out infinite',
          animationDelay: '-2s',
        }} />
      </div>

      <div className="page-content" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 80px)'
      }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <Link href="/dashboard" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--primary)',
            textDecoration: 'none',
            fontWeight: 600,
            marginBottom: '1.5rem',
            transition: 'all 0.3s'
          }}>
            <ArrowRightIcon size={16} />
            العودة للوحة التحكم
          </Link>

          <div className="card" style={{
            textAlign: 'center',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem 2rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              width: 90,
              height: 90,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: 'var(--shadow-lg)',
            }}>
              <KeyIcon size={36} style={{ color: 'white' }} />
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '0.5rem'
            }}>
              <CodeIcon size={24} style={{ marginInlineEnd: '0.5rem', verticalAlign: 'middle' }} />
              استخدام كود المركز
            </h1>

            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
              lineHeight: 1.7
            }}>
              أدخل الكود الذي حصلت عليه من المركز للحصول على الكورس المميز
            </p>

            {success && (
              <div className="banner banner-success" style={{ marginBottom: '1.5rem', textAlign: 'center', display: 'block' }}>
                <CheckCircleIcon size={24} style={{ marginBottom: '0.5rem' }} />
                <p style={{
                  fontWeight: 700,
                  color: 'var(--success-dark)',
                  fontSize: '1.1rem',
                  marginBottom: '0.5rem'
                }}>
                  {success.message}
                </p>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  <GraduationCapIcon size={16} style={{ marginInlineEnd: '0.25rem', verticalAlign: 'middle' }} />
                  الكورس: <strong>{success.course.title}</strong>
                </p>
                <Link
                  href={`/courses/${success.course.id}`}
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  بدء الكورس
                  <ArrowLeftIcon size={16} />
                </Link>
              </div>
            )}

            {error && (
              <div className="banner banner-error" style={{ marginBottom: '1.5rem' }}>
                <AlertTriangleIcon size={16} />
                {error}
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ textAlign: 'right', fontWeight: 700 }}>
                    <CodeIcon size={16} style={{ marginInlineEnd: '0.25rem', verticalAlign: 'middle' }} />
                    أدخل الكود هنا
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX"
                    required
                    className="input-field"
                    style={{
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      fontSize: '1.25rem',
                      letterSpacing: '0.15em',
                      fontWeight: 700,
                      padding: '1rem'
                    }}
                  />
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.5rem'
                  }}>
                    <FileTextIcon size={12} style={{ marginInlineEnd: '0.25rem', verticalAlign: 'middle' }} />
                    الكود يتكون من 12 حرف وأرقام مفصولة بشرطات
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="btn btn-primary btn-block"
                  style={{
                    padding: '1rem',
                    fontSize: '1.1rem'
                  }}
                >
                  {loading ? (
                    <>
                      <div className="spinner" style={{ width: 18, height: 18, marginInlineEnd: '8px' }}></div>
                      جاري التحقق والتفعيل...
                    </>
                  ) : (
                    'تفعيل الكود الآن'
                  )}
                </button>
              </form>
            )}

            {!success && (
              <div style={{
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border)'
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.75rem'
                }}>
                  ليس لديك كود؟ وتريد الشراء أونلاين؟
                </p>
                <Link href="/courses" style={{
                  color: 'var(--primary)',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <BookIcon size={16} />
                  تصفح الكورسات المتاحة
                </Link>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', opacity: 0.6 }}>
            <LockIcon size={20} style={{ margin: '0 0.25rem', verticalAlign: 'middle', display: 'inline-block' }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
              عملية التفعيل آمنة ومشفرة تماماً
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
        }
      `}</style>
    </div>
  );
}
