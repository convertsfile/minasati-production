'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { CheckIcon, XIcon, UsersIcon, SearchIcon, AlertCircleIcon, CheckCircleIcon, FileTextIcon, SparklesIcon } from '../../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface Student {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  parentPhone: string;
  academicYear: string;
  studentNumber: string;
  school: string;
  parentJob: string;
  governorate: string;
  idImage: string;
  isVerified: boolean;
  createdAt: string;
}

interface RawStudent {
  id: number;
  full_name?: string;
  name?: string;
  fullName?: string;
  email: string;
  phone: string;
  parent_phone?: string;
  parentPhone?: string;
  academic_year?: string;
  academicYear?: string;
  student_number?: string;
  studentNumber?: string;
  school: string;
  parent_job?: string;
  parentJob?: string;
  governorate: string;
  id_image?: string;
  idImage?: string;
  is_verified?: boolean;
  isVerified?: boolean;
  created_at?: string;
  createdAt?: string;
}

export default function PendingStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [processing, setProcessing] = useState(false);
  
  const [approveModal, setApproveModal] = useState<Student | null>(null);
  const [rejectModal, setRejectModal] = useState<Student | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  useEffect(() => {
    console.log('🔄 [PendingStudentsPage] Component Mounted & Rendering Started');
    fetchPendingStudents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPendingStudents = async () => {
    try {
      const token = getToken();

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/users/pending`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const mappedStudents = (data.data || []).map((s: RawStudent) => {
          let imageUrl = s.id_image || s.idImage;
          if (imageUrl && imageUrl.includes('s3.us-east-005.backblazeb2.com/file/')) {
            imageUrl = imageUrl.replace('s3.us-east-005.backblazeb2.com/file/', 's3.us-east-005.backblazeb2.com/');
          }

          return {
            id: s.id,
            fullName: s.full_name || s.fullName || 'غير محدد',
            email: s.email,
            phone: s.phone,
            parentPhone: s.parent_phone || s.parentPhone || '',
            academicYear: s.academic_year || s.academicYear || '',
            studentNumber: s.student_number || s.studentNumber || '',
            school: s.school,
            parentJob: s.parent_job || s.parentJob || '',
            governorate: s.governorate,
            idImage: imageUrl || '',
            isVerified: s.is_verified || s.isVerified || false,
            createdAt: s.created_at || s.createdAt || '',
          };
        });

        setStudents(mappedStudents);
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const executeApprove = async () => {
    if (!approveModal) {
      return;
    }

    setProcessing(true);
    
    try {
      const token = getToken();
      
      const response = await fetch(`${API_URL}/api/admin/users/${approveModal.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });


      const isJson = response.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await response.json() : await response.text();

      if (response.ok) {
        showToast('تمت الموافقة على الطالب بنجاح', 'success');
        setStudents(prev => prev.filter((s) => s.id !== approveModal.id));
        setApproveModal(null);
      } else {
        showToast(isJson ? (data.message || 'فشل في الموافقة') : `خطأ سيرفر (${response.status}) راجع الـ Console`, 'error');
      }
    } catch (error) {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const executeReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim() || rejectReason.length < 10) {
      showToast('يرجى إدخال سبب الرفض (10 أحرف على الأقل)', 'error');
      return;
    }

    setProcessing(true);
    try {
      const token = getToken();
      
      const response = await fetch(`${API_URL}/api/admin/users/${rejectModal.id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ reason: rejectReason }),
      });


      const isJson = response.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await response.json() : await response.text();


      if (response.ok) {
        showToast('تم رفض الطالب وإرسال إشعار له بنجاح', 'success');
        setStudents(prev => prev.filter((s) => s.id !== rejectModal.id));
        setRejectModal(null);
        setRejectReason('');
      } else {
        console.error('❌ [API] Server Error:', data);
        showToast(isJson ? (data.message || 'فشل في الرفض') : `خطأ سيرفر (${response.status}) راجع الـ Console`, 'error');
      }
    } catch (error) {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setApproveModal(null);
        setRejectModal(null);
        setRejectReason('');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content">
          <div className="loading-state">
            <div className="spinner spinner-lg" />
          </div>
        </main>
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

      <main className="admin-content relative z-10">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <FileTextIcon size={28} />
              مراجعة الطلاب الجدد
            </h1>
            <p className="page-subtitle">
              يوجد <span className="badge badge-warning">{students.length}</span> طلب تسجيل في انتظار قرارك
            </p>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <SparklesIcon size={48} />
            </div>
            <h3 className="text-xl font-bold">لا توجد طلبات معلقة حالياً</h3>
            <p>لقد قمت بمراجعة جميع الطلبات. عمل رائع!</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface)' }}>
            <div className="table-responsive">
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                <thead>
                  <tr style={{ background: 'var(--soft-bg)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 'bold' }}>الطالب</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>السنة الدراسية</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>المحافظة</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>رقم الهاتف</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>هاتف ولي الأمر</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 'bold' }}>المدرسة / وظيفة ولي الأمر</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>إثبات الهوية</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>تاريخ الطلب</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-md font-bold bg-gradient-to-br from-yellow-400 to-orange-500">
                            {(student.fullName || '?').charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-gray-900">{student.fullName}</div>
                            <div className="text-xs text-muted font-mono">{student.studentNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: '600' }} className="text-primary">{student.academicYear}</td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>{student.governorate || '-'}</td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontFamily: 'monospace' }} dir="ltr">{student.phone}</td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontFamily: 'monospace' }} dir="ltr">{student.parentPhone}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="text-xs font-semibold">{student.school || '-'}</div>
                        <div className="text-[10px] text-muted">{student.parentJob || '-'}</div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        {student.idImage ? (
                          <div className="inline-block overflow-hidden rounded border" style={{ width: '60px', height: '40px' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={student.idImage.startsWith('http') ? student.idImage : `${API_URL}/storage/${student.idImage}`}
                              alt="الهوية"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted">لا يوجد</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(student.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setApproveModal(student)}
                            className="btn btn-sm btn-success"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '8px' }}
                          >
                            <CheckIcon size={14} />
                            موافقة
                          </button>
                          <button
                            onClick={() => setRejectModal(student)}
                            className="btn btn-sm btn-outline"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', borderRadius: '8px', border: '1px solid var(--error)', color: 'var(--error)', background: 'transparent' }}
                          >
                            <XIcon size={14} />
                            رفض
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

      {approveModal && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          {/* Left panel: Large ID Image */}
          <div className="md:w-1/2 bg-slate-950 flex flex-col justify-center items-center p-6 relative min-h-[300px] md:min-h-screen">
            <h4 className="absolute top-4 right-4 text-white text-sm font-bold bg-black/50 px-3 py-1.5 rounded-full z-10">
              صورة إثبات الهوية للتحقق
            </h4>
            {approveModal.idImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={approveModal.idImage.startsWith('http') ? approveModal.idImage : `${API_URL}/storage/${approveModal.idImage}`}
                alt="صورة الهوية"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="text-gray-400 text-center">
                <AlertCircleIcon size={48} className="mx-auto mb-2" />
                <p>لا توجد صورة إثبات هوية مرفقة</p>
              </div>
            )}
            {approveModal.idImage && (
              <a
                href={approveModal.idImage.startsWith('http') ? approveModal.idImage : `${API_URL}/storage/${approveModal.idImage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 border border-white/20 transition-all"
              >
                <SearchIcon size={18} />
                عرض الصورة بالحجم الكامل ↗
              </a>
            )}
          </div>

          {/* Right panel: Details & Confirmation Form */}
          <div className="md:w-1/2 bg-white flex flex-col justify-between p-8 md:p-12 relative min-h-[400px]">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setApproveModal(null)}
              className="absolute top-6 left-6 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-all border border-gray-200 cursor-pointer shadow-sm"
              title="إغلاق"
            >
              <XIcon size={20} />
            </button>

            {/* Content Container */}
            <div className="my-auto max-w-lg mx-auto w-full space-y-8">
              <div className="text-center md:text-right">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0 shadow-inner">
                  <CheckIcon size={36} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 leading-tight">قبول وتفعيل حساب الطالب</h2>
                <p className="text-gray-500 mt-2">يرجى مراجعة البيانات الشخصية وتأكيد رغبتك في تفعيل الحساب.</p>
              </div>

              {/* Student Details Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm text-right">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-500 font-medium">اسم الطالب</span>
                  <span className="font-bold text-gray-900 text-base">{approveModal.fullName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-500 font-medium">السنة الدراسية</span>
                  <span className="font-bold text-primary text-base">{approveModal.academicYear}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-500 font-medium">المحافظة</span>
                  <span className="font-bold text-gray-800">{approveModal.governorate || '-'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-500 font-medium">رقم الهاتف</span>
                  <span className="font-bold text-gray-900 font-mono" dir="ltr">{approveModal.phone}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-500 font-medium">هاتف ولي الأمر</span>
                  <span className="font-bold text-gray-900 font-mono" dir="ltr">{approveModal.parentPhone}</span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-gray-500 font-medium">المدرسة</span>
                  <span className="font-bold text-gray-800">{approveModal.school || '-'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setApproveModal(null)}
                  disabled={processing}
                  className="btn btn-outline flex-1 py-3.5 rounded-xl font-bold text-base cursor-pointer hover:bg-gray-50 transition-all border-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={executeApprove}
                  disabled={processing}
                  className="btn btn-success flex-[2] py-3.5 rounded-xl font-bold text-base cursor-pointer shadow-lg shadow-green-200/50 hover:shadow-xl transition-all"
                >
                  {processing ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'تفعيل الحساب فوراً'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 mt-6 border-t pt-4">
              الموافقة على الطالب ستمنحه صلاحية الدخول للمنصة وشحن محفظته والاشتراك في الكورسات.
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row overflow-y-auto animate-fade-in" style={{ direction: 'rtl' }}>
          {/* Left panel: Large ID Image */}
          <div className="md:w-1/2 bg-slate-950 flex flex-col justify-center items-center p-6 relative min-h-[300px] md:min-h-screen">
            <h4 className="absolute top-4 right-4 text-white text-sm font-bold bg-black/50 px-3 py-1.5 rounded-full z-10">
              صورة إثبات الهوية للتحقق
            </h4>
            {rejectModal.idImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={rejectModal.idImage.startsWith('http') ? rejectModal.idImage : `${API_URL}/storage/${rejectModal.idImage}`}
                alt="صورة الهوية"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="text-gray-400 text-center">
                <AlertCircleIcon size={48} className="mx-auto mb-2" />
                <p>لا توجد صورة إثبات هوية مرفقة</p>
              </div>
            )}
            {rejectModal.idImage && (
              <a
                href={rejectModal.idImage.startsWith('http') ? rejectModal.idImage : `${API_URL}/storage/${rejectModal.idImage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 border border-white/20 transition-all"
              >
                <SearchIcon size={18} />
                عرض الصورة بالحجم الكامل ↗
              </a>
            )}
          </div>

          {/* Right panel: Details & Rejection Form */}
          <div className="md:w-1/2 bg-white flex flex-col justify-between p-8 md:p-12 relative min-h-[400px]">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => { setRejectModal(null); setRejectReason(''); }}
              className="absolute top-6 left-6 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-all border border-gray-200 cursor-pointer shadow-sm"
              title="إغلاق"
            >
              <XIcon size={20} />
            </button>

            {/* Content Container */}
            <div className="my-auto max-w-lg mx-auto w-full space-y-6">
              <div className="text-center md:text-right">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto md:mx-0 shadow-inner">
                  <XIcon size={36} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 leading-tight">رفض طلب التسجيل</h2>
                <p className="text-gray-500 mt-2">سيتم رفض الحساب وإرسال رسالة توضح سبب الرفض للطالب.</p>
              </div>

              {/* Student Details Card */}
              <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 text-sm text-right flex justify-between items-center">
                <div>
                  <span className="text-gray-500 block text-xs">اسم الطالب</span>
                  <strong className="text-red-900 text-base">{rejectModal.fullName}</strong>
                </div>
                <div className="text-left">
                  <span className="text-gray-500 block text-xs">السنة الدراسية</span>
                  <strong className="text-primary text-base">{rejectModal.academicYear}</strong>
                </div>
              </div>

              {/* Rejection Form Input */}
              <div className="space-y-3 text-right">
                <label className="form-label text-gray-700 font-bold block">سبب الرفض (يظهر للطالب في لوحة التحكم)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="مثال: صورة إثبات الهوية غير واضحة أو لا تطابق البيانات المدخلة، يرجى إعادة رفع صورة واضحة ومقروءة..."
                  className="input-field w-full bg-gray-50 focus:bg-white transition-all border-gray-300 focus:border-red-500 focus:ring-red-100 rounded-xl"
                  rows={5}
                  dir="rtl"
                  style={{ resize: 'none', padding: '1rem', fontSize: '0.95rem' }}
                />
                
                {/* Quick select templates */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs text-gray-500 font-semibold py-1">أسباب سريعة:</span>
                  <button
                    type="button"
                    onClick={() => setRejectReason('صورة إثبات الهوية غير واضحة ومشوَّشة، يرجى إعادة رفع صورة واضحة لبطاقة الهوية.')}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full cursor-pointer transition-colors"
                  >
                    صورة غير واضحة
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectReason('صورة الهوية المرفوعة لا تخص الطالب صاحب الطلب. يرجى رفع إثبات هوية صحيح.')}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full cursor-pointer transition-colors"
                  >
                    الهوية لا تطابق الاسم
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectReason('يرجى التأكد من كتابة الاسم ثلاثي باللغة العربية وإعادة إرسال طلب تفعيل الحساب.')}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full cursor-pointer transition-colors"
                  >
                    الاسم يحتاج تعديل
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => { setRejectModal(null); setRejectReason(''); }}
                  disabled={processing}
                  className="btn btn-outline flex-1 py-3.5 rounded-xl font-bold text-base cursor-pointer hover:bg-gray-50 transition-all border-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={executeReject}
                  disabled={processing || rejectReason.trim().length < 10}
                  className="btn btn-danger flex-[2] py-3.5 rounded-xl font-bold text-base cursor-pointer shadow-lg shadow-red-200/50 hover:shadow-xl transition-all"
                >
                  {processing ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'تأكيد الرفض والإرسال'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 mt-6 border-t pt-4">
              عند الرفض، سيتمكن الطالب من الدخول لداشبورد محدود لرفع صورة هوية أو تعديل بياناته لإعادة المراجعة.
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}
