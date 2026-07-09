'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import {
  UserIcon,
  UsersIcon,
  WalletIcon,
  BookIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SettingsIcon,
  KeyIcon,
} from '../../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PER_PAGE = 10;

interface Student {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  academic_year: string;
  status: 'pending' | 'active' | 'rejected';
  wallet_balance: number;
  created_at: string;
}

function getStatusBadge(status: string) {
  const config: Record<string, { className: string; text: string }> = {
    pending: { className: 'badge-warning', text: 'معلق' },
    active: { className: 'badge-success', text: 'نشط' },
    rejected: { className: 'badge-error', text: 'مرفوض' },
  };
  const cfg = config[status] || config.pending;
  return <span className={`badge ${cfg.className}`}>{cfg.text}</span>;
}

export default function AllStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [academicYearFilter, setAcademicYearFilter] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentProgress, setStudentProgress] = useState<any>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [walletAmount, setWalletAmount] = useState('');
  const [updatingWallet, setUpdatingWallet] = useState(false);
  const [togglingCourseId, setTogglingCourseId] = useState<number | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    fetchStudents(currentPage);
  }, [filter, currentPage, search, academicYearFilter]);

  const fetchStudents = async (page = 1) => {
    setLoading(true);
    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.substring(6) || localStorage.getItem('token');

      const url = new URL(`${API_URL}/api/admin/users`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', PER_PAGE.toString());
      if (filter !== 'all') url.searchParams.append('status', filter);
      if (search) url.searchParams.append('search', search);
      if (academicYearFilter) url.searchParams.append('academic_year', academicYearFilter);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.data.data || []);
        setTotalPages(data.data.last_page || 1);
        setTotalCount(data.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProgress = async (studentId: number) => {
    setLoadingProgress(true);
    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.substring(6) || localStorage.getItem('token');

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
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.substring(6) || localStorage.getItem('token');

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

  const handleOpenProfile = (student: Student) => {
    setSelectedStudent(student);
    setStudentProgress(null);
    setNewPassword('');
    fetchStudentProgress(student.id);
    fetchAllCourses();
  };

  const handleUpdateWallet = async () => {
    if (!selectedStudent) return;
    setUpdatingWallet(true);
    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.substring(6) || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/admin/users/${selectedStudent.id}/wallet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ balance: parseInt(walletAmount) }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast('تم تحديث رصيد المحفظة بنجاح!', 'success');
        fetchStudentProgress(selectedStudent.id);
        fetchStudents(currentPage);
      } else {
        showToast(data.error || data.message || 'فشل تحديث رصيد المحفظة', 'error');
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
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.substring(6) || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/admin/users/${selectedStudent.id}/courses/${courseId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });

      const data = await response.json();
      if (response.ok) {
        showToast('تم تغيير حالة الاشتراك للكورس بنجاح!', 'success');
        fetchStudentProgress(selectedStudent.id);
      } else {
        showToast(data.error || data.message || 'فشل تغيير حالة الاشتراك', 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setTogglingCourseId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStudent) return;
    if (!newPassword || newPassword.length < 6) {
      showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
      return;
    }
    setResettingPassword(true);
    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.substring(6) || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/admin/users/${selectedStudent.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        showToast('تم إعادة تعيين كلمة المرور بنجاح!', 'success');
        setNewPassword('');
      } else {
        const errData = await response.json();
        showToast(errData.message || 'فشل إعادة تعيين كلمة المرور', 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setResettingPassword(false);
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
            <h1 className="page-title">إدارة الطلاب</h1>
            <p className="page-subtitle">
              إجمالي الطلاب: {totalCount} طالب/ة
            </p>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <SearchIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو البريد أو الهاتف..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field pr-9"
                dir="rtl"
              />
            </div>

            <div style={{ width: '200px' }}>
              <select
                value={academicYearFilter}
                onChange={(e) => {
                  setAcademicYearFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field animate-fade-in"
                dir="rtl"
              >
                <option value="">كل السنوات الدراسية</option>
                {['الاول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي', 'الاول الاعدادي', 'الثاني الاعدادي', 'الثالث الاعدادي', 'الاول الثانوي', 'الثاني الثانوية', 'الثالث الثانوي'].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 flex-wrap">
              {(['all', 'active', 'pending', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilter(status);
                    setCurrentPage(1);
                  }}
                  className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-outline'}`}
                >
                  {status === 'all' ? 'الكل' : status === 'active' ? 'نشط' : status === 'pending' ? 'معلق' : 'مرفوض'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner-lg" />
            <p className="mt-4 text-muted">جاري تحميل قائمة الطلاب...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <UsersIcon size={32} />
            </div>
            <h3>لا يوجد طلاب</h3>
            <p>لا يوجد طلاب يطابقون البحث</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table text-right">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الاسم</th>
                    <th>السنة</th>
                    <th>المحفظة</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                    <th className="text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.id}>
                      <td>{(currentPage - 1) * PER_PAGE + index + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="student-avatar"
                            style={{ backgroundColor: 'var(--primary)' }}
                          >
                            {(student.full_name || '?').charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold">{student.full_name}</div>
                            <div className="text-xs text-muted" dir="ltr">{student.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>{student.academic_year}</td>
                      <td>
                        <span className="font-semibold text-success">
                          {student.wallet_balance} ج.م
                        </span>
                      </td>
                      <td>{getStatusBadge(student.status)}</td>
                      <td>{new Date(student.created_at).toLocaleDateString('ar-EG')}</td>
                      <td className="text-center">
                        <button
                          onClick={() => handleOpenProfile(student)}
                          className="btn btn-sm btn-outline font-bold"
                        >
                          <SettingsIcon size={14} />
                          إدارة البروفايل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-outline"
                >
                  السابق
                </button>
                <span className="flex items-center px-4 font-bold">
                  {currentPage} من {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-outline"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {selectedStudent && (
        <div className="profile-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="profile-fullscreen" onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <h2 className="profile-header-title">
                <UserIcon size={20} />
                إدارة بروفايل الطالب: {selectedStudent.full_name}
              </h2>
              <button onClick={() => setSelectedStudent(null)} className="profile-close-btn">
                <XIcon size={24} />
              </button>
            </div>

            {loadingProgress || !studentProgress ? (
              <div className="loading-state">
                <div className="spinner spinner-lg" />
                <p className="mt-4 text-muted font-bold">جاري تحميل بيانات الطالب والتقدم...</p>
              </div>
            ) : (
              <div className="space-y-6">

                <div className="profile-info-grid">
                  <div>
                    <span className="text-xs text-muted block">البريد الإلكتروني</span>
                    <span className="font-bold">{studentProgress.student.email || selectedStudent.email || 'غير محدد'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted block">السنة الدراسية</span>
                    <span className="font-bold">{studentProgress.student.academicYear || selectedStudent.academic_year || 'غير محدد'}</span>
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

                <div className="card">
                  <h3 className="font-bold text-success mb-3 flex items-center gap-2">
                    <WalletIcon size={18} />
                    إدارة رصيد المحفظة
                  </h3>
                  <div className="flex gap-3 items-end max-w-md">
                    <div className="flex-1">
                      <label className="form-label">الرصيد الجديد (بالنقاط/جنيه)</label>
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
                    >
                      {updatingWallet ? 'جاري الحفظ...' : 'تحديث الرصيد'}
                    </button>
                  </div>
                </div>

                <div className="card">
                  <h3 className="font-bold text-warning mb-3 flex items-center gap-2">
                    <KeyIcon size={18} />
                    إعادة تعيين كلمة المرور
                  </h3>
                  <div className="flex gap-3 items-end max-w-md">
                    <div className="flex-1">
                      <label className="form-label">كلمة المرور الجديدة</label>
                      <input
                        type="text"
                        placeholder="أدخل 6 أحرف على الأقل"
                        className="input-field w-full font-bold"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleResetPassword}
                      disabled={resettingPassword}
                      className="btn btn-warning"
                    >
                      {resettingPassword ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BookIcon size={18} />
                    اشتراكات الكورسات والتقدم التعليمي
                  </h3>

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
                                className={`btn btn-sm font-bold ${isEnrolled ? 'btn-danger' : 'btn-primary'}`}
                              >
                                {togglingCourseId === course.id ? (
                                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                ) : isEnrolled ? (
                                  <>
                                    <XIcon size={14} />
                                    إلغاء الاشتراك
                                  </>
                                ) : (
                                  <>
                                    <CheckIcon size={14} />
                                    تفعيل الاشتراك
                                  </>
                                )}
                              </button>
                            </div>

                            {isEnrolled && (
                              <div className="p-3 rounded-lg space-y-3 text-right" style={{ background: 'var(--soft-bg, #f8fafc)', border: '1px solid var(--border, #DCE5EB)' }}>
                                <div className="flex justify-between items-center text-xs font-bold flex-wrap gap-2" style={{ color: 'var(--text-secondary)' }}>
                                  <span>عدد المحاضرات المكتملة: {courseProg.completedLectures} / {courseProg.totalLectures}</span>
                                  <span>نسبة الإنجاز: {courseProg.totalLectures > 0 ? Math.round((courseProg.completedLectures / courseProg.totalLectures) * 100) : 0}%</span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-right text-xs">
                                    <thead>
                                      <tr className="border-b text-muted">
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
                                              <span className="text-success font-bold inline-flex items-center gap-1">
                                                <CheckIcon size={14} />
                                                مكتمل
                                              </span>
                                            ) : (
                                              <span className="text-muted inline-flex items-center gap-1">
                                                <ClockIcon size={14} />
                                                غير مكتمل ({Math.round(lec.watchTime / 60)} د)
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 text-center">
                                            {lec.lastExamScore !== null ? (
                                              <span className={`font-bold ${lec.examPassed ? 'text-success' : 'text-error'}`}>
                                                {lec.lastExamScore}% ({lec.examPassed ? 'ناجح' : 'راسب'})
                                              </span>
                                            ) : (
                                              <span className="text-muted">—</span>
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
    </div>
  );
}
