'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابات المركزي
import api from '@/lib/axios'; // 🚀 العميل الشبكي الذكي
import {
  FileTextIcon, CheckIcon, XIcon, BookIcon,
  UserIcon, CheckCircleIcon, AlertCircleIcon, ExternalLinkIcon
} from '../../components/Icons';

interface Submission {
  id: number;
  status: string;
  filePath: string;
  submittedAt: string;
  student: {
    id: number;
    fullName: string;
    phone: string;
    studentNumber: string;
  };
  homework: {
    id: number;
    title: string;
  };
  lecture: {
    id: number;
    title: string;
  };
  course: {
    id: number;
    title: string;
  };
}

export default function AdminHomeworkPage() {
  // 🚀 درع الحماية: يطرد أي متطفل فوراً ويعرض شاشة التحميل
  const { isChecking } = useAuthGuard(['admin']);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [score, setScore] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // 🚀 نظام التنبيهات الموحد الأنيق
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  // 🚀 تجميد التمرير (Scroll Lock) بشكل آمن
  useEffect(() => {
    if (reviewingSubmission) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [reviewingSubmission]);

  useEffect(() => {
    if (!isChecking) {
      fetchSubmissions(page);
    }
  }, [page, isChecking]);

  const fetchSubmissions = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const response = await api.get('/admin/homework/submissions', {
        params: { page: pageNumber }
      });
      
      const data = response.data;
      const rawSubmissions = data?.data?.data || data?.data || data || [];
      
      // 🚀 توافقية آمنة (Sanitization) لاستخراج البيانات
      const validSubmissions = Array.isArray(rawSubmissions) ? rawSubmissions : [];
      
      const mappedSubmissions: Submission[] = validSubmissions.map((sub: any) => ({
        id: sub.id,
        status: sub.status || 'pending',
        filePath: sub.file_path || sub.filePath || '',
        submittedAt: sub.submitted_at || sub.submittedAt || new Date().toISOString(),
        student: {
          id: sub.student?.id,
          fullName: sub.student?.full_name || sub.student?.fullName || 'طالب غير محدد',
          phone: sub.student?.phone || '—',
          studentNumber: sub.student?.student_number || sub.student?.studentNumber || '—',
        },
        homework: {
          id: sub.homework?.id,
          title: sub.homework?.title || 'واجب غير محدد',
        },
        lecture: {
          id: sub.lecture?.id,
          title: sub.lecture?.title || 'محاضرة غير محددة',
        },
        course: {
          id: sub.course?.id,
          title: sub.course?.title || 'كورس غير محدد',
        },
      }));

      setSubmissions(mappedSubmissions);
      setTotalPages(data?.meta?.last_page || data?.meta?.lastPage || data?.data?.last_page || 1);
    } catch (e: any) {
      showToast(e?.message || 'فشل تحميل الواجبات المعلقة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (submission: Submission, type: 'approved' | 'rejected') => {
    setReviewingSubmission(submission);
    setActionType(type);
    setRejectionReason('');
    setScore('100');
  };

  const handleCloseReview = () => {
    setReviewingSubmission(null);
    setActionType(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingSubmission || !actionType) return;

    // 🚀 تأمين المدخلات
    if (actionType === 'rejected' && (!rejectionReason.trim() || rejectionReason.length < 5)) {
      showToast('يرجى كتابة سبب رفض واضح (5 أحرف على الأقل)', 'error');
      return;
    }
    
    const parsedScore = parseInt(score);
    if (actionType === 'approved' && (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100)) {
      showToast('يرجى إدخال درجة صحيحة بين 0 و 100', 'error');
      return;
    }

    setSubmittingReview(true);

    try {
      await api.post(`/admin/homework/submissions/${reviewingSubmission.id}/review`, {
        status: actionType,
        rejection_reason: actionType === 'rejected' ? rejectionReason.trim() : undefined,
        score: actionType === 'approved' ? parsedScore : undefined,
      });

      showToast(actionType === 'approved' ? 'تم قبول الواجب ورصد الدرجة بنجاح!' : 'تم رفض الواجب وإبلاغ الطالب.', 'success');
      handleCloseReview();
      fetchSubmissions(page);
    } catch (error: any) {
      showToast(error?.message || error?.error || 'فشل إرسال التقييم للمحاولة', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // 🚀 دالة ذكية لمعالجة روابط الملفات
  const getFileUrl = (path: string) => {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
    return `${baseUrl}/storage/${path}`;
  };

  if (isChecking) {
    return (
      <div className="admin-layout relative">
        <AdminSidebar />
        <main className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="loading-state text-center flex flex-col items-center">
            <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
            <p className="font-bold text-muted text-lg">جاري تحميل سجل الواجبات...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      <AdminSidebar />

      {/* 🚀 نظام التنبيهات الموحد العائم */}
      <div 
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
        style={{ 
          opacity: toast.visible ? 1 : 0, 
          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
          pointerEvents: toast.visible ? 'auto' : 'none' 
        }}
      >
        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
          <span>{toast.message}</span>
        </div>
      </div>

      <main className="admin-content">
        <div className="page-header mb-8">
          <div>
            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
              <FileTextIcon size={32} className="text-primary" />
              مراجعة الواجبات
            </h1>
            <p className="page-subtitle text-base mt-2">قم بتقييم وقبول أو رفض واجبات الطلاب المعلقة في مختلف الكورسات.</p>
          </div>
        </div>

        {loading ? (
          <div className="card p-16 flex flex-col justify-center items-center shadow-sm border border-gray-100 rounded-2xl bg-white">
            <div className="spinner spinner-primary spinner-lg mb-4" />
            <p className="text-muted font-bold text-lg">جاري سحب طلبات الواجبات من السيرفر...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="empty-state bg-white rounded-2xl py-20 shadow-sm text-center">
            <div className="empty-state-icon bg-green-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircleIcon size={48} className="text-success" />
            </div>
            <h3 className="text-2xl font-black text-success mb-3">صندوق المراجعة فارغ!</h3>
            <p className="text-gray-500 font-medium text-lg">تم تقييم جميع الواجبات المرفوعة بنجاح، لا يوجد أي تراكمات.</p>
          </div>
        ) : (
          <>
            <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              {/* 🚀 الحماية من التداخل في الشاشات الصغيرة */}
              <div className="overflow-x-auto w-full">
                <table className="table w-full m-0 min-w-[900px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">بيانات الطالب</th>
                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">الكورس والمحاضرة</th>
                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">اسم الواجب</th>
                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">تاريخ الرفع</th>
                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">الملف المرفق</th>
                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">إجراءات التقييم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-primary font-black text-lg flex items-center justify-center shadow-inner shrink-0">
                              {sub.student.fullName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-gray-900 text-sm">{sub.student.fullName}</div>
                              <div className="text-xs text-gray-500 font-mono font-bold mt-1" dir="ltr">{sub.student.studentNumber !== '—' ? `#${sub.student.studentNumber}` : sub.student.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div>
                            <div className="font-bold text-primary flex items-center gap-1.5"><BookIcon size={16} className="text-gray-400"/> {sub.course.title}</div>
                            <div className="text-[11px] font-bold text-gray-500 mt-1.5 bg-gray-50 px-2 py-1 rounded-md inline-block border border-gray-200">{sub.lecture.title}</div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className="font-black text-gray-800 text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 inline-block">{sub.homework.title}</span>
                        </td>
                        <td className="py-4 px-5 text-center align-middle">
                          <div className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1.5 rounded-lg inline-block border border-gray-100 shadow-sm" dir="ltr">
                            {/* 🚀 حماية ضد Null */}
                            {new Date((sub.filePath || '').includes('dummy') ? new Date().toISOString() : sub.submittedAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </td>
                        <td className="py-4 px-5 text-center align-middle">
                          <a
                            href={getFileUrl(sub.filePath)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-outline font-bold flex items-center justify-center gap-2 mx-auto hover:bg-gray-50 shadow-sm rounded-xl py-2 px-4 border-gray-200"
                          >
                            <ExternalLinkIcon size={16} className="text-primary" /> فتح الملف
                          </a>
                        </td>
                        <td className="py-4 px-5 text-center align-middle">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleOpenReview(sub, 'approved')}
                              className="btn btn-sm btn-success font-bold flex items-center gap-1.5 shadow-sm rounded-lg px-4"
                            >
                              <CheckIcon size={16} /> قبول
                            </button>
                            <button
                              onClick={() => handleOpenReview(sub, 'rejected')}
                              className="btn btn-sm btn-outline text-error border-error hover:bg-red-50 font-bold flex items-center gap-1.5 shadow-sm rounded-lg px-4"
                            >
                              <XIcon size={16} /> رفض
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-full shadow-sm border border-gray-200 inline-flex mx-auto">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold hover:bg-gray-50 border-none transition-colors"
                >
                  السابق
                </button>
                <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">
                  الصفحة {page} من {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold hover:bg-gray-50 border-none transition-colors"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* 🚀 نافذة التقييم والمراجعة الأنيقة والمحصنة */}
      {reviewingSubmission && actionType && (
        <div className="fixed inset-0 flex items-center justify-center z-[150] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={handleCloseReview}>
          <form
            onSubmit={handleSubmitReview}
            className="card w-full max-w-md p-0 overflow-hidden shadow-2xl animate-scale-up border border-gray-100 bg-white rounded-2xl"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-5 flex justify-between items-center border-b border-gray-100 ${actionType === 'approved' ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className={`text-xl font-black flex items-center gap-2 ${actionType === 'approved' ? 'text-green-800' : 'text-red-800'}`}>
                {actionType === 'approved' ? (
                  <><CheckCircleIcon size={24} className="text-success" /> اعتماد درجة الواجب</>
                ) : (
                  <><AlertCircleIcon size={24} className="text-error" /> رفض واجب الطالب</>
                )}
              </h3>
              <button type="button" onClick={handleCloseReview} className="text-gray-400 hover:text-gray-700 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors border border-gray-200">
                <XIcon size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-inner">
                <div className="flex items-center gap-3 mb-4 border-b border-gray-200 pb-4">
                  <div className="w-10 h-10 bg-blue-100 text-primary flex items-center justify-center rounded-full font-black"><UserIcon size={20} /></div>
                  <div>
                    <span className="text-xs text-gray-500 font-bold block">اسم الطالب</span>
                    <span className="font-black text-gray-900 text-base">{reviewingSubmission.student.fullName}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-bold block mb-2">الكورس والمحاضرة</span>
                  <span className="font-black text-primary text-sm bg-white border border-blue-100 px-3 py-1.5 rounded-lg inline-block shadow-sm">{reviewingSubmission.course.title} &bull; {reviewingSubmission.lecture.title}</span>
                </div>
              </div>

              {actionType === 'approved' ? (
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-800 text-base mb-3 block">الدرجة الممنوحة للطالب (من 100):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={e => setScore(e.target.value.replace(/[^0-9]/g, ''))} // 🚀 منع إدخال الرموز
                    className="input-field w-full text-center text-3xl font-black text-success border-2 border-green-200 focus:border-green-500 py-4 bg-green-50/50 rounded-xl"
                    required
                  />
                </div>
              ) : (
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-800 text-base mb-3 block">سبب الرفض (يظهر للطالب ليقوم بتصحيحه):</label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="مثال: الملف غير واضح، أرجو رفع ملف PDF بدلاً من الصور..."
                    className="input-field w-full p-4 border-2 border-red-200 focus:border-red-500 bg-red-50/50 font-medium text-gray-900 rounded-xl"
                    rows={4}
                    style={{ resize: 'none' }}
                    required
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-5 flex justify-end gap-3">
              <button type="button" onClick={handleCloseReview} className="btn btn-outline flex-1 font-bold bg-white shadow-sm border-gray-300 rounded-xl">إلغاء المراجعة</button>
              <button
                type="submit"
                disabled={submittingReview}
                className={`btn flex-[2] font-bold shadow-lg rounded-xl ${actionType === 'approved' ? 'btn-success shadow-green-200' : 'btn-danger shadow-red-200 text-white'}`}
              >
                {submittingReview ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'تأكيد وحفظ التقييم'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}