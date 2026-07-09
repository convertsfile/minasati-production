'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import {
  TrendingUpIcon, BarChartIcon, CreditCardIcon, FileTextIcon,
  CheckCircleIcon, XIcon, AlertCircleIcon
} from '@/app/components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface FinancialSummary {
  period: { start: string; end: string };
  totalTopups: number;
  topupsCount: number;
  courseSalesCount: number;
  students: { total: number; active: number };
}

interface TransactionLog {
  id: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  status: string;
  date: string;
  reference: string;
  studentName: string;
}

interface SubscriptionLog {
  id: number;
  studentName: string;
  courseTitle: string;
  accessType: string;
  reference: string | null;
  grantedAt: string | null;
  createdAt: string;
}

export default function FinanceStatsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions' | 'subscriptions'>('summary');
  
  // States
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionLog[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [subPage, setSubPage] = useState(1);
  const [subTotalPages, setSubTotalPages] = useState(1);

  // Toast
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { router.push('/login'); return; }

      const res = await fetch(`${API_URL}/api/admin/wallet/summary`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (res.ok) {
        const result = await res.json();
        setSummary(result.data);
      } else {
        showToast('فشل تحميل الملخص المالي', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { router.push('/login'); return; }

      const res = await fetch(`${API_URL}/api/admin/wallet/transactions?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (res.ok) {
        const result = await res.json();
        setTransactions(result.data?.data || []);
        setTxPage(result.data?.pagination?.currentPage || 1);
        setTxTotalPages(result.data?.pagination?.lastPage || 1);
      } else {
        showToast('فشل تحميل سجل العمليات المالية', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  const fetchSubscriptions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { router.push('/login'); return; }

      const res = await fetch(`${API_URL}/api/admin/wallet/subscriptions?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (res.ok) {
        const result = await res.json();
        setSubscriptions(result.data?.data || []);
        setSubPage(result.data?.pagination?.currentPage || 1);
        setSubTotalPages(result.data?.pagination?.lastPage || 1);
      } else {
        showToast('فشل تحميل سجل الاشتراكات', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    if (activeTab === 'summary') {
      fetchSummary();
    } else if (activeTab === 'transactions') {
      fetchTransactions(txPage);
    } else if (activeTab === 'subscriptions') {
      fetchSubscriptions(subPage);
    }
  }, [activeTab, txPage, subPage, fetchSummary, fetchTransactions, fetchSubscriptions]);

  return (
    <div className="admin-layout relative">
      <AdminSidebar />

      {/* Toast */}
      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
        <div className={`toast-content ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <XIcon size={18} />}
          {toast.message}
        </div>
      </div>

      <main className="admin-content">
        <div className="page-header">
          <div>
            <h1 className="page-title flex items-center gap-2"><TrendingUpIcon size={26} /> السجل والتقرير المالي للمنصة</h1>
            <p className="page-subtitle">تتبع المبيعات والعمليات المالية والاشتراكات للوقوف على أداء المنصة المالي.</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 border-b-2 mb-6" style={{ direction: 'rtl' }}>
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-3 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'summary' ? 'border-primary text-primary font-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <BarChartIcon size={16} /> ملخص المبيعات
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'transactions' ? 'border-primary text-primary font-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <CreditCardIcon size={16} /> سجل عمليات المحفظة
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-3 px-6 font-bold text-sm transition-all border-b-2 flex items-center gap-1.5 ${activeTab === 'subscriptions' ? 'border-primary text-primary font-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <FileTextIcon size={16} /> سجل اشتراكات الطلاب
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner-lg"></div>
            <p className="mt-4 font-bold">جاري تحميل البيانات المالية...</p>
          </div>
        ) : (
          <div className="space-y-6 text-right" style={{ direction: 'rtl' }}>
            
            {/* TAB 1: Summary */}
            {activeTab === 'summary' && summary && (
              <div className="space-y-6 animate-fade-in">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                  <div className="card p-6" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: 'var(--success)' }}>
                    <span className="text-xs text-muted block mb-1">إجمالي إيرادات الشحن (مكتملة)</span>
                    <span className="text-3xl font-black text-success">{summary.totalTopups} ج.م</span>
                    <span className="text-xs text-muted block mt-2">({summary.topupsCount} عملية شحن مقبولة)</span>
                  </div>
                  <div className="card p-6" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: 'var(--primary)' }}>
                    <span className="text-xs text-muted block mb-1">إجمالي مبيعات الكورسات</span>
                    <span className="text-3xl font-black text-primary">{summary.courseSalesCount} مبيعات</span>
                  </div>
                  <div className="card p-6" style={{ borderInlineStartWidth: '5px', borderInlineStartColor: 'var(--primary)' }}>
                    <span className="text-xs text-muted block mb-1">الطلاب النشطين / الإجمالي</span>
                    <span className="text-3xl font-black text-gray-800">{summary.students.active} / {summary.students.total}</span>
                  </div>
                </div>

                <div className="card p-6">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><AlertCircleIcon size={20} /> النطاق الزمني للملخص المالي</h3>
                  <p className="text-muted text-sm">يعرض هذا الملخص الأرقام للفترة بين <strong>{summary.period.start}</strong> و <strong>{summary.period.end}</strong> (آخر 30 يوماً).</p>
                </div>
              </div>
            )}

            {/* TAB 2: Transactions */}
            {activeTab === 'transactions' && (
              <div className="space-y-6 animate-fade-in">
                {transactions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <FileTextIcon size={36} />
                    </div>
                    <h3>لا توجد عمليات مالية مسجلة بعد</h3>
                  </div>
                ) : (
                  <>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>التاريخ</th>
                            <th>الطالب</th>
                            <th className="text-center">النوع</th>
                            <th className="text-center">المبلغ</th>
                            <th className="text-center">الرصيد قبل / بعد</th>
                            <th>تفاصيل العملية</th>
                            <th>كود المرجع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((tx) => (
                            <tr key={tx.id}>
                              <td className="text-xs text-muted">
                                {new Date(tx.date).toLocaleString('ar-EG')}
                              </td>
                              <td className="font-bold text-gray-800">
                                {tx.studentName}
                              </td>
                              <td className="text-center">
                                {tx.type === 'top_up' ? (
                                  <span className="badge badge-success">شحن رصيد</span>
                                ) : tx.type === 'purchase' ? (
                                  <span className="badge badge-primary">شراء كورس</span>
                                ) : (
                                  <span className="badge badge-secondary">{tx.type}</span>
                                )}
                              </td>
                              <td className="text-center font-bold text-gray-900">
                                {tx.amount} ج.م
                              </td>
                              <td className="text-center text-xs text-muted font-semibold">
                                {tx.balanceBefore} ج.م &larr; {tx.balanceAfter} ج.م
                              </td>
                              <td className="text-sm text-gray-600">
                                {tx.description}
                              </td>
                              <td className="text-xs font-mono text-muted">
                                {tx.reference || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {txTotalPages > 1 && (
                      <div className="flex justify-center gap-2 mt-6">
                        <button
                          onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                          disabled={txPage === 1}
                          className="btn btn-outline text-xs"
                        >
                          السابق
                        </button>
                        <span className="flex items-center px-4 font-bold text-sm">
                          {txPage} من {txTotalPages}
                        </span>
                        <button
                          onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
                          disabled={txPage === txTotalPages}
                          className="btn btn-outline text-xs"
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB 3: Subscriptions */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-6 animate-fade-in">
                {subscriptions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <FileTextIcon size={36} />
                    </div>
                    <h3>لا توجد اشتراكات مسجلة في النظام</h3>
                  </div>
                ) : (
                  <>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>تاريخ الاشتراك</th>
                            <th>الطالب</th>
                            <th>الكورس المشترك فيه</th>
                            <th className="text-center">طريقة الاشتراك</th>
                            <th>تفاصيل كود السنتر / المرجع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subscriptions.map((sub) => (
                            <tr key={sub.id}>
                              <td className="text-xs text-muted">
                                {sub.createdAt ? new Date(sub.createdAt).toLocaleString('ar-EG') : '—'}
                              </td>
                              <td className="font-bold text-gray-800">
                                {sub.studentName}
                              </td>
                              <td className="font-bold text-primary">
                                {sub.courseTitle}
                              </td>
                              <td className="text-center">
                                {sub.accessType === 'wallet' ? (
                                  <span className="badge badge-success">محفظة الطالب</span>
                                ) : sub.accessType === 'center_code' ? (
                                  <span className="badge badge-primary">كود السنتر</span>
                                ) : (
                                  <span className="badge badge-warning">تفعيل يدوي (إدمن)</span>
                                )}
                              </td>
                              <td className="text-xs font-mono text-muted">
                                {sub.reference || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {subTotalPages > 1 && (
                      <div className="flex justify-center gap-2 mt-6">
                        <button
                          onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                          disabled={subPage === 1}
                          className="btn btn-outline text-xs"
                        >
                          السابق
                        </button>
                        <span className="flex items-center px-4 font-bold text-sm">
                          {subPage} من {subTotalPages}
                        </span>
                        <button
                          onClick={() => setSubPage((p) => Math.min(subTotalPages, p + 1))}
                          disabled={subPage === subTotalPages}
                          className="btn btn-outline text-xs"
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
