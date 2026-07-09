'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar';
import { KeyIcon, PlusIcon, UploadIcon, SearchIcon, CheckCircleIcon, AlertCircleIcon, FileTextIcon, XIcon, PhoneIcon } from '../../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1] || localStorage.getItem('token');
};

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

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    checkAuth();
    fetchCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCodes(currentPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCourse, filterStatus, currentPage]);

  const checkAuth = async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // /auth/me returns {status:"success", data:UserResource} →
        // UserResource is {success, message, data:User}. Unwrap twice.
        const user = data?.data?.data ?? data?.data ?? data;
        if (!user?.is_admin) router.push('/');
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  };

  const fetchCourses = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchLectures = async (courseId: string) => {
    if (!courseId) {
      setCourseLectures([]);
      return;
    }
    setFetchingLectures(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/courses/${courseId}/lectures`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCourseLectures(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch lectures:', error);
    } finally {
      setFetchingLectures(false);
    }
  };

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
      const token = getToken();
      const params = new URLSearchParams();
      if (filterCourse) params.append('course_id', filterCourse);
      if (filterStatus) params.append('status', filterStatus);
      params.append('page', page.toString());

      const response = await fetch(`${API_URL}/api/admin/center-codes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCodes(data.data || []);
        if (data.meta) {
          setTotalPages(data.meta.lastPage || 1);
          setTotalCount(data.meta.total || 0);
          setCurrentPage(data.meta.currentPage || 1);
        }
      }
    } catch (error) {
      console.error('Failed to fetch codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGeneratedCodes([]);

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/center-codes/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          course_id: parseInt(selectedCourse),
          quantity: parseInt(quantity),
          type: codeType,
          student_phone: codeType === 'accumulator' ? studentPhone : null,
          lecture_id: codeType === 'lecture' && selectedLectureId ? parseInt(selectedLectureId) : null,
          accumulator_lectures: codeType === 'accumulator' ? selectedAccumulatorLectures : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newCodes = data.data.codes.map((c: { code: string }) => c.code);
        setGeneratedCodes(newCodes);
        setStudentPhone('');
        fetchCodes(1);
        showToast(`تم إنشاء ${newCodes.length} كود بنجاح!`, 'success');
      } else {
        showToast('فشل إنشاء الأكواد، تأكد من البيانات', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ في الاتصال بالخادم', 'error');
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
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/center-codes/export?course_id=${filterCourse}`, {
        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const exportData = data.data;

        if (exportData.length === 0) {
          showToast('لا توجد أكواد غير مستخدمة لهذا الكورس', 'error');
          return;
        }

        const csvContent = exportData
          .map((code: any) => `${code.code},${code.course},${code.created_at}`)
          .join('\n');

        const blob = new Blob([`الكود,الكورس,تاريخ الإنشاء\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `center-codes-course-${filterCourse}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        showToast('تم التصدير بنجاح', 'success');
      } else {
        showToast('فشل التصدير من الخادم', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ أثناء التصدير', 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('تم النسخ إلى الحافظة!', 'success');
  };

  const getStatusBadge = (isUsed: boolean) => {
    return (
      <span className={isUsed ? 'badge badge-error' : 'badge badge-success'}>
        {isUsed ? 'مستخدم' : 'متاح'}
      </span>
    );
  };

  if (loading && codes.length === 0) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <div className="admin-content">
          <div className="loading-state">
            <div className="spinner spinner-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      <AdminSidebar />

      <div className="toast-container" style={{ opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
          {toast.message}
        </div>
      </div>

      <main className="admin-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <KeyIcon size={28} />
              إدارة أكواد المراكز
            </h1>
            <p className="page-subtitle">إجمالي الأكواد: {totalCount} كود</p>
          </div>
        </div>

        <div className="card mb-6">
          <h2 className="card-title flex items-center gap-2 mb-5">
            <PlusIcon size={20} />
            إنشاء أكواد جديدة
          </h2>

          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="form-group">
                <label className="form-label">الكورس</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="input-field"
                  required
                  dir="rtl"
                >
                  <option value="">اختر كورس</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">نوع الكود</label>
                <select
                  value={codeType}
                  onChange={(e) => setCodeType(e.target.value as any)}
                  className="input-field"
                  required
                  dir="rtl"
                >
                  <option value="course">كورس كامل</option>
                  <option value="lecture">محاضرة معينة (فتح محاضرة واحدة)</option>
                  <option value="accumulator">كود تراكمي (امتحان وواجب اختياري)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">العدد</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  max="1000"
                  className="input-field"
                  required
                  dir="rtl"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="btn btn-primary h-[42px]"
              >
                {generating ? 'جاري الإنشاء...' : 'إنشاء'}
              </button>
            </div>

            {codeType === 'lecture' && selectedCourse && (
              <div className="form-group animate-fade-in max-w-lg">
                <label className="form-label">اختر المحاضرة المراد فتحها</label>
                {fetchingLectures ? (
                  <p className="text-muted text-xs">جاري تحميل المحاضرات...</p>
                ) : (
                  <select
                    value={selectedLectureId}
                    onChange={(e) => setSelectedLectureId(e.target.value)}
                    className="input-field"
                    required
                    dir="rtl"
                  >
                    <option value="">اختر محاضرة</option>
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
              <div className="flex flex-col gap-4 animate-fade-in">
                <div className="form-group max-w-lg">
                  <label className="form-label">رقم هاتف الطالب أو ولي الأمر (مطلوب للكود التراكمي)</label>
                  <input
                    type="text"
                    placeholder="مثال: 01067473845"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="input-field"
                    required
                    dir="rtl"
                  />
                  <small className="text-muted text-xs mt-1 block">لن يتمكن من استخدام هذا الكود سوى الطالب صاحب الرقم المدخل أو ولي أمره.</small>
                </div>

                <div className="form-group">
                  <label className="form-label font-bold mb-2 block">حدد المحاضرات التي تريد جعل واجبها وامتحانها اختيارياً (تراكمي):</label>
                  {fetchingLectures ? (
                    <p className="text-muted text-xs">جاري تحميل المحاضرات...</p>
                  ) : courseLectures.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--error)' }}>لا يوجد محاضرات في هذا الكورس بعد.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg border max-h-60 overflow-y-auto">
                      {courseLectures.map(lecture => {
                        const isChecked = selectedAccumulatorLectures.includes(lecture.id);
                        return (
                          <label key={lecture.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors border">
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
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                            />
                            <span className="text-sm font-medium">{lecture.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>

          {generatedCodes.length > 0 && (
            <div className="mt-6 p-4 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)' }}>
              <p className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--success)' }}>
                <CheckCircleIcon size={18} />
                تم إنشاء {generatedCodes.length} كود بنجاح:
              </p>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
                {generatedCodes.map((code, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-white rounded shadow-sm">
                    <code className="font-mono text-sm">{code}</code>
                    <button onClick={() => copyToClipboard(code)} className="btn btn-sm btn-outline">نسخ</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card mb-6">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="form-label text-sm">تصفية حسب الكورس</label>
              <select
                value={filterCourse}
                onChange={(e) => { setFilterCourse(e.target.value); setCurrentPage(1); }}
                className="input-field"
                dir="rtl"
              >
                <option value="">جميع الكورسات</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="form-label text-sm">تصفية حسب الحالة</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="input-field"
                dir="rtl"
              >
                <option value="">الكل</option>
                <option value="unused">غير مستخدم</option>
                <option value="used">مستخدم</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="btn btn-success flex items-center gap-2"
            >
              <UploadIcon size={16} />
              تصدير غير المستخدم كـ CSV
            </button>
          </div>
        </div>

        {codes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><KeyIcon size={48} /></div>
            <h3 className="text-xl font-bold">لا توجد أكواد</h3>
            <p>لم يتم العثور على أي أكواد تطابق بحثك</p>
          </div>
        ) : (
          <>
            <div className="table-container mb-4">
              <table className="table">
                <thead>
                  <tr>
                    <th>الكود</th>
                    <th>الكورس</th>
                    <th>النوع</th>
                    <th>الحالة</th>
                    <th>مخصص لهاتف</th>
                    <th>استخدم بواسطة</th>
                    <th>تاريخ الإنشاء</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map(code => (
                    <tr key={code.id}>
                      <td>
                        <code className="font-mono text-sm">{code.code}</code>
                      </td>
                      <td className="text-muted">{code.courseTitle}</td>
                      <td>
                        {code.type === 'course' ? (
                          <span className="badge" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>كورس كامل</span>
                        ) : code.type === 'lecture' ? (
                          <span className="badge animate-fade-in" style={{ backgroundColor: '#0B4F6C', color: '#fff' }}>
                            محاضرة: {code.lectureTitle || `محاضرة #${code.lectureId}`}
                          </span>
                        ) : (
                          <span className="badge animate-fade-in" style={{ backgroundColor: '#f97316', color: '#fff' }}>
                            تراكمي ({code.accumulatorLectures ? code.accumulatorLectures.length : 0} م)
                          </span>
                        )}
                      </td>
                      <td>{getStatusBadge(code.isUsed)}</td>
                      <td>
                        {code.studentPhone ? (
                          <span className="font-mono text-sm font-bold flex items-center gap-1" style={{ color: 'var(--success)' }}>
                            <PhoneIcon size={14} />
                            {code.studentPhone}
                          </span>
                        ) : (
                          <span className="text-muted">عام</span>
                        )}
                      </td>
                      <td>
                        {code.usedBy ? (
                          <div>
                            <div className="font-semibold">{code.usedBy.fullName}</div>
                            <div className="text-xs text-muted">
                              {code.usedBy.phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <span className="text-sm text-muted">
                          {new Date(code.createdAt).toLocaleDateString('ar-EG')}
                        </span>
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
                <span className="flex items-center px-4 font-bold text-primary">
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

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
