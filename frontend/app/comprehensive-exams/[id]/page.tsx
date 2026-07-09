'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
import api from '@/lib/axios'; // 🚀 العميل الشبكي المحمي
import {
  ShieldIcon, ClockIcon, AwardIcon, CalendarIcon, CheckCircleIcon,
  CreditCardIcon, AlertTriangleIcon, FileTextIcon, PlayIcon
} from '@/app/components/Icons';

interface ExamDetails {
  id: number;
  title: string;
  courseTitle: string;
  instructions: string;
  pricePoints: number;
  durationMinutes: number;
  passScore: number;
  startTime: string;
  endTime: string;
  maxAttempts: number;
  questionsCount: number;
  isPurchased: boolean;
  attemptsUsed: number;
  status: 'upcoming' | 'active' | 'ended';
  userWalletBalance: number;
}

export default function StudentExamDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id;

  const { isChecking } = useAuthGuard();

  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  // تجميد التمرير للـ Modal
  useEffect(() => {
    if (confirmDialog) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [confirmDialog]);

  useEffect(() => {
    if (!isChecking && examId) {
      fetchExamDetails();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, isChecking]);

  const fetchExamDetails = async () => {
    setLoading(true);
    try {
      // ⚠️ /api/comprehensive-exams/{id} is DEAD (controller method missing).
      // Workaround: call /api/comprehensive-exams/available, then look up the
      // requested exam in the returned list. The list uses snake_case fields
      // (price_points, course_title, is_purchased, duration_minutes, ...) per
      // the inventory §32.3 holdover note — read both casings defensively.
      const response = await api.get('/comprehensive-exams/available');
      const payload: any = response;
      const list: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.data)
        ? payload.data.data
        : [];
      const data = list.find((e) => String(e.id) === String(examId));
      if (!data) {
        throw new Error('الاختبار غير موجود أو لم يتم نشره بعد');
      }
      
      setExam({
        id: data.id,
        title: data.title,
        courseTitle: data.course_title ?? data.courseTitle ?? 'عام',
        instructions: data.instructions,
        pricePoints: data.price_points ?? data.pricePoints ?? 0,
        durationMinutes: data.duration_minutes ?? data.durationMinutes ?? 60,
        passScore: data.pass_score ?? data.passScore ?? 50,
        startTime: data.start_time ?? data.startTime,
        endTime: data.end_time ?? data.endTime,
        maxAttempts: data.max_attempts ?? data.maxAttempts ?? 1,
        questionsCount: data.questions_count ?? data.questionsCount ?? 0,
        isPurchased: !!(data.is_purchased ?? data.isPurchased),
        attemptsUsed: data.attempts_used ?? data.attemptsUsed ?? 0,
        status: data.status ?? 'active',
        userWalletBalance: data.user_wallet_balance ?? data.userWalletBalance ?? 0,
      });
    } catch (err: any) {
      showToast(err?.message || 'فشل تحميل بيانات الاختبار', 'error');
      setTimeout(() => router.push('/courses'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = () => {
    if (!exam) return;

    if (exam.userWalletBalance < exam.pricePoints) {
      showToast('رصيد محفظتك غير كافٍ. قم بشحن المحفظة أولاً.', 'error');
      return;
    }

    setConfirmDialog({
      visible: true,
      message: `سيتم خصم ${exam.pricePoints} ج.م من رصيد محفظتك لشراء هذا الاختبار. هل أنت متأكد؟`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setProcessingAction(true);
        try {
          // The /purchase response uses snake_case (comprehensive_exam_id,
          // amount_paid, new_balance, wallet_transaction_id) — see inventory
          // §32.3 holdover. The frontend axios interceptor returns
          // `response.data.data`, which for the standard envelope is the
          // purchase object. Read both casings defensively in the success
          // toast (e.g. show new balance when available).
          const purchaseRes: any = await api.post(`/comprehensive-exams/${exam.id}/purchase`);
          const purchaseData = purchaseRes?.data ?? purchaseRes;
          const newBalance = purchaseData?.new_balance ?? purchaseData?.newBalance;
          const alreadyOwned = purchaseData?.already_owned ?? purchaseData?.alreadyOwned;
          if (alreadyOwned) {
            showToast('هذا الاختبار مفعّل لديك بالفعل. يمكنك البدء الآن.', 'success');
          } else {
            showToast(
              newBalance !== undefined
                ? `تم شراء الاختبار بنجاح! رصيدك الجديد ${newBalance} ج.م`
                : 'تم شراء الاختبار بنجاح! يمكنك البدء الآن.',
              'success'
            );
          }
          fetchExamDetails(); // تحديث الحالة لتظهر "بدء الاختبار"
        } catch (err: any) {
          showToast(err?.message || err?.error || 'فشل إتمام عملية الشراء', 'error');
        } finally {
          setProcessingAction(false);
        }
      }
    });
  };

  const handleStartExam = () => {
    if (!exam) return;

    if (exam.status === 'upcoming') {
      showToast('لم يحن موعد الاختبار بعد.', 'error');
      return;
    }
    if (exam.status === 'ended') {
      showToast('لقد انتهى الوقت المخصص لهذا الاختبار.', 'error');
      return;
    }
    if (exam.attemptsUsed >= exam.maxAttempts) {
      showToast('لقد استنفدت الحد الأقصى للمحاولات المسموحة لك.', 'error');
      return;
    }

    setConfirmDialog({
      visible: true,
      message: 'بمجرد الضغط على "تأكيد"، سيبدأ العداد التنازلي للاختبار ولن تتمكن من إيقافه. تأكد من استقرار الإنترنت لديك. هل أنت مستعد؟',
      onConfirm: () => {
        setConfirmDialog(null);
        // توجيه الطالب لصفحة قاعة الامتحان (حيث العداد والأسئلة)
        router.push(`/student/exams/${exam.id}/take`);
      }
    });
  };

  if (isChecking || loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="spinner spinner-primary spinner-lg mb-4" />
          <p className="font-bold text-gray-500">جاري تجهيز بيانات الاختبار...</p>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-20">
      <Navbar />

      {/* 🚀 نظام التنبيهات */}
      <div className="toast-container" style={{ position: 'fixed', top: '2rem', left: '2rem', zIndex: 1000, transition: 'all 0.3s', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertTriangleIcon size={20} />}
          {toast.message}
        </div>
      </div>

      {/* 🚀 نافذة التأكيد الذكية */}
      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }} onClick={() => setConfirmDialog(null)}>
          <div className="bg-white shadow-2xl max-w-md w-full text-center p-8 rounded-3xl animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-5 text-primary"><ShieldIcon size={56} /></div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الإجراء</h3>
            <p className="text-gray-600 mb-8 leading-relaxed font-bold">{confirmDialog.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 py-3 font-bold border-gray-300">إلغاء</button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-primary flex-1 py-3 font-black shadow-lg shadow-blue-200">تأكيد الإجراء</button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 animate-fade-in">
        <button onClick={() => router.back()} className="text-sm font-bold text-gray-400 hover:text-primary mb-6 flex items-center gap-1 transition-colors">
          &rarr; العودة للمتجر
        </button>

        {/* كارت معلومات الاختبار */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden mb-8 relative">
          {/* شريط زينة علوي */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-blue-400"></div>
          
          <div className="p-8 md:p-10">
            <span className="inline-block px-3 py-1.5 bg-blue-50 text-primary text-xs font-black rounded-lg border border-blue-100 mb-4">
              كورس: {exam.courseTitle}
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-8">{exam.title}</h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div>
                <span className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><ClockIcon size={14}/> المدة</span>
                <span className="font-black text-gray-800 text-lg">{exam.durationMinutes} دقيقة</span>
              </div>
              <div className="border-r border-gray-200 pr-4">
                <span className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><FileTextIcon size={14}/> الأسئلة</span>
                <span className="font-black text-primary text-lg">{exam.questionsCount} أسئلة</span>
              </div>
              <div className="border-r border-gray-200 pr-4">
                <span className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><AwardIcon size={14}/> النجاح</span>
                <span className="font-black text-success text-lg">{exam.passScore}%</span>
              </div>
              <div className="border-r border-gray-200 pr-4">
                <span className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><ShieldIcon size={14}/> المحاولات</span>
                <span className="font-black text-orange-600 text-lg">{exam.attemptsUsed} / {exam.maxAttempts}</span>
              </div>
            </div>

            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 mb-8">
              <h4 className="font-black text-primary flex items-center gap-2 mb-4"><CalendarIcon size={20} /> نافذة الإتاحة (Time Window)</h4>
              <div className="flex flex-col md:flex-row justify-between gap-4 font-bold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  يبدأ: <span dir="ltr">{new Date(exam.startTime).toLocaleString('ar-EG')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  يغلق: <span dir="ltr">{new Date(exam.endTime).toLocaleString('ar-EG')}</span>
                </div>
              </div>
            </div>

            {exam.instructions && (
              <div className="mb-8">
                <h4 className="font-black text-gray-800 flex items-center gap-2 mb-3"><AlertTriangleIcon size={20} className="text-warning"/> تعليمات قبل البدء</h4>
                <p className="text-gray-600 font-medium leading-relaxed bg-gray-50 p-5 rounded-2xl border border-gray-100 whitespace-pre-wrap">
                  {exam.instructions}
                </p>
              </div>
            )}
            
            <div className="pt-8 border-t border-gray-100 flex flex-col items-center">
              {exam.isPurchased ? (
                <div className="w-full flex flex-col items-center">
                  {exam.status === 'upcoming' && (
                    <div className="w-full bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 font-bold text-center mb-4">
                      ⏳ لم يحن موعد الاختبار بعد. يرجى الانتظار حتى الموعد المحدد.
                    </div>
                  )}
                  {exam.status === 'ended' && (
                    <div className="w-full bg-gray-100 text-gray-600 p-4 rounded-xl border border-gray-200 font-bold text-center mb-4">
                      🔒 عذراً، لقد انتهت النافذة الزمنية المخصصة لهذا الاختبار وتم إغلاقه.
                    </div>
                  )}
                  <button 
                    onClick={handleStartExam} 
                    disabled={exam.status !== 'active' || exam.attemptsUsed >= exam.maxAttempts}
                    className="w-full md:w-auto min-w-[300px] btn btn-primary py-4 text-lg font-black shadow-xl shadow-blue-200 flex justify-center items-center gap-3 transition-transform hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <PlayIcon size={24} /> {exam.attemptsUsed >= exam.maxAttempts ? 'استنفدت المحاولات المسموحة' : 'بدء الاختبار الآن'}
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center bg-gray-50 p-6 rounded-2xl border border-gray-200">
                  <span className="text-sm font-bold text-gray-500 mb-2">هذا الاختبار متاح للشراء كمنتج مستقل</span>
                  <div className="font-black text-4xl text-primary font-mono mb-6">
                    {exam.pricePoints > 0 ? `${exam.pricePoints} ج.م` : 'مجاني'}
                  </div>
                  
                  <div className="w-full flex flex-col sm:flex-row justify-center gap-4">
                    <div className="bg-white px-5 py-3 rounded-xl border border-gray-200 flex items-center justify-between min-w-[200px] shadow-sm">
                      <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5"><CreditCardIcon size={16}/> رصيدك الحالي:</span>
                      <span className="font-black text-success" dir="ltr">{exam.userWalletBalance} ج</span>
                    </div>
                    <button 
                      onClick={handlePurchase}
                      disabled={processingAction}
                      className="btn btn-success py-3 px-8 text-base font-black shadow-lg shadow-green-200 flex justify-center items-center gap-2"
                    >
                      {processingAction ? <span className="spinner spinner-light w-5 h-5 border-2" /> : <><CheckCircleIcon size={20}/> إتمام الشراء وخصم الرصيد</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

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