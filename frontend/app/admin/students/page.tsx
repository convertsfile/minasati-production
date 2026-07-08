'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import api from '@/lib/axios';
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

const PER_PAGE = 10;

const ACADEMIC_YEARS = [
  { value: 'grade_1', label: 'الأول الابتدائي' },
  { value: 'grade_2', label: 'الثاني الابتدائي' },
  { value: 'grade_3', label: 'الثالث الابتدائي' },
  { value: 'grade_4', label: 'الرابع الابتدائي' },
  { value: 'grade_5', label: 'الخامس الابتدائي' },
  { value: 'grade_6', label: 'السادس الابتدائي' },
  { value: 'grade_7', label: 'الأول الإعدادي' },
  { value: 'grade_8', label: 'الثاني الإعدادي' },
  { value: 'grade_9', label: 'الثالث الإعدادي' },
  { value: 'grade_10', label: 'الأول الثانوي' },
  { value: 'grade_11', label: 'الثاني الثانوي' },
  { value: 'grade_12', label: 'الثالث الثانوي' },
  { value: 'other', label: 'أخرى / جامعي' }
];

// احتفظنا بالـ Interface القديم للواجهة لكي لا نكسر التصميم
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

function getAcademicYearLabel(val: string) {
  const found = ACADEMIC_YEARS.find(y => y.value === val);
  return found ? found.label : val;
}

export default function AllStudentsPage() {
  const router = useRouter();
  const { isChecking } = useAuthGuard(['admin']);

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
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    if (selectedStudent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedStudent]);

  useEffect(() => {
    if (!isChecking) {
      fetchStudents(currentPage);
    }
  }, [filter, currentPage, search, academicYearFilter, isChecking]);

  // 🚀 الدالة العبقرية الجديدة لجلب البيانات وفك تشفيرها
  const fetchStudents = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = { page, limit: PER_PAGE };
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      if (academicYearFilter) params.academic_year = academicYearFilter;

      const response: any = await api.get('/admin/users', { params });
      
      let usersArray = [];
      let total = 0;
      let lastPage = 1;

      // 1. معالجة التغليف الخاص بـ Pagination من Laravel بجميع حالاته
      if (Array.isArray(response.data)) {
        usersArray = response.data;
        total = response.meta?.total || usersArray.length;
        lastPage = response.meta?.lastPage || response.meta?.last_page || 1;
      } else if (response.data && Array.isArray(response.data.data)) {
        usersArray = response.data.data;
        total = response.data.meta?.total || response.data.total || usersArray.length;
        lastPage = response.data.meta?.last_page || response.data.last_page || 1;
      }

      // 2. توحيد الأسماء (ترجمة CamelCase من الباك إند إلى Snake_case للواجهة)
      const mappedStudents = usersArray.map((s: any) => ({
        id: s.id,
        full_name: s.fullName || s.full_name || 'بدون اسم',
        email: s.email || '-',
        phone: s.phone || '-',
        academic_year: getAcademicYearLabel(s.academicYear || s.academic_year || 'غير محدد'),
        status: s.status || 'pending',
        wallet_balance: s.walletBalance !== undefined ? s.walletBalance : (s.wallet_balance || 0),
        created_at: s.joinedAt || s.joined_at || s.createdAt || s.created_at || new Date().toISOString(),
      }));

      setStudents(mappedStudents);
      setTotalPages(lastPage);
      setTotalCount(total);
    } catch (error: any) {
      showToast(error?.message || 'فشل في جلب بيانات الطلاب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProgress = async (studentId: number) => {
    setLoadingProgress(true);
    try {
      const response = await api.get(`/admin/student-progress/${studentId}`);
      setStudentProgress(response.data);
      setWalletAmount(response.data.student.walletBalance.toString());
    } catch (error: any) {
      showToast('فشل في جلب تقدم الطالب', 'error');
    } finally {
      setLoadingProgress(false);
    }
  };

  const fetchAllCourses = async () => {
    try {
      const response = await api.get('/admin/courses');
      setAllCourses(response.data || []);
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
      await api.post(`/admin/users/${selectedStudent.id}/wallet`, {
        balance: parseInt(walletAmount)
      });
      showToast('تم تحديث رصيد المحفظة بنجاح!', 'success');
      fetchStudentProgress(selectedStudent.id);
      fetchStudents(currentPage); 
    } catch (error: any) {
      showToast(error?.message || 'فشل تحديث رصيد المحفظة', 'error');
    } finally {
      setUpdatingWallet(false);
    }
  };

  const handleToggleCourse = async (courseId: number) => {
    if (!selectedStudent) return;
    setTogglingCourseId(courseId);
    try {
      await api.post(`/admin/users/${selectedStudent.id}/courses/${courseId}/toggle`);
      showToast('تم تغيير حالة الاشتراك للكورس بنجاح!', 'success');
      fetchStudentProgress(selectedStudent.id);
    } catch (error: any) {
      showToast(error?.message || 'فشل تغيير حالة الاشتراك', 'error');
    } finally {
      setTogglingCourseId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStudent) return;
    if (!newPassword || newPassword.length < 8) {
      showToast('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتتضمن أرقام', 'error');
      return;
    }
    setResettingPassword(true);
    try {
      await api.post(`/admin/users/${selectedStudent.id}/reset-password`, {
        password: newPassword
      });
      showToast('تم إعادة تعيين كلمة المرور بنجاح!', 'success');
      setNewPassword('');
    } catch (error: any) {
      showToast(error?.message || 'فشل إعادة تعيين كلمة المرور', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  if (isChecking) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content">
          <div className="loading-state">
            <div className="spinner spinner-lg" />
            <p className="mt-4 text-muted font-bold">جاري التحقق من الصلاحيات...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      <AdminSidebar />

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
        <div className="page-header">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <UsersIcon size={28} />
              إدارة جميع الطلاب
            </h1>
            <p className="page-subtitle">
              إجمالي الطلاب المسجلين: <span className="font-bold text-primary">{totalCount}</span> طالب/ة
            </p>
          </div>
        </div>

        <div className="card mb-6 shadow-sm border border-[var(--border)]">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <SearchIcon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو البريد أو الهاتف..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field pr-12 w-full font-semibold"
                dir="rtl"
              />
            </div>

            <div style={{ width: '220px' }}>
              <select
                value={academicYearFilter}
                onChange={(e) => {
                  setAcademicYearFilter(e.target.value);
                  setCurrentPage(1); // العودة للصفحة الأولى عند الفلترة
                }}
                className="input-field w-full font-semibold cursor-pointer"
                dir="rtl"
              >
                <option value="">كل السنوات الدراسية</option>
                {/* 🚀 رسم الفلتر باللغة العربية، ولكن القيمة المرسلة ستكون إنجليزية */}
                {ACADEMIC_YEARS.map(year => (
                  <option key={year.value} value={year.value}>{year.label}</option>
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
                  className={`btn btn-sm font-bold px-4 ${filter === status ? 'btn-primary shadow-md' : 'btn-outline bg-[var(--soft-bg)]'}`}
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
            <p className="mt-4 text-muted font-bold">جاري تحميل قائمة الطلاب...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <UsersIcon size={48} />
            </div>
            <h3 className="text-xl font-bold mt-4">لا يوجد طلاب</h3>
            <p className="text-muted">لم يتم العثور على طلاب يطابقون معايير البحث الحالية.</p>
          </div>
        ) : (
          <>
            <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
              <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
                <table className="table text-right" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', margin: 0 }}>
                  <thead>
                    <tr style={{ background: 'var(--soft-bg)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '1rem' }}>#</th>
                      <th style={{ padding: '1rem' }}>الاسم</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>السنة</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>المحفظة</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>الحالة</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>التاريخ</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={student.id} className="hover:bg-[var(--soft-bg)] transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                          {(currentPage - 1) * PER_PAGE + index + 1}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-md font-bold bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] shrink-0">
                              {(student.full_name || '?').charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-[var(--text-primary)]">{student.full_name}</div>
                              <div className="text-xs text-muted font-mono" dir="ltr">{student.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }} className="text-primary">
                          {student.academic_year}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span className="font-bold text-success bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs">
                            {student.wallet_balance} ج.م
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {getStatusBadge(student.status)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(student.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleOpenProfile(student)}
                            className="btn btn-sm btn-outline font-bold inline-flex items-center gap-2 px-4 rounded-lg"
                          >
                            <SettingsIcon size={14} />
                            إدارة الملف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-outline px-6 rounded-xl font-bold disabled:opacity-50"
                >
                  السابق
                </button>
                <span className="font-bold text-sm bg-[var(--soft-bg)] px-4 py-2 rounded-lg border border-[var(--border)]">
                  صفحة <span className="text-primary">{currentPage}</span> من {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-primary px-6 rounded-xl font-bold disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* نافذة إدارة بروفايل الطالب */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in" onClick={() => setSelectedStudent(null)}>
          <div 
            className="bg-[var(--background)] w-full max-w-2xl h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden" 
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface)]">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-primary)]">
                  <UserIcon size={24} className="text-primary" />
                  ملف الطالب: {selectedStudent.full_name}
                </h2>
                <p className="text-sm text-muted mt-1 font-mono">{selectedStudent.email}</p>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)} 
                className="p-2 rounded-full hover:bg-[var(--soft-bg)] text-muted hover:text-red-500 transition-colors"
              >
                <XIcon size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {loadingProgress || !studentProgress ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="spinner spinner-lg text-primary" />
                  <p className="text-muted font-bold animate-pulse">جاري جلب الملف الشامل للطالب...</p>
                </div>
              ) : (
                <div className="space-y-6">

                  {/* معلومات أساسية */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-[var(--soft-bg)] rounded-2xl border border-[var(--border)]">
                    <div>
                      <span className="text-xs text-muted block mb-1">السنة الدراسية</span>
                      <span className="font-bold text-sm bg-white px-2 py-1 rounded shadow-sm">{studentProgress.student.academicYear || selectedStudent.academic_year || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block mb-1">هاتف الطالب</span>
                      <span className="font-bold text-sm font-mono" dir="ltr">{studentProgress.student.phone}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block mb-1">هاتف ولي الأمر</span>
                      <span className="font-bold text-sm font-mono" dir="ltr">{studentProgress.student.parentPhone || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block mb-1">المحافظة</span>
                      <span className="font-bold text-sm">{studentProgress.student.governorate || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block mb-1">المدرسة</span>
                      <span className="font-bold text-sm truncate block" title={studentProgress.student.school}>{studentProgress.student.school || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block mb-1">رصيد المحفظة الحالي</span>
                      <span className="font-bold text-success text-sm">{studentProgress.student.walletBalance} ج.م</span>
                    </div>
                  </div>

                  {/* إدارة المحفظة */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-green-600 mb-4 flex items-center gap-2">
                      <WalletIcon size={20} />
                      تعديل رصيد المحفظة
                    </h3>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <input
                          type="number"
                          className="input-field w-full font-bold text-lg text-left"
                          value={walletAmount}
                          onChange={e => setWalletAmount(e.target.value)}
                          min="0"
                          dir="ltr"
                        />
                      </div>
                      <button
                        onClick={handleUpdateWallet}
                        disabled={updatingWallet}
                        className="btn btn-success px-6 py-3 rounded-xl font-bold shadow-lg shadow-green-200/50"
                      >
                        {updatingWallet ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'حفظ الرصيد'}
                      </button>
                    </div>
                  </div>

                  {/* إعادة تعيين كلمة المرور */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-amber-500 mb-4 flex items-center gap-2">
                      <KeyIcon size={20} />
                      تغيير كلمة المرور
                    </h3>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="أدخل 8 أحرف وأرقام على الأقل"
                          className="input-field w-full font-bold font-mono text-left"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          dir="ltr"
                        />
                      </div>
                      <button
                        onClick={handleResetPassword}
                        disabled={resettingPassword}
                        className="btn btn-warning px-6 py-3 rounded-xl font-bold shadow-lg shadow-amber-200/50 text-white"
                      >
                        {resettingPassword ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'تغيير'}
                      </button>
                    </div>
                  </div>

                  {/* إدارة الكورسات والتقدم */}
                  <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                    <h3 className="font-bold text-xl flex items-center gap-2 text-[var(--text-primary)]">
                      <BookIcon size={22} className="text-primary" />
                      الاشتراكات والتقدم التعليمي
                    </h3>

                    {allCourses.length === 0 ? (
                      <div className="text-center py-8 bg-[var(--soft-bg)] rounded-xl border border-dashed border-gray-300">
                        <BookIcon size={32} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500 font-bold">لا توجد كورسات متاحة في المنصة حالياً.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {allCourses.map(course => {
                          const courseProg = studentProgress.courses.find((c: any) => c.courseId === course.id);
                          const isEnrolled = !!courseProg;

                          return (
                            <div key={course.id} className={`bg-white rounded-2xl border transition-all ${isEnrolled ? 'border-primary shadow-md' : 'border-gray-200 opacity-75 hover:opacity-100'}`}>
                              <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100">
                                <div>
                                  <h4 className="font-bold text-lg text-gray-900">{course.title}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold">
                                      {course.academic_year || 'عام'}
                                    </span>
                                    {isEnrolled && (
                                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">
                                        إنجاز: {courseProg.totalLectures > 0 ? Math.round((courseProg.completedLectures / courseProg.totalLectures) * 100) : 0}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleToggleCourse(course.id)}
                                  disabled={togglingCourseId === course.id}
                                  className={`btn btn-sm font-bold w-full md:w-auto px-6 py-2 rounded-xl transition-all ${isEnrolled ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100' : 'btn-primary shadow-lg shadow-primary/30'}`}
                                >
                                  {togglingCourseId === course.id ? (
                                    <span className="spinner w-4 h-4 border-2 mx-auto" style={{ borderColor: isEnrolled ? 'red transparent red transparent' : 'white transparent white transparent'}} />
                                  ) : isEnrolled ? (
                                    <><XIcon size={16} /> إلغاء الاشتراك</>
                                  ) : (
                                    <><CheckIcon size={16} /> تفعيل الكورس</>
                                  )}
                                </button>
                              </div>

                              {isEnrolled && courseProg.lectures.length > 0 && (
                                <div className="p-4 bg-gray-50/50 rounded-b-2xl">
                                  <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                                    <table className="w-full text-right text-sm">
                                      <thead>
                                        <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                          <th className="py-3 px-4 font-bold">المحاضرة</th>
                                          <th className="py-3 px-4 text-center font-bold">الفيديو</th>
                                          <th className="py-3 px-4 text-center font-bold">الامتحان</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {courseProg.lectures.map((lec: any) => (
                                          <tr key={lec.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 font-semibold text-gray-800">{lec.title}</td>
                                            <td className="py-3 px-4 text-center">
                                              {lec.isCompleted ? (
                                                <span className="text-green-600 bg-green-50 px-2 py-1 rounded inline-flex items-center gap-1 text-xs font-bold">
                                                  <CheckIcon size={14} /> مكتمل
                                                </span>
                                              ) : (
                                                <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded inline-flex items-center gap-1 text-xs font-bold">
                                                  <ClockIcon size={14} /> شاهد {Math.round(lec.watchTime / 60)} دقيقة
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                              {lec.lastExamScore !== null ? (
                                                <span className={`font-bold inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${lec.examPassed ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                                  {lec.examPassed ? <CheckIcon size={14} /> : <XIcon size={14} />}
                                                  {lec.lastExamScore}%
                                                </span>
                                              ) : (
                                                <span className="text-gray-400 text-xs font-bold">—</span>
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
        </div>
      )}

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}