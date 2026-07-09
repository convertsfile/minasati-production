'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import {
  BellIcon, SearchIcon, RefreshIcon, XIcon, CheckCircleIcon,
  AlertTriangleIcon, CheckIcon, FileTextIcon, ClockIcon, UsersIcon
} from '@/app/components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface MissedLecture {
  id: number;
  title: string;
}

interface Attempt {
  id: number;
  formIndex: number;
  score: number;
  passed: boolean;
  completedAt: string;
}

interface Issue {
  type: 'accumulation' | 'exam_failed';
  courseId: number;
  courseTitle: string;
  missedCount?: number;
  missedLectures?: MissedLecture[];
  lectureId?: number;
  lectureTitle?: string;
  attempts?: Attempt[];
}

interface FlaggedStudent {
  studentId: number;
  fullName: string;
  phone: string;
  parentPhone: string;
  studentNumber: string;
  academicYear: string;
  courseId: number;
  courseTitle: string;
  subscriptionId: number;
  issues: Issue[];
}

interface QuestionReview {
  id: number;
  body: string;
  options: string[];
  correctAnswer: number;
  selectedAnswer: number | null;
}

interface AttemptReviewData {
  id: number;
  studentName: string;
  examTitle: string;
  score: number;
  passed: boolean;
  completedAt: string;
  questions: QuestionReview[];
}

export default function MonitoringPage() {
  const router = useRouter();
  const [flagged, setFlagged] = useState<FlaggedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Grace Period state
  const [extendingId, setExtendingId] = useState<string | null>(null);
  
  // Review Modal state
  const [reviewAttemptId, setReviewAttemptId] = useState<number | null>(null);
  const [reviewData, setReviewData] = useState<AttemptReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }, []);

  const fetchFlaggedStudents = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { router.push('/login'); return; }

      const res = await fetch(`${API_URL}/api/admin/monitoring/students`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (res.ok) {
        const result = await res.json();
        setFlagged(result.data || []);
      } else {
        showToast('فشل تحميل قائمة المتابعة', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    fetchFlaggedStudents();
  }, [fetchFlaggedStudents]);

  const handleExtendGrace = async (studentId: number, courseId: number, days: number) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/monitoring/extend-grace`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ student_id: studentId, course_id: courseId, days }),
      });

      if (res.ok) {
        showToast(`تم إعطاء مهلة للطالب لمدة ${days} أيام بنجاح.`, 'success');
        fetchFlaggedStudents();
      } else {
        showToast('فشل تمديد المهلة', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleReviewAttempt = async (attemptId: number) => {
    setReviewAttemptId(attemptId);
    setReviewLoading(true);
    setReviewData(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/monitoring/attempts/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (res.ok) {
        const result = await res.json();
        setReviewData(result.data);
      } else {
        showToast('فشل تحميل تفاصيل المحاولة', 'error');
        setReviewAttemptId(null);
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
      setReviewAttemptId(null);
    } finally {
      setReviewLoading(false);
    }
  };

  // Filter flagged students based on search query
  const filteredFlagged = flagged.filter(f => 
    f.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.studentNumber.includes(searchQuery) ||
    f.phone.includes(searchQuery)
  );

  return (
    <div className="admin-layout relative">
      <AdminSidebar />

      {/* Toast Notification */}
      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
        <div className={`toast-content ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <XIcon size={18} />}
          {toast.message}
        </div>
      </div>

      {/* Answers Review Modal */}
      {reviewAttemptId && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setReviewAttemptId(null)}>
          <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2"><FileTextIcon size={22} /> مراجعة إجابات الطالب في الامتحان</h2>
              <button onClick={() => setReviewAttemptId(null)} className="text-gray-400 hover:text-error text-2xl font-bold transition-colors"><XIcon size={22} /></button>
            </div>

            {reviewLoading || !reviewData ? (
              <div className="loading-state">
                <div className="spinner spinner-lg"></div>
                <p className="font-bold mt-4">جاري تحميل إجابات الطالب...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{reviewData.studentName}</h3>
                    <p className="text-sm text-muted">{reviewData.examTitle} &bull; {reviewData.completedAt}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted">الدرجة المحققة</p>
                    <p className={`text-2xl font-black ${reviewData.passed ? 'text-success' : 'text-error'}`}>{reviewData.score}%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {reviewData.questions.map((q, qIndex) => {
                    const isCorrect = q.selectedAnswer === q.correctAnswer;
                    return (
                      <div key={q.id} className="border rounded-lg p-4 bg-white" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: isCorrect ? '#10b981' : '#ef4444' }}>
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-bold text-sm text-gray-500">سؤال {qIndex + 1}</span>
                          <span className={`badge text-xs font-bold ${isCorrect ? 'badge-success' : 'badge-error'}`}>
                            {isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-800 mb-3">{q.body}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {q.options.map((opt, oIndex) => {
                            const isSelected = q.selectedAnswer === oIndex;
                            const isAnswerCorrect = q.correctAnswer === oIndex;

                            let borderStyle = '1px solid var(--border)';
                            let bgStyle = 'white';
                            if (isSelected) {
                              borderStyle = isCorrect ? '2px solid #10b981' : '2px solid #ef4444';
                              bgStyle = isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';
                            } else if (isAnswerCorrect) {
                              borderStyle = '2px solid #10b981';
                              bgStyle = 'rgba(16, 185, 129, 0.05)';
                            }

                            return (
                              <div key={oIndex} className="p-3 rounded-lg flex items-center gap-2" style={{ border: borderStyle, backgroundColor: bgStyle }}>
                                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs">
                                  {String.fromCharCode(65 + oIndex)}
                                </span>
                                <span className="flex-1 text-sm">{opt}</span>
                                {isAnswerCorrect && <span className="text-success font-bold text-xs flex items-center gap-1"><CheckIcon size={14} /> الإجابة الصحيحة</span>}
                                {isSelected && !isCorrect && <span className="text-error font-bold text-xs flex items-center gap-1"><XIcon size={14} /> إجابة الطالب</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="admin-content">
        <div className="page-header">
          <div>
            <h1 className="page-title flex items-center gap-2"><BellIcon size={26} /> قسم المتابعة والطلاب المتأخرين</h1>
            <p className="page-subtitle">تتبع الطلاب الذين تراكمت لديهم المحاضرات أو رسبوا في جميع محاولات الاختبارات وتواصل معهم.</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="card mb-6 p-4 flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-[250px] relative">
            <SearchIcon size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted" />
            <input
              type="text"
              placeholder="ابحث عن طالب بالاسم، الهاتف، أو كود الطالب..."
              className="input-field pr-10"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={fetchFlaggedStudents} className="btn btn-outline font-bold"><RefreshIcon size={16} /> تحديث القائمة</button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner-lg"></div>
            <p className="mt-4 font-bold">جاري تحميل بيانات المتابعة...</p>
          </div>
        ) : filteredFlagged.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <CheckCircleIcon size={36} color="var(--success)" />
            </div>
            <h3 className="text-success">كل الطلاب يسيرون بشكل ممتاز!</h3>
            <p>لا يوجد أي طلاب يحتاجون للمتابعة حالياً.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>ولي الأمر / الهاتف</th>
                  <th>الكورس المشترك فيه</th>
                  <th>المحاضرات المتراكمة / الرسوب</th>
                  <th className="text-center">إجراءات المتابعة</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlagged.map((item) => {
                  const uniqueId = `${item.studentId}-${item.courseId}`;
                  return (
                    <tr key={uniqueId}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {item.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{item.fullName}</p>
                            <span className="text-xs text-primary font-bold">{item.academicYear} &bull; #{item.studentNumber}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-sm font-bold text-gray-800">{item.phone}</p>
                        <p className="text-xs text-muted">ولي الأمر: {item.parentPhone}</p>
                      </td>
                      <td className="font-medium">{item.courseTitle}</td>
                      <td>
                        <div className="space-y-2">
                          {item.issues.map((issue, index) => (
                            <div key={index} className="p-2 rounded-lg text-xs flex items-start gap-2" style={{ backgroundColor: issue.type === 'accumulation' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: issue.type === 'accumulation' ? 'var(--warning-dark)' : 'var(--error)' }}>
                              {issue.type === 'accumulation' ? (
                                <div className="flex-1">
                                  <strong className="flex items-center gap-1"><AlertTriangleIcon size={14} /> متراكم ({issue.missedCount} محاضرات):</strong>
                                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                                    {issue.missedLectures?.map(l => (
                                      <li key={l.id}>{l.title}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <div className="flex-1">
                                  <strong className="flex items-center gap-1"><XIcon size={14} /> رسب في جميع المحاولات:</strong>
                                  <p className="mt-1">محاضرة: {issue.lectureTitle}</p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {issue.attempts?.map(att => (
                                      <button
                                        key={att.id}
                                        onClick={() => handleReviewAttempt(att.id)}
                                        className="btn btn-xs btn-outline bg-white hover:bg-red-50 text-error px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                                      >
                                        <FileTextIcon size={12} /> مراجعة إجابات نموذج {att.formIndex} ({att.score}%)
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="relative inline-block text-right">
                          {extendingId === uniqueId ? (
                            <div className="bg-white border rounded-lg shadow-lg p-2 absolute left-0 bottom-full z-10 min-w-[150px] animate-fade-in">
                              <p className="text-xs text-muted font-bold mb-2 text-center">اختر مدة المهلة:</p>
                              <div className="flex flex-col gap-1">
                                {[1, 2, 3, 7, 14, 30].map(days => (
                                  <button
                                    key={days}
                                    onClick={() => {
                                      handleExtendGrace(item.studentId, item.courseId, days);
                                      setExtendingId(null);
                                    }}
                                    className="text-right text-xs p-2 rounded hover:bg-primary hover:text-white transition-colors"
                                  >
                                    {days === 1 ? 'يوم واحد' : days === 2 ? 'يومين' : `${days} أيام`}
                                  </button>
                                ))}
                                <button onClick={() => setExtendingId(null)} className="text-xs text-error font-bold p-2 border-t mt-1">إلغاء</button>
                              </div>
                            </div>
                          ) : null}
                          <button
                            onClick={() => setExtendingId(uniqueId)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-sm inline-flex items-center gap-1"
                          >
                            <CheckIcon size={16} /> تم المتابعة (إعطاء مهلة)
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
