'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useAuthGuard } from '../../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
import api from '@/lib/axios'; // 🚀 العميل الذكي للشبكة
import {
  TrendingUpIcon, BarChartIcon, CreditCardIcon, FileTextIcon,
  CheckCircleIcon, XIcon, AlertCircleIcon, UsersIcon
} from '@/app/components/Icons';

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
  // 🚀 حارس البوابة: يطرد المتطفلين ويعرض شاشة التحميل ريثما يتم الفحص
  const { isChecking } = useAuthGuard(['admin']);

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

  // 🚀 نظام التنبيهات الموحد العائم
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/wallet/summary');
      const data = response.data?.data || response.data || {};
      
      // 🚀 التحويل الصارم للأرقام لمنع انهيار الصفحة أثناء استخدام toLocaleString
      setSummary({
        period: data.period || { start: '—', end: '—' },
        totalTopups: Number(data.total_topups ?? data.totalTopups ?? 0),
        topupsCount: Number(data.topups_count ?? data.topupsCount ?? 0),
        courseSalesCount: Number(data.course_sales_count ?? data.courseSalesCount ?? 0),
        students: {
          total: Number(data.students?.total ?? 0),
          active: Number(data.students?.active ?? 0)
        }
      });
    } catch (e: any) {
      showToast(e?.message || 'فشل تحميل الملخص المالي', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get('/admin/wallet/transactions', {
        params: { page, limit: 20 }
      });
      
      const data = response.data;
      const rawTx = data?.data?.data || data?.data || [];
      
      const mappedTx: TransactionLog[] = rawTx.map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount) || 0,
        balanceBefore: Number(tx.balance_before ?? tx.balanceBefore ?? 0),
        balanceAfter: Number(tx.balance_after ?? tx.balanceAfter ?? 0),
        description: tx.description || 'بدون وصف',
        status: tx.status || 'مكتمل',
        date: tx.date || tx.created_at || tx.createdAt || new Date().toISOString(),
        reference: tx.reference || '—',
        studentName: tx.student_name ?? tx.studentName ?? tx.student?.full_name ?? 'غير محدد',
      }));

      setTransactions(mappedTx);
      setTxPage(data?.data?.pagination?.currentPage ?? data?.meta?.current_page ?? 1);
      setTxTotalPages(data?.data?.pagination?.lastPage ?? data?.meta?.last_page ?? 1);
    } catch (e: any) {
      showToast(e?.message || 'فشل تحميل سجل العمليات المالية', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchSubscriptions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get('/admin/wallet/subscriptions', {
        params: { page, limit: 20 }
      });
      
      const data = response.data;
      const rawSubs = data?.data?.data || data?.data || [];

      const mappedSubs: SubscriptionLog[] = rawSubs.map((sub: any) => ({
        id: sub.id,
        studentName: sub.student_name ?? sub.studentName ?? sub.student?.full_name ?? 'طالب غير محدد',
        courseTitle: sub.course_title ?? sub.courseTitle ?? sub.course?.title ?? 'كورس غير محدد',
        accessType: sub.access_type ?? sub.accessType ?? 'unknown',
        reference: sub.reference,
        grantedAt: sub.granted_at ?? sub.grantedAt,
        createdAt: sub.created_at ?? sub.createdAt ?? new Date().toISOString(),
      }));

      setSubscriptions(mappedSubs);
      setSubPage(data?.data?.pagination?.currentPage ?? data?.meta?.current_page ?? 1);
      setSubTotalPages(data?.data?.pagination?.lastPage ?? data?.meta?.last_page ?? 1);
    } catch (e: any) {
      showToast(e?.message || 'فشل تحميل سجل الاشتراكات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 🚀 المراقبة الذكية للتبويبات
  useEffect(() => {
    if (!isChecking) {
      if (activeTab === 'summary') {
        fetchSummary();
      } else if (activeTab === 'transactions') {
        fetchTransactions(txPage);
      } else if (activeTab === 'subscriptions') {
        fetchSubscriptions(subPage);
      }
    }
  }, [activeTab, txPage, subPage, fetchSummary, fetchTransactions, fetchSubscriptions, isChecking]);

  if (isChecking) {
    return (
      <div className="admin-layout relative">
        <AdminSidebar />
        <main className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="loading-state text-center flex flex-col items-center">
            <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
            <p className="font-bold text-muted text-lg">جاري تجهيز البيانات المالية...</p>
          </div>
        </main>
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
              <TrendingUpIcon size={32} className="text-primary" /> 
              السجل والتقرير المالي الشامل
            </h1>
            <p className="page-subtitle text-base mt-2">مراقبة تفصيلية للمبيعات، إيرادات الشحن، واشتراكات الطلاب في المنصة.</p>
          </div>
        </div>

        {/* 🚀 Tab Controls */}
        <div className="flex gap-3 mb-8 bg-white p-2 rounded-xl border border-gray-100 w-fit overflow-x-auto shadow-sm" style={{ direction: 'rtl' }}>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-6 py-3 font-bold text-sm transition-all rounded-lg flex items-center gap-2 whitespace-nowrap ${activeTab === 'summary' ? 'bg-blue-50 text-primary shadow-sm border border-blue-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-transparent'}`}
          >
            <BarChartIcon size={18} /> ملخص الإيرادات
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-3 font-bold text-sm transition-all rounded-lg flex items-center gap-2 whitespace-nowrap ${activeTab === 'transactions' ? 'bg-blue-50 text-primary shadow-sm border border-blue-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-transparent'}`}
          >
            <CreditCardIcon size={18} /> سجل المحافظ (Ledger)
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-6 py-3 font-bold text-sm transition-all rounded-lg flex items-center gap-2 whitespace-nowrap ${activeTab === 'subscriptions' ? 'bg-blue-50 text-primary shadow-sm border border-blue-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-transparent'}`}
          >
            <FileTextIcon size={18} /> سجل اشتراكات الكورسات
          </button>
        </div>

        {loading ? (
          <div className="loading-state h-64 border border-gray-100 bg-white rounded-2xl shadow-sm flex flex-col justify-center items-center">
            <div className="spinner spinner-primary spinner-lg mb-4"></div>
            <p className="font-bold text-gray-500">جاري سحب التقارير من قاعدة البيانات...</p>
          </div>
        ) : (
          <div className="space-y-6 text-right" style={{ direction: 'rtl' }}>
            
            {/* 🚀 TAB 1: Summary */}
            {activeTab === 'summary' && summary && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="card p-8 border-l-4 border-l-success shadow-sm bg-white rounded-2xl hover:shadow-md transition-shadow group">
                    <span className="text-sm font-bold text-gray-500 block mb-3">إجمالي إيرادات الشحن (الموافق عليها)</span>
                    <span className="text-4xl font-black text-success font-mono group-hover:scale-105 transition-transform origin-right inline-block">
                      {summary.totalTopups.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-lg">ج.م</span>
                    </span>
                    <span className="text-xs font-bold text-gray-500 block mt-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100">بناءً على {summary.topupsCount.toLocaleString('en-US')} عملية شحن مقبولة.</span>
                  </div>
                  
                  <div className="card p-8 border-l-4 border-l-primary shadow-sm bg-white rounded-2xl hover:shadow-md transition-shadow group">
                    <span className="text-sm font-bold text-gray-500 block mb-3">إجمالي عمليات بيع الكورسات</span>
                    <span className="text-4xl font-black text-primary font-mono group-hover:scale-105 transition-transform origin-right inline-block">
                      {summary.courseSalesCount.toLocaleString('en-US')} <span className="text-xl">عملية</span>
                    </span>
                    <span className="text-xs font-bold text-gray-500 block mt-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100">يشمل الدفع بالمحفظة أو التفعيل المباشر.</span>
                  </div>
                  
                  <div className="card p-8 border-l-4 border-l-orange-500 shadow-sm bg-white rounded-2xl hover:shadow-md transition-shadow group">
                    <span className="text-sm font-bold text-gray-500 block mb-3">إحصائيات الطلاب (نشط / إجمالي)</span>
                    <span className="text-4xl font-black text-gray-900 font-mono group-hover:scale-105 transition-transform origin-right inline-block">
                      {summary.students.active.toLocaleString('en-US')} <span className="text-xl text-gray-400">/ {summary.students.total.toLocaleString('en-US')}</span>
                    </span>
                    <span className="text-xs font-bold text-gray-500 block mt-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-1.5"><UsersIcon size={14} className="text-orange-500"/> طالب نشط اشترى كورساً واحداً على الأقل.</span>
                  </div>
                </div>

                <div className="card p-6 border border-blue-100 shadow-sm bg-blue-50/50 rounded-2xl">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-primary"><AlertCircleIcon size={20} /> النطاق الزمني للتقرير</h3>
                  <p className="text-gray-600 text-sm font-medium leading-relaxed">
                    يتم عرض الأرقام المالية والحسابات الخاصة بالفترة من <strong className="font-mono text-gray-900 bg-white px-2.5 py-1 rounded-md shadow-sm border border-gray-200" dir="ltr">{summary.period.start}</strong> إلى <strong className="font-mono text-gray-900 bg-white px-2.5 py-1 rounded-md shadow-sm border border-gray-200" dir="ltr">{summary.period.end}</strong> (آخر 30 يوماً).
                  </p>
                </div>
              </div>
            )}

            {/* 🚀 TAB 2: Transactions */}
            {activeTab === 'transactions' && (
              <div className="space-y-6 animate-fade-in">
                {transactions.length === 0 ? (
                  <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
                    <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
                      <CreditCardIcon size={48} className="text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-800">لا توجد حركات مالية مسجلة بعد</h3>
                  </div>
                ) : (
                  <>
                    <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="table w-full m-0 min-w-[1000px]">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">التاريخ والوقت</th>
                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">الطالب</th>
                              <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">نوع العملية</th>
                              <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">قيمة العملية</th>
                              <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">الرصيد (قبل &larr; بعد)</th>
                              <th className="font-bold text-gray-700 py-5 px-5 text-right min-w-[200px]">البيان / الوصف</th>
                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">كود المرجع</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {transactions.map((tx) => {
                              const isTopup = tx.type === 'top_up' || tx.type === 'topup';
                              return (
                                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="py-4 px-5">
                                    <div className="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg inline-block">
                                      {new Date(tx.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </div>
                                  </td>
                                  <td className="py-4 px-5 font-black text-gray-900 text-sm">{tx.studentName}</td>
                                  <td className="py-4 px-5 text-center">
                                    {isTopup ? (
                                      <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-green-50 text-green-700 border border-green-100">إيداع / شحن</span>
                                    ) : tx.type === 'purchase' ? (
                                      <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-blue-50 text-blue-700 border border-blue-100">خصم / شراء</span>
                                    ) : (
                                      <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-gray-100 text-gray-700 border border-gray-200">{tx.type}</span>
                                    )}
                                  </td>
                                  <td className="py-4 px-5 text-center">
                                    <span className={`font-black text-lg font-mono px-3 py-1 rounded-lg border shadow-sm ${isTopup ? 'text-success bg-green-50 border-green-100' : 'text-error bg-red-50 border-red-100'}`} dir="ltr">
                                      {isTopup ? '+' : '-'}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </td>
                                  <td className="py-4 px-5 text-center font-bold text-xs text-gray-500 font-mono bg-gray-50/50" dir="ltr">
                                    {tx.balanceBefore.toLocaleString('en-US')} <span className="text-gray-300 mx-1">&rarr;</span> <span className="text-gray-800">{tx.balanceAfter.toLocaleString('en-US')}</span>
                                  </td>
                                  <td className="py-4 px-5 text-sm font-bold text-gray-700 leading-relaxed">{tx.description}</td>
                                  <td className="py-4 px-5">
                                    <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md select-all" dir="ltr">
                                      {tx.reference || '—'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {txTotalPages > 1 && (
                      <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-full shadow-sm border border-gray-200 inline-flex mx-auto">
                        <button onClick={() => setTxPage((p) => Math.max(1, p - 1))} disabled={txPage === 1} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">السابق</button>
                        <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">الصفحة {txPage} من {txTotalPages}</span>
                        <button onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))} disabled={txPage === txTotalPages} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">التالي</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 🚀 TAB 3: Subscriptions */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-6 animate-fade-in">
                {subscriptions.length === 0 ? (
                  <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
                    <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
                      <FileTextIcon size={48} className="text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-800">لا توجد اشتراكات مسجلة في النظام</h3>
                  </div>
                ) : (
                  <>
                    <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                      <div className="overflow-x-auto w-full">
                        <table className="table w-full m-0 min-w-[1000px]">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">تاريخ التفعيل</th>
                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">الطالب المشترك</th>
                              <th className="font-bold text-gray-700 py-5 px-5 text-right min-w-[200px]">الكورس (المحتوى)</th>
                              <th className="font-bold text-gray-700 py-5 px-5 text-center whitespace-nowrap">بوابة / طريقة التفعيل</th>
                              <th className="font-bold text-gray-700 py-5 px-5 text-right whitespace-nowrap">كود المرجع / الإيصال</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {subscriptions.map((sub) => (
                              <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 px-5">
                                  <span className="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg inline-block">
                                    {sub.createdAt ? new Date(sub.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                                  </span>
                                </td>
                                <td className="py-4 px-5 font-black text-gray-900 text-sm">{sub.studentName}</td>
                                <td className="py-4 px-5 font-black text-primary">{sub.courseTitle}</td>
                                <td className="py-4 px-5 text-center">
                                  {sub.accessType === 'wallet' ? (
                                    <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-green-50 text-green-700 border border-green-100">محفظة الطالب 💳</span>
                                  ) : sub.accessType === 'center_code' ? (
                                    <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-blue-50 text-blue-700 border border-blue-100">كود سنتر 🎟️</span>
                                  ) : (
                                    <span className="badge font-bold px-3 py-1.5 rounded-lg text-xs bg-orange-50 text-orange-700 border border-orange-100">تفعيل يدوي للإدارة ⚙️</span>
                                  )}
                                </td>
                                <td className="py-4 px-5">
                                  <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md select-all" dir="ltr">
                                    {sub.reference || '—'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {subTotalPages > 1 && (
                      <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-full shadow-sm border border-gray-200 inline-flex mx-auto">
                        <button onClick={() => setSubPage((p) => Math.max(1, p - 1))} disabled={subPage === 1} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">السابق</button>
                        <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">الصفحة {subPage} من {subTotalPages}</span>
                        <button onClick={() => setSubPage((p) => Math.min(subTotalPages, p + 1))} disabled={subPage === subTotalPages} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">التالي</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}