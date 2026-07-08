'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuthGuard } from '../hooks/useAuthGuard';
import api from '@/lib/axios';
import {
  CreditCardIcon,
  PhoneIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  BarChartIcon,
  FileTextIcon,
  ImageIcon,
  UploadIcon,
  TrendingUpIcon,
} from '../components/Icons';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  paymentMethod: string;
  description: string;
  status: string;
  createdAt: string;
}

interface TopupRequest {
  id: number;
  amount: number;
  verifiedAmount: number | null;
  paymentMethod: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

interface PaymentNumberData {
  provider: string;
  payment_number?: string;
  paymentNumber?: string;
  number?: string;
  display_order?: number;
  instructions: string[];
}

type TabKey = 'transactions' | 'topup';

const TABS = [
  { id: 'transactions' as TabKey, label: 'المعاملات', icon: BarChartIcon },
  { id: 'topup' as TabKey, label: 'شحن الرصيد', icon: PlusIcon },
];

const PAYMENT_METHODS = [
  { id: 'instapay', name: 'إنستاباي', icon: CreditCardIcon, description: 'تحويل عبر التطبيق البنكي' },
  { id: 'vodafone_cash', name: 'فودافون كاش', icon: PhoneIcon, description: 'تحويل عبر محفظة فودافون كاش' },
];

export default function WalletPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isChecking, user } = useAuthGuard();

  const [activeTab, setActiveTab] = useState<TabKey>('transactions');

  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topupHistory, setTopupHistory] = useState<TopupRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [topupStep, setTopupStep] = useState<'select-method' | 'show-number' | 'upload-proof' | 'success'>('select-method');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentNumberData, setPaymentNumberData] = useState<PaymentNumberData | null>(null);

  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState('');

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  useEffect(() => {
    if (!isChecking && user?.status === 'pending') {
      router.replace('/waiting-room');
    }
  }, [isChecking, user, router]);

  useEffect(() => {
    if (!isChecking && user?.status !== 'pending') {
      fetchWalletData();
      fetchTopupHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChecking, user]);

  const fetchWalletData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.allSettled([
        api.get('/wallet/balance'),
        api.get('/wallet/transactions?limit=10'),
      ]);

      if (balanceRes.status === 'fulfilled') {
        setBalance(balanceRes.value.data?.data?.balance ?? balanceRes.value.data?.balance ?? 0);
      }

      if (transactionsRes.status === 'fulfilled') {
        const resData = transactionsRes.value.data;
        
        // 🚀 استخراج ذكي وآمن للبيانات للوصول لمصفوفة المعاملات أياً كان عمقها
        let rawTransactions: any[] = [];
        if (Array.isArray(resData)) {
          rawTransactions = resData;
        } else if (Array.isArray(resData?.data)) {
          rawTransactions = resData.data;
        } else if (Array.isArray(resData?.data?.data)) {
          rawTransactions = resData.data.data;
        } else if (resData?.data?.transactions && Array.isArray(resData.data.transactions)) {
          rawTransactions = resData.data.transactions;
        } else if (resData?.transactions && Array.isArray(resData.transactions)) {
          rawTransactions = resData.transactions;
        }

        const mappedTransactions = rawTransactions.map((t: any) => ({
          id: t.id,
          type: t.type || t.transaction_type || 'top_up',
          amount: Number(t.amount) || 0,
          balanceBefore: Number(t.balance_before ?? t.balanceBefore ?? 0),
          balanceAfter: Number(t.balance_after ?? t.balanceAfter ?? 0),
          reference: t.reference || '',
          paymentMethod: t.payment_method ?? t.paymentMethod ?? '',
          description: t.description || '',
          status: t.status || 'completed',
          createdAt: t.created_at ?? t.createdAt ?? new Date().toISOString(),
        }));
        setTransactions(mappedTransactions);
      }
    } catch (err) {
      console.error('Error fetching wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopupHistory = async () => {
    try {
      const response = await api.get('/wallet/topup/history?limit=10');
      const resData = response.data;
      
      let rawTopups: any[] = [];
      if (Array.isArray(resData)) {
        rawTopups = resData;
      } else if (Array.isArray(resData?.data)) {
        rawTopups = resData.data;
      } else if (Array.isArray(resData?.data?.data)) {
        rawTopups = resData.data.data;
      }

      const mappedTopups = rawTopups.map((req: any) => ({
        id: req.id,
        amount: req.amount,
        verifiedAmount: req.verified_amount ?? req.verifiedAmount ?? null,
        paymentMethod: req.payment_method ?? req.paymentMethod ?? '',
        status: req.status,
        adminNotes: req.admin_notes ?? req.adminNotes ?? null,
        createdAt: req.created_at ?? req.createdAt,
        reviewedAt: req.reviewed_at ?? req.reviewedAt ?? null,
      }));
      setTopupHistory(mappedTopups);
    } catch (err) {
      console.error('Error fetching topup history:', err);
    }
  };

  const initiateTopup = async (method: string) => {
    setSelectedMethod(method);
    setTopupLoading(true);
    setTopupError('');

    try {
      const response = await api.post(`/wallet/topup/initiate?provider=${method}`);
      setPaymentNumberData(response.data?.data || response.data);
      setTopupStep('show-number');
    } catch (err: any) {
      let errorMsg = 'حدث خطأ غير متوقع';
      if (err?.code === 'ERR_NO_PAYMENT_NUMBER' || err?.response?.data?.code === 'ERR_NO_PAYMENT_NUMBER') {
        errorMsg = 'عذراً، لا تتوفر أرقام تحويل حالياً لهذه الوسيلة. يرجى تجربة وسيلة أخرى أو التواصل مع الدعم.';
      } else {
        errorMsg = err?.message || err?.error || errorMsg;
      }
      setTopupError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('يجب اختيار ملف صورة فقط لإيصال الدفع', 'error');
        return;
      }
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitProof = async () => {
    if (!proofImage || !amount || !selectedMethod) {
      setTopupError('الرجاء إكمال جميع البيانات وإرفاق الصورة بوضوح');
      return;
    }

    setTopupLoading(true);
    setTopupError('');

    try {
      const formData = new FormData();
      formData.append('provider', selectedMethod);
      formData.append('amount', amount);
      formData.append('proof_image', proofImage);

      await api.post('/wallet/topup/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTopupStep('success');
      showToast('تم إرسال طلب الشحن بنجاح! جاري المراجعة.', 'success');
      
      fetchWalletData();
      fetchTopupHistory();
    } catch (err: any) {
      setTopupError(err?.response?.data?.message || err?.message || err?.error || 'فشل في إرسال إثبات الدفع');
    } finally {
      setTopupLoading(false);
    }
  };

  const resetTopup = () => {
    setTopupStep('select-method');
    setSelectedMethod(null);
    setPaymentNumberData(null);
    setProofImage(null);
    setProofPreview(null);
    setAmount('');
    setTopupError('');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'badge badge-success';
      case 'pending':
        return 'badge badge-warning';
      case 'declined':
      case 'failed':
      case 'cancelled':
        return 'badge badge-error';
      case 'amount_mismatch':
        return 'badge badge-warning';
      default:
        return 'badge';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'تمت الموافقة';
      case 'pending': return 'قيد المراجعة';
      case 'declined': return 'مرفوض';
      case 'amount_mismatch': return 'اختلاف المبلغ';
      case 'completed': return 'مكتمل';
      case 'failed': return 'فشل';
      case 'cancelled': return 'ملغى';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'top_up':
      case 'topup': return 'شحن';
      case 'purchase': return 'شراء (كورس)';
      case 'comprehensive_exam': return 'شراء (امتحان مستقل)';
      case 'refund': return 'استرجاع';
      default: return type;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'instapay': return 'إنستاباي';
      case 'vodafone_cash': return 'فودافون كاش';
      case 'fawry': return 'فوري';
      default: return method;
    }
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab !== 'topup') {
      resetTopup();
    }
  };

  if (isChecking || loading) {
    return (
      <div className="page-container">
        <Navbar />
        <div className="page-content flex items-center justify-center min-h-[60vh]">
          <div className="loading-state text-center">
            <div className="spinner spinner-lg mb-4 mx-auto" />
            <p className="font-bold text-gray-500">جاري تحميل بيانات محفظتك...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container relative">
      <Navbar />

      <div className={`toast-container ${toast.visible ? 'show' : ''}`} style={{ position: 'fixed', top: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: 'max-content', maxWidth: '90vw' }}>
        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertTriangleIcon size={20} />}
          {toast.message}
        </div>
      </div>

      <div className="page-content animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">محفظتي</h1>
            <p className="page-subtitle">إدارة رصيدك وطلبات الشحن</p>
          </div>
          <Link href="/student" className="btn btn-outline">
            <ArrowLeftIcon size={18} /> العودة للوحة
          </Link>
        </div>

        <div className="wallet-tabs mb-8">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`wallet-tab ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'transactions' && (
          <>
            <div className="card balance-card mb-6">
              <div className="balance-card-bg" />
              <div className="balance-card-content">
                <p className="balance-label">الرصيد المتاح حالياً</p>
                <h2 className="balance-value" dir="ltr">
                  {balance.toLocaleString()} <span className="balance-unit">ج.م</span>
                </h2>
                <button onClick={() => handleTabChange('topup')} className="btn balance-cta">
                  <PlusIcon size={18} /> شحن رصيد
                </button>
              </div>
            </div>

            {topupHistory.length > 0 && (
              <div className="card mb-6 animate-fade-in">
                <div className="card-header">
                  <h3 className="card-title">سجل طلبات الشحن</h3>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>المبلغ المضاف</th>
                        <th>الطريقة</th>
                        <th>حالة الطلب</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topupHistory.map(req => (
                        <tr key={req.id}>
                          <td>
                            <span className="font-bold" dir="ltr">
                              {req.verifiedAmount || req.amount} ج.م
                            </span>
                            {req.verifiedAmount && req.verifiedAmount !== req.amount && (
                              <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem' }}>
                                (المرسل الفعلي: {req.amount})
                              </span>
                            )}
                          </td>
                          <td>{getMethodLabel(req.paymentMethod)}</td>
                          <td>
                            <span className={getStatusBadgeClass(req.status)}>
                              {req.status === 'approved' && <CheckIcon size={12} />}
                              {req.status === 'pending' && <ClockIcon size={12} />}
                              {req.status === 'declined' && <XIcon size={12} />}
                              {req.status === 'amount_mismatch' && <AlertTriangleIcon size={12} />}
                              {getStatusLabel(req.status)}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }} dir="ltr">
                            {new Date(req.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="card animate-fade-in">
              <div className="card-header">
                <h3 className="card-title">سجل المعاملات المالية (Ledger)</h3>
              </div>
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><FileTextIcon size={28} /></div>
                  <p>لا توجد معاملات مسجلة حتى الآن</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>النوع والبيان</th>
                        <th>المبلغ</th>
                        <th>الرصيد النهائي</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(transaction => (
                        <tr key={transaction.id}>
                          <td>
                            <span className="font-bold flex items-center gap-1.5 mb-1">
                              {transaction.type === 'top_up' || transaction.type === 'topup' ? (
                                <TrendingUpIcon size={16} className="text-success" />
                              ) : transaction.type === 'purchase' || transaction.type === 'comprehensive_exam' ? (
                                <CreditCardIcon size={16} className="text-primary" />
                              ) : (
                                <ArrowLeftIcon size={16} className="text-warning" />
                              )}
                              {getTypeLabel(transaction.type)}
                            </span>
                            <span className="text-xs text-muted block max-w-[200px] truncate" title={transaction.description}>{transaction.description}</span>
                          </td>
                          <td dir="ltr">
                            <span className={`font-black ${['purchase', 'comprehensive_exam', 'withdrawal'].includes(transaction.type) ? 'text-error' : 'text-success'}`}>
                              {['purchase', 'comprehensive_exam', 'withdrawal'].includes(transaction.type) ? '-' : '+'}{transaction.amount}
                            </span>
                          </td>
                          <td>
                            <span className="font-bold text-gray-700" dir="ltr">{transaction.balanceAfter} ج.م</span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }} dir="ltr" className="text-sm">
                            {new Date(transaction.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'topup' && (
          <div className="card animate-fade-in">
            <div className="card-header">
              <h3 className="card-title">
                {topupStep === 'select-method' && 'اختر وسيلة الشحن المناسبة'}
                {topupStep === 'show-number' && 'أرسل المبلغ المطلوب'}
                {topupStep === 'upload-proof' && 'ارفع إيصال التحويل (Screen)'}
                {topupStep === 'success' && 'تم استلام طلبك'}
              </h3>
              <button onClick={resetTopup} className="btn btn-outline btn-sm">
                <XIcon size={16} /> إلغاء الشحن
              </button>
            </div>

            {topupError && (
              <div className="banner banner-error mb-6 font-bold flex items-center gap-2">
                <AlertTriangleIcon size={20} /> {topupError}
              </div>
            )}

            <div className="step-indicator">
              {[1, 2, 3, 4].map((step) => {
                const isActive = (topupStep === 'select-method' && step === 1) ||
                  (topupStep === 'show-number' && step === 2) ||
                  (topupStep === 'upload-proof' && step === 3) ||
                  (topupStep === 'success' && step === 4);
                const isCompleted = (topupStep === 'show-number' && step === 1) ||
                  (topupStep === 'upload-proof' && (step === 1 || step === 2)) ||
                  (topupStep === 'success' && step <= 3);
                return (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`step-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                      {isCompleted && step < 4 ? <CheckIcon size={14} /> : step}
                    </div>
                    {step < 4 && <div className={`step-line ${isCompleted ? 'completed' : ''}`} />}
                  </div>
                );
              })}
            </div>

            {topupStep === 'select-method' && (
              <div className="payment-methods-grid animate-fade-in">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon;
                  return (
                    <div
                      key={method.id}
                      onClick={() => initiateTopup(method.id)}
                      className="card payment-method-card"
                    >
                      <div className="payment-method-icon"><Icon size={40} /></div>
                      <h4 className="payment-method-name">{method.name}</h4>
                      <p className="payment-method-desc">{method.description}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {topupStep === 'show-number' && paymentNumberData && (
              <div className="animate-fade-in">
                <div className="payment-number-display">
                  <p className="payment-number-label">قم بتحويل المبلغ إلى الرقم الآتي:</p>
                  
                  <h3 className="payment-number-value select-all">
                    {paymentNumberData.payment_number || paymentNumberData.paymentNumber || paymentNumberData.number || 'الرقم غير متاح'}
                  </h3>

                  <p className="payment-number-provider">
                    {paymentNumberData.provider === 'instapay' ? <><CreditCardIcon size={16} /> عبر تطبيق إنستاباي</> : <><PhoneIcon size={16} /> عبر محفظة فودافون كاش</>}
                  </p>
                </div>

                <div className="banner banner-warning mb-6">
                  <AlertTriangleIcon size={20} />
                  <div>
                    <p className="font-bold mb-2">تعليمات هامة قبل التحويل:</p>
                    <ul className="instructions-list">
                      {paymentNumberData.instructions?.map((instruction, i) => <li key={i}>{instruction}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 flex-wrap">
                  <button onClick={resetTopup} className="btn btn-outline flex-1"><XIcon size={16} /> إلغاء العملية</button>
                  <button onClick={() => setTopupStep('upload-proof')} className="btn btn-primary flex-1"><CheckIcon size={16} /> أرسلت المبلغ، المتابعة للإيصال</button>
                </div>
              </div>
            )}

            {topupStep === 'upload-proof' && (
              <div className="animate-fade-in">
                <div className="form-group mb-6">
                  <label className="form-label font-bold text-lg">المبلغ الذي قمت بتحويله (بالجنيه المصري)</label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field w-full"
                    placeholder="مثال: 150"
                    style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}
                  />
                </div>

                <div className="form-group mb-6">
                  <label className="form-label font-bold text-lg mb-2 block">صورة إيصال التحويل (سكرين شوت من التطبيق)</label>
                  <input type="file" accept="image/*" onChange={handleProofSelect} ref={fileInputRef} className="hidden" />
                  <div onClick={() => fileInputRef.current?.click()} className={`file-upload-zone ${proofImage ? 'has-file' : ''}`}>
                    {proofPreview ? (
                      <img src={proofPreview} alt="إيصال الدفع" className="upload-preview" />
                    ) : (
                      <div>
                        <div className="upload-placeholder-icon text-primary mb-2"><ImageIcon size={48} /></div>
                        <p className="font-black text-gray-700 text-lg">اضغط هنا لرفع صورة الإيصال</p>
                        <p className="text-gray-400 font-bold mt-1 text-sm">صيغة الصور المدعومة: PNG, JPG, JPEG</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 flex-wrap mt-8">
                  <button onClick={() => setTopupStep('show-number')} className="btn btn-outline flex-1"><ArrowLeftIcon size={16} /> رجوع للرقم</button>
                  <button onClick={submitProof} disabled={topupLoading || !proofImage || !amount} className="btn btn-primary flex-1 py-3 font-bold text-lg shadow-md shadow-blue-200">
                    {topupLoading ? <><span className="spinner spinner-white border-2 w-5 h-5" /> جاري الرفع...</> : <><UploadIcon size={18} /> تأكيد إرسال الطلب للإدارة</>}
                  </button>
                </div>
              </div>
            )}

            {topupStep === 'success' && (
              <div className="animate-fade-in text-center py-8">
                <div className="success-circle shadow-lg shadow-green-200">
                  <CheckCircleIcon size={48} style={{ color: 'white' }} />
                </div>
                <h3 className="success-title text-success">تم استقبال طلبك بنجاح!</h3>
                <p className="text-gray-500 font-bold mb-8 leading-relaxed max-w-md mx-auto">
                  تقوم الإدارة حالياً بمراجعة إيصال التحويل الخاص بك والتأكد من البنك.
                  سيتم إضافة الرصيد إلى محفظتك تلقائياً فور التأكيد.
                </p>
                <button onClick={() => handleTabChange('transactions')} className="btn btn-primary px-8 font-bold mx-auto">
                  العودة لسجل المحفظة
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .wallet-tabs { display: flex; gap: 0.5rem; background: var(--surface); border-radius: var(--radius-md); padding: 0.375rem; border: 1px solid var(--border); }
        .wallet-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; border: none; background: transparent; color: var(--text-secondary); font-family: var(--font-body); font-size: 0.9375rem; font-weight: 600; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.3s ease; }
        .wallet-tab:hover { color: var(--primary); background: rgba(11, 79, 108, 0.04); }
        .wallet-tab.active { background: var(--gradient-primary); color: white; box-shadow: var(--shadow-sm); }
        .balance-card { background: var(--gradient-primary); border: none; position: relative; overflow: hidden; padding: var(--space-xl); border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(11, 79, 108, 0.3); }
        .balance-card-bg { position: absolute; inset: 0; background: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%); pointer-events: none; }
        .balance-card-content { position: relative; z-index: 1; }
        .balance-label { color: rgba(255,255,255,0.8); font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
        .balance-value { color: white; font-family: var(--font-display); font-size: 3.5rem; font-weight: 900; margin-bottom: 1.5rem; }
        .balance-unit { font-size: 1.25rem; font-weight: 700; opacity: 0.9; }
        .balance-cta { background: white; color: var(--primary); border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-weight: 800; padding: 0.75rem 1.5rem; }
        .balance-cta:hover { background: var(--surface); color: var(--primary-dark); box-shadow: 0 6px 16px rgba(0,0,0,0.2); transform: translateY(-2px); }
        .payment-methods-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
        .payment-method-card { cursor: pointer; text-align: center; padding: 2.5rem 1.5rem; border: 2px solid transparent; background: var(--surface); box-shadow: var(--shadow-sm); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border-radius: 1rem; }
        .payment-method-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); border-color: var(--primary); background: linear-gradient(135deg, rgba(11, 79, 108, 0.04) 0%, var(--surface) 100%); }
        .payment-method-icon { color: var(--primary); margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; }
        .payment-method-name { font-family: var(--font-display); font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-primary); }
        .payment-method-desc { color: var(--text-secondary); font-size: 0.875rem; font-weight: 600; }
        .payment-number-display { background: var(--gradient-accent); border-radius: 1rem; padding: 2.5rem; text-align: center; margin-bottom: 1.5rem; box-shadow: 0 10px 25px -5px rgba(27, 189, 212, 0.3); }
        .payment-number-label { color: rgba(255,255,255,0.9); font-size: 1.1rem; font-weight: 700; }
        .payment-number-value { color: white; font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3rem); font-weight: 900; letter-spacing: 0.1em; margin: 1rem 0; direction: ltr; }
        .payment-number-provider { color: rgba(255,255,255,0.9); font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: bold; }
        .instructions-list { font-size: 0.95rem; padding-inline-start: 1.5rem; line-height: 1.8; list-style: disc; color: var(--text-secondary); }
        .file-upload-zone { border: 2px dashed var(--border); border-radius: 1rem; padding: 3rem 1rem; text-align: center; cursor: pointer; transition: all 0.3s ease; background: var(--surface); }
        .file-upload-zone:hover { border-color: var(--primary); background: rgba(11, 79, 108, 0.02); }
        .file-upload-zone.has-file { border-style: solid; border-color: var(--success); background: rgba(16, 185, 129, 0.02); padding: 1rem; }
        .upload-preview { max-height: 300px; object-fit: contain; margin: 0 auto; border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); }
        .upload-placeholder-icon { display: flex; align-items: center; justify-content: center; }
        .success-circle { width: 100px; height: 100px; border-radius: 50%; background: var(--success); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
        .success-title { font-family: var(--font-display); font-size: 2rem; font-weight: 900; margin-bottom: 1rem; }
      `}</style>
    </div>
  );
}