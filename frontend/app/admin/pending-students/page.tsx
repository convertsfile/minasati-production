'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import api from '@/lib/axios';
import { 
  CheckIcon, XIcon, SparklesIcon, AlertCircleIcon, 
  CheckCircleIcon, FileTextIcon 
} from '../../components/Icons';

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

export default function PendingStudentsPage() {
  const router = useRouter();
  const { isChecking } = useAuthGuard(['admin']);

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [processing, setProcessing] = useState(false);
  
  const [approveModal, setApproveModal] = useState<Student | null>(null);
  const [rejectModal, setRejectModal] = useState<Student | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // 🚀 حالة جديدة مخصصة لعرض الصورة المكبرة فقط
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  useEffect(() => {
    if (!isChecking) {
      fetchPendingStudents();
    }
  }, [isChecking]);

  // إغلاق التمرير عند فتح أي مودال أو صورة
  useEffect(() => {
    if (approveModal || rejectModal || imagePreview) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [approveModal, rejectModal, imagePreview]);

  const fetchPendingStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users/pending');
      const usersArray = response.data || [];

      const mappedStudents = usersArray.map((s: any) => {
        let imageUrl = s.idImageUrl || s.id_image_url || s.idImage || s.id_image || '';
        if (imageUrl && imageUrl.includes('s3.us-east-005.backblazeb2.com/file/')) {
          imageUrl = imageUrl.replace('s3.us-east-005.backblazeb2.com/file/', 's3.us-east-005.backblazeb2.com/');
        }

        return {
          id: s.id,
          fullName: s.fullName || s.full_name || 'غير محدد',
          email: s.email,
          phone: s.phone,
          parentPhone: s.parentPhone || s.parent_phone || '',
          academicYear: s.academicYear || s.academic_year || '',
          studentNumber: s.studentNumber || s.student_number || '',
          school: s.school,
          parentJob: s.parentJob || s.parent_job || '',
          governorate: s.governorate,
          idImage: imageUrl,
          isVerified: s.isVerified || s.is_verified || false,
          // 🚀 الحل السحري للتاريخ: قراءة joinedAt القادمة من UserResource
          createdAt: s.joinedAt || s.joined_at || s.createdAt || s.created_at || '',
        };
      });

      setStudents(mappedStudents);
    } catch (error: any) {
      showToast(error?.message || 'خطأ في جلب طلبات التسجيل المعلقة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const executeApprove = async () => {
    if (!approveModal) return;
    setProcessing(true);
    
    try {
      await api.post(`/admin/users/${approveModal.id}/approve`);
      
      showToast('تمت الموافقة على الطالب وتفعيل حسابه بنجاح', 'success');
      setStudents(prev => prev.filter((s) => s.id !== approveModal.id));
      setApproveModal(null);
    } catch (error: any) {
      showToast(error?.message || 'فشل في الموافقة على الطالب', 'error');
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
      await api.post(`/admin/users/${rejectModal.id}/reject`, { reason: rejectReason });
      
      showToast('تم رفض الطالب بنجاح', 'success');
      setStudents(prev => prev.filter((s) => s.id !== rejectModal.id));
      setRejectModal(null);
      setRejectReason('');
    } catch (error: any) {
      showToast(error?.message || 'فشل في رفض الطالب', 'error');
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
        setImagePreview(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/storage/${path}`;
  };

  if (isChecking || loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content">
          <div className="loading-state">
            <div className="spinner spinner-lg" />
            <p className="mt-4 text-muted font-bold">جاري تحميل الطلبات المعلقة...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      <AdminSidebar />
      
      {/* 🚀 إشعار عائم في أعلى منتصف الشاشة بشكل لطيف جداً */}
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
          <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
            <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
              <table className="table" style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', margin: 0 }}>
                <thead>
                  <tr style={{ background: 'var(--soft-bg)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>الطالب</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>السنة الدراسية</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>المحافظة</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>رقم الهاتف</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>هاتف ولي الأمر</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>المدرسة / وظيفة ولي الأمر</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>إثبات الهوية</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>تاريخ الطلب</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-md font-bold bg-gradient-to-br from-yellow-400 to-orange-500 shrink-0">
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
                          <div className="inline-block overflow-hidden rounded border border-gray-200 shadow-sm" style={{ width: '60px', height: '40px' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getImageUrl(student.idImage)}
                              alt="الهوية"
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition"
                              // 🚀 فتح الصورة المكبرة فقط بدلاً من نافذة الموافقة
                              onClick={() => setImagePreview(getImageUrl(student.idImage))}
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted">لا يوجد</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {/* 🚀 إظهار التاريخ بنجاح */}
                        {student.createdAt ? new Date(student.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }) : '-'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setApproveModal(student)}
                            className="btn btn-sm btn-success shrink-0"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', borderRadius: '8px' }}
                          >
                            <CheckIcon size={14} /> موافقة
                          </button>
                          <button
                            onClick={() => setRejectModal(student)}
                            className="btn btn-sm btn-outline shrink-0"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--error)', color: 'var(--error)', background: 'transparent' }}
                          >
                            <XIcon size={14} /> رفض
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

      {/* 🚀 نافذة عرض الصورة المكبرة (يُغلق عند الضغط خارج الصورة) */}
      {imagePreview && (
        <div 
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="تكبير الهوية"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()} // منع الإغلاق عند الضغط على الصورة نفسها
            />
            <button
              className="absolute -top-12 right-0 text-white hover:text-red-400 bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all cursor-pointer"
              onClick={() => setImagePreview(null)}
            >
              <XIcon size={24} />
            </button>
          </div>
        </div>
      )}

      {/* 🚀 نافذة تأكيد الموافقة (تصميم صغير وجميل في المنتصف) */}
      {approveModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" dir="rtl" onClick={() => setApproveModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد الموافقة</h3>
              <p className="text-gray-500 mb-6 text-sm">
                هل أنت متأكد من رغبتك في تفعيل حساب الطالب <span className="font-bold text-gray-800">{approveModal.fullName}</span>؟
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setApproveModal(null)} 
                  disabled={processing} 
                  className="btn btn-outline flex-1 py-2.5 rounded-xl text-gray-700 text-sm font-bold border-gray-200 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button 
                  onClick={executeApprove} 
                  disabled={processing} 
                  className="btn btn-success flex-1 py-2.5 rounded-xl text-white shadow-lg shadow-green-200/50 text-sm font-bold"
                >
                  {processing ? <span className="spinner spinner-light w-4 h-4 border-2" /> : 'نعم، موافق'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 نافذة تأكيد الرفض (تصميم صغير وجميل في المنتصف) */}
      {rejectModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" dir="rtl" onClick={() => { setRejectModal(null); setRejectReason(''); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XIcon size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">رفض الحساب</h3>
              <p className="text-gray-500 mb-4 text-sm">
                يرجى كتابة سبب رفض الطالب <span className="font-bold text-gray-800">{rejectModal.fullName}</span>
              </p>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="اكتب سبب الرفض هنا ليظهر للطالب..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-right text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none mb-4 resize-none transition-all"
                rows={3}
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => { setRejectModal(null); setRejectReason(''); }} 
                  disabled={processing} 
                  className="btn btn-outline flex-1 py-2.5 rounded-xl text-gray-700 text-sm font-bold border-gray-200 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button 
                  onClick={executeReject} 
                  disabled={processing || rejectReason.trim().length < 10} 
                  className="btn btn-danger flex-1 py-2.5 rounded-xl text-white shadow-lg shadow-red-200/50 text-sm font-bold"
                >
                  {processing ? <span className="spinner spinner-light w-4 h-4 border-2" /> : 'تأكيد الرفض'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}