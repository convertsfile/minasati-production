'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import {
  FileTextIcon, CheckIcon, XIcon, ClockIcon, BookIcon,
  UserIcon, CheckCircleIcon, AlertCircleIcon, ExternalLinkIcon
} from '../../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [score, setScore] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    fetchSubmissions(page);
  }, [page]);

  const fetchSubmissions = async (pageNumber = 1) => {
    setLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/homework/submissions?page=${pageNumber}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.data.data || []);
        setTotalPages(data.data.meta?.lastPage || data.data.last_page || 1);
      } else {
        showToast('فشل تحميل الواجبات المعلقة', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
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

    setSubmittingReview(true);
    const token = getToken();

    try {
      const response = await fetch(`${API_URL}/api/admin/homework/submissions/${reviewingSubmission.id}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          status: actionType,
          rejection_reason: actionType === 'rejected' ? rejectionReason : null,
          score: actionType === 'approved' ? parseInt(score) : null,
        }),
      });

      if (response.ok) {
        showToast('تم مراجعة الواجب بنجاح!', 'success');
        handleCloseReview();
        fetchSubmissions(page);
      } else {
        const data = await response.json();
        showToast(data.message || 'فشل إرسال المراجعة', 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="admin-layout relative">
      <AdminSidebar />

      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
        <div className={`toast-content ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <AlertCircleIcon size={18} />}
          {toast.message}
        </div>
      </div>

      <main className="admin-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">مراجعة الواجبات</h1>
            <p className="page-subtitle">قم بتقييم وقبول أو رفض واجبات الطلاب المعلقة</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner-lg" />
            <p className="mt-4 text-muted">جاري تحميل طلبات الواجبات...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileTextIcon size={32} />
            </div>
            <h3>لا توجد واجبات معلقة للمراجعة</h3>
            <p>تم تقييم جميع الواجبات المرفوعة بنجاح.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table text-right">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>الكورس / المحاضرة</th>
                    <th>اسم الواجب</th>
                    <th>تاريخ الرفع</th>
                    <th>ملف الواجب</th>
                    <th className="text-center">التقييم</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="student-avatar" style={{ backgroundColor: 'var(--primary)', width: 32, height: 32 }}>
                            {sub.student.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold">{sub.student.fullName}</div>
                            <div className="text-xs text-muted" dir="ltr">{sub.student.studentNumber || sub.student.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="font-semibold text-primary">{sub.course.title}</div>
                          <div className="text-xs text-muted">{sub.lecture.title}</div>
                        </div>
                      </td>
                      <td>
                        <span className="font-medium">{sub.homework.title}</span>
                      </td>
                      <td>
                        <div className="text-xs" dir="ltr">
                          {new Date(sub.filePath.includes('dummy') ? sub.submittedAt : sub.submittedAt).toLocaleString('ar-EG')}
                        </div>
                      </td>
                      <td>
                        <a
                          href={sub.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-xs btn-outline font-bold flex items-center gap-1.5"
                          style={{ width: 'fit-content' }}
                        >
                          <ExternalLinkIcon size={12} />
                          عرض الملف
                        </a>
                      </td>
                      <td className="text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenReview(sub, 'approved')}
                            className="btn btn-xs btn-success font-bold"
                          >
                            <CheckIcon size={12} />
                            قبول
                          </button>
                          <button
                            onClick={() => handleOpenReview(sub, 'rejected')}
                            className="btn btn-xs btn-danger font-bold"
                          >
                            <XIcon size={12} />
                            رفض
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-outline"
                >
                  السابق
                </button>
                <span className="flex items-center px-4 font-bold">
                  {page} من {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outline"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Review Modal */}
      {reviewingSubmission && actionType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <form
            onSubmit={handleSubmitReview}
            className="bg-[#1a1b26] w-full max-w-md flex flex-col shadow-2xl border border-white/10 rounded-2xl overflow-hidden"
            dir="rtl"
          >
            <div className="bg-black/40 border-b border-white/10 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {actionType === 'approved' ? (
                  <><CheckCircleIcon size={20} className="text-success" /> قبول وتقييم واجب الطالب</>
                ) : (
                  <><AlertCircleIcon size={20} className="text-error" /> رفض واجب الطالب</>
                )}
              </h3>
              <button type="button" onClick={handleCloseReview} className="text-muted hover:text-error text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-1">
                <div><span className="text-muted text-xs">اسم الطالب:</span> <span className="font-bold">{reviewingSubmission.student.fullName}</span></div>
                <div><span className="text-muted text-xs">المحاضرة:</span> <span className="font-bold">{reviewingSubmission.lecture.title}</span></div>
              </div>

              {actionType === 'approved' ? (
                <div className="form-group">
                  <label className="form-label">الدرجة الممنوحة (من 100):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={e => setScore(e.target.value)}
                    className="input-field w-full text-center text-xl font-bold"
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">سبب الرفض (سيظهر للطالب):</label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="اكتب سبب الرفض هنا بوضوح ليعرف الطالب ماذا يصحح..."
                    className="input-field w-full p-3"
                    rows={4}
                    required
                  />
                </div>
              )}
            </div>

            <div className="bg-black/40 border-t border-white/10 px-6 py-4 flex justify-end gap-3">
              <button type="button" onClick={handleCloseReview} className="btn btn-outline">إلغاء</button>
              <button
                type="submit"
                disabled={submittingReview}
                className={`btn ${actionType === 'approved' ? 'btn-success' : 'btn-danger'}`}
              >
                {submittingReview ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
