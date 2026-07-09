'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar';
import { ShieldIcon, UsersIcon, AlertTriangleIcon, XIcon, TrashIcon, LockIcon, UnlockIcon, AlertCircleIcon, CheckCircleIcon, BarChartIcon } from '../../components/Icons';
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  user: { fullName: string; phone: string; parentPhone: string };
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
  const [students, setStudents] = useState<StudentWithViolations[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'violations'>('students');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [blockingId, setBlockingId] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3_000);
  };

  const checkAuth = async () => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.substring(6);

    if (!token) {
      router.push('/login');
      return;
    }
  };

  const fetchData = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.substring(6);

      if (!token) return;

      const studentsResponse = await fetch(`${API_URL}/api/admin/security/students-with-violations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (studentsResponse.ok) {
        const data = await studentsResponse.json();
        const mappedStudents = (data.data || []).map((student: any) => ({
          id: student.id,
          fullName: student.full_name,
          phone: student.phone,
          parentPhone: student.parent_phone,
          email: student.email || 'غير متوفر',
          academicYear: student.academic_year || '',
          school: student.school || '',
          governorate: student.governorate || '',
          violationCount: student.violations_count,
          unblockCount: student.unblock_count || 0,
          lastViolation: student.last_violation,
          isBlocked: student.is_blocked,
        }));
        setStudents(mappedStudents);
      }

      const violationsResponse = await fetch(`${API_URL}/api/admin/security/violations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (violationsResponse.ok) {
        const data = await violationsResponse.json();
        const mappedViolations = (data.data || []).map((v: any) => ({
          id: v.id,
          userId: v.user_id,
          lectureTitle: v.lecture_title || 'غير محدد',
          courseTitle: v.course_title || '',
          violationType: v.violation_type,
          createdAt: v.created_at,
          academicYear: v.academic_year || '',
          school: v.school || '',
          governorate: v.governorate || '',
          user: { 
            fullName: v.full_name, 
            phone: v.phone, 
            parentPhone: v.parent_phone 
          }
        }));
        setViolations(mappedViolations);
      }
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockStudent = (userId: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من حظر هذا الطالب ومنعه من الوصول للمنصة؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        setBlockingId(userId);
        try {
          const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('token='))
            ?.substring(6);

          const response = await fetch(`${API_URL}/api/admin/security/block-student/${userId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            showNotification('success', 'تم حظر الطالب بنجاح');
            fetchData();
          } else {
            showNotification('error', 'فشل حظر الطالب');
          }
        } catch (error) {
          console.error('Failed to block student:', error);
          showNotification('error', 'حدث خطأ');
        } finally {
          setBlockingId(null);
        }
      }
    });
  };

  const handleUnblockStudent = (userId: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من رفع الحظر عن هذا الطالب؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        setBlockingId(userId);
        try {
          const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('token='))
            ?.substring(6);

          const response = await fetch(`${API_URL}/api/admin/security/unblock-student/${userId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            showNotification('success', 'تم رفع الحظر بنجاح');
            fetchData();
          } else {
            showNotification('error', 'فشل رفع الحظر');
          }
        } catch (error) {
          console.error('Failed to unblock student:', error);
          showNotification('error', 'حدث خطأ');
        } finally {
          setBlockingId(null);
        }
      }
    });
  };

  const handleDeleteViolation = async (violationId: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من حذف هذه المخالفة نهائياً؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('token='))
            ?.substring(6);

          const response = await fetch(`${API_URL}/api/admin/security/violations/${violationId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            showNotification('success', 'تم حذف المخالفة بنجاح');
            fetchData();
          } else {
            showNotification('error', 'فشل حذف المخالفة');
          }
        } catch (error) {
          console.error('Failed to delete violation:', error);
          showNotification('error', 'حدث خطأ');
        }
      }
    });
  };

  const handleClearStudentViolations = async (userId: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من مسح جميع مخالفات هذا الطالب وتصفير العداد؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('token='))
            ?.substring(6);

          const response = await fetch(`${API_URL}/api/admin/security/students/${userId}/violations`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            showNotification('success', 'تم مسح المخالفات بنجاح');
            fetchData();
          } else {
            showNotification('error', 'فشل مسح المخالفات');
          }
        } catch (error) {
          console.error('Failed to clear violations:', error);
          showNotification('error', 'حدث خطأ');
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

  const getViolationColor = (count: number) => {
    if (count >= 5) return 'var(--error)';
    if (count >= 3) return 'var(--warning)';
    return 'var(--success)';
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

  if (loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content">
          <div className="loading-state">
            <div className="spinner spinner-lg" />
            <p>جارٍ التحميل...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="card shadow-2xl max-w-sm w-full text-center p-8">
            <div className="flex justify-center mb-4 text-error">
              <AlertTriangleIcon size={48} />
            </div>
            <h3 className="text-xl font-bold text-error mb-4">تأكيد الإجراء</h3>
            <p className="text-muted mb-6 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1">إلغاء</button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1">نعم، متأكد</button>
            </div>
          </div>
        </div>
      )}
      <AdminSidebar />

      <main className="admin-content">
        {notification && (
          <div className={`toast-container`} style={{ position: 'relative', opacity: 1 }}>
            <div className={`toast-content ${notification.type === 'success' ? 'toast-success' : 'toast-error'}`} style={{ position: 'relative', top: 0, left: 0, transform: 'none' }}>
              {notification.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
              {notification.message}
            </div>
          </div>
        )}

        <div className="page-header">
          <div>
            <h1 className="page-title">
              <ShieldIcon size={28} />
              لوحة الأمان
            </h1>
            <p className="page-subtitle">مراقبة المخالفات وحظر الطلاب</p>
          </div>
        </div>

        <div className="security-stats-grid">
          <div className="card text-center p-6">
            <div className="flex justify-center mb-2 text-primary">
              <UsersIcon size={32} />
            </div>
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-muted mt-1">طلاب لديهم مخالفات</div>
          </div>
          <div className="card text-center p-6 border-t-4 border-t-warning">
            <div className="flex justify-center mb-2" style={{ color: 'var(--warning)' }}>
              <AlertTriangleIcon size={32} />
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>{stats.atRisk}</div>
            <div className="text-sm text-muted mt-1">طلاب في خطر (3+ مخالفات)</div>
          </div>
          <div className="card text-center p-6 border-t-4 border-t-error">
            <div className="flex justify-center mb-2 text-error">
              <XIcon size={32} />
            </div>
            <div className="text-2xl font-bold text-error">{stats.blocked}</div>
            <div className="text-sm text-muted mt-1">محظورون</div>
          </div>
          <div className="card text-center p-6">
            <div className="flex justify-center mb-2">
              <BarChartIcon size={32} />
            </div>
            <div className="text-2xl font-bold">{stats.violations}</div>
            <div className="text-sm text-muted mt-1">إجمالي المخالفات</div>
          </div>
        </div>

        <div className="tab-switcher">
          <button
            onClick={() => setActiveTab('students')}
            className={`tab-btn ${activeTab === 'students' ? 'tab-btn-active' : ''}`}
          >
            <UsersIcon size={18} />
            الطلاب
            <span className={`tab-count ${activeTab === 'students' ? 'tab-count-active' : ''}`}>{students.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('violations')}
            className={`tab-btn ${activeTab === 'violations' ? 'tab-btn-active' : ''}`}
          >
            <AlertTriangleIcon size={18} />
            المخالفات
            <span className={`tab-count ${activeTab === 'violations' ? 'tab-count-active' : ''}`}>{violations.length}</span>
          </button>
        </div>

        {activeTab === 'students' && (
          <div className="table-container">
            <table className="table">
              <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الهاتف</th>
                    <th>السنة الدراسية</th>
                    <th>المدرسة</th>
                    <th style={{ textAlign: 'center' }}>المخالفات</th>
                    <th>آخر مخالفة</th>
                    <th style={{ textAlign: 'center' }}>الإجراء</th>
                  </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted">
                      لا توجد مخالفات مسجلة
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <div className="font-bold text-primary">{student.fullName}</div>
                        <div className="text-xs text-muted mt-1">{student.email}</div>
                      </td>
                      <td className="font-mono text-sm" dir="ltr">{student.phone}</td>
                      <td className="text-sm">{student.academicYear}</td>
                      <td className="text-sm">{student.school}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={getViolationBadgeClass(student.violationCount)}>
                          {student.violationCount}
                        </span>
                      </td>
                      <td className="text-sm text-muted">
                        {student.lastViolation ? new Date(student.lastViolation).toLocaleString('ar-EG') : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex gap-1 justify-center">
                          {student.isBlocked ? (
                            <button
                              onClick={() => handleUnblockStudent(student.id)}
                              disabled={blockingId === student.id}
                              className="btn btn-sm btn-success"
                            >
                              <UnlockIcon size={14} />
                              رفع الحظر
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlockStudent(student.id)}
                              disabled={blockingId === student.id}
                              className="btn btn-sm btn-danger"
                            >
                              <LockIcon size={14} />
                              حظر
                            </button>
                          )}
                          <button 
                            onClick={() => handleClearStudentViolations(student.id)} 
                            disabled={student.violationCount === 0} 
                            className="btn btn-sm btn-outline"
                          >
                            <TrashIcon size={14} />
                            مسح
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'violations' && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>السنة الدراسية</th>
                  <th>نوع المخالفة</th>
                  <th>التاريخ</th>
                  <th>المحاضرة</th>
                  <th style={{ textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {violations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted">
                      لا توجد مخالفات مسجلة
                    </td>
                  </tr>
                ) : (
                  violations.slice(0, 100).map((violation) => (
                    <tr key={violation.id}>
                      <td>
                        <div className="font-bold text-primary">{violation.user.fullName}</div>
                        <div className="text-xs text-muted">{violation.user.phone}</div>
                      </td>
                      <td>
                        <div className="text-sm">{violation.academicYear}</div>
                        <div className="text-xs text-muted">{violation.school}</div>
                      </td>
                      <td>
                        <span className="badge badge-warning">
                          {getViolationTypeLabel(violation.violationType)}
                        </span>
                      </td>
                      <td className="text-sm text-muted">
                        {new Date(violation.createdAt).toLocaleString('ar-EG')}
                      </td>
                      <td className="text-sm text-muted">
                        {violation.courseTitle} - {violation.lectureTitle}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => handleDeleteViolation(violation.id)} className="btn btn-sm btn-danger" title="حذف المخالفة">
                          <TrashIcon size={14} /> حذف
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .security-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 900px) {
          .security-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 500px) {
          .security-stats-grid {
            grid-template-columns: 1fr;
          }
        }

        .tab-switcher {
          display: flex;
          gap: 0.5rem;
          padding: 0.375rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          margin-bottom: 2rem;
          max-width: 420px;
          box-shadow: var(--shadow-sm);
        }
        .tab-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-weight: 700;
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
          box-shadow: 0 4px 16px rgba(11, 79, 108, 0.25);
          transform: translateY(-1px);
        }
        .tab-btn-active:hover {
          box-shadow: 0 6px 20px rgba(11, 79, 108, 0.3);
        }
        .tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          font-size: 0.75rem;
          font-weight: 800;
          border-radius: 8px;
          background: var(--soft-bg);
          color: var(--text-muted);
          transition: all 0.3s ease;
        }
        .tab-count-active {
          background: rgba(255, 255, 255, 0.25);
          color: white;
        }

        [data-theme="dark"] .tab-switcher {
          background: var(--glass-bg);
          border-color: var(--glass-border);
        }
      `}</style>
    </div>
  );
}
