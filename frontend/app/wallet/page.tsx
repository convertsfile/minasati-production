'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { useAuthGuard } from '../hooks/useAuthGuard';
import StatCard from '../components/StatCard';
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
  AwardIcon,
  TrendingUpIcon,
} from '../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

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
  payment_number: string;
  display_order: number;
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
  const { isChecking } = useAuthGuard();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [topupSuccess, setTopupSuccess] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    fetchWalletData();
    fetchTopupHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchWalletData = async () => {
    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const [balanceRes, transactionsRes] = await Promise.all([
        fetch(`${API_URL}/api/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        }),
        fetch(`${API_URL}/api/wallet/transactions?limit=10`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        }),
      ]);

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData.data?.balance || 0);

        const statusRes = await fetch(`${API_URL}/api/auth/status`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.data?.status === 'pending') {
            router.replace('/waiting-room');
            return;
          }
        }
      }

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        const rawTransactions = transactionsData.data?.data || transactionsData.data || [];
        const mappedTransactions = rawTransactions.map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balanceBefore: t.balance_before ?? t.balanceBefore ?? 0,
          balanceAfter: t.balance_after ?? t.balanceAfter ?? 0,
          reference: t.reference || '',
          paymentMethod: t.payment_method ?? t.paymentMethod ?? '',
          description: t.description || '',
          status: t.status,
          createdAt: t.created_at ?? t.createdAt,
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
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/wallet/topup/history?limit=10`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const rawTopups = data.data?.data || data.data || [];
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
      }
    } catch (err) {
      console.error('Error fetching topup history:', err);
    }
  };

  const initiateTopup = async (method: string) => {
    setSelectedMethod(method);
    setTopupLoading(true);
    setTopupError('');

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/wallet/topup/initiate?provider=${method}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'ERR_NO_PAYMENT_NUMBER') {
          throw new Error('عذراً، لا تتوفر أرقام تحويل حالياً لهذه الوسيلة. يرجى تجربة وسيلة أخرى أو التواصل مع الدعم.');
        }
        throw new Error(data.error || data.message || 'فشل في جلب رقم الدفع');
      }

      setPaymentNumberData(data.data);
      setTopupStep('show-number');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
      setTopupError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      setTopupError('الرجاء إكمال جميع البيانات والصورة');
      return;
    }

    setTopupLoading(true);
    setTopupError('');

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('provider', selectedMethod);
      formData.append('amount', amount);
      formData.append('proof_image', proofImage);

      const response = await fetch(`${API_URL}/api/wallet/topup/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'فشل في إرسال إثبات الدفع');
      }

      setTopupSuccess(true);
      setTopupStep('success');
      showToast('تم إرسال طلب الشحن بنجاح!', 'success');
      fetchWalletData();
      fetchTopupHistory();
    } catch (err) {
      setTopupError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
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
    setTopupSuccess(false);
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
      case 'purchase': return 'شراء';
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
        <div className="page-content">
          <div className="loading-state">
            <div className="spinner spinner-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container relative">
      <Navbar />

      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
        <div className={`toast-content ${toast.type}`}>
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
          <Link href="/dashboard" className="btn btn-outline">
            <ArrowLeftIcon size={18} />
            العودة للوحة
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
                <p className="balance-label">الرصيد المتاح</p>
                <h2 className="balance-value">
                  {balance.toLocaleString()} <span className="balance-unit">نقطة</span>
                </h2>
                <button
                  onClick={() => handleTabChange('topup')}
                  className="btn balance-cta"
                >
                  <PlusIcon size={18} />
                  شحن رصيد
                </button>
              </div>
            </div>



            {topupHistory.length > 0 && (
              <div className="card mb-6">
                <div className="card-header">
                  <h3 className="card-title">طلبات الشحن</h3>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>المبلغ</th>
                        <th>الطريقة</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topupHistory.map(req => (
                        <tr key={req.id}>
                          <td>
                            <span className="font-bold">
                              {req.verifiedAmount || req.amount} نقطة
                            </span>
                            {req.verifiedAmount && req.verifiedAmount !== req.amount && (
                              <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem' }}>
                                (المطلوب: {req.amount})
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
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {new Date(req.createdAt).toLocaleDateString('ar-EG')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">أخر المعاملات</h3>
              </div>
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <FileTextIcon size={28} />
                  </div>
                  <p>لا توجد معاملات بعد</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>النوع</th>
                        <th>المبلغ</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(transaction => (
                        <tr key={transaction.id}>
                          <td>
                            <span className="font-semibold">
                              {transaction.type === 'top_up' || transaction.type === 'topup' ? (
                                <TrendingUpIcon size={16} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                              ) : transaction.type === 'purchase' ? (
                                <CreditCardIcon size={16} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                              ) : (
                                <ArrowLeftIcon size={16} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                              )}
                              {getTypeLabel(transaction.type)}
                            </span>
                          </td>
                          <td>
                            <span className={`font-bold ${transaction.amount > 0 ? 'text-success' : 'text-error'}`}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount} نقطة
                            </span>
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(transaction.status)}>
                              {transaction.status === 'completed' && <CheckIcon size={12} />}
                              {transaction.status === 'pending' && <ClockIcon size={12} />}
                              {transaction.status === 'failed' && <XIcon size={12} />}
                              {getStatusLabel(transaction.status)}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {new Date(transaction.createdAt).toLocaleDateString('ar-EG')}
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
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                {topupStep === 'select-method' && 'اختر طريقة الدفع'}
                {topupStep === 'show-number' && 'أرسل المبلغ'}
                {topupStep === 'upload-proof' && 'ارفع الإيصال'}
                {topupStep === 'success' && 'تم الاستلام'}
              </h3>
              <button onClick={resetTopup} className="btn btn-outline btn-sm">
                <XIcon size={16} />
                إلغاء
              </button>
            </div>

            {topupError && (
              <div className="banner banner-error mb-6">
                <AlertTriangleIcon size={20} />
                {topupError}
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
              <div className="payment-methods-grid">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon;
                  return (
                    <div
                      key={method.id}
                      onClick={() => initiateTopup(method.id)}
                      className="card payment-method-card"
                    >
                      <div className="payment-method-icon">
                        <Icon size={40} />
                      </div>
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
                  <p className="payment-number-label">أرسل المبلغ إلى:</p>
                  <h3 className="payment-number-value">
                    {paymentNumberData.payment_number}
                  </h3>
                  <p className="payment-number-provider">
                    {paymentNumberData.provider === 'instapay' ? (
                      <><CreditCardIcon size={16} /> إنستاباي</>
                    ) : (
                      <><PhoneIcon size={16} /> فودافون كاش</>
                    )}
                  </p>
                </div>

                <div className="banner banner-warning mb-6">
                  <AlertTriangleIcon size={20} />
                  <div>
                    <p className="font-bold mb-2">أرسل المبلغ المذكور ثم التقط صورة إيصال التحويل</p>
                    <ul className="instructions-list">
                      {paymentNumberData.instructions.map((instruction, i) => (
                        <li key={i}>{instruction}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 flex-wrap">
                  <button onClick={resetTopup} className="btn btn-outline flex-1">
                    <XIcon size={16} />
                    إلغاء
                  </button>
                  <button onClick={() => setTopupStep('upload-proof')} className="btn btn-primary flex-1">
                    <CheckIcon size={16} />
                    تم التحويل، التالي
                  </button>
                </div>
              </div>
            )}

            {topupStep === 'upload-proof' && (
              <div className="animate-fade-in">
                <div className="form-group mb-6">
                  <label className="form-label">المبلغ المرسل (بالجنيه)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field"
                    placeholder="أدخل المبلغ الذي قمت بتحويله"
                    style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 700 }}
                  />
                </div>

                <div className="form-group mb-6">
                  <label className="form-label">صورة إيصال التحويل</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofSelect}
                    ref={fileInputRef}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`file-upload-zone ${proofImage ? 'has-file' : ''}`}
                  >
                    {proofPreview ? (
                      <img src={proofPreview} alt="إيصال دفع" className="upload-preview" />
                    ) : (
                      <div>
                        <div className="upload-placeholder-icon">
                          <ImageIcon size={40} />
                        </div>
                        <p className="font-semibold text-secondary">اضغط هنا لرفع الصورة</p>
                        <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>PNG, JPG أو JPEG</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 flex-wrap">
                  <button onClick={() => setTopupStep('show-number')} className="btn btn-outline flex-1">
                    <ArrowLeftIcon size={16} />
                    رجوع
                  </button>
                  <button
                    onClick={submitProof}
                    disabled={topupLoading || !proofImage || !amount}
                    className="btn btn-primary flex-1"
                  >
                    {topupLoading ? (
                      <>
                        <span className="spinner spinner-white" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <UploadIcon size={16} />
                        إرسال للمراجعة
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {topupStep === 'success' && (
              <div className="animate-fade-in text-center" style={{ padding: '2rem' }}>
                <div className="success-circle">
                  <CheckCircleIcon size={40} style={{ color: 'white' }} />
                </div>
                <h3 className="success-title">تم إرسال طلبك بنجاح!</h3>
                <p className="text-secondary mb-6" style={{ lineHeight: 1.8 }}>
                  سيتم مراجعة إيصال الدفع من قبل الإدارة.<br />
                  سيضاف الرصيد إلى محفظتك فور التأكد من التحويل.
                </p>
                <button onClick={() => handleTabChange('transactions')} className="btn btn-primary">
                  <ArrowLeftIcon size={16} />
                  العودة للمحفظة
                </button>
              </div>
            )}
          </div>
        )}


      </div>

      <style jsx>{`
        .wallet-tabs {
          display: flex;
          gap: 0.5rem;
          background: var(--surface);
          border-radius: var(--radius-md);
          padding: 0.375rem;
          border: 1px solid var(--border);
        }
        .wallet-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 0.9375rem;
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .wallet-tab:hover {
          color: var(--primary);
          background: rgba(11, 79, 108, 0.04);
        }
        .wallet-tab.active {
          background: var(--gradient-primary);
          color: white;
          box-shadow: var(--shadow-sm);
        }
        .balance-card {
          background: var(--gradient-primary);
          border: none;
          position: relative;
          overflow: hidden;
          padding: var(--space-xl);
        }
        .balance-card-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%);
          pointer-events: none;
        }
        .balance-card-content {
          position: relative;
          z-index: 1;
        }
        .balance-label {
          color: rgba(255,255,255,0.8);
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .balance-value {
          color: white;
          font-family: var(--font-display);
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
        }
        .balance-unit {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .balance-cta {
          background: white;
          color: var(--primary);
          border: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-weight: 700;
        }
        .balance-cta:hover {
          background: white;
          color: var(--primary-dark);
          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
          transform: translateY(-2px);
        }
        .payment-methods-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .payment-method-card {
          cursor: pointer;
          text-align: center;
          padding: 2rem 1.5rem;
          border: 2px solid var(--primary);
          background: linear-gradient(135deg, rgba(11, 79, 108, 0.04) 0%, var(--surface) 100%);
          transition: all 0.3s ease;
        }
        .payment-method-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-lg);
        }
        .payment-method-icon {
          color: var(--primary);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .payment-method-name {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .payment-method-desc {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .payment-number-display {
          background: var(--gradient-accent);
          border-radius: var(--radius-lg);
          padding: 2.5rem;
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .payment-number-label {
          color: rgba(255,255,255,0.8);
          font-size: 1rem;
          font-weight: 600;
        }
        .payment-number-value {
          color: white;
          font-family: var(--font-display);
          font-size: clamp(1.5rem, 5vw, 2.5rem);
          font-weight: 800;
          letter-spacing: 0.1em;
          margin: 1rem 0;
          direction: ltr;
        }
        .payment-number-provider {
          color: rgba(255,255,255,0.8);
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .instructions-list {
          font-size: 0.875rem;
          padding-inline-start: 1.25rem;
          line-height: 1.8;
          list-style: disc;
        }
        .upload-preview {
          max-height: 250px;
          object-fit: contain;
          margin: 0 auto;
          border-radius: var(--radius-sm);
        }
        .upload-placeholder-icon {
          color: var(--text-muted);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .success-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: var(--success);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }
        .success-title {
          font-family: var(--font-display);
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--success);
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
