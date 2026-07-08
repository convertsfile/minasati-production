'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابة المركزي
import api from '@/lib/axios'; // 🚀 العميل الشبكي المحمي
import { 
  KeyIcon, PlusIcon, UploadIcon, SearchIcon, 
  CheckCircleIcon, AlertCircleIcon, PhoneIcon 
} from '../../components/Icons';

interface Course {
  id: number;
  title: string;
}

interface CenterCode {
  id: number;
  code: string;
  courseId: number;
  courseTitle: string;
  type: 'course' | 'lecture' | 'accumulator';
  studentPhone: string | null;
  lectureId: number | null;
  lectureTitle: string | null;
  accumulatorLectures: number[] | null;
  isUsed: boolean;
  usedBy: {
    id: number;
    fullName: string;
    phone: string;
  } | null;
  usedAt: string | null;
  createdAt: string;
}

export default function AdminCenterCodesPage() {
  const router = useRouter();

  // 🚀 درع الحماية: يمنع المتطفلين ويعرض شاشة تحميل ريثما يتأكد من الصلاحيات
  const { isChecking } = useAuthGuard(['admin']);

  const [courses, setCourses] = useState<Course[]>([]);
  const [codes, setCodes] = useState<CenterCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [selectedCourse, setSelectedCourse] = useState('');
  const [codeType, setCodeType] = useState<'course' | 'lecture' | 'accumulator'>('course');
  const [courseLectures, setCourseLectures] = useState<{ id: number; title: string }[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState('');
  const [selectedAccumulatorLectures, setSelectedAccumulatorLectures] = useState<number[]>([]);
  const [studentPhone, setStudentPhone] = useState('');
  const [fetchingLectures, setFetchingLectures] = useState(false);
  const [quantity, setQuantity] = useState('10');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // نظام التنبيهات الموحد الأنيق
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  // 🚀 جلب الكورسات بمجرد التأكد من الصلاحيات
  useEffect(() => {
    if (!isChecking) {
      fetchCourses();
    }
  }, [isChecking]);

  // 🚀 مراقبة الفلاتر وجلب الأكواد
  useEffect(() => {
    if (!isChecking) {
      fetchCodes(currentPage);
    }
  }, [filterCourse, filterStatus, currentPage, isChecking]);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/admin/courses');
      setCourses(response.data?.data || response.data || []);
    } catch (error: any) {
      showToast(error?.message || 'فشل تحميل قائمة الكورسات', 'error');
    }
  };

  const fetchLectures = async (courseId: string) => {
    if (!courseId) {
      setCourseLectures([]);
      return;
    }
    setFetchingLectures(true);
    try {
      const response = await api.get(`/admin/courses/${courseId}/lectures`);
      setCourseLectures(response.data?.data || response.data || []);
    } catch (error: any) {
      showToast(error?.message || 'فشل تحميل المحاضرات', 'error');
    } finally {
      setFetchingLectures(false);
    }
  };

  // 🚀 التفاعل الذكي مع تغيير نوع الكود والكورس المختار
  useEffect(() => {
    if (selectedCourse && (codeType === 'lecture' || codeType === 'accumulator')) {
      fetchLectures(selectedCourse);
    } else {
      setCourseLectures([]);
    }
    setSelectedLectureId('');
    setSelectedAccumulatorLectures([]);
  }, [selectedCourse, codeType]);

  const fetchCodes = async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get('/admin/center-codes', {
        params: {
          course_id: filterCourse || undefined,
          status: filterStatus || undefined,
          page
        }
      });
      
      const data = response.data;
      
      // 🚀 توحيد الحقول لتناسب الواجهة وتأمين الـ Pagination
      const mappedCodes = (data?.data || data || []).map((c: any) => ({
        id: c.id,
        code: c.code,
        courseId: c.course_id || c.courseId,
        courseTitle: c.course_title || c.courseTitle || c.course?.title || '',
        type: c.type || 'course',
        studentPhone: c.student_phone || c.studentPhone || null,
        lectureId: c.lecture_id || c.lectureId || null,
        lectureTitle: c.lecture_title || c.lectureTitle || null,
        accumulatorLectures: c.accumulator_lectures || c.accumulatorLectures || null,
        isUsed: c.is_used ?? c.isUsed ?? false,
        usedBy: c.used_by || c.usedBy ? {
          id: c.used_by?.id || c.usedBy?.id,
          fullName: c.used_by?.full_name || c.usedBy?.fullName || c.used_by?.name || 'غير معروف',
          phone: c.used_by?.phone || c.usedBy?.phone || '',
        } : null,
        usedAt: c.used_at || c.usedAt || null,
        createdAt: c.created_at || c.createdAt || new Date().toISOString(),
      }));

      setCodes(mappedCodes);
      
      // تأمين قراءة بيانات الصفحات
      const meta = data?.meta || data;
      setTotalPages(meta?.last_page || meta?.lastPage || 1);
      setTotalCount(meta?.total || mappedCodes.length || 0);
      setCurrentPage(meta?.current_page || meta?.currentPage || 1);
    } catch (error: any) {
      showToast(error?.message || 'فشل تحميل الأكواد', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🚀 حماية (Front-end Validation) لمنع أخطاء الـ API
    if (codeType === 'lecture' && !selectedLectureId) {
      showToast('يجب اختيار المحاضرة أولاً لإنشاء هذا النوع من الأكواد', 'error');
      return;
    }
    if (codeType === 'accumulator') {
      if (!studentPhone || studentPhone.length < 10) {
        showToast('يجب إدخال رقم هاتف صحيح للطالب لهذا الكود التراكمي', 'error');
        return;
      }
      if (selectedAccumulatorLectures.length === 0) {
        showToast('يجب تحديد محاضرة واحدة على الأقل لإعفاء الطالب منها', 'error');
        return;
      }
    }

    setGenerating(true);
    setGeneratedCodes([]);

    try {
      const payload = {
        course_id: parseInt(selectedCourse),
        quantity: parseInt(quantity),
        type: codeType,
        student_phone: codeType === 'accumulator' ? studentPhone : null,
        lecture_id: codeType === 'lecture' && selectedLectureId ? parseInt(selectedLectureId) : null,
        accumulator_lectures: codeType === 'accumulator' ? selectedAccumulatorLectures : null,
      };

      const response = await api.post('/admin/center-codes/generate', payload);
      
      const newCodesData = response.data?.codes || response.data?.data?.codes || [];
      const newCodes = newCodesData.map((c: any) => c.code || c);
      
      setGeneratedCodes(newCodes);
      setStudentPhone('');
      fetchCodes(1); // إعادة جلب الصفحة الأولى لتحديث الجدول
      showToast(`تم إنشاء ${newCodes.length} كود بنجاح!`, 'success');
      
    } catch (error: any) {
      showToast(error?.message || error?.error || 'فشل إنشاء الأكواد، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCSV = async () => {
    if (!filterCourse) {
      showToast('يجب اختيار كورس أولاً من الفلتر لتصدير أكواده المتاحة', 'error');
      return;
    }

    try {
      // 🚀 تصدير احترافي عبر Axios
      const response = await api.get('/admin/center-codes/export', {
        params: { course_id: filterCourse }
      });

      const exportData = response.data?.data || response.data || [];

      if (exportData.length === 0) {
        showToast('لا توجد أكواد غير مستخدمة لهذا الكورس', 'error');
        return;
      }

      // 🚀 تأمين ملف الـ CSV من الكسر بسبب الفواصل (Commas)
      const csvContent = exportData
        .map((code: any) => {
          const rawTitle = code.course || code.course_title || code.courseTitle || 'N/A';
          const safeTitle = rawTitle.replace(/,/g, ' - '); // إزالة الفواصل لحماية الأعمدة
          const codeString = code.code || '';
          const dateString = code.created_at || code.createdAt || '';
          return `${codeString},${safeTitle},${dateString}`;
        })
        .join('\n');

      // معالجة اللغة العربية (BOM) لكي يفتح الإكسيل الملف بشكل صحيح
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + `الكود,الكورس,تاريخ الإنشاء\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `أكواد-مراكز-كورس-${filterCourse}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      showToast('تم التصدير بنجاح', 'success');
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء التصدير', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('تم النسخ إلى الحافظة!', 'success');
  };

  const getStatusBadge = (isUsed: boolean) => {
    return (
      <span className={isUsed ? 'badge badge-error font-bold px-3 py-1' : 'badge badge-success font-bold px-3 py-1'}>
        {isUsed ? 'مستخدم' : 'متاح للبيع'}
      </span>
    );
  };

  // 🚀 شاشة التحميل الأولية لمنع وميض الواجهة
  if (isChecking || (loading && codes.length === 0 && !filterCourse)) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <div className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="loading-state flex flex-col items-center">
            <div className="spinner spinner-lg mb-4 text-primary" />
            <p className="text-muted font-bold text-lg">جاري تجهيز أكواد المراكز...</p>
          </div>
        </div>
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
              <KeyIcon size={32} className="text-primary" />
              إدارة أكواد المراكز
            </h1>
            <p className="page-subtitle text-base mt-2">قم بتوليد وتصدير أكواد مسبقة الدفع لتباع في السناتر والمكتبات (إجمالي: <span className="font-bold text-primary">{totalCount}</span> كود)</p>
          </div>
        </div>

        {/* 🚀 قسم توليد الأكواد */}
        <div className="card mb-8 shadow-sm border border-gray-200 bg-white rounded-2xl p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-800 pb-4">
            <PlusIcon size={22} className="text-success" />
            إنشاء أكواد جديدة
          </h2>

          <form onSubmit={handleGenerate} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
              <div className="form-group mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">الكورس المرتبط بالكود</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="input-field bg-gray-50 focus:bg-white font-bold w-full rounded-xl py-3 border-gray-200"
                  required
                  dir="rtl"
                >
                  <option value="">اختر كورس...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">نوع الصلاحية (الكود)</label>
                <select
                  value={codeType}
                  onChange={(e) => setCodeType(e.target.value as any)}
                  className="input-field bg-gray-50 focus:bg-white font-bold w-full rounded-xl py-3 border-gray-200"
                  required
                  dir="rtl"
                >
                  <option value="course">كورس كامل (يفتح الكورس)</option>
                  <option value="lecture">محاضرة معينة (يفتح محاضرة واحدة)</option>
                  <option value="accumulator">كود تراكمي (إعفاء من واجب/امتحان)</option>
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">الكمية (عدد الأكواد)</label>
                <input
                  type="number"
                  value={quantity}
                  // 🚀 حماية ضد الأرقام السالبة والكسور
                  onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                  min="1"
                  max="1000"
                  className="input-field bg-gray-50 focus:bg-white font-bold w-full rounded-xl py-3 border-gray-200 text-center"
                  required
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={generating || !selectedCourse}
                className="btn btn-primary h-[50px] text-base font-bold shadow-lg shadow-blue-200 rounded-xl"
              >
                {generating ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'إنشاء الأكواد 🚀'}
              </button>
            </div>

            {/* الحقول الإضافية (تظهر بـ Animation حسب الاختيار) */}
            {codeType === 'lecture' && selectedCourse && (
              <div className="form-group animate-fade-in max-w-lg bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                <label className="form-label font-bold text-blue-900 block mb-3">حدد المحاضرة التي سيفتحها هذا الكود:</label>
                {fetchingLectures ? (
                  <p className="text-muted text-sm font-bold flex items-center gap-2"><span className="spinner spinner-primary w-4 h-4 border-2" /> جاري التحميل...</p>
                ) : (
                  <select
                    value={selectedLectureId}
                    onChange={(e) => setSelectedLectureId(e.target.value)}
                    className="input-field bg-white w-full rounded-lg font-medium border-blue-200"
                    required
                    dir="rtl"
                  >
                    <option value="">اختر محاضرة...</option>
                    {courseLectures.map(lecture => (
                      <option key={lecture.id} value={lecture.id}>
                        {lecture.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {codeType === 'accumulator' && selectedCourse && (
              <div className="flex flex-col gap-5 animate-fade-in bg-orange-50/50 p-6 rounded-xl border border-orange-100">
                <div className="form-group max-w-lg">
                  <label className="form-label font-bold text-orange-900 block mb-2">رقم هاتف الطالب المخصص له الكود</label>
                  <input
                    type="text"
                    placeholder="مثال: 01012345678"
                    value={studentPhone}
                    // 🚀 تأمين الإدخال ليقبل الأرقام فقط
                    onChange={(e) => setStudentPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="input-field bg-white font-mono text-lg tracking-widest w-full rounded-lg border-orange-200"
                    required
                    dir="ltr"
                  />
                  <small className="text-orange-700 text-xs mt-2 flex items-center gap-1 font-bold">
                    <AlertCircleIcon size={14} /> للحماية: لن يتمكن من استخدام هذا الكود التراكمي سوى الطالب صاحب هذا الرقم.
                  </small>
                </div>

                <div className="form-group border-t border-orange-200/50 pt-4">
                  <label className="form-label font-bold mb-4 block text-orange-900">حدد المحاضرات التي تريد إعفاء الطالب من شرطها:</label>
                  {fetchingLectures ? (
                    <p className="text-muted text-sm font-bold flex items-center gap-2"><span className="spinner spinner-primary w-4 h-4" /> جاري التحميل...</p>
                  ) : courseLectures.length === 0 ? (
                    <p className="text-sm font-bold text-red-600 bg-red-50 p-3 rounded-lg inline-block">لا يوجد محاضرات في هذا الكورس بعد.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-white/80 rounded-xl border border-orange-200 max-h-64 overflow-y-auto shadow-inner">
                      {courseLectures.map(lecture => {
                        const isChecked = selectedAccumulatorLectures.includes(lecture.id);
                        return (
                          <label key={lecture.id} className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all border ${isChecked ? 'bg-orange-100 border-orange-300 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAccumulatorLectures(prev => [...prev, lecture.id]);
                                } else {
                                  setSelectedAccumulatorLectures(prev => prev.filter(id => id !== lecture.id));
                                }
                              }}
                              className="mt-0.5 w-5 h-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                            />
                            <span className={`text-sm font-bold leading-tight ${isChecked ? 'text-orange-900' : 'text-gray-700'}`}>{lecture.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>

          {/* 🚀 عرض الأكواد التي تم توليدها للتو */}
          {generatedCodes.length > 0 && (
            <div className="mt-8 p-6 rounded-2xl animate-scale-up shadow-sm" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
              <div className="flex flex-wrap justify-between items-center gap-4 mb-5 pb-4 border-b border-green-200">
                <p className="font-bold flex items-center gap-2 text-green-800 text-lg">
                  <CheckCircleIcon size={24} />
                  نجاح! تم إنشاء {generatedCodes.length} كود جديد.
                </p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCodes.join('\n'));
                    showToast('تم نسخ جميع الأكواد بنجاح', 'success');
                  }} 
                  className="btn bg-white text-green-700 border border-green-300 hover:bg-green-50 font-bold shadow-sm rounded-xl px-6"
                >
                  نسخ الكل 📋
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-2">
                {generatedCodes.map((code, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-green-100 hover:border-green-300 transition-colors group">
                    <code className="font-mono text-base font-bold text-gray-800 tracking-widest select-all">{code}</code>
                    <button onClick={() => copyToClipboard(code)} className="text-xs font-bold text-primary hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">نسخ</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 🚀 قسم الفلاتر والجدول */}
        <div className="card mb-6 shadow-sm border border-gray-200 bg-white rounded-2xl p-5">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="form-label text-sm font-bold text-gray-700 mb-2 block">تصفية حسب الكورس</label>
              <select
                value={filterCourse}
                onChange={(e) => { setFilterCourse(e.target.value); setCurrentPage(1); }}
                className="input-field bg-gray-50 focus:bg-white font-bold w-full rounded-xl"
                dir="rtl"
              >
                <option value="">جميع الكورسات (عرض الكل)</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="form-label text-sm font-bold text-gray-700 mb-2 block">تصفية حسب حالة الاستخدام</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="input-field bg-gray-50 focus:bg-white font-bold w-full rounded-xl"
                dir="rtl"
              >
                <option value="">الكل (مستخدم وغير مستخدم)</option>
                <option value="unused">غير مستخدم فقط (متاح للبيع)</option>
                <option value="used">مستخدم فقط (تم تفعيله)</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="btn btn-success flex items-center gap-2 h-[46px] px-6 rounded-xl font-bold shadow-md shadow-green-200"
            >
              <UploadIcon size={18} />
              تصدير المتاح كـ CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card p-16 flex flex-col items-center justify-center border border-gray-200 bg-white rounded-2xl">
            <div className="spinner spinner-primary spinner-lg mb-4" />
            <span className="font-bold text-muted">جاري سحب الأكواد...</span>
          </div>
        ) : codes.length === 0 ? (
          <div className="empty-state bg-white rounded-2xl py-20 shadow-sm">
            <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
              <KeyIcon size={48} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-black text-gray-800">لا توجد أكواد مطابقة</h3>
            <p className="text-muted mt-2 font-medium">قم بإنشاء أكواد جديدة أو تغيير خيارات التصفية بالأعلى لتظهر النتائج.</p>
          </div>
        ) : (
          <>
            <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto w-full">
                <table className="table w-full m-0 min-w-[1000px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">الكود</th>
                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">الكورس المرتبط</th>
                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">نوع الصلاحية</th>
                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">الحالة</th>
                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">مخصص لهاتف</th>
                      <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">المستخدم (الطالب)</th>
                      <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">تاريخ الإنشاء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {codes.map(code => (
                      <tr key={code.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-5">
                          <code className="font-mono text-base font-bold text-primary tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg select-all border border-blue-100 inline-block">{code.code}</code>
                        </td>
                        <td className="py-4 px-5 font-bold text-gray-800 text-sm">{code.courseTitle || '—'}</td>
                        <td className="py-4 px-5 text-center">
                          {code.type === 'course' ? (
                            <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>كورس كامل</span>
                          ) : code.type === 'lecture' ? (
                            <span className="badge animate-fade-in font-bold px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: '#0B4F6C', color: '#fff' }}>
                              محاضرة: {code.lectureTitle || `#${code.lectureId}`}
                            </span>
                          ) : (
                            <span className="badge animate-fade-in font-bold px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: '#f97316', color: '#fff' }}>
                              تراكمي ({code.accumulatorLectures ? code.accumulatorLectures.length : 0} م)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-center">{getStatusBadge(code.isUsed)}</td>
                        <td className="py-4 px-5 text-center">
                          {code.studentPhone ? (
                            <span className="font-mono text-xs font-bold flex items-center justify-center gap-1.5 text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 inline-flex">
                              <PhoneIcon size={14} />
                              {code.studentPhone}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-full">عام للجميع</span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          {code.usedBy ? (
                            <div>
                              <div className="font-bold text-sm text-gray-900">{code.usedBy.fullName}</div>
                              <div className="text-xs text-muted font-mono mt-1 font-bold" dir="ltr">
                                {code.usedBy.phone}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-bold">—</span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className="text-xs text-gray-500 font-bold bg-gray-50 px-2 py-1 rounded">
                            {new Date(code.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
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
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold hover:bg-gray-50 border-none"
                >
                  السابق
                </button>
                <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">
                  الصفحة {currentPage} من {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold hover:bg-gray-50 border-none"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}