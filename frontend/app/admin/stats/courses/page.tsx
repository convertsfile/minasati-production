'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useAuthGuard } from '../../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
import api from '@/lib/axios'; // 🚀 العميل الذكي للشبكة
import {
  BarChartIcon, RefreshIcon, FileTextIcon, UsersIcon, XIcon,
  SearchIcon, SettingsIcon, UserIcon, CreditCardIcon, BookIcon,
  CheckIcon, CheckCircleIcon, AlertCircleIcon
} from '@/app/components/Icons';

interface CourseStat {
  id: number;
  title: string;
  pricePoints: number;
  studentsCount: number;
}

export default function CourseStatsPage() {
  const router = useRouter();

  // 🚀 درع الحماية: يطرد المتطفلين فوراً ويعرض شاشة التحميل
  const { isChecking } = useAuthGuard(['admin']);

  const [stats, setStats] = useState<CourseStat[]>([]);
  const [loading, setLoading] = useState(true);

  // إعدادات النوافذ المنبثقة (Modals)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState<string | null>(null);
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // إعدادات بروفايل الطالب
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentProgress, setStudentProgress] = useState<any>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [walletAmount, setWalletAmount] = useState('');
  const [updatingWallet, setUpdatingWallet] = useState(false);
  const [togglingCourseId, setTogglingCourseId] = useState<number | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // 🚀 نظام التنبيهات الموحد الأنيق
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  // 🚀 تجميد التمرير (Scroll Lock) بشكل آمن
  useEffect(() => {
    if (selectedCourseId || selectedStudent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedCourseId, selectedStudent]);

  useEffect(() => {
    if (!isChecking) {
      fetchCourseStats();
    }
  }, [isChecking]);

  const fetchCourseStats = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/wallet/course-stats');
      
      const rawData = response.data?.data || response.data || [];
      // 🚀 حماية المصفوفة
      const validData = Array.isArray(rawData) ? rawData : [];
      
      const mappedStats: CourseStat[] = validData.map((s: any) => ({
        id: s.id,
        title: s.title || 'كورس بدون عنوان',
        pricePoints: Number(s.price_points ?? s.pricePoints ?? 0),
        studentsCount: Number(s.students_count ?? s.studentsCount ?? 0),
      }));

      setStats(mappedStats);
    } catch (e: any) {
      showToast(e?.message || 'فشل تحميل إحصائيات الكورسات', 'error');
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
      const response = await api.get(`/admin/wallet/courses/${courseId}/students`);
      
      const studentsData = response.data?.data?.students || response.data?.students || [];
      // 🚀 حماية المصفوفة
      const validStudents = Array.isArray(studentsData) ? studentsData : [];
      
      const mappedStudents = validStudents.map((st: any) => ({
        id: st.id,
        fullName: st.full_name ?? st.fullName ?? 'غير محدد',
        phone: st.phone ?? '',
        academicYear: st.academic_year ?? st.academicYear ?? 'غير محدد',
        subscribedAt: st.subscribed_at ?? st.subscribedAt ?? null,
      }));

      setCourseStudents(mappedStudents);
    } catch (e: any) {
      showToast(e?.message || 'فشل تحميل قائمة الطلاب المشتركين', 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchStudentProgress = async (studentId: number) => {
    setLoadingProgress(true);
    try {
      const response = await api.get(`/admin/student-progress/${studentId}`);
      const data = response.data?.data || response.data || {};
      
      // 🚀 تأمين هيكل البيانات لمنع الانهيار الداخلي
      const safeData = {
        student: data.student || {},
        courses: Array.isArray(data.courses) ? data.courses : []
      };
      
      setStudentProgress(safeData);
      setWalletAmount(safeData.student.walletBalance?.toString() || safeData.student.wallet_balance?.toString() || '0');
    } catch (error: any) {
      showToast(error?.message || 'فشل تحميل بيانات تقدم الطالب', 'error');
    } finally {
      setLoadingProgress(false);
    }
  };

  const fetchAllCourses = async () => {
    try {
      const response = await api.get('/admin/courses');
      const data = response.data?.data || response.data || [];
      setAllCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching all courses:', error);
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
      // 🚀 إرسال الرقم الفعلي دون مسح الكسور إن وجدت
      await api.post(`/admin/users/${selectedStudent.id}/wallet`, { 
        balance: Number(walletAmount) || 0 
      });

      showToast('تم تحديث رصيد المحفظة بنجاح!', 'success');
      
      fetchStudentProgress(selectedStudent.id);
      if (selectedCourseId !== null && selectedCourseTitle !== null) {
        fetchCourseStudents(selectedCourseId, selectedCourseTitle);
      }
    } catch (error: any) {
      showToast(error?.message || error?.error || 'فشل تحديث رصيد المحفظة', 'error');
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
      if (selectedCourseId !== null && selectedCourseTitle !== null) {
        fetchCourseStudents(selectedCourseId, selectedCourseTitle);
      }
    } catch (error: any) {
      showToast(error?.message || error?.error || 'فشل تغيير حالة الاشتراك', 'error');
    } finally {
      setTogglingCourseId(null);
    }
  };

  const totalEnrollments = stats.reduce((acc, curr) => acc + curr.studentsCount, 0);

  if (isChecking) {
    return (
      <div className="admin-layout relative">
        <AdminSidebar />
        <main className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="loading-state text-center flex flex-col items-center">
            <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
            <p className="font-bold text-muted text-lg">جاري تجهيز إحصائيات الكورسات...</p>
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
        <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
              <BarChartIcon size={32} className="text-primary" /> 
              إحصائيات الكورسات والاشتراكات
            </h1>
            <p className="page-subtitle text-base mt-2">تتبع أعداد الطلاب المشتركين ومعدلات الإقبال على الكورسات المختلفة.</p>
          </div>
          <button onClick={fetchCourseStats} disabled={loading} className="btn btn-outline font-bold bg-white shadow-sm border-gray-200 rounded-xl px-6 py-2.5 hover:bg-gray-50 transition-colors">
            {loading ? <span className="spinner spinner-primary w-5 h-5 border-2 mx-auto" /> : <span className="flex items-center gap-2"><RefreshIcon size={18} /> تحديث الإحصائيات</span>}
          </button>
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card text-right p-8 border-r-4 border-r-primary shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
            <span className="text-sm font-bold text-gray-500 block mb-3">إجمالي الكورسات النشطة</span>
            <span className="text-5xl font-black text-primary font-mono">{stats.length} <span className="text-2xl text-gray-400 font-bold">كورس</span></span>
          </div>
          <div className="card text-right p-8 border-r-4 border-r-success shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
            <span className="text-sm font-bold text-gray-500 block mb-3">إجمالي اشتراكات الطلاب</span>
            <span className="text-5xl font-black text-success font-mono">{totalEnrollments.toLocaleString('en-US')} <span className="text-2xl text-gray-400 font-bold">اشتراك</span></span>
          </div>
        </div>

        {loading ? (
          <div className="card border border-gray-100 flex justify-center p-16 shadow-sm rounded-2xl bg-white">
            <div className="spinner spinner-primary spinner-lg" />
          </div>
        ) : stats.length === 0 ? (
          <div className="empty-state bg-white rounded-2xl py-20 shadow-sm text-center">
            <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
              <FileTextIcon size={48} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-black text-gray-800">لا توجد كورسات مسجلة</h3>
            <p className="text-muted mt-2 font-medium">قم بإنشاء كورس من صفحة الكورسات للبدء في تتبع الإحصائيات.</p>
          </div>
        ) : (
          <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto w-full">
              <table className="table w-full m-0 min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">الكورس التعليمي</th>
                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">سعر الاشتراك (بالنقاط)</th>
                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">عدد الطلاب المشتركين</th>
                    <th className="font-bold text-gray-700 py-5 px-6 text-center min-w-[250px]">معدل الإقبال والتوزيع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.map((course) => {
                    const pct = totalEnrollments > 0 ? Math.round((course.studentsCount / totalEnrollments) * 100) : 0;
                    return (
                      <tr 
                        key={course.id} 
                        className="cursor-pointer hover:bg-blue-50/50 transition-colors group" 
                        onClick={() => fetchCourseStudents(course.id, course.title)}
                      >
                        <td className="py-5 px-6">
                          <span className="font-black text-gray-900 group-hover:text-primary transition-colors text-base flex items-center gap-3">
                            <BookIcon size={20} className="text-gray-400 group-hover:text-primary" />
                            {course.title}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="badge font-bold px-4 py-1.5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg">
                            {course.pricePoints.toLocaleString('en-US')} ج.م
                          </span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="font-black text-gray-800 text-xl font-mono">
                            {course.studentsCount.toLocaleString('en-US')} <span className="text-sm text-gray-500 font-bold">طالب</span>
                          </span>
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center justify-center gap-4">
                            <span className="text-xs text-gray-500 font-bold w-10 text-left font-mono">{pct}%</span>
                            <div className="flex-1 w-full bg-gray-100 h-2.5 rounded-full overflow-hidden shadow-inner border border-gray-200/50">
                              <div className="bg-gradient-to-l from-primary to-blue-400 h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                            </div>
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

        {/* 🚀 نافذة: الطلاب المشتركين في الكورس */}
        {selectedCourseId !== null && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedCourseId(null)}>
            <div className="card w-full max-w-4xl max-h-[85vh] overflow-y-auto transform transition-all shadow-2xl text-right bg-white p-0 rounded-2xl animate-scale-up border border-gray-100" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
                <h2 className="text-xl font-black text-primary flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-primary flex items-center justify-center rounded-full shadow-inner"><UsersIcon size={20} /></div>
                  الطلاب المشتركون في: {selectedCourseTitle}
                </h2>
                <button onClick={() => setSelectedCourseId(null)} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 text-gray-400 hover:text-error hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-colors">
                  <XIcon size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6 relative">
                  <SearchIcon size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ابحث عن طالب بالاسم أو الهاتف..."
                    value={studentSearchQuery}
                    onChange={e => setStudentSearchQuery(e.target.value)}
                    className="input-field w-full pr-12 py-3 bg-gray-50 focus:bg-white transition-colors font-medium border-gray-200 rounded-xl"
                    dir="rtl"
                  />
                </div>

                {loadingStudents ? (
                  <div className="loading-state h-64 border border-gray-100 rounded-xl flex flex-col justify-center items-center bg-gray-50/50">
                    <div className="spinner spinner-primary spinner-lg"></div>
                    <p className="mt-4 font-bold text-muted">جاري تحميل قائمة الطلاب...</p>
                  </div>
                ) : (() => {
                  // 🚀 الفلترة الآمنة ضد القيم الفارغة
                  const filtered = courseStudents.filter(s => 
                    (s.fullName || '').toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                    (s.phone || '').includes(studentSearchQuery)
                  );

                  return filtered.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      <UsersIcon size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 font-bold">لا يوجد طلاب مشتركين يطابقون كلمة البحث.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
                      <table className="w-full text-right text-sm m-0 min-w-[800px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="py-4 px-5 font-bold text-gray-700 whitespace-nowrap">الاسم</th>
                            <th className="py-4 px-5 font-bold text-gray-700 whitespace-nowrap">الهاتف</th>
                            <th className="py-4 px-5 font-bold text-gray-700 text-center whitespace-nowrap">السنة الدراسية</th>
                            <th className="py-4 px-5 font-bold text-gray-700 text-center whitespace-nowrap">تاريخ الاشتراك</th>
                            <th className="py-4 px-5 font-bold text-gray-700 text-center whitespace-nowrap">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filtered.map(student => (
                            <tr key={student.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="py-4 px-5 font-black text-gray-900">{student.fullName}</td>
                              <td className="py-4 px-5 font-mono font-bold text-gray-600" dir="ltr">{student.phone}</td>
                              <td className="py-4 px-5 text-center">
                                <span className="text-xs font-bold text-primary bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                  {student.academicYear || 'غير محدد'}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-center text-xs font-bold text-gray-500">
                                {student.subscribedAt ? new Date(student.subscribedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : 'غير معروف'}
                              </td>
                              <td className="py-4 px-5 text-center">
                                <button
                                  onClick={() => handleOpenProfile(student)}
                                  className="btn btn-sm btn-outline font-bold flex items-center justify-center gap-1.5 mx-auto bg-white shadow-sm border-gray-300 hover:bg-gray-50 rounded-lg px-4"
                                >
                                  <SettingsIcon size={14} /> إدارة
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
          </div>
        )}

        {/* 🚀 نافذة: إدارة بروفايل الطالب (التي تفتح من داخل الكورس) */}
        {selectedStudent && (
          <div className="profile-overlay z-[200] fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-end" onClick={() => setSelectedStudent(null)}>
            <div className="profile-fullscreen shadow-2xl border-l border-gray-200 bg-white w-full max-w-2xl h-full overflow-y-auto animate-slide-in-right" onClick={e => e.stopPropagation()}>
              <div className="profile-header bg-white border-b border-gray-100 p-6 flex justify-between items-center sticky top-0 z-10">
                <h2 className="profile-header-title text-xl font-black text-gray-900 flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-50 text-primary flex items-center justify-center rounded-full shadow-inner"><UserIcon size={24} /></div>
                  ملف الطالب: {selectedStudent.fullName}
                </h2>
                <button onClick={() => setSelectedStudent(null)} className="profile-close-btn w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 border border-gray-200 hover:bg-red-50 hover:text-error hover:border-red-200 transition-colors">
                  <XIcon size={20} />
                </button>
              </div>

              {loadingProgress || !studentProgress ? (
                <div className="loading-state h-[calc(100vh-100px)] flex flex-col justify-center items-center">
                  <div className="spinner spinner-primary spinner-lg mb-4"></div>
                  <p className="font-bold text-gray-500">جاري تحميل بيانات ومستويات الطالب...</p>
                </div>
              ) : (
                <div className="space-y-6 p-6">
                  
                  {/* 1. Student Basic Details */}
                  <div className="profile-info-grid grid grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-inner">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">السنة الدراسية</span>
                      <span className="font-black text-primary text-sm">{studentProgress.student?.academicYear || selectedStudent.academicYear || 'غير محدد'}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">رقم هاتف الطالب</span>
                      <span className="font-black text-gray-800 text-sm font-mono" dir="ltr">{studentProgress.student?.phone || '—'}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">رقم ولي الأمر</span>
                      <span className="font-black text-gray-800 text-sm font-mono" dir="ltr">{studentProgress.student?.parentPhone || 'غير محدد'}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">رصيد المحفظة</span>
                      <span className="font-black text-success text-lg">{studentProgress.student?.walletBalance || 0} ج.م</span>
                    </div>
                  </div>

                  {/* 2. Wallet Adjustment */}
                  <div className="card p-6 border border-green-200 bg-green-50/50 rounded-2xl shadow-sm">
                    <h3 className="font-black text-success mb-4 flex items-center gap-2 text-lg"><CreditCardIcon size={22} /> إدارة رصيد المحفظة</h3>
                    <div className="flex gap-4 items-end max-w-md">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-gray-700 mb-2 block">الرصيد الجديد (ج.م)</label>
                        <input
                          type="text" // استخدام text للتحكم الكامل ومنع الكسور إن لزم الأمر
                          className="input-field w-full font-black text-xl bg-white border-green-200 focus:border-green-500 shadow-sm rounded-xl py-3"
                          value={walletAmount}
                          // 🚀 حماية حقل الإدخال
                          onChange={e => setWalletAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        />
                      </div>
                      <button
                        onClick={handleUpdateWallet}
                        disabled={updatingWallet || walletAmount === ''}
                        className="btn btn-success shadow-lg shadow-green-200 font-bold rounded-xl"
                        style={{ padding: '0 1.5rem', height: '54px' }}
                      >
                        {updatingWallet ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'تحديث الرصيد'}
                      </button>
                    </div>
                  </div>

                  {/* 3. Course Enrollment Controls & Lecture Progress */}
                  <div className="space-y-4">
                    <h3 className="font-black border-b border-gray-100 pb-4 flex items-center gap-2 text-xl text-gray-900 mt-8">
                      <BookIcon size={24} className="text-primary" /> اشتراكات الكورسات والتقدم
                    </h3>
                    
                    {allCourses.length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-2xl"><p className="font-bold text-gray-500">لا توجد كورسات مسجلة في المنصة.</p></div>
                    ) : (
                      <div className="space-y-4">
                        {allCourses.map(course => {
                          // 🚀 حماية المصفوفة
                          const courseProg = studentProgress.courses?.find((c: any) => c.courseId === course.id);
                          const isEnrolled = !!courseProg;

                          return (
                            <div key={course.id} className={`profile-course-card p-5 rounded-2xl border transition-all ${isEnrolled ? 'border-primary/30 bg-blue-50/20 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                              <div className="flex justify-between items-center flex-wrap gap-4">
                                <div>
                                  <h4 className="font-black text-lg text-gray-900">{course.title}</h4>
                                  {course.academic_year && (
                                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md mt-1.5 inline-block border border-gray-200">
                                      {course.academic_year}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleToggleCourse(course.id)}
                                  disabled={togglingCourseId === course.id}
                                  className={`btn text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all ${isEnrolled ? 'btn-outline border-error text-error hover:bg-red-50' : 'btn-primary shadow-blue-200'}`}
                                >
                                  {togglingCourseId === course.id ? (
                                    <span className="spinner w-5 h-5 border-2"></span>
                                  ) : isEnrolled ? (
                                    <span className="flex items-center gap-1.5"><XIcon size={16} /> إلغاء الاشتراك</span>
                                  ) : (
                                    <span className="flex items-center gap-1.5"><CheckIcon size={16} /> تفعيل الكورس للطالب</span>
                                  )}
                                </button>
                              </div>

                              {/* Enrolled Course Progress Details */}
                              {isEnrolled && courseProg && (
                                <div className="mt-5 p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
                                  <div className="flex justify-between items-center text-xs font-bold flex-wrap gap-3 mb-5 bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                                    <span className="text-gray-700">المحاضرات المكتملة: <span className="text-primary font-black text-sm bg-white px-2 py-0.5 rounded border border-gray-100">{courseProg.completedLectures} / {courseProg.totalLectures}</span></span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-700">نسبة الإنجاز:</span>
                                      <span className={`px-2.5 py-1 rounded-md text-white shadow-sm ${courseProg.totalLectures > 0 && Math.round((courseProg.completedLectures / courseProg.totalLectures) * 100) >= 50 ? 'bg-success' : 'bg-warning'}`}>
                                        {courseProg.totalLectures > 0 ? Math.round((courseProg.completedLectures / courseProg.totalLectures) * 100) : 0}%
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                    <table className="w-full text-right text-sm m-0 min-w-[500px]">
                                      <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                          <th className="py-3 px-4 font-bold text-gray-700">اسم المحاضرة</th>
                                          <th className="py-3 px-4 font-bold text-gray-700 text-center">حالة الفيديو</th>
                                          <th className="py-3 px-4 font-bold text-gray-700 text-center">أعلى درجة امتحان</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {courseProg.lectures?.map((lec: any) => (
                                          <tr key={lec.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-gray-900">{lec.title}</td>
                                            <td className="py-3 px-4 text-center">
                                              {lec.isCompleted ? (
                                                <span className="text-success font-bold flex items-center justify-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg inline-flex border border-green-100 text-xs shadow-sm"><CheckIcon size={14} /> مكتمل</span>
                                              ) : (
                                                <span className="text-gray-500 font-bold flex items-center justify-center gap-1.5 text-xs bg-gray-50 px-3 py-1.5 rounded-lg inline-flex border border-gray-200">
                                                  غير مكتمل ({Math.round(lec.watchTime / 60)} د)
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                              {lec.lastExamScore !== null ? (
                                                <span className={`font-bold px-3 py-1.5 rounded-lg inline-block text-xs border shadow-sm ${lec.examPassed ? 'text-success bg-green-50 border-green-100' : 'text-error bg-red-50 border-red-100'}`}>
                                                  {lec.lastExamScore}% ({lec.examPassed ? 'ناجح' : 'راسب'})
                                                </span>
                                              ) : (
                                                <span className="text-gray-400 font-bold">—</span>
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

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}