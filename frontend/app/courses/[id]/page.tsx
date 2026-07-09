'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import {
  BookIcon, PlayIcon, LockIcon, ClockIcon,
  AlertTriangleIcon, CheckCircleIcon, XIcon
} from '../../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface Lecture {
  id: number;
  title: string;
  description: string;
  orderIndex?: number;
  order_index?: number;
  isLocked?: boolean;
  is_locked?: boolean;
  encodingStatus?: string | null;
  video_status?: string | null;
  encodingProgress?: number;
}

interface Course {
  id: number;
  title: string;
  description: string;
  pricePoints?: number;
  price_points?: number;
  validityDate?: string | null;
  validity_date?: string | null;
  lecturesCount?: number;
  lectures_count?: number;
  isPurchased?: boolean;
  is_purchased?: boolean;
  lectures: Lecture[];
  createdAt?: string;
  created_at?: string;
}

export default function CoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // نظام الإشعارات
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
    fetchCourse();
    if (token) fetchWalletBalance();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const token = getToken();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/api/courses/${courseId}`, { headers, cache: 'no-store' });

      if (response.ok) {
        const data = await response.json();
        setCourse(data.data);
      } else {
        showToast('الكورس غير موجود أو غير متاح', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.data?.balance ?? 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurchase = async () => {
    if (!course) return;
    const price = course.pricePoints ?? course.price_points ?? 0;

    if (!isLoggedIn) {
      showToast('يجب تسجيل الدخول أولاً لشراء الكورس', 'error');
      return;
    }

    if (walletBalance === null || walletBalance < price) {
      showToast('رصيدك غير كافٍ. يرجى شحن محفظتك أولاً.', 'error');
      return;
    }

    if (!confirm('هل أنت متأكد من شراء هذا الكورس؟ سيتم خصم المبلغ من محفظتك.')) return;

    setPurchasing(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/courses/${courseId}/purchase`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();

      if (response.ok) {
        showToast('🎉 مبروك! تم الاشتراك في الكورس بنجاح.', 'success');
        
        setWalletBalance(data.data?.newBalance ?? (walletBalance - price));
        fetchCourse();
        
      } else {
        showToast(data.error || data.message || 'فشل شراء الكورس', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم أثناء الشراء', 'error');
    } finally {
      setPurchasing(false);
    }
  };

  const handleLectureClick = (lectureId: number, isPurchased: boolean, isLocked: boolean, isUnlocked: boolean) => {
    if (!isLoggedIn) {
      showToast('يجب تسجيل الدخول لفتح المحاضرات', 'error');
      router.push('/login');
      return;
    }
    if (!isUnlocked) {
      if (!isPurchased) {
        showToast('يجب شراء الكورس أولاً لفتح المحاضرات', 'error');
      } else {
        showToast('هذه المحاضرة مغلقة، يرجى إنهاء المحاضرة السابقة وامتحاناتها أولاً!', 'error');
      }
      return;
    }
    router.push(`/lectures/${lectureId}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex justify-center items-center h-[60vh]">
        <div className="spinner spinner-dark" style={{ width: 48, height: 48, borderWidth: 4 }}></div>
      </div>
    </div>
  );

  if (!course) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-12 text-center">
        <h2 className="text-2xl font-bold text-error">الكورس غير موجود</h2>
        <button onClick={() => router.push('/courses')} className="btn btn-primary mt-4">العودة للكورسات</button>
      </div>
    </div>
  );

  const price = course.pricePoints ?? course.price_points ?? 0;
  const lecturesCount = course.lecturesCount ?? course.lectures_count ?? 0;
  const validityDate = course.validityDate ?? course.validity_date;
  const isPurchased = course.isPurchased ?? course.is_purchased ?? false;

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      {/* Toast UI */}
      <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'all 0.3s', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
        <div style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {toast.message}
        </div>
      </div>

      <div className="container py-8 animate-fade-in">
        <div className="card mb-8 overflow-hidden" style={{ padding: 0 }}>
          <div style={{
            height: '200px',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <BookIcon size={64} />
          </div>
          <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">{course.title}</h1>
              <p className="text-secondary max-w-2xl leading-relaxed">
                {course.description || 'لا يوجد وصف لهذا الكورس'}
              </p>
              <div className="flex gap-4 mt-4 text-sm text-muted">
                <span className="flex items-center gap-1"><BookIcon size={16} /> {lecturesCount} محاضرة</span>
                {validityDate && (
                  <span className="flex items-center gap-1"><ClockIcon size={16} /> متاح حتى: {new Date(validityDate).toLocaleDateString('ar-EG')}</span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 min-w-[250px] text-center shadow-sm">
              {isPurchased ? (
                <div>
                  <CheckCircleIcon size={40} className="mb-2" style={{ color: 'var(--success)', margin: '0 auto 0.5rem' }} />
                  <h3 className="font-bold text-success text-xl">أنت مشترك</h3>
                  <p className="text-sm text-muted mt-2">يمكنك البدء في مشاهدة المحاضرات فوراً</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted font-bold mb-1">سعر الكورس</p>
                  <div className="text-3xl font-black text-primary mb-4" dir="ltr">
                    {price} <span className="text-sm">EGP</span>
                  </div>
                  {walletBalance !== null && (
                    <p className="text-xs text-muted mb-4 border-t pt-2">
                      رصيدك الحالي: <span className="font-bold text-success">{walletBalance} EGP</span>
                    </p>
                  )}
                  {!isLoggedIn ? (
                    <button onClick={() => router.push('/login')} className="btn btn-primary w-full">
                      سجل الدخول للشراء
                    </button>
                  ) : walletBalance !== null && walletBalance < price ? (
                    <button onClick={() => router.push('/wallet')} className="btn btn-warning w-full">
                      رصيدك لا يكفي - اشحن محفظتك
                    </button>
                  ) : (
                    <button onClick={handlePurchase} disabled={purchasing} className="btn btn-primary w-full">
                      {purchasing ? 'جاري الشراء...' : 'شراء الآن'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">محتوى الكورس</h2>
          
          <div className="flex flex-col gap-3">
            {course.lectures.length === 0 ? (
              <div className="card text-center p-8 text-muted">لا توجد محاضرات في هذا الكورس بعد</div>
            ) : course.lectures.map((lecture, index) => {
              
              const isLocked = lecture.isLocked ?? lecture.is_locked ?? true;
              const isUnlocked = (lecture as any).isUnlocked ?? (lecture as any).is_unlocked ?? !isLocked;
              const isAvailable = isUnlocked;
              
              const vStatus = lecture.video_status ?? lecture.encodingStatus ?? 'completed';
              const isProcessing = vStatus === 'processing';
              const isFailed = vStatus === 'failed';
              const isReady = !isProcessing && !isFailed;
              
              const isClickable = isAvailable && isReady;

              return (
                <div
                  key={lecture.id}
                  onClick={() => {
                    if (!isAvailable) {
                      // إذا لم يشتر الكورس أو المحاضرة مغلقة — لا يحدث شيء مرئي عند الضغط
                      handleLectureClick(lecture.id, isPurchased, isLocked, isUnlocked);
                    } else if (!isReady) {
                      showToast('الفيديو جاري تجهيزه حالياً', 'error');
                    } else {
                      handleLectureClick(lecture.id, isPurchased, isLocked, isUnlocked);
                    }
                  }}
                  className="card flex items-center justify-between p-4 transition-all"
                  style={{
                    cursor: isClickable ? 'pointer' : 'not-allowed',
                    opacity: isAvailable ? 1 : 0.6,
                    border: '1px solid var(--border)',
                    borderInlineStart: isAvailable ? '4px solid var(--success)' : '4px solid var(--text-muted)',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (isClickable) {
                      e.currentTarget.style.transform = 'translateX(-4px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className={`font-bold ${isAvailable ? 'text-primary' : 'text-gray-500'}`}>
                        {lecture.title}
                      </h3>
                      {lecture.description && (
                        <p className="text-sm text-muted mt-1 line-clamp-1">{lecture.description}</p>
                      )}
                      {!isAvailable && !isPurchased && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>اشترِ الكورس للوصول</p>
                      )}
                      {!isAvailable && isPurchased && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>أكمل المحاضرة السابقة أولاً</p>
                      )}
                    </div>
                  </div>
 
                  {isAvailable && (
                    <div className="mx-4 flex-shrink-0">
                      {isProcessing && (
                        <span className="badge badge-warning text-xs flex items-center gap-1"><ClockIcon size={12} /> جاري التجهيز...</span>
                      )}
                      {isFailed && (
                        <span className="badge badge-error text-xs flex items-center gap-1"><AlertTriangleIcon size={12} /> الفيديو غير متاح</span>
                      )}
                    </div>
                  )}
                  
                  {isAvailable && isReady && (
                    <span className="shrink-0" style={{ color: 'var(--success)' }}>
                      <PlayIcon size={24} />
                    </span>
                  )}
                  
                  {!isAvailable && (
                    <div className="text-muted shrink-0">
                      <LockIcon size={22} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
