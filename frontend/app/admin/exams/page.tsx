'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useAuthGuard } from '@/app/hooks/useAuthGuard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"; // 🚀 تم تعديل المنفذ

// دالة مساعدة لتوحيد جلب التوكن
const getToken = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1] || localStorage.getItem('token');
};

interface Lecture {
  id: number;
  title: string;
  course_id: number;
  course_title?: string;
}

interface ExamAttempt {
  id: number;
  formIndex: number;
  score: number;
  passed: boolean;
  completedAt: string;
}

interface StudentAttempt {
  userId: number;
  fullName: string;
  studentNumber: string;
  parentPhone: string;
  passed: boolean;
  failedCount: number;
  isLockedOut: boolean;
  attempts: ExamAttempt[];
}

export default function AdminExamControlPage() {
  const router = useRouter();
  const { isChecking } = useAuthGuard();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState('');
  const [students, setStudents] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  // 🚀 نظام الإشعارات الموحد
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    fetchLectures();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedLectureId) {
      fetchStudentsAttempts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLectureId]);

  const fetchLectures = async () => {
    try {
      const token = getToken();
      // 🚀 تحسين الأداء: طلب واحد فقط للباك إند لأن الكورسات تحتوي مسبقاً على المحاضرات
      const res = await fetch(`${API_URL}/api/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const allLectures: Lecture[] = [];

        // استخراج المحاضرات من داخل الكورسات مباشرة بدون طلبات إضافية
        for (const course of data.data || []) {
          for (const lecture of course.lectures || []) {
            allLectures.push({
              id: lecture.id,
              title: lecture.title,
              course_id: course.id,
              course_title: course.title,
            });
          }
        }

        setLectures(allLectures);
        if (allLectures.length > 0) {
          setSelectedLectureId(String(allLectures[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to fetch lectures:', err);
      showToast('فشل تحميل المحاضرات', 'error');
    }
  };

  const fetchStudentsAttempts = async () => {
    if (!selectedLectureId) return;
    setLoading(true);

    try {
      const token = getToken();
      // ⚠️ /api/admin/lectures/{id}/students-attempts is BROKEN (404). Use
      // /api/admin/lectures/{lecture}/exams/results which returns the same
      // shape (paginated list of student attempts for the lecture).
      const res = await fetch(`${API_URL}/api/admin/lectures/${selectedLectureId}/exams/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        // The endpoint returns a paginated ApiResponse; read both the
        // standard `data` and the `meta` payloads.
        setStudents(data.data || []);
      } else {
        showToast('فشل تحميل بيانات الطلاب', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
      showToast('حدث خطأ أثناء تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantUnlock = async (userId: number) => {
    setActionLoading(userId);

    try {
      const token = getToken();
      // ⚠️ /api/admin/lectures/{id}/instant-unlock is BROKEN (404). The
      // backend exposes /api/admin/lectures/{lecture}/unlock-student/{user}
      // (both lecture and user are required path parameters).
      const res = await fetch(`${API_URL}/api/admin/lectures/${selectedLectureId}/unlock-student/${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      const data = await res.json();

      if (res.ok) {
        showToast(`تم فتح المحاضرة التالية للطالب بنجاح`, 'success');
        fetchStudentsAttempts();
      } else {
        showToast(data.message || data.error || 'فشل فتح المحاضرة', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetAttempts = async (userId: number) => {
    if (!confirm('هل أنت متأكد من إعادة ضبط جميع محاولات هذا الطالب؟')) return;

    setActionLoading(userId);

    try {
      const token = getToken();
      // ⚠️ The reset-attempts endpoint requires {user} as a path parameter
      // (per backend route binding). Previously the frontend sent
      // /api/admin/lectures/{id}/reset-attempts with {user_id} in the body,
      // which 422s because the route is registered with {user} in the path.
      const res = await fetch(`${API_URL}/api/admin/lectures/${selectedLectureId}/reset-attempts/${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      const data = await res.json();

      if (res.ok) {
        showToast(`تم إعادة ضبط المحاولات بنجاح`, 'success');
        fetchStudentsAttempts();
      } else {
        showToast(data.message || data.error || 'فشل إعادة الضبط', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="admin-layout relative">
      <AdminSidebar />
      
      {/* 🚀 Toast UI */}
      <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'all 0.3s', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
        <div style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {toast.message}
        </div>
      </div>

      <main className="admin-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">إدارة الاختبارات والطلاب</h1>
            <p className="page-subtitle">متابعة حالة الطلاب وفتح المحاضرات يدوياً</p>
          </div>
        </div>

        {/* Lecture Selector */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">اختر المحاضرة لعرض الطلاب:</label>
          <select
            value={selectedLectureId}
            onChange={(e) => setSelectedLectureId(e.target.value)}
            className="input-field"
            style={{ maxWidth: 500 }}
          >
            {lectures.length === 0 && <option value="">جاري تحميل المحاضرات...</option>}
            {lectures.map((lecture) => (
              <option key={lecture.id} value={lecture.id}>
                {lecture.course_title} - {lecture.title}
              </option>
            ))}
          </select>
        </div>

        {/* Students Table */}
        {isChecking || loading ? (
          <div className="flex justify-center p-12">
            <div className="spinner spinner-dark" style={{ width: 48, height: 48, borderWidth: 4 }}></div>
          </div>
        ) : students.length === 0 ? (
          <div className="card text-center p-12">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-bold mb-2">لا توجد محاولات اختبار لهذه المحاضرة</h3>
            <p className="text-muted">سيتم عرض الطلاب الذين قاموا بمحاولات الاختبار هنا</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {students.map((student) => (
              <div
                key={student.userId}
                className="card"
                style={{
                  border: student.isLockedOut
                    ? '2px solid var(--error)'
                    : student.passed
                    ? '2px solid var(--success)'
                    : '2px solid var(--warning)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Status Badge */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  insetInlineEnd: 0,
                  padding: '0.5rem 1rem',
                  borderRadius: '0 0 0 var(--radius-md)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'white',
                  background: student.isLockedOut
                    ? 'var(--error)'
                    : student.passed
                    ? 'var(--success)'
                    : 'var(--warning)'
                }}>
                  {student.isLockedOut
                    ? '🔒 محظور (3 محاولات رسوب)'
                    : student.passed
                    ? '✅ ناجح'
                    : `⚠️ راسب (${student.failedCount} محاولة)`}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      {student.fullName}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      📋 رقم الطالب: {student.studentNumber || 'غير محدد'}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      📞 ولي الأمر: <span dir="ltr">{student.parentPhone}</span>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!student.passed && (
                      <button
                        onClick={() => handleInstantUnlock(student.userId)}
                        disabled={actionLoading === student.userId}
                        className="btn btn-primary btn-sm"
                      >
                        {actionLoading === student.userId ? '⏳...' : '🔓 فتح فوري للمحاضرة التالية'}
                      </button>
                    )}
                    <button
                      onClick={() => handleResetAttempts(student.userId)}
                      disabled={actionLoading === student.userId}
                      className="btn btn-outline btn-sm"
                    >
                      {actionLoading === student.userId ? '⏳...' : '🔄 تصفير المحاولات'}
                    </button>
                  </div>
                </div>

                {/* Attempts History */}
                {student.attempts.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      سجل المحاولات:
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {student.attempts.map((attempt) => (
                        <span
                          key={attempt.id}
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: attempt.passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: attempt.passed ? 'var(--success)' : 'var(--error)',
                            border: `1px solid ${attempt.passed ? 'var(--success)' : 'var(--error)'}`
                          }}
                        >
                          نموذج {attempt.formIndex} | الدرجة: {attempt.score}% {attempt.passed ? '✅' : '❌'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}