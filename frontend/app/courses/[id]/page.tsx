'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import api from '@/lib/axios'; 
import { useAuthStore } from '@/store/useAuthStore'; 
import {
  BookIcon, PlayIcon, LockIcon, ClockIcon,
  AlertTriangleIcon, CheckCircleIcon, ShieldIcon,
  AwardIcon, VideoIcon
} from '@/app/components/Icons';

interface Lecture {
  id: number;
  title: string;
  description: string;
  orderIndex: number;
  isLocked: boolean;
  videoStatus: string;
}

interface Exam {
  id: number;
  title: string;
  durationMinutes: number;
  passScore: number;
  startTime: string;
  endTime: string;
  isPurchased: boolean;
}

interface Course {
  id: number;
  title: string;
  description: string;
  pricePoints: number;
  validityDate: string | null;
  lecturesCount: number;
  isPurchased: boolean;
  lectures: Lecture[];
}

export default function CourseDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;

  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [courseExams, setCourseExams] = useState<Exam[]>([]); 
  
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  useEffect(() => {
    if (confirmDialog) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [confirmDialog]);

  useEffect(() => {
    if (courseId && !authLoading) {
      fetchCourseData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, authLoading, isAuthenticated]);

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const courseRes = await api.get(`/courses/${courseId}`);
      const cData = courseRes.data?.data || courseRes.data;
      
      const rawLectures = Array.isArray(cData.lectures) ? cData.lectures : [];
      
      // 🚀 إصلاح مشكلة حالة الشراء: التأكد التام من تقييم الحالة
      const isCoursePurchased = cData.is_purchased === true || cData.isPurchased === true;

      setCourse({
        id: cData.id,
        title: cData.title || 'بدون عنوان',
        description: cData.description || '',
        pricePoints: Number(cData.price_points ?? cData.pricePoints ?? 0),
        validityDate: cData.validity_date ?? cData.validityDate ?? null,
        // 🚀 إصلاح مشكلة عدد المحاضرات: استخدام طول المصفوفة كخطة بديلة أكيدة
        lecturesCount: Number(cData.lectures_count ?? cData.lecturesCount ?? rawLectures.length),
        isPurchased: isCoursePurchased,
        lectures: rawLectures.map((l: any) => ({
          id: l.id,
          title: l.title || 'محاضرة',
          description: l.description || '',
          orderIndex: Number(l.order_index ?? l.orderIndex ?? 0),
          // 🚀 إذا كان الكورس مشترى، فك القفل ظاهرياً عن جميع المحاضرات فوراً
          isLocked: isCoursePurchased ? false : !!(l.is_locked ?? l.isLocked ?? true),
          videoStatus: l.video_status ?? l.videoStatus ?? 'completed',
        })).sort((a: Lecture, b: Lecture) => a.orderIndex - b.orderIndex)
      });

      if (isAuthenticated) {
        const [walletRes, examsRes] = await Promise.allSettled([
          api.get('/wallet/balance'),
          api.get('/comprehensive-exams/available')
        ]);

        if (walletRes.status === 'fulfilled') {
          setWalletBalance(Number(walletRes.value.data?.data?.balance ?? walletRes.value.data?.balance ?? 0));
        }

        if (examsRes.status === 'fulfilled') {
          const rawExams = examsRes.value.data?.data || examsRes.value.data || [];
          const validExams = Array.isArray(rawExams) ? rawExams : [];
          
          const filteredExams = validExams.filter((ex: any) => String(ex.course_id ?? ex.courseId) === String(courseId) || ex.course_title === cData.title);
          
          setCourseExams(filteredExams.map((ex: any) => ({
            id: ex.id,
            title: ex.title || 'اختبار شامل',
            durationMinutes: Number(ex.duration_minutes ?? ex.durationMinutes ?? 60),
            passScore: Number(ex.pass_score ?? ex.passScore ?? 50),
            startTime: ex.start_time ?? ex.startTime,
            endTime: ex.end_time ?? ex.endTime,
            isPurchased: !!(ex.is_purchased ?? ex.isPurchased),
          })));
        }
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        showToast('هذا الكورس غير متاح حالياً أو أنه لا يزال قيد التجهيز (مسودة)', 'error');
      } else {
        showToast(err?.message || 'فشل تحميل بيانات الكورس', 'error');
      }
      setTimeout(() => router.push('/courses'), 2500);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseClick = () => {
    if (!course) return;

    if (!isAuthenticated) {
      showToast('يجب تسجيل الدخول أولاً لشراء الكورس', 'error');
      router.push('/login');
      return;
    }

    if (walletBalance === null || walletBalance < course.pricePoints) {
      showToast('رصيدك غير كافٍ. يرجى شحن محفظتك أولاً.', 'error');
      router.push('/wallet');
      return;
    }

    setConfirmDialog({
      visible: true,
      message: `هل أنت متأكد من الاشتراك في هذا الكورس؟ سيتم خصم ${course.pricePoints} ج.م من محفظتك.`,
      onConfirm: executePurchase
    });
  };

  const executePurchase = async () => {
    setConfirmDialog(null);
    setPurchasing(true);
    try {
      const response = await api.post(`/courses/${courseId}/purchase`);
      
      showToast('🎉 مبروك! تم الاشتراك في الكورس بنجاح.', 'success');
      
      const newBalance = Number(response.data?.data?.newBalance ?? response.data?.new_balance ?? (walletBalance! - course!.pricePoints));
      setWalletBalance(newBalance);
      
      // 🚀 تحديث حالة الكورس والمحاضرات فوراً بعد الشراء الناجح بدون إعادة تحميل
      setCourse(prev => prev ? { 
        ...prev, 
        isPurchased: true, 
        lectures: prev.lectures.map(l => ({ ...l, isLocked: false })) 
      } : null);
      
      setCourseExams(prev => prev.map(ex => ({ ...ex, isPurchased: true })));

    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'فشل شراء الكورس، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setPurchasing(false);
    }
  };

  const handleStartLearning = () => {
    if (course?.lectures && course.lectures.length > 0) {
      router.push(`/lectures/${course.lectures[0].id}`);
    } else {
      showToast('لا توجد محاضرات في هذا الكورس بعد.', 'error');
    }
  };

  const handleLectureClick = (lectureId: number, isPurchased: boolean, isLocked: boolean) => {
    if (!isAuthenticated) {
      showToast('يجب تسجيل الدخول لفتح المحاضرات', 'error');
      router.push('/login');
      return;
    }
    if (!isPurchased && isLocked) {
      showToast('يجب شراء الكورس أولاً لفتح المحاضرات', 'error');
      return;
    }
    router.push(`/lectures/${lectureId}`);
  };

  if (loading || authLoading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex justify-center items-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    </div>
  );

  if (!course) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 relative font-sans">
      <Navbar />

      {/* نظام الإشعارات */}
      <div className="toast-container" style={{ position: 'fixed', top: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'all 0.3s', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none', width: 'max-content', maxWidth: '90vw' }}>
        <div className={`flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg text-white font-bold text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertTriangleIcon size={20} />}
          {toast.message}
        </div>
      </div>

      {/* نافذة تأكيد الدفع */}
      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }} onClick={() => setConfirmDialog(null)}>
          <div className="bg-white shadow-2xl max-w-sm w-full text-center p-8 rounded-3xl animate-scale-up border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-5 text-blue-600"><BookIcon size={56} /></div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الاشتراك</h3>
            <p className="text-gray-600 mb-8 leading-relaxed font-bold">{confirmDialog.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">إلغاء</button>
              <button onClick={confirmDialog.onConfirm} className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">تأكيد الدفع</button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 animate-fade-in">
        <button onClick={() => router.push('/courses')} className="text-sm font-bold text-gray-400 hover:text-blue-600 mb-6 flex items-center gap-1 transition-colors">
          &rarr; العودة لمتجر الكورسات
        </button>

        {/* 🎨 كارت تعريف الكورس (الرئيسي) */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden mb-10 relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-cyan-400"></div>
          
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-2/3 p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start">
              <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 bg-blue-50/50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner border border-blue-100 mx-auto md:mx-0">
                <BookIcon size={48} className="md:w-16 md:h-16" />
              </div>
              <div className="text-center md:text-right w-full">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">{course.title}</h1>
                <p className="text-gray-600 font-medium leading-relaxed mb-6">
                  {course.description || 'لا يوجد وصف لهذا الكورس حتى الآن.'}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm font-bold text-gray-600">
                  <span className="flex items-center gap-1.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                    <VideoIcon size={18} className="text-blue-600"/> {course.lecturesCount} محاضرة
                  </span>
                  {course.validityDate ? (
                    <span className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-4 py-2 rounded-xl border border-orange-200">
                      <ClockIcon size={18}/> متاح حتى: {new Date(course.validityDate).toLocaleDateString('ar-EG')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-200">
                      <CheckCircleIcon size={18}/> وصول مدى الحياة
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 🎨 قسم الدفع أو بدء التعلم (Status Panel) */}
            <div className="lg:w-1/3 bg-gray-50 p-8 md:p-10 flex flex-col justify-center border-t lg:border-t-0 lg:border-r border-gray-200 shadow-inner">
              {course.isPurchased ? (
                <div className="text-center animate-fade-in">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-green-200">
                    <CheckCircleIcon size={40} className="text-green-600" />
                  </div>
                  <h3 className="font-black text-green-600 text-2xl mb-2">أنت مشترك بالفعل!</h3>
                  <p className="text-gray-500 font-bold text-sm mb-6">جاهز لبدء رحلة التعلم؟</p>
                  
                  {/* 🚀 الزر الجديد: بدء مشاهدة الكورس */}
                  <button onClick={handleStartLearning} className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-2 transition-transform hover:-translate-y-1">
                    <PlayIcon size={20} /> ابدأ التعلم الآن
                  </button>
                </div>
              ) : (
                <div className="text-center animate-fade-in">
                  <span className="text-sm font-bold text-gray-500 block mb-2">سعر الاشتراك في الكورس</span>
                  <div className="text-4xl font-black text-blue-600 font-mono mb-6 flex justify-center items-end gap-2">
                    {course.pricePoints} <span className="text-lg text-gray-400 font-bold mb-1">ج.م</span>
                  </div>
                  
                  {isAuthenticated && walletBalance !== null && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex justify-between items-center shadow-sm">
                      <span className="text-sm font-bold text-gray-500">رصيد محفظتك:</span>
                      <span className={`font-black text-lg ${walletBalance >= course.pricePoints ? 'text-green-600' : 'text-red-600'}`} dir="ltr">{walletBalance} ج.م</span>
                    </div>
                  )}

                  {!isAuthenticated ? (
                    <button onClick={() => router.push('/login')} className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700">
                      سجل الدخول للشراء
                    </button>
                  ) : walletBalance !== null && walletBalance < course.pricePoints ? (
                    <button onClick={() => router.push('/wallet')} className="w-full py-4 bg-white border-2 border-yellow-500 text-yellow-600 text-lg font-black rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-50 transition-colors">
                      <AlertTriangleIcon size={20} /> اشحن محفظتك للمتابعة
                    </button>
                  ) : (
                    <button onClick={handlePurchaseClick} disabled={purchasing} className="w-full py-4 bg-green-600 text-white text-lg font-black rounded-xl shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 hover:bg-green-700">
                      {purchasing ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : <><LockIcon size={20} /> تأكيد الشراء الآن</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🎨 قسم الاختبارات الشاملة */}
        {isAuthenticated && courseExams.length > 0 && (
          <div className="mb-12 animate-fade-in">
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <ShieldIcon size={28} className="text-blue-600" />
              الاختبارات الشاملة (ميدتيرم / نهائي)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {courseExams.map(exam => (
                <div key={exam.id} onClick={() => router.push(`/exams/${exam.id}`)} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between group">
                  <div>
                    <h3 className="font-black text-lg text-gray-900 group-hover:text-blue-600 transition-colors mb-2">{exam.title}</h3>
                    <div className="flex gap-4 text-sm font-bold text-gray-500">
                      <span className="flex items-center gap-1.5"><ClockIcon size={16} className="text-gray-400"/> {exam.durationMinutes} دقيقة</span>
                      <span className="flex items-center gap-1.5 text-green-600"><AwardIcon size={16}/> نجاح: {exam.passScore}%</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    &larr;
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🎨 قسم قائمة المحاضرات (المنهج) */}
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <PlayIcon size={28} className="text-blue-600" />
            محتوى المنهج
          </h2>
          
          <div className="flex flex-col gap-4">
            {course.lectures.length === 0 ? (
              <div className="bg-white border-2 border-gray-200 border-dashed rounded-3xl p-16 text-center">
                <BookIcon size={56} className="text-gray-300 mx-auto mb-4" />
                <p className="font-bold text-gray-500 text-lg">جاري تجهيز محتوى هذا الكورس، سيتم إضافة المحاضرات قريباً.</p>
              </div>
            ) : course.lectures.map((lecture, index) => {
              
              const isAvailable = course.isPurchased || !lecture.isLocked;
              const isProcessing = lecture.videoStatus === 'processing' || lecture.videoStatus === 'uploading';
              const isFailed = lecture.videoStatus === 'failed';
              const isReady = !isProcessing && !isFailed;
              
              return (
                <div
                  key={lecture.id}
                  onClick={() => {
                    if (isAvailable && isReady) {
                      handleLectureClick(lecture.id, course.isPurchased, lecture.isLocked);
                    }
                  }}
                  className={`bg-white rounded-2xl p-5 border transition-all duration-300 flex items-center justify-between group
                    ${isAvailable && isReady ? 'cursor-pointer border-gray-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-1' : 'opacity-80 border-gray-100 bg-gray-50'}
                  `}
                >
                  <div className="flex items-center gap-5 flex-1">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 border ${isAvailable ? 'bg-blue-50/50 text-blue-600 border-blue-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className={`text-lg font-black mb-1 ${isAvailable ? 'text-gray-900 group-hover:text-blue-600 transition-colors' : 'text-gray-500'}`}>
                        {lecture.title}
                      </h3>
                      {lecture.description && (
                        <p className="text-sm text-gray-500 font-medium line-clamp-1 max-w-2xl">{lecture.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="mx-4 flex-shrink-0 flex items-center gap-3">
                    {isAvailable && isProcessing && (
                      <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 animate-pulse"><ClockIcon size={16} /> جاري المعالجة...</span>
                    )}
                    {isAvailable && isFailed && (
                      <span className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><AlertTriangleIcon size={16} /> خطأ في الفيديو</span>
                    )}
                    
                    {isAvailable && isReady && (
                      <button className="flex items-center gap-2 bg-blue-50 text-blue-600 px-5 py-2.5 rounded-xl font-bold border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <PlayIcon size={18} /> <span>تشغيل</span>
                      </button>
                    )}
                    
                    {(!isAvailable || lecture.isLocked) && !course.isPurchased && (
                      <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-5 py-2.5 rounded-xl font-bold border border-gray-200">
                        <LockIcon size={18} /> <span>مقفلة</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}