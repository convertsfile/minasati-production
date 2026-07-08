'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
import api from '@/lib/axios'; // 🚀 العميل الذكي
import {
  BellIcon, SearchIcon, RefreshIcon, XIcon, CheckCircleIcon,
  AlertTriangleIcon, CheckIcon, FileTextIcon, AlertCircleIcon
} from '../../components/Icons';

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
  
  // 🚀 درع الحماية: يطرد المتطفلين فوراً ويعرض شاشة التحميل
  const { isChecking } = useAuthGuard(['admin']);

  const [flagged, setFlagged] = useState<FlaggedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // حالة تمديد المهلة
  const [extendingId, setExtendingId] = useState<string | null>(null);
  
  // حالة نافذة المراجعة
  const [reviewAttemptId, setReviewAttemptId] = useState<number | null>(null);
  const [reviewData, setReviewData] = useState<AttemptReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // 🚀 نظام التنبيهات الموحد الأنيق
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  const fetchFlaggedStudents = useCallback(async () => {
    setLoading(true);
    try {
      // 🚀 جلب البيانات عبر العميل المركزي بأمان
      const response = await api.get('/admin/monitoring/students');
      
      // التوافقية والأمان في استخراج البيانات (فك التغليف إن وجد)
      const studentsData = response.data?.data || response.data || [];
      
      const mappedStudents: FlaggedStudent[] = studentsData.map((s: any) => ({
        studentId: s.student_id || s.studentId,
        fullName: s.full_name || s.fullName || 'غير محدد',
        phone: s.phone || '',
        parentPhone: s.parent_phone || s.parentPhone || '',
        studentNumber: s.student_number || s.studentNumber || '',
        academicYear: s.academic_year || s.academicYear || '',
        courseId: s.course_id || s.courseId,
        courseTitle: s.course_title || s.courseTitle || '',
        subscriptionId: s.subscription_id || s.subscriptionId,
        issues: s.issues || [],
      }));

      setFlagged(mappedStudents);
    } catch (e: any) {
      showToast(e?.message || 'فشل تحميل قائمة المتابعة', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 🚀 جلب البيانات فقط بعد التأكد من الصلاحيات
  useEffect(() => {
    if (!isChecking) {
      fetchFlaggedStudents();
    }
  }, [isChecking, fetchFlaggedStudents]);

  // إغلاق التمرير عند فتح المودال
  useEffect(() => {
    if (reviewAttemptId) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [reviewAttemptId]);

  const handleExtendGrace = async (studentId: number, courseId: number, days: number) => {
    try {
      // 🚀 إرسال طلب التمديد عبر Axios
      await api.post('/admin/monitoring/extend-grace', { 
        student_id: studentId, 
        course_id: courseId, 
        days 
      });

      showToast(`تم إعطاء مهلة للطالب لمدة ${days} أيام بنجاح.`, 'success');
      fetchFlaggedStudents(); // تحديث القائمة فوراً
    } catch (e: any) {
      showToast(e?.message || 'فشل تمديد المهلة', 'error');
    }
  };

  const handleReviewAttempt = async (attemptId: number) => {
    setReviewAttemptId(attemptId);
    setReviewLoading(true);
    setReviewData(null);
    try {
      // 🚀 جلب المراجعة عبر العميل المركزي
      const response = await api.get(`/admin/monitoring/attempts/${attemptId}`);
      
      const data = response.data?.data || response.data;
      
      // 🚀 التوافقية الآمنة مع الردود ومنع الانهيار
      setReviewData({
        id: data.id,
        studentName: data.student_name || data.studentName || 'طالب غير محدد',
        examTitle: data.exam_title || data.examTitle || 'امتحان غير محدد',
        score: data.score || 0,
        passed: !!data.passed,
        completedAt: data.completed_at || data.completedAt || new Date().toISOString(),
        questions: Array.isArray(data.questions) ? data.questions.map((q: any) => ({
          id: q.id,
          body: q.body,
          options: q.options || [],
          correctAnswer: q.correct_answer ?? q.correctAnswer ?? 0,
          selectedAnswer: q.selected_answer ?? q.selectedAnswer ?? null,
        })) : []
      });
    } catch (e: any) {
      showToast(e?.message || 'فشل تحميل تفاصيل المحاولة', 'error');
      setReviewAttemptId(null);
    } finally {
      setReviewLoading(false);
    }
  };

  // 🚀 فلترة الطلاب محلياً (آمنة تماماً ضد الـ Null/Undefined)
  const filteredFlagged = flagged.filter(f => 
    (f.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.studentNumber || '').includes(searchQuery) ||
    (f.phone || '').includes(searchQuery) ||
    (f.parentPhone || '').includes(searchQuery)
  );

  // 🚀 شاشة التحميل لمنع الوميض
  if (isChecking) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="spinner spinner-lg" />
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      <AdminSidebar />

      {/* 🚀 نظام التنبيهات الموحد الأنيق */}
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

      {/* Answers Review Modal */}
      {reviewAttemptId && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setReviewAttemptId(null)}>
          <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all shadow-2xl animate-scale-up bg-white rounded-2xl" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 p-6 pb-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <FileTextIcon size={22} /> مراجعة إجابات الطالب في الامتحان
              </h2>
              <button onClick={() => setReviewAttemptId(null)} className="text-gray-400 hover:text-error text-2xl font-bold transition-colors bg-gray-50 hover:bg-red-50 p-2 rounded-full">
                <XIcon size={20} />
              </button>
            </div>

            <div className="px-6 pb-6">
              {reviewLoading || !reviewData ? (
                <div className="loading-state h-64 flex flex-col items-center justify-center">
                  <div className="spinner spinner-lg text-primary"></div>
                  <p className="font-bold mt-4 text-muted">جاري تحميل إجابات الطالب...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 flex flex-wrap gap-4 justify-between items-center shadow-inner">
                    <div>
                      <h3 className="font-black text-xl text-gray-900">{reviewData.studentName}</h3>
                      <p className="text-sm font-bold text-primary mt-2">{reviewData.examTitle} &bull; <span className="text-muted">{new Date(reviewData.completedAt).toLocaleString('ar-EG')}</span></p>
                    </div>
                    <div className="text-center bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-100">
                      <p className="text-xs text-muted font-bold mb-1">الدرجة المحققة</p>
                      <p className={`text-3xl font-black ${reviewData.passed ? 'text-success' : 'text-error'}`}>{reviewData.score}%</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {reviewData.questions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 font-bold">لا توجد أسئلة مسجلة لهذه المحاولة.</div>
                    ) : (
                      reviewData.questions.map((q, qIndex) => {
                        const isCorrect = q.selectedAnswer === q.correctAnswer;
                        return (
                          <div key={q.id} className="border rounded-2xl p-6 bg-white shadow-sm transition-all hover:shadow-md" style={{ borderInlineStartWidth: '6px', borderInlineStartColor: isCorrect ? '#10b981' : '#ef4444' }}>
                            <div className="flex justify-between items-start mb-5">
                              <span className="font-bold text-sm text-gray-600 bg-gray-100 px-4 py-1.5 rounded-full">سؤال {qIndex + 1}</span>
                              <span className={`badge text-xs font-bold px-3 py-1.5 ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                              </span>
                            </div>
                            <h4 className="font-bold text-gray-900 mb-5 text-lg leading-relaxed">{q.body}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {q.options.map((opt, oIndex) => {
                                const isSelected = q.selectedAnswer === oIndex;
                                const isAnswerCorrect = q.correctAnswer === oIndex;

                                let borderStyle = '1px solid var(--border-light)';
                                let bgStyle = 'white';
                                if (isSelected) {
                                  borderStyle = isCorrect ? '2px solid #10b981' : '2px solid #ef4444';
                                  bgStyle = isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';
                                } else if (isAnswerCorrect) {
                                  borderStyle = '2px solid #10b981';
                                  bgStyle = 'rgba(16, 185, 129, 0.05)';
                                }

                                return (
                                  <div key={oIndex} className="p-4 rounded-xl flex items-center gap-3 transition-colors" style={{ border: borderStyle, backgroundColor: bgStyle }}>
                                    <span className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? (isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : isAnswerCorrect ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                      {String.fromCharCode(65 + oIndex)}
                                    </span>
                                    <span className="flex-1 font-medium text-gray-800 text-sm">{opt}</span>
                                    {isAnswerCorrect && <span className="text-success font-bold text-[10px] flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm border border-green-100 shrink-0"><CheckIcon size={12} /> إجابة صحيحة</span>}
                                    {isSelected && !isCorrect && <span className="text-error font-bold text-[10px] flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm border border-red-100 shrink-0"><XIcon size={12} /> اختيار الطالب</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="admin-content">
        <div className="page-header mb-8">
          <div>
            <h1 className="page-title flex items-center gap-3 text-3xl font-black text-gray-900">
              <BellIcon size={32} className="text-primary" /> 
              قسم المتابعة والطلاب المتأخرين
            </h1>
            <p className="page-subtitle text-base mt-2">تتبع الطلاب الذين تراكمت لديهم المحاضرات أو رسبوا في الاختبارات.</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="card mb-8 p-6 flex gap-4 flex-wrap items-center bg-white shadow-sm border border-gray-100 rounded-2xl">
          <div className="flex-1 min-w-[250px] relative">
            <SearchIcon size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن طالب بالاسم، الهاتف، أو الكود..."
              className="input-field w-full pr-12 py-3 bg-gray-50 focus:bg-white transition-colors rounded-xl font-medium"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={fetchFlaggedStudents} disabled={loading} className="btn btn-outline py-3 px-6 font-bold shadow-sm rounded-xl">
            {loading ? <span className="spinner spinner-primary w-5 h-5 border-2" /> : <><RefreshIcon size={18} /> تحديث القائمة</>}
          </button>
        </div>

        {loading ? (
          <div className="loading-state h-64 flex flex-col items-center justify-center">
            <div className="spinner spinner-lg text-primary"></div>
            <p className="mt-4 font-bold text-muted">جاري سحب تقارير المتابعة...</p>
          </div>
        ) : filteredFlagged.length === 0 ? (
          <div className="empty-state bg-white shadow-sm rounded-2xl py-20">
            <div className="empty-state-icon bg-green-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircleIcon size={48} className="text-success" />
            </div>
            <h3 className="text-2xl font-black text-success mb-3">الوضع ممتاز!</h3>
            <p className="text-gray-500 font-medium max-w-sm mx-auto">جميع الطلاب يسيرون وفق الخطة ولا يوجد أي تأخير أو رسوب في الوقت الحالي.</p>
          </div>
        ) : (
          <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto w-full">
              <table className="table w-full m-0 min-w-[1000px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">الطالب</th>
                    <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">ولي الأمر / الهاتف</th>
                    <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">الكورس المستهدف</th>
                    <th className="font-bold text-gray-700 py-5 px-6 text-right min-w-[300px]">المحاضرات المتراكمة / الرسوب</th>
                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">إجراءات الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFlagged.map((item) => {
                    const uniqueId = `${item.studentId}-${item.courseId}`;
                    return (
                      <tr key={uniqueId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-primary flex items-center justify-center font-black text-lg shadow-inner shrink-0">
                              {item.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 text-base">{item.fullName}</p>
                              <span className="text-xs text-primary font-bold bg-blue-50 px-2 py-1 rounded-md mt-1 inline-block">
                                {item.academicYear} &bull; #{item.studentNumber}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <p className="text-sm font-bold text-gray-800 font-mono" dir="ltr">{item.phone}</p>
                          <p className="text-xs text-muted font-medium mt-1">ولي الأمر: <span className="font-mono text-gray-600 font-bold" dir="ltr">{item.parentPhone}</span></p>
                        </td>
                        <td className="py-5 px-6 font-bold text-gray-800">{item.courseTitle}</td>
                        <td className="py-5 px-6">
                          <div className="space-y-3">
                            {item.issues.map((issue, index) => (
                              <div key={index} className="p-4 rounded-xl border flex items-start gap-3 shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: issue.type === 'accumulation' ? '#fffbeb' : '#fef2f2', borderColor: issue.type === 'accumulation' ? '#fde68a' : '#fecaca' }}>
                                {issue.type === 'accumulation' ? (
                                  <div className="flex-1">
                                    <strong className="flex items-center gap-2 text-yellow-800 text-sm mb-2">
                                      <AlertTriangleIcon size={18} /> 
                                      تراكم ({issue.missedCount} محاضرات):
                                    </strong>
                                    <ul className="list-disc list-inside space-y-1.5 text-xs text-yellow-900/90 font-bold pl-2">
                                      {issue.missedLectures?.map(l => (
                                        <li key={l.id}>{l.title}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : (
                                  <div className="flex-1">
                                    <strong className="flex items-center gap-2 text-red-800 text-sm mb-2">
                                      <XIcon size={18} /> 
                                      رسوب متكرر:
                                    </strong>
                                    <p className="text-xs text-red-900 font-bold bg-white/60 px-3 py-1.5 rounded-lg inline-block shadow-sm border border-red-100">{issue.lectureTitle}</p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {issue.attempts?.map(att => (
                                        <button
                                          key={att.id}
                                          onClick={() => handleReviewAttempt(att.id)}
                                          className="btn btn-xs font-bold shadow-sm hover:-translate-y-0.5 transition-transform rounded-lg px-3 py-1.5"
                                          style={{ backgroundColor: 'white', color: '#b91c1c', border: '1px solid #fecaca' }}
                                        >
                                          <FileTextIcon size={12} className="inline mr-1" /> نموذج {att.formIndex} ({att.score}%)
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center align-middle">
                          <div className="relative inline-block text-right">
                            {/* 🚀 نافذة التمديد الاستثنائي */}
                            {extendingId === uniqueId && (
                              <div className="bg-white border border-gray-200 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] p-4 absolute left-0 bottom-full mb-3 z-10 w-56 animate-scale-up origin-bottom-left">
                                <p className="text-xs text-gray-500 font-bold mb-3 text-center pb-2 border-b border-gray-100">اختر مدة التمديد الاستثنائي:</p>
                                <div className="flex flex-col gap-1.5">
                                  {[1, 2, 3, 7, 14, 30].map(days => (
                                    <button
                                      key={days}
                                      onClick={() => {
                                        handleExtendGrace(item.studentId, item.courseId, days);
                                        setExtendingId(null);
                                      }}
                                      className="text-right text-sm font-bold p-2.5 rounded-xl bg-gray-50 hover:bg-primary hover:text-white transition-colors"
                                    >
                                      {days === 1 ? 'يوم واحد' : days === 2 ? 'يومين' : `${days} أيام`}
                                    </button>
                                  ))}
                                  <button onClick={() => setExtendingId(null)} className="text-xs text-error font-bold p-2.5 mt-2 w-full bg-red-50 hover:bg-red-100 rounded-xl transition-colors">إلغاء الإجراء</button>
                                </div>
                              </div>
                            )}
                            <button
                              // 🚀 إصلاح الـ Toggle لكي يفتح ويغلق عند الضغط
                              onClick={() => setExtendingId(prev => prev === uniqueId ? null : uniqueId)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md shadow-emerald-200 inline-flex items-center gap-2"
                            >
                              <CheckIcon size={18} /> {extendingId === uniqueId ? 'إغلاق القائمة' : 'تم التحذير (إعطاء مهلة)'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}