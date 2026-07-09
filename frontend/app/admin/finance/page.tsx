'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useAuthGuard } from '@/app/hooks/useAuthGuard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"; // 🚀 تم إصلاح المنفذ

// 🚀 دالة مساعدة لتوحيد جلب التوكن
const getToken = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1] || localStorage.getItem('token');
};

interface FinanceSummary {
  totalTopups: number;
  topupsCount: number;
  courseSales: number;
  totalStudents: number;
  activeStudents: number;
  dailyTopups: Array<{ date: string; amount: number; count: number }>;
  dailySales: Array<{ date: string; count: number }>;
}

interface StudentFinance {
  userId: number;
  fullName: string;
  studentNumber: string;
  walletBalance: number;
  topupsCount: number;
  totalTopups: number;
  purchasesCount: number;
}

interface Transaction {
  id?: number;
  type: 'topup' | 'purchase' | 'top_up'; // إضافة top_up للتوافق مع الباك إند
  amount: number;
  description?: string;
  status?: string;
  date: string;
  reference: string;
}

export default function AdminFinancePage() {
  useAuthGuard();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [students, setStudents] = useState<StudentFinance[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentFinance | null>(null);
  const [transactions, setTransactions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'summary' | 'students'>('summary');

  // 🚀 نظام الإشعارات الموحد
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    fetchSummary();
    fetchStudents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSummary = async () => {
    try {
      const token = getToken();
      // ⚠️ /api/admin/finance/summary is BROKEN (404). The real summary lives
      // at /api/admin/wallet/summary and returns
      // {period:{start,end}, totalTopups, topupsCount, courseSalesCount, students:{...}}.
      // Map the camelCase fields into the page's FinanceSummary shape.
      const res = await fetch(`${API_URL}/api/admin/wallet/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const d = data.data || {};
        setSummary({
          totalTopups: d.totalTopups ?? 0,
          topupsCount: d.topupsCount ?? 0,
          courseSales: d.courseSalesCount ?? 0,
          totalStudents: d.students?.total ?? 0,
          activeStudents: d.students?.active ?? 0,
          // No daily breakdown endpoint exists; leave the chart empty until
          // the backend adds one. Daily topups/sales charts are not part of
          // the new contract.
          dailyTopups: [],
          dailySales: [],
        });
      } else {
        showToast('فشل جلب ملخص المالية', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = getToken();
      // ⚠️ /api/admin/finance/per-student is BROKEN (404). Use the global
      // /api/admin/wallet/transactions which is paginated; for the per-student
      // list we fall back to /api/admin/student-progress which is the closest
      // inventory-supported surface that returns a per-student row.
      const res = await fetch(`${API_URL}/api/admin/student-progress?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const rawStudents = data.data?.data || data.data || [];
        const mappedStudents = rawStudents.map((s: any) => ({
          userId: s.id ?? s.userId ?? s.user_id,
          fullName: s.fullName ?? s.full_name ?? 'غير محدد',
          studentNumber: s.studentNumber ?? s.student_number ?? 'غير محدد',
          walletBalance: s.walletBalance ?? s.wallet_balance ?? 0,
          topupsCount: 0,
          totalTopups: 0,
          purchasesCount: 0,
        }));
        setStudents(mappedStudents);
      }
    } catch (e) {
      console.error(e);
      showToast('فشل جلب قائمة الطلاب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (student: StudentFinance) => {
    setSelectedStudent(student);
    try {
      const token = getToken();
      // ⚠️ /api/admin/students/{id}/transactions is BROKEN (404). The real
      // per-student ledger lives at
      // /api/admin/wallet/student/{user}/transactions and returns
      // {transactions:[...], walletBalance, totalTopups, totalPurchases,
      //  pagination:{...}}.
      const res = await fetch(`${API_URL}/api/admin/wallet/student/${student.userId}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data);
      } else {
        showToast('فشل جلب سجل العمليات', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const maxDaily = summary?.dailyTopups?.length
    ? Math.max(...summary.dailyTopups.map((d) => d.amount)) || 1
    : 1;

  return (
    <div className="admin-layout relative">
      <AdminSidebar />

      {/* 🚀 Toast UI */}
      <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'all 0.3s', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
        <div style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {toast.message}
        </div>
      </div>

      <main className="admin-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">لوحة المالية</h1>
            <p className="page-subtitle">نظرة عامة على الإيرادات والشحنات والمبيعات</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button onClick={() => setTab('summary')} className={`btn ${tab === 'summary' ? 'btn-primary' : 'btn-outline'}`}>
            📊 ملخص
          </button>
          <button onClick={() => setTab('students')} className={`btn ${tab === 'students' ? 'btn-primary' : 'btn-outline'}`}>
            👨‍🎓 حسابات الطلاب
          </button>
        </div>

        {tab === 'summary' && summary && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'إجمالي الشحنات', value: `${(summary.totalTopups || 0).toFixed(2)} EGP`, icon: '💰' },
                { label: 'عدد الشحنات', value: summary.topupsCount || 0, icon: '📱' },
                { label: 'مبيعات الكورسات', value: summary.courseSales || 0, icon: '📚' },
                { label: 'إجمالي الطلاب', value: summary.totalStudents || 0, icon: '👨‍🎓' },
                { label: 'طلاب نشطون', value: summary.activeStudents || 0, icon: '✅' },
              ].map((card) => (
                <div key={card.label} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{card.icon}</div>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{card.value}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{card.label}</p>
                </div>
              ))}
            </div>

            {/* Daily Chart */}
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>📈 الشحنات اليومية (آخر 30 يوم)</h3>
              {!summary.dailyTopups || summary.dailyTopups.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>لا توجد بيانات متاحة لهذا الشهر</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem', height: 200, padding: '1rem 0' }}>
                  {summary.dailyTopups.map((d) => (
                    <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{
                        width: '100%',
                        height: `${(d.amount / maxDaily) * 160}px`,
                        background: 'var(--gradient-primary)',
                        borderRadius: 'var(--radius-sm)',
                        minHeight: 4,
                      }} title={`${d.amount} EGP`} />
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                        {d.date.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'students' && (
          <>
            {selectedStudent ? (
              <div className="animate-fade-in">
                <button onClick={() => { setSelectedStudent(null); setTransactions(null); }} className="btn btn-outline" style={{ marginBottom: '1rem' }}>
                  ← العودة للقائمة
                </button>
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.25rem' }}>{selectedStudent.fullName}</h3>
                  <p style={{ color: 'var(--text-muted)' }}>رقم الطالب: {selectedStudent.studentNumber}</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">💰 رصيد: {selectedStudent.walletBalance} ج.م</span>
                    <span className="badge badge-success">📱 شحنات: {selectedStudent.topupsCount} ({selectedStudent.totalTopups.toFixed(2)} ج.م)</span>
                    <span className="badge badge-warning">📚 مشتريات: {selectedStudent.purchasesCount}</span>
                  </div>
                </div>
                {transactions && (
                  <div className="card">
                    <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>سجل العمليات (Ledger)</h4>
                    {transactions.transactions?.length === 0 ? (
                      <p className="text-center text-muted py-4">لا توجد عمليات مسجلة لهذا الطالب</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {transactions.transactions?.map((t: Transaction, idx: number) => {
                          const isTopup = t.type === 'topup' || t.type === 'top_up';
                          return (
                            <div key={t.reference || idx} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '1rem', background: 'var(--background)', borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{
                                  fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontWeight: 'bold',
                                  background: isTopup ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                  color: isTopup ? 'var(--success)' : 'var(--error)'
                                }}>
                                  {isTopup ? 'شحن' : 'شراء'}
                                </span>
                                <div>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{t.description || t.reference}</span>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t.reference}</div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'end' }}>
                                <span style={{ fontWeight: 800, color: isTopup ? 'var(--success)' : 'var(--error)' }}>
                                  {isTopup ? '+' : '-'}{t.amount} ج.م
                                </span>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                  {new Date(t.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {loading ? (
                  <div className="flex justify-center p-12">
                    <div className="spinner spinner-dark" style={{ width: 48, height: 48, borderWidth: 4 }}></div>
                  </div>
                ) : students.length === 0 ? (
                  <div className="empty-state card text-center p-12">
                    <div className="empty-icon text-4xl mb-4">💵</div>
                    <h3 className="text-xl font-bold">لا يوجد طلاب</h3>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Header Row */}
                    <div className="hidden md:grid" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 'bold' }}>
                      <span>الطالب</span>
                      <span>الكود التعريفي</span>
                      <span>الرصيد الحالي</span>
                      <span>إجمالي الشحنات</span>
                      <span>عمليات الشراء</span>
                    </div>
                    {/* Student Rows */}
                    {students.map((s) => (
                      <div
                        key={s.userId}
                        onClick={() => fetchTransactions(s)}
                        className="card hover-effect"
                        style={{ cursor: 'pointer', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', alignItems: 'center', padding: '1rem' }}
                      >
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>{s.fullName}</p>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{s.studentNumber}</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>💰 {s.walletBalance} ج.م</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 'bold' }}>📱 {s.totalTopups.toFixed(2)} ج.م</p>
                        <p style={{ fontSize: '0.875rem' }}>📚 {s.purchasesCount} كورس</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}