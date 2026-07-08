'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard'; 
import api from '@/lib/axios'; 
import {
  PlusIcon, XIcon, EditIcon, TrashIcon, BookIcon, 
  FileTextIcon, AlertTriangleIcon, SparklesIcon,
  CheckCircleIcon, AlertCircleIcon, ShieldIcon
} from '@/app/components/Icons';

// قاموس الترجمة
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
  { value: 'other', label: 'أخرى / عام' }
];

function getAcademicYearLabel(val: string) {
  const found = ACADEMIC_YEARS.find(y => y.value === val);
  return found ? found.label : val;
}

interface Course {
  id: number;
  title: string;
  description: string | null;
  pricePoints: number;
  validityDate: string | null;
  academicYear: string | null;
  isStrictOrder: boolean;
  status: string; // 🚀 تمت إضافة الحالة
  createdAt: string;
  lecturesCount?: number;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const { isChecking } = useAuthGuard(['admin']);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  // 🚀 تمت إضافة status للنموذج
  const [formData, setFormData] = useState({
    title: '', description: '', price_points: '', validity_date: '', academic_year: '', is_strict_order: true, status: 'published'
  });

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  useEffect(() => {
    if (confirmDialog) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [confirmDialog]);

  useEffect(() => {
    if (!isChecking) fetchCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChecking]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/courses');
      const data = response.data?.data || response.data || [];
      
      const mappedCourses: Course[] = data.map((c: any) => ({
        id: c.id,
        title: c.title || 'كورس بدون عنوان',
        description: c.description,
        pricePoints: Number(c.price_points ?? c.pricePoints ?? 0),
        validityDate: c.validity_date ?? c.validityDate ?? null,
        academicYear: c.academic_year ?? c.academicYear ?? null,
        isStrictOrder: !!(c.is_strict_order ?? c.isStrictOrder ?? true),
        status: c.status || 'draft', // 🚀 سحب الحالة
        createdAt: c.created_at ?? c.createdAt ?? new Date().toISOString(),
        lecturesCount: Number(c.lectures_count ?? c.lecturesCount ?? 0),
      }));
      setCourses(mappedCourses);
    } catch (e: any) {
      showToast(e?.message || 'فشل جلب قائمة الكورسات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.price_points) {
      showToast('يرجى تعبئة العنوان والسعر', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        price_points: parseInt(formData.price_points) || 0,
        validity_date: formData.validity_date || null,
        academic_year: formData.academic_year || null,
        is_strict_order: formData.is_strict_order,
        status: formData.status, // 🚀 إرسال الحالة للباك إند
      };

      if (editingCourse) {
        await api.put(`/admin/courses/${editingCourse.id}`, payload);
        showToast('تم تحديث بيانات الكورس بنجاح', 'success');
      } else {
        await api.post('/admin/courses', payload);
        showToast('تمت إضافة الكورس الجديد بنجاح', 'success');
      }

      setShowForm(false);
      setEditingCourse(null);
      setFormData({ title: '', description: '', price_points: '', validity_date: '', academic_year: '', is_strict_order: true, status: 'published' });
      fetchCourses();
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || e?.message || 'فشل حفظ الكورس، تحقق من البيانات';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (course: Course) => {
    setConfirmDialog({
      visible: true,
      message: `هل أنت متأكد من حذف الكورس "${course.title}"؟ سيتم حذف جميع المحاضرات والاختبارات المرتبطة به نهائياً.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoading(true);
        try {
          await api.delete(`/admin/courses/${course.id}`);
          showToast('تم حذف الكورس بنجاح', 'success');
          fetchCourses();
        } catch (e: any) {
          showToast(e?.message || 'فشل حذف الكورس', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      price_points: course.pricePoints.toString(),
      validity_date: course.validityDate ? course.validityDate.split('T')[0] : '',
      academic_year: course.academicYear || '',
      is_strict_order: course.isStrictOrder,
      status: course.status, // 🚀 تعبئة الحالة عند التعديل
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isChecking) {
    return (
      <div className="admin-layout relative">
        <AdminSidebar />
        <main className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="loading-state text-center flex flex-col items-center">
             <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
             <p className="font-bold text-muted text-lg">جاري التحقق وتجهيز الكورسات...</p>
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
        style={{ opacity: toast.visible ? 1 : 0, transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', pointerEvents: toast.visible ? 'auto' : 'none' }}
      >
        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
          <span>{toast.message}</span>
        </div>
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmDialog(null)}>
          <div className="card shadow-2xl max-w-sm w-full text-center p-8 animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-5 text-error">
              <AlertTriangleIcon size={56} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 py-3 font-bold rounded-xl border-gray-200 hover:bg-gray-50">إلغاء</button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1 py-3 font-bold shadow-lg shadow-red-200 rounded-xl text-white">نعم، احذف</button>
            </div>
          </div>
        </div>
      )}

      <main className="admin-content">
        <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
              <BookIcon size={32} className="text-primary" /> إدارة الكورسات
            </h1>
            <p className="page-subtitle mt-2 text-base">تحكم كامل في كورسات المنصة، الأسعار، والترتيب التعليمي.</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingCourse(null); setFormData({ title: '', description: '', price_points: '', validity_date: '', academic_year: '', is_strict_order: true, status: 'published' }); }}
            className={`btn ${showForm ? 'btn-outline border-error text-error hover:bg-red-50' : 'btn-primary shadow-lg shadow-blue-200'} font-bold transition-all rounded-xl px-6 py-3`}
          >
            {showForm ? <><XIcon size={18} /> إلغاء إضافة كورس</> : <><PlusIcon size={18} /> إضافة كورس جديد</>}
          </button>
        </div>

        {showForm && (
          <div className="card mb-8 animate-fade-in shadow-sm border border-blue-100 p-8 bg-gradient-to-b from-blue-50/50 to-white rounded-2xl">
            <h3 className="text-xl font-black mb-6 text-primary flex items-center gap-2 border-b border-primary/10 pb-4">
              {editingCourse ? <><EditIcon size={22} /> تعديل بيانات الكورس</> : <><SparklesIcon size={22} className="text-success" /> إعداد كورس جديد</>}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group col-span-full mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">عنوان الكورس (إجباري)</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field w-full font-black text-lg bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl py-3" required dir="rtl" placeholder="مثال: كورس الفيزياء - الباب الأول" />
              </div>
              
              <div className="form-group col-span-full mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">الوصف التفصيلي (اختياري)</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field w-full bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl p-4 text-sm" rows={3} dir="rtl" style={{ resize: 'none' }} placeholder="اكتب وصفاً مختصراً يظهر للطلاب عن محتوى الكورس..." />
              </div>

              <div className="form-group mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">السعر (بالنقاط/الجنيه)</label>
                <input type="text" value={formData.price_points} onChange={(e) => setFormData({ ...formData, price_points: e.target.value.replace(/[^0-9]/g, '') })} className="input-field w-full font-black text-success text-xl bg-white border-green-200 focus:border-green-500 shadow-sm rounded-xl py-3 text-center" required dir="ltr" placeholder="0" />
              </div>

              <div className="form-group mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">السنة الدراسية المستهدفة</label>
                <select value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} className="input-field w-full font-bold bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl py-3" dir="rtl">
                  <option value="">عام لجميع السنوات</option>
                  {ACADEMIC_YEARS.map(year => (
                    <option key={year.value} value={year.value}>{year.label}</option>
                  ))}
                </select>
              </div>

              {/* 🚀 حقل اختيار حالة الكورس الجديد */}
              <div className="form-group mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">حالة الكورس (الظهور للطلاب)</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-field w-full font-bold bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl py-3" dir="rtl">
                  <option value="published">🟢 منشور ومتاح للطلاب</option>
                  <option value="draft">🔒 مسودة (مخفي قيد التجهيز)</option>
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">تاريخ انتهاء الصلاحية (اختياري)</label>
                <input type="date" value={formData.validity_date} onChange={(e) => setFormData({ ...formData, validity_date: e.target.value })} className="input-field w-full font-bold bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl py-3 text-center" />
              </div>

              <div className="form-group col-span-full flex items-center pt-4 mb-0">
                <label className="flex items-center gap-4 cursor-pointer p-4 bg-white hover:bg-gray-50 rounded-xl transition-all border border-gray-200 w-full shadow-sm">
                  <input type="checkbox" checked={formData.is_strict_order} onChange={(e) => setFormData({ ...formData, is_strict_order: e.target.checked })} className="w-6 h-6 rounded accent-primary cursor-pointer border-gray-300" />
                  <div>
                    <span className="font-black text-gray-900 block text-base mb-1">إلزامية الترتيب المتتالي</span>
                    <span className="text-xs text-gray-500 font-bold leading-tight">يمنع الطالب من فتح المحاضرة التالية إلا بعد اجتياز المحاضرة السابقة بنجاح.</span>
                  </div>
                </label>
              </div>

              <div className="col-span-full pt-6 border-t border-gray-100 mt-2">
                <button type="submit" disabled={loading} className="btn btn-primary px-10 py-3.5 font-black text-base shadow-lg shadow-blue-200 rounded-xl w-full md:w-auto">
                  {loading ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto block" /> : (editingCourse ? 'حفظ التعديلات ✔️' : 'إصدار الكورس 🚀')}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && courses.length === 0 ? (
          <div className="card p-16 flex justify-center items-center flex-col bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="spinner spinner-primary spinner-lg mb-4" />
            <p className="font-bold text-gray-500">جاري سحب بيانات الكورسات...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
            <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
              <BookIcon size={48} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-black text-gray-800">لا توجد كورسات بعد</h3>
            <p className="text-muted mt-2 font-medium mb-8 max-w-sm mx-auto">ابدأ بإنشاء الكورس الأول ليتمكن الطلاب من الاشتراك وبدء التعلم.</p>
            <button onClick={() => { setShowForm(true); setEditingCourse(null); }} className="btn btn-primary px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200">
              <PlusIcon size={20} className="ml-2 inline" /> أضف الكورس الأول الآن
            </button>
          </div>
        ) : (
          <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto w-full">
              <table className="table w-full m-0 min-w-[1000px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">عنوان الكورس</th>
                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">الحالة</th>
                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">السعر (ج.م)</th>
                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">المحاضرات</th>
                    <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap min-w-[300px]">إجراءات الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-black text-primary text-base flex items-center gap-2">
                          <BookIcon size={18} className="text-gray-400" /> {course.title}
                        </div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {course.academicYear ? (
                            <span className="badge font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded">
                              {getAcademicYearLabel(course.academicYear)}
                            </span>
                          ) : (
                            <span className="badge font-bold text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded">
                              عام للجميع
                            </span>
                          )}
                          {!course.isStrictOrder && (
                            <span className="badge font-bold text-[10px] bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded">
                              ترتيب حر
                            </span>
                          )}
                        </div>
                      </td>
                      {/* 🚀 عرض حالة الكورس في الجدول */}
                      <td className="py-4 px-6 text-center">
                        <span className={`badge font-bold text-xs px-3 py-1.5 rounded-lg border shadow-sm ${course.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {course.status === 'published' ? '🟢 منشور' : '🔒 مسودة'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-black text-success text-lg bg-green-50 px-3 py-1 rounded-lg border border-green-100 shadow-sm">
                          {course.pricePoints}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-black text-gray-800 text-lg">{course.lecturesCount || 0}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center items-center gap-2">
                          <button onClick={() => router.push(`/admin/courses/${course.id}/lectures`)} className="btn btn-sm btn-primary font-bold shadow-sm rounded-lg px-3 hover:-translate-y-0.5 transition-transform" title="إدارة المحاضرات">
                            <BookIcon size={14} /> المحاضرات
                          </button>
                          <button onClick={() => router.push(`/admin/courses/${course.id}/comprehensive-exams`)} className="btn btn-sm btn-secondary font-bold shadow-sm rounded-lg px-3 bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 transition-transform text-white" title="الاختبارات الشاملة">
                            <ShieldIcon size={14} /> الامتحانات
                          </button>
                          <button onClick={() => handleEdit(course)} className="btn btn-sm btn-outline border-gray-300 hover:bg-gray-100 font-bold rounded-lg px-2" title="تعديل الكورس">
                            <EditIcon size={16} />
                          </button>
                          <button onClick={() => handleDelete(course)} className="btn btn-sm btn-outline border-red-100 text-error hover:bg-red-50 font-bold rounded-lg px-2" title="حذف الكورس نهائياً">
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}