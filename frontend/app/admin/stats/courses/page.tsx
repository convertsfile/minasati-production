'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import {
  BarChartIcon, RefreshIcon, FileTextIcon, UsersIcon, XIcon,
  SearchIcon, SettingsIcon, UserIcon, CreditCardIcon, BookIcon,
  CheckIcon, CheckCircleIcon, AlertTriangleIcon
} from '@/app/components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface CourseStat {
  id: number;
  title: string;
  pricePoints: number;
  studentsCount: number;
}

export default function CourseStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CourseStat[]>([]);
  const [loading, setLoading] = useState(true);
  // 🛑 Audit fix (M-5): explicit error state so the body renders a
  // visible retry card instead of just showing a toast.
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal States
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState<string | null>(null);
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Profile management states
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentProgress, setStudentProgress] = useState<any>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [walletAmount, setWalletAmount] = useState('');
  const [updatingWallet, setUpdatingWallet] = useState(false);
  const [togglingCourseId, setTogglingCourseId] = useState<number | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const fetchCourseStats = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const token = getToken();
      if (!token) { router.push('/login'); return; }

      // 🛑 Audit fix (M-5): bound the request with a timeout so a dead
      // backend cannot leave the page on an infinite spinner.
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      let res: Response;
      try {
        res = await fetch(`${API_URL}/api/admin/wallet/course-stats`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (res.ok) {
        const result = await res.json();
        setStats(result.data || []);
      } else {
        const message = 'فشل تحميل إحصائيات الكورسات';
        setLoadError(message);
        showToast(message, 'error');
      }
    } catch (e: any) {
      const message = e?.name === 'AbortError'
        ? 'استغرق تحميل الإحصائيات وقتاً طويلاً.'
        : 'خطأ في الاتصال بالخادم';
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseStudents = async (courseId: number, courseTitle: string) => {
    setSelectedCourseId(courseId);
    setSelectedCourseTitle(courseTitle);
    setLoadingStudents(true);
    setCourseStudents([]);
    setStudentSearchQuery('');
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/wallet/courses/${courseId}/students`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (res.ok) {
        const result = await res.json();
        setCourseStudents(result.data.students || []);
      } else {
        showToast('فشل تحميل قائمة الطلاب', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchStudentProgress = async (studentId: number) => {
    setLoadingProgress(true);
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/admin/student-progress/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStudentProgress(data.data);
        setWalletAmount(data.data.student.walletBalance.toString());
      }
    } catch (error) {
      console.error('Error fetching student progress:', error);
    } finally {
      setLoadingProgress(false);
    }
  };

  const fetchAllCourses = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllCourses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleOpenProfile = (student: any) => {
    setSelectedStudent(student);
    setStudentProgress(null);
    fetchStudentProgress(student.id);
    fetchAllCourses();
  };

  const handleUpdateWallet = async () => {
    if (!selectedStudent) return;
    setUpdatingWallet(true);
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/admin/users/${selectedStudent.id}/wallet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ balance: parseInt(walletAmount) }),
      });

      if (response.ok) {
        showToast('تم تحديث رصيد المحفظة بنجاح!', 'success');
        fetchStudentProgress(selectedStudent.id);
        if (selectedCourseId !== null && selectedCourseTitle !== null) {
          fetchCourseStudents(selectedCourseId, selectedCourseTitle);
        }
      } else {
        showToast('فشل تحديث رصيد المحفظة', 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setUpdatingWallet(false);
    }
  };

  const handleToggleCourse = async (courseId: number) => {
    if (!selectedStudent) return;
    setTogglingCourseId(courseId);
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/admin/users/${selectedStudent.id}/courses/${courseId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });

      if (response.ok) {
        showToast('تم تغيير حالة الاشتراك للكورس بنجاح!', 'success');
        fetchStudentProgress(selectedStudent.id);
        if (selectedCourseId !== null && selectedCourseTitle !== null) {
          fetchCourseStudents(selectedCourseId, selectedCourseTitle);
        }
      } else {
        showToast('فشل تغيير حالة الاشتراك', 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setTogglingCourseId(null);
    }
  };

  useEffect(() => {
    fetchCourseStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalEnrollments = stats.reduce((acc, curr) => acc + curr.studentsCount, 0);

  return (
    <div className="admin-layout relative">
      <AdminSidebar />

      {/* Toast */}
      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
        <div className={`toast-content ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <XIcon size={18} />}
          {toast.message}
        </div>
      </div>

      <main className="admin-content">
        <div className="page-header">
          <div>
            <h1 className="page-title flex items-center gap-2"><BarChartIcon size={26} /> إحصائيات الكورسات والاشتراكات</h1>
            <p className="page-subtitle">تتبع أعداد الطلاب المشتركين ومعدلات الإقبال على الكورسات المختلفة.</p>
          </div>
          <button onClick={fetchCourseStats} className="btn btn-outline font-bold"><RefreshIcon size={16} /> تحديث</button>
        </div>

        {/* Highlight Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card text-right p-6" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: 'var(--primary)' }}>
            <span className="text-xs text-muted block mb-1">إجمالي الكورسات النشطة</span>
            <span className="text-3xl font-black text-gray-800">{stats.length}</span>
          </div>
          <div className="card text-right p-6" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: '#10b981' }}>
            <span className="text-xs text-muted block mb-1">إجمالي اشتراكات الطلاب</span>
            <span className="text-3xl font-black text-success">{totalEnrollments}</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner-lg"></div>
            <p className="mt-4 font-bold">جاري تحميل الإحصائيات...</p>
          </div>
        ) : loadError ? (
          // 🛑 Audit fix (M-5): render a visible retry card so the
          // admin can recover from a failed stats fetch.
          <div className="card bg-white border border-red-100 shadow-sm rounded-2xl py-16 text-center">
            <div className="empty-state-icon bg-red-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner"><AlertTriangleIcon size={48} className="text-error" /></div>
            <h3 className="text-2xl font-black text-gray-800">تعذّر تحميل إحصائيات الكورسات</h3>
            <p className="text-gray-500 font-medium text-lg mt-2 mb-8 max-w-md mx-auto leading-relaxed">{loadError}</p>
            <button onClick={fetchCourseStats} className="btn btn-primary px-6 py-3 rounded-xl shadow-lg shadow-blue-200 font-bold">
              <CheckCircleIcon size={18} className="ml-2 inline" /> إعادة المحاولة
            </button>
          </div>
        ) : stats.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileTextIcon size={36} />
            </div>
            <h3>لا توجد كورسات مسجلة</h3>
            <p>قم بإنشاء كورس من صفحة الكورسات للبدء.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>الكورس التعليمي</th>
                  <th className="text-center">سعر الاشتراك (بالنقاط)</th>
                  <th className="text-center">عدد الطلاب المشتركين</th>
                  <th className="text-center">النسبة من إجمالي الاشتراكات</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((course) => {
                  const pct = totalEnrollments > 0 ? Math.round((course.studentsCount / totalEnrollments) * 100) : 0;
                  return (
                    <tr key={course.id} className="cursor-pointer" onClick={() => fetchCourseStudents(course.id, course.title)}>
                      <td>
                        <span className="font-bold text-primary hover:underline text-base">{course.title}</span>
                      </td>
                      <td className="text-center">
                        <span className="badge badge-success px-3 py-1 font-bold">{course.pricePoints} EGP</span>
                      </td>
                      <td className="text-center">
                        <span className="font-black text-gray-800 text-lg">{course.studentsCount} طالب/ة</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-xs text-muted font-bold w-8 text-left">{pct}%</span>
                          <div className="flex-1 max-w-[150px] bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Course Students Modal */}
        {selectedCourseId !== null && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedCourseId(null)}>
            <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto transform transition-all shadow-2xl text-right bg-white p-6 rounded-xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <h2 className="text-xl font-bold text-primary flex items-center gap-2"><UsersIcon size={22} /> الطلاب المشتركون في كورس: {selectedCourseTitle}</h2>
                <button onClick={() => setSelectedCourseId(null)} className="text-gray-400 hover:text-error text-2xl font-bold transition-colors"><XIcon size={22} /></button>
              </div>

              <div className="mb-4 relative">
                <SearchIcon size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted" />
                <input
                  type="text"
                  placeholder="ابحث عن طالب بالاسم أو الهاتف..."
                  value={studentSearchQuery}
                  onChange={e => setStudentSearchQuery(e.target.value)}
                  className="input-field w-full pr-10 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  dir="rtl"
                />
              </div>

              {loadingStudents ? (
                <div className="loading-state">
                  <div className="spinner spinner-lg"></div>
                  <p className="mt-4 font-bold">جاري تحميل قائمة الطلاب...</p>
                </div>
              ) : (() => {
                const filtered = courseStudents.filter(s => 
                  s.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                  s.phone.includes(studentSearchQuery)
                );

                return filtered.length === 0 ? (
                  <p className="text-muted text-center py-8">لا يوجد طلاب مشتركين يطابقون البحث.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b text-gray-500">
                          <th className="pb-2">الاسم</th>
                          <th className="pb-2">الهاتف</th>
                          <th className="pb-2">السنة الدراسية</th>
                          <th className="pb-2">تاريخ الاشتراك</th>
                          <th className="pb-2 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filtered.map(student => (
                          <tr key={student.id}>
                            <td className="py-2.5 font-bold text-gray-800">{student.fullName}</td>
                            <td className="py-2.5 font-mono">{student.phone}</td>
                            <td className="py-2.5">
                              <span className="badge badge-primary text-[10px]">
                                {student.academicYear || 'غير محدد'}
                              </span>
                            </td>
                            <td className="py-2.5 text-muted">
                              {student.subscribedAt ? new Date(student.subscribedAt).toLocaleDateString('ar-EG') : 'غير معروف'}
                            </td>
                            <td className="py-2.5 text-center">
                              <button
                                onClick={() => handleOpenProfile(student)}
                                className="btn btn-xs btn-outline font-bold text-xs flex items-center gap-1"
                                style={{ padding: '0.25rem 0.75rem' }}
                              >
                                <SettingsIcon size={14} /> إدارة البروفايل
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Profile Management Modal */}
        {selectedStudent && (
          <div className="profile-overlay" onClick={() => setSelectedStudent(null)}>
            <div className="profile-fullscreen" onClick={e => e.stopPropagation()}>
              <div className="profile-header">
                <h2 className="profile-header-title">
                  <UserIcon size={20} />
                  إدارة بروفايل الطالب: {selectedStudent.fullName}
                </h2>
                <button onClick={() => setSelectedStudent(null)} className="profile-close-btn">
                  <XIcon size={24} />
                </button>
              </div>

              {loadingProgress || !studentProgress ? (
                <div className="loading-state">
                  <div className="spinner spinner-lg"></div>
                  <p className="mt-4 font-bold">جاري تحميل بيانات الطالب والتقدم...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* 1. Student Basic Details */}
                  <div className="profile-info-grid">
                    <div>
                      <span className="text-xs text-muted block">السنة الدراسية</span>
                      <span className="font-bold">{studentProgress.student.academicYear || selectedStudent.academicYear || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">رقم هاتف الطالب</span>
                      <span className="font-bold" dir="ltr">{studentProgress.student.phone}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">رقم هاتف ولي الأمر</span>
                      <span className="font-bold" dir="ltr">{studentProgress.student.parentPhone || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">رصيد المحفظة</span>
                      <span className="font-bold text-success">{studentProgress.student.walletBalance} ج.م</span>
                    </div>
                  </div>

                  {/* 2. Wallet Adjustment */}
                  <div className="card p-4 border border-success/20 bg-success/5 rounded-lg">
                    <h3 className="font-bold text-success mb-3 flex items-center gap-2"><CreditCardIcon size={20} /> إدارة رصيد المحفظة</h3>
                    <div className="flex gap-3 items-end max-w-md">
                      <div className="flex-1">
                        <label className="text-xs text-muted mb-1 block">الرصيد الجديد (بالنقاط/جنيه)</label>
                        <input
                          type="number"
                          className="input-field w-full font-bold text-lg"
                          value={walletAmount}
                          onChange={e => setWalletAmount(e.target.value)}
                          min="0"
                        />
                      </div>
                      <button
                        onClick={handleUpdateWallet}
                        disabled={updatingWallet}
                        className="btn btn-success"
                        style={{ padding: '0.75rem 1.5rem', height: '42px' }}
                      >
                        {updatingWallet ? 'جاري الحفظ...' : 'تحديث الرصيد'}
                      </button>
                    </div>
                  </div>

                  {/* 3. Course Enrollment Controls & Lecture Progress */}
                  <div className="space-y-4">
                    <h3 className="font-bold border-b pb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><BookIcon size={20} /> اشتراكات الكورسات والتقدم التعليمي</h3>
                    
                    {allCourses.length === 0 ? (
                      <p className="text-muted text-center py-4">لا توجد كورسات مسجلة في المنصة.</p>
                    ) : (
                      <div className="space-y-4">
                        {allCourses.map(course => {
                          const courseProg = studentProgress.courses.find((c: any) => c.courseId === course.id);
                          const isEnrolled = !!courseProg;

                          return (
                            <div key={course.id} className="profile-course-card space-y-3 text-right">
                              <div className="flex justify-between items-center flex-wrap gap-2">
                                <div>
                                  <h4 className="font-bold text-base text-primary">{course.title}</h4>
                                  {course.academic_year && (
                                    <span className="text-xs text-muted px-2 py-0.5 rounded" style={{ background: 'var(--soft-bg, #f1f5f9)' }}>
                                      {course.academic_year}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleToggleCourse(course.id)}
                                  disabled={togglingCourseId === course.id}
                                  className={`btn text-xs font-bold px-4 py-2 rounded-lg transition-all ${isEnrolled ? 'btn-danger' : 'btn-primary'}`}
                                >
                                  {togglingCourseId === course.id ? (
                                    <span className="spinner w-4 h-4 border-2"></span>
                                  ) : isEnrolled ? (
                                    <span className="flex items-center gap-1"><XIcon size={14} /> إلغاء الاشتراك</span>
                                  ) : (
                                    <span className="flex items-center gap-1"><CheckIcon size={14} /> تفعيل الاشتراك</span>
                                  )}
                                </button>
                              </div>

                              {/* Enrolled Course Progress Details */}
                              {isEnrolled && (
                                <div className="p-3 rounded-lg space-y-3 text-right" style={{ background: 'var(--soft-bg, #f8fafc)', border: '1px solid var(--border, #DCE5EB)' }}>
                                  <div className="flex justify-between items-center text-xs font-bold flex-wrap gap-2" style={{ color: 'var(--text-secondary)' }}>
                                    <span>عدد المحاضرات المكتملة: {courseProg.completedLectures} / {courseProg.totalLectures}</span>
                                    <span>نسبة الإنجاز: {courseProg.totalLectures > 0 ? Math.round((courseProg.completedLectures / courseProg.totalLectures) * 100) : 0}%</span>
                                  </div>
                                  
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-right text-xs">
                                      <thead>
                                        <tr className="border-b text-gray-500">
                                          <th className="pb-2">اسم المحاضرة</th>
                                          <th className="pb-2 text-center">مشاهدة الفيديو</th>
                                          <th className="pb-2 text-center">أعلى درجة امتحان</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y">
                                        {courseProg.lectures.map((lec: any) => (
                                          <tr key={lec.id}>
                                            <td className="py-2 font-medium">{lec.title}</td>
                                            <td className="py-2 text-center">
                                              {lec.isCompleted ? (
                                                <span className="text-success font-bold flex items-center justify-center gap-1"><CheckIcon size={14} /> مكتمل</span>
                                              ) : (
                                                <span className="text-muted flex items-center justify-center gap-1">{Math.round(lec.watchTime / 60)} د</span>
                                              )}
                                            </td>
                                            <td className="py-2 text-center">
                                              {lec.lastExamScore !== null ? (
                                                <span className={`font-bold ${lec.examPassed ? 'text-success' : 'text-error'}`}>
                                                  {lec.lastExamScore}% ({lec.examPassed ? 'ناجح' : 'راسب'})
                                                </span>
                                              ) : (
                                                <span className="text-muted">&mdash;</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
