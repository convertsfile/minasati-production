'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import {
  PlusIcon, XIcon, EditIcon, TrashIcon, BookIcon, FileTextIcon,
  AlertTriangleIcon, CheckIcon, ClockIcon, SparklesIcon,
} from '@/app/components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Course {
  id: number;
  title: string;
  description: string | null;
  price_points: number;
  validity_date: string | null;
  academic_year: string | null;
  is_strict_order: boolean | number;
  created_at: string;
  lectures_count?: number;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_points: '',
    validity_date: '',
    academic_year: '',
    is_strict_order: true,
  });

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.substring(6) || localStorage.getItem('token');
  };

  useEffect(() => {
    fetchCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (res.status === 401 || res.status === 403) {
        router.push('/login');
        return;
      }

      const data = await res.json();
      setCourses(data.data || []);
    } catch (err) {
      showToast('فشل جلب الكورسات من الخادم', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = getToken();
      const url = editingCourse
        ? `${API_URL}/api/admin/courses/${editingCourse.id}`
        : `${API_URL}/api/admin/courses`;

      // ⚠️ Backend registers PATCH /api/admin/courses/{course} for partial
      // updates (Route::patch(...)). Using PUT here 404s because the route
      // table does not include a PUT binding.
      const res = await fetch(url, {
        method: editingCourse ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          price_points: parseInt(formData.price_points),
          is_strict_order: formData.is_strict_order,
          academic_year: formData.academic_year || null,
        }),
      });

      if (res.ok) {
        showToast(editingCourse ? 'تم تحديث الكورس بنجاح' : 'تم إضافة الكورس بنجاح', 'success');
        setShowForm(false);
        setEditingCourse(null);
        setFormData({ title: '', description: '', price_points: '', validity_date: '', academic_year: '', is_strict_order: true });
        fetchCourses();
      } else {
        const errorData = await res.json();
        showToast(errorData.message || 'حدث خطأ أثناء الحفظ. تأكد من البيانات', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من حذف هذا الكورس؟ سيتم حذف جميع المحاضرات والاختبارات المرتبطة به للأبد.',
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsLoading(true);
        try {
          const token = getToken();
          const res = await fetch(`${API_URL}/api/admin/courses/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          if (res.ok) {
            showToast('تم حذف الكورس بنجاح', 'success');
            fetchCourses();
          } else {
            showToast('فشل حذف الكورس. قد يكون مرتبطاً ببيانات أخرى', 'error');
          }
        } catch (err) {
          showToast('خطأ في الاتصال بالخادم', 'error');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    const formattedDate = course.validity_date ? course.validity_date.split('T')[0] : '';

    setFormData({
      title: course.title,
      description: course.description || '',
      price_points: course.price_points.toString(),
      validity_date: formattedDate,
      academic_year: course.academic_year || '',
      is_strict_order: course.is_strict_order === undefined ? true : !!course.is_strict_order,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      {toast.visible && (
        <div className="toast-container">
          <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
            {toast.message}
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="modal-overlay">
          <div className="modal max-w-sm w-11/12 text-center p-8">
            <div className="flex justify-center mb-4" style={{ opacity: 0.9 }}>
              <AlertTriangleIcon size={48} />
            </div>
            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--error)' }}>تأكيد الحذف</h3>
            <p className="text-muted mb-6" style={{ lineHeight: '1.6' }}>{confirmDialog.message}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1">إلغاء</button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1">نعم، احذف</button>
            </div>
          </div>
        </div>
      )}

      <main className="admin-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">إدارة الكورسات</h1>
            <p className="page-subtitle text-muted">قم بإضافة وتعديل الكورسات التعليمية المتاحة للطلاب</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingCourse(null); setFormData({ title: '', description: '', price_points: '', validity_date: '', academic_year: '', is_strict_order: true }); }}
            className="btn btn-primary"
          >
            {showForm ? <><XIcon size={16} /> إلغاء</> : <><PlusIcon size={20} /> إضافة كورس جديد</>}
          </button>
        </div>

        {showForm && (
          <div className="card animate-fade-in mb-6">
            <div className="border-b border-white/10 pb-4 mb-5">
              <h3 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                {editingCourse ? <><EditIcon size={20} /> تعديل الكورس</> : <><SparklesIcon size={20} /> إضافة كورس جديد</>}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">عنوان الكورس</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field w-full" required dir="rtl" placeholder="مثال: كورس التأسيس الشامل" />
              </div>
              <div className="form-group">
                <label className="form-label">الوصف التفصيلي</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field w-full custom-scrollbar" rows={4} dir="rtl" placeholder="اكتب نبذة عن محتوى الكورس وما سيتعلمه الطالب..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--success)' }}>السعر (بالنقاط)</label>
                  <input type="number" value={formData.price_points} onChange={(e) => setFormData({ ...formData, price_points: e.target.value })} className="input-field w-full text-xl font-bold" style={{ color: 'var(--success)' }} required min="0" placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--warning)' }}>تاريخ انتهاء الصلاحية (اختياري)</label>
                  <input type="date" value={formData.validity_date} onChange={(e) => setFormData({ ...formData, validity_date: e.target.value })} className="input-field w-full" style={{ color: 'var(--warning)' }} />
                  <small className="text-muted text-xs mt-1 block">إذا تركته فارغاً، سيكون الكورس متاحاً للأبد للمشتركين.</small>
                </div>
                <div className="form-group">
                  <label className="form-label">السنة الدراسية (اختياري)</label>
                  <select
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="input-field w-full"
                    dir="rtl"
                  >
                    <option value="">كل السنوات الدراسية (عام)</option>
                    {['الاول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي', 'الاول الاعدادي', 'الثاني الاعدادي', 'الثالث الاعدادي', 'الاول الثانوي', 'الثاني الثانوية', 'الثالث الثانوي'].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-black/10 rounded-lg hover:bg-black/20 transition-all border border-white/5">
                    <input
                      type="checkbox"
                      checked={formData.is_strict_order}
                      onChange={(e) => setFormData({ ...formData, is_strict_order: e.target.checked })}
                      className="w-5 h-5 rounded border-white/10 bg-black/40"
                      style={{ color: 'var(--primary)' }}
                    />
                    <div>
                      <span className="font-bold text-sm block" style={{ color: 'var(--text-primary)' }}>إلزامية الترتيب المتتالي للمحاضرات</span>
                      <small className="text-muted text-xs block">يمنع الطالب من فتح المحاضرة التالية إلا بعد إنهاء السابقة</small>
                    </div>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-white/10 mt-6">
                <button type="submit" disabled={isLoading} className="btn btn-primary px-8">
                  {isLoading ? 'جاري الحفظ...' : <><CheckIcon size={20} /> حفظ الكورس</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading && courses.length === 0 ? (
          <div className="loading-state">
            <div className="spinner spinner-lg"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <BookIcon size={48} style={{ opacity: 0.5 }} />
            <h3 className="text-xl font-bold mb-2">لا توجد كورسات مسجلة بعد</h3>
            <p className="text-muted mb-6">قم بإنشاء الكورس الأول للبدء في رفع المحاضرات وبناء المنصة.</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary"><PlusIcon size={20} /> أضف الكورس الأول</button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>عنوان الكورس والتفاصيل</th>
                  <th className="text-center">السعر</th>
                  <th className="text-center">تاريخ الانتهاء</th>
                  <th className="text-center">المحاضرات</th>
                  <th className="text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-bold text-lg" style={{ color: 'var(--primary)' }}>{course.title}</h4>
                          {course.academic_year && (
                            <span className="badge" style={{ backgroundColor: 'rgba(27, 189, 212, 0.1)', color: '#1BBDD4', border: '1px solid rgba(27, 189, 212, 0.2)' }}>
                              {course.academic_year}
                            </span>
                          )}
                          {!course.is_strict_order && (
                            <span className="badge" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                              ترتيب حر (مراكمين)
                            </span>
                          )}
                        </div>
                        {course.description && (
                          <p className="text-sm text-muted mt-1 line-clamp-1">{course.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="badge badge-success px-3 py-1 text-sm font-bold">{course.price_points} EGP</span>
                    </td>
                    <td className="text-center">
                      {course.validity_date ? (
                        <span className="text-sm" style={{ color: 'var(--warning)' }}>
                          <ClockIcon size={14} /> {new Date(course.validity_date).toLocaleDateString('ar-EG')}
                        </span>
                      ) : (
                        <span className="text-muted opacity-50">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className="badge" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                        {course.lectures_count || 0}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-center items-center gap-2">
                        <button onClick={() => router.push(`/admin/courses/${course.id}/lectures`)} className="btn btn-sm btn-primary shrink-0" title="إدارة المحاضرات">
                          <BookIcon size={16} /> المحاضرات
                        </button>
                        <button onClick={() => router.push(`/admin/courses/${course.id}/exams`)} className="btn btn-sm btn-secondary shrink-0" title="إدارة الاختبارات">
                          <FileTextIcon size={16} /> الاختبارات
                        </button>
                        <button onClick={() => handleEdit(course)} className="btn btn-sm btn-outline px-3" title="تعديل">
                          <EditIcon size={16} />
                        </button>
                        <button onClick={() => handleDelete(course.id)} className="btn btn-sm btn-danger px-3" title="حذف الكورس">
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
