'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابة المركزي
import api from '@/lib/axios'; // 🚀 العميل المركزي المحمي
import { 
  ShieldIcon, UsersIcon, AlertTriangleIcon, XIcon, 
  TrashIcon, LockIcon, UnlockIcon, AlertCircleIcon, 
  CheckCircleIcon, BarChartIcon 
} from '../../components/Icons';

// 🚀 قاموس ترجمة السنوات الدراسية لجماليات العرض
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

function getAcademicYearLabel(val: string) {
  const found = ACADEMIC_YEARS.find(y => y.value === val);
  return found ? found.label : val;
}

// 🚀 دالة مضادة للرصاص لاستخراج المصفوفات من استجابة Laravel
const extractArray = (response: any) => {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && Array.isArray(response.data.data)) return response.data.data;
  return [];
};

interface OmittedStudent {
  fullName: string; 
  phone: string; 
  parentPhone: string;
}

interface Violation {
  id: number;
  userId: number;
  lectureTitle: string;
  courseTitle: string;
  violationType: string;
  createdAt: string;
  academicYear: string;
  school: string;
  governorate: string;
  user: OmittedStudent;
}

interface StudentWithViolations {
  id: number;
  fullName: string;
  phone: string;
  parentPhone: string;
  email: string;
  academicYear: string;
  school: string;
  governorate: string;
  violationCount: number;
  unblockCount: number;
  lastViolation: string;
  isBlocked: boolean;
}

export default function AdminSecurityPage() {
  const router = useRouter();

  // 🚀 درع الحماية: يطرد أي شخص ليس أدمن فوراً ويعرض شاشة التحميل
  const { isChecking } = useAuthGuard(['admin']);

  const [students, setStudents] = useState<StudentWithViolations[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'violations'>('students');
  
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [blockingId, setBlockingId] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  // منع تمرير الصفحة عند فتح نافذة التأكيد
  useEffect(() => {
    if (confirmDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [confirmDialog]);

  useEffect(() => {
    if (!isChecking) {
      fetchData();
    }
  }, [isChecking]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 🚀 الأداء الخارق: جلب الطلاب والمخالفات في نفس اللحظة بالتوازي
      const [studentsRes, violationsRes] = await Promise.allSettled([
        api.get('/admin/security/students-with-violations'),
        api.get('/admin/security/violations')
      ]);

      if (studentsRes.status === 'fulfilled') {
        const usersData = extractArray(studentsRes.value);
        const mappedStudents = usersData.map((student: any) => ({
          id: student.id,
          fullName: student.full_name || student.fullName || 'غير محدد',
          phone: student.phone,
          parentPhone: student.parent_phone || student.parentPhone,
          email: student.email || 'غير متوفر',
          academicYear: getAcademicYearLabel(student.academic_year || student.academicYear || ''),
          school: student.school || '',
          governorate: student.governorate || '',
          violationCount: student.violations_count || student.violationCount || 0,
          unblockCount: student.unblock_count || student.unblockCount || 0,
          lastViolation: student.last_violation || student.lastViolation,
          isBlocked: student.is_blocked || student.isBlocked,
        }));
        setStudents(mappedStudents);
      } else {
        console.error('Failed to fetch students:', studentsRes.reason);
      }

      if (violationsRes.status === 'fulfilled') {
        const vData = extractArray(violationsRes.value);
        const mappedViolations = vData.map((v: any) => ({
          id: v.id,
          userId: v.user_id || v.userId,
          lectureTitle: v.lecture_title || v.lectureTitle || 'غير محدد',
          courseTitle: v.course_title || v.courseTitle || '',
          violationType: v.violation_type || v.violationType,
          createdAt: v.created_at || v.createdAt,
          academicYear: getAcademicYearLabel(v.academic_year || v.academicYear || ''),
          school: v.school || '',
          governorate: v.governorate || '',
          user: { 
            fullName: v.full_name || v.user?.fullName || v.user?.full_name || 'غير محدد', 
            phone: v.phone || v.user?.phone || '', 
            parentPhone: v.parent_phone || v.user?.parentPhone || '' 
          }
        }));
        setViolations(mappedViolations);
      } else {
        console.error('Failed to fetch violations:', violationsRes.reason);
      }

    } catch (error: any) {
      showToast(error?.message || 'فشل في جلب بيانات الأمان', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockStudent = (userId: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من حظر هذا الطالب ومنعه من الوصول للمنصة بالكامل؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        setBlockingId(userId);
        try {
          await api.post(`/admin/security/block-student/${userId}`);
          showToast('تم حظر الطالب بنجاح', 'success');
          fetchData(); // تحديث القوائم
        } catch (error: any) {
          showToast(error?.message || 'فشل حظر الطالب', 'error');
        } finally {
          setBlockingId(null);
        }
      }
    });
  };

  const handleUnblockStudent = (userId: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من رفع الحظر عن هذا الطالب وإعادته للمنصة؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        setBlockingId(userId);
        try {
          await api.post(`/admin/security/unblock-student/${userId}`);
          showToast('تم رفع الحظر بنجاح', 'success');
          fetchData();
        } catch (error: any) {
          showToast(error?.message || 'فشل رفع الحظر', 'error');
        } finally {
          setBlockingId(null);
        }
      }
    });
  };

  const handleDeleteViolation = async (violationId: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من حذف هذه المخالفة نهائياً من سجل الطالب؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/admin/security/violations/${violationId}`);
          showToast('تم حذف المخالفة بنجاح', 'success');
          fetchData();
        } catch (error: any) {
          showToast(error?.message || 'فشل حذف المخالفة', 'error');
        }
      }
    });
  };

  const handleClearStudentViolations = async (userId: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من مسح جميع مخالفات هذا الطالب وتصفير العداد الخاص به؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/admin/security/students/${userId}/violations`);
          showToast('تم مسح جميع المخالفات وتصفير العداد بنجاح', 'success');
          fetchData();
        } catch (error: any) {
          showToast(error?.message || 'فشل مسح المخالفات', 'error');
        }
      }
    });
  };

  const getViolationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      screenshot: 'لقطة شاشة',
      screen_recording: 'تسجيل شاشة',
      devtools: 'أدوات المطور',
      tab_switch: 'تبديل التبويب',
    };
    return labels[type] || type;
  };

  const getViolationBadgeClass = (count: number) => {
    if (count >= 5) return 'badge badge-error';
    if (count >= 3) return 'badge badge-warning';
    return 'badge badge-success';
  };

  const stats = {
    total: students.length,
    atRisk: students.filter(s => s.violationCount >= 3 && !s.isBlocked).length,
    blocked: students.filter(s => s.isBlocked).length,
    violations: violations.length,
  };

  if (isChecking || loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content">
          <div className="loading-state">
            <div className="spinner spinner-lg" />
            <p className="mt-4 font-bold text-muted">جاري تحميل السجلات الأمنية...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      {/* 🚀 نافذة التأكيد (Modal) بتصميم احترافي */}
      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="card shadow-2xl max-w-sm w-full text-center p-8 animate-scale-up border border-gray-100 bg-white rounded-2xl">
            <div className="flex justify-center mb-4 text-error">
              <AlertTriangleIcon size={56} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الإجراء</h3>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 py-3 text-gray-600 font-bold border-gray-300 rounded-xl hover:bg-gray-50">إلغاء</button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1 py-3 font-bold shadow-lg shadow-red-200 rounded-xl text-white">نعم، متأكد</button>
            </div>
          </div>
        </div>
      )}

      <AdminSidebar />

      <main className="admin-content">
        {/* 🚀 إشعار التأكيد (Toast) الموحد في منتصف الشاشة من الأعلى */}
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

        <div className="page-header">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <ShieldIcon size={28} />
              لوحة الأمان والمراقبة
            </h1>
            <p className="page-subtitle">مراقبة المخالفات، كشف محاولات الغش، وحظر الطلاب</p>
          </div>
        </div>

        <div className="security-stats-grid">
          <div className="card text-center p-6 shadow-sm border border-[var(--border)]">
            <div className="flex justify-center mb-3 text-primary">
              <UsersIcon size={36} />
            </div>
            <div className="text-3xl font-black text-primary">{stats.total}</div>
            <div className="text-sm text-muted mt-2 font-bold">طلاب لديهم مخالفات</div>
          </div>
          <div className="card text-center p-6 border-t-4 border-t-warning shadow-sm bg-[var(--surface)]">
            <div className="flex justify-center mb-3" style={{ color: 'var(--warning)' }}>
              <AlertTriangleIcon size={36} />
            </div>
            <div className="text-3xl font-black" style={{ color: 'var(--warning)' }}>{stats.atRisk}</div>
            <div className="text-sm text-muted mt-2 font-bold">طلاب في خطر (3+ مخالفات)</div>
          </div>
          <div className="card text-center p-6 border-t-4 border-t-error shadow-sm bg-[var(--surface)]">
            <div className="flex justify-center mb-3 text-error">
              <XIcon size={36} />
            </div>
            <div className="text-3xl font-black text-error">{stats.blocked}</div>
            <div className="text-sm text-muted mt-2 font-bold">محظورون حالياً</div>
          </div>
          <div className="card text-center p-6 shadow-sm border border-[var(--border)]">
            <div className="flex justify-center mb-3 text-secondary">
              <BarChartIcon size={36} />
            </div>
            <div className="text-3xl font-black text-secondary">{stats.violations}</div>
            <div className="text-sm text-muted mt-2 font-bold">إجمالي المخالفات المرصودة</div>
          </div>
        </div>

        <div className="tab-switcher">
          <button
            onClick={() => setActiveTab('students')}
            className={`tab-btn ${activeTab === 'students' ? 'tab-btn-active' : ''}`}
          >
            <UsersIcon size={18} />
            سجل الطلاب
            <span className={`tab-count ${activeTab === 'students' ? 'tab-count-active' : ''}`}>{students.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('violations')}
            className={`tab-btn ${activeTab === 'violations' ? 'tab-btn-active' : ''}`}
          >
            <AlertTriangleIcon size={18} />
            سجل المخالفات
            <span className={`tab-count ${activeTab === 'violations' ? 'tab-count-active' : ''}`}>{violations.length}</span>
          </button>
        </div>

        {/* 🚀 تأمين التمرير الأفقي للجداول لمنع تشوه التصميم */}
        {activeTab === 'students' && (
          <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
            <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
              <table className="table" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', margin: 0 }}>
                <thead style={{ background: 'var(--soft-bg)' }}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>بيانات الطالب</th>
                      <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>رقم الهاتف</th>
                      <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>السنة الدراسية</th>
                      <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>المخالفات</th>
                      <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>آخر مخالفة</th>
                      <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted font-bold">
                        <ShieldIcon size={48} className="mx-auto mb-3 opacity-20" />
                        الوضع آمن. لا توجد أي مخالفات مسجلة!
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id} className="hover:bg-[var(--soft-bg)] transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div className="font-bold text-gray-900 text-sm">{student.fullName}</div>
                          <div className="text-xs text-muted mt-1">{student.school}</div>
                        </td>
                        <td className="font-mono font-bold text-sm text-center" dir="ltr" style={{ padding: '1rem' }}>{student.phone}</td>
                        <td className="text-sm font-semibold text-center text-primary" style={{ padding: '1rem' }}>{student.academicYear}</td>
                        <td style={{ textAlign: 'center', padding: '1rem' }}>
                          <span className={getViolationBadgeClass(student.violationCount)}>
                            {student.violationCount} {student.violationCount > 10 ? '🔥' : ''}
                          </span>
                        </td>
                        <td className="text-xs text-muted font-semibold text-center" style={{ padding: '1rem' }}>
                          {student.lastViolation ? new Date(student.lastViolation).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '1rem' }}>
                          <div className="flex gap-2 justify-center">
                            {student.isBlocked ? (
                              <button
                                onClick={() => handleUnblockStudent(student.id)}
                                disabled={blockingId === student.id}
                                className="btn btn-sm btn-success font-bold rounded-lg"
                              >
                                {blockingId === student.id ? <span className="spinner w-4 h-4 border-2" /> : <><UnlockIcon size={14} /> رفع الحظر</>}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlockStudent(student.id)}
                                disabled={blockingId === student.id}
                                className="btn btn-sm btn-danger font-bold rounded-lg"
                              >
                                {blockingId === student.id ? <span className="spinner w-4 h-4 border-2" /> : <><LockIcon size={14} /> حظر فوراً</>}
                              </button>
                            )}
                            <button 
                              onClick={() => handleClearStudentViolations(student.id)} 
                              disabled={student.violationCount === 0} 
                              className="btn btn-sm btn-outline font-bold rounded-lg"
                              title="مسح جميع مخالفات الطالب"
                            >
                              <TrashIcon size={14} />
                              تصفير
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'violations' && (
          <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
            <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
              <table className="table" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', margin: 0 }}>
                <thead style={{ background: 'var(--soft-bg)' }}>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>بيانات الطالب</th>
                    <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>نوع المخالفة</th>
                    <th style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>مكان المخالفة (الكورس - المحاضرة)</th>
                    <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>التاريخ والوقت</th>
                    <th style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted font-bold">
                        <CheckCircleIcon size={48} className="mx-auto mb-3 opacity-20 text-success" />
                        لا توجد أي مخالفات فردية مسجلة!
                      </td>
                    </tr>
                  ) : (
                    violations.slice(0, 100).map((violation) => (
                      <tr key={violation.id} className="hover:bg-[var(--soft-bg)] transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div className="font-bold text-gray-900 text-sm">{violation.user.fullName}</div>
                          <div className="text-xs text-muted font-mono mt-1" dir="ltr">{violation.user.phone}</div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '1rem' }}>
                          <span className="badge badge-warning font-bold">
                            {getViolationTypeLabel(violation.violationType)}
                          </span>
                        </td>
                        <td className="text-sm font-semibold text-primary" style={{ padding: '1rem' }}>
                          {violation.courseTitle}
                          <br/>
                          <span className="text-xs text-muted">{violation.lectureTitle}</span>
                        </td>
                        <td className="text-xs text-muted font-semibold text-center" style={{ padding: '1rem' }}>
                          {new Date(violation.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td style={{ textAlign: 'center', padding: '1rem' }}>
                          <button 
                            onClick={() => handleDeleteViolation(violation.id)} 
                            className="btn btn-sm btn-outline text-error border-error hover:bg-red-50 font-bold rounded-lg" 
                            title="حذف هذا السجل فقط"
                          >
                            <TrashIcon size={14} /> حذف السجل
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {violations.length > 100 && (
               <div className="text-center p-3 text-xs text-muted bg-gray-50 border-t border-gray-100 font-bold">
                 يتم عرض أحدث 100 مخالفة فقط لتسريع الصفحة.
               </div>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

        .security-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        @media (max-width: 1024px) {
          .security-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .security-stats-grid { grid-template-columns: 1fr; }
        }

        .tab-switcher {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          margin-bottom: 2rem;
          max-width: 450px;
          box-shadow: var(--shadow-sm);
        }
        .tab-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          font-family: var(--font-body);
          font-size: 0.95rem;
          font-weight: 800;
          border-radius: 12px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          flex: 1;
          position: relative;
        }
        .tab-btn:hover:not(.tab-btn-active) {
          color: var(--primary);
          background: var(--soft-bg);
        }
        .tab-btn-active {
          background: var(--gradient-primary);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 16px rgba(11, 79, 108, 0.3);
          transform: translateY(-2px);
        }
        .tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          font-size: 0.75rem;
          font-weight: 900;
          border-radius: 8px;
          background: var(--soft-bg);
          color: var(--text-muted);
          transition: all 0.3s ease;
        }
        .tab-count-active {
          background: rgba(255, 255, 255, 0.25);
          color: white;
        }
      `}</style>
    </div>
  );
}