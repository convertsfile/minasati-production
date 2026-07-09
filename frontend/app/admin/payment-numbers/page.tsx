'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar';
import { PlusIcon, XIcon, TrashIcon, CheckCircleIcon, AlertCircleIcon, PhoneIcon, CreditCardIcon, AlertTriangleIcon } from '../../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PaymentNumber {
  id: number;
  provider: 'instapay' | 'vodafone_cash';
  number: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export default function PaymentNumbersPage() {
  const router = useRouter();
  const [instapayNumbers, setInstapayNumbers] = useState<PaymentNumber[]>([]);
  const [vodafoneNumbers, setVodafoneNumbers] = useState<PaymentNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newProvider, setNewProvider] = useState<'instapay' | 'vodafone_cash'>('instapay');
  const [newNumber, setNewNumber] = useState('');
  const [newOrder, setNewOrder] = useState('1');
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const getToken = () => {
    return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
  };

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/payment-numbers`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        const allNumbers = data.data || [];
        setInstapayNumbers(allNumbers.filter((n: PaymentNumber) => n.provider === 'instapay'));
        setVodafoneNumbers(allNumbers.filter((n: PaymentNumber) => n.provider === 'vodafone_cash'));
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      showToast('فشل الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber || !newOrder) return;

    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/payment-numbers`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          provider: newProvider,
          number: newNumber,
          display_order: parseInt(newOrder),
          is_active: true
        }),
      });

      if (response.ok) {
        showToast('تم إضافة الرقم بنجاح', 'success');
        setShowAddForm(false);
        setNewNumber('');
        setNewOrder('1');
        fetchNumbers();
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'فشل الحفظ، تأكد من البيانات', 'error');
      }
    } catch {
      showToast('حدث خطأ أثناء الاتصال', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من حذف هذا الرقم؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const token = getToken();
          const response = await fetch(`${API_URL}/api/admin/payment-numbers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
          });

          if (response.ok) {
            showToast('تم حذف الرقم بنجاح', 'success');
            fetchNumbers();
          } else {
            const error = await response.json();
            showToast(error.message || 'لا يمكن حذف رقم له سجل معاملات', 'error');
          }
        } catch {
          showToast('خطأ في الاتصال', 'error');
        }
      }
    });
  };

  const handleToggle = async (num: PaymentNumber) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/payment-numbers/${num.id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ is_active: !num.is_active }),
      });

      if (response.ok) {
        showToast('تم تحديث حالة الرقم', 'success');
        fetchNumbers();
      } else {
        showToast('فشل تحديث الحالة من الخادم', 'error');
      }
    } catch {
      showToast('فشل تحديث الحالة', 'error');
    }
  };

  return (
    <div className="admin-layout relative">
      <AdminSidebar />
      
      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="card shadow-2xl max-w-sm w-full text-center p-8">
            <div className="flex justify-center mb-4 text-error">
              <AlertTriangleIcon size={48} />
            </div>
            <h3 className="text-xl font-bold text-error mb-4">تأكيد الحذف</h3>
            <p className="text-muted mb-6 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1">إلغاء</button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1">نعم، احذف</button>
            </div>
          </div>
        </div>
      )}

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
              <PhoneIcon size={28} />
              أرقام الدفع
            </h1>
            <p className="page-subtitle">إدارة أرقام InstaPay و Vodafone Cash</p>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary">
            {showAddForm ? <><XIcon size={16} /> إلغاء</> : <><PlusIcon size={16} /> إضافة رقم جديد</>}
          </button>
        </div>

        {showAddForm && (
          <div className="card mb-6 animate-fade-in border border-primary/20 shadow-lg">
            <h2 className="card-title mb-5 text-primary flex items-center gap-2"><PlusIcon size={20} /> إضافة رقم دفع جديد</h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">مزود الخدمة</label>
                <select value={newProvider} onChange={(e) => setNewProvider(e.target.value as any)} className="input-field" dir="rtl">
                  <option value="instapay">إنستاباي (InstaPay)</option>
                  <option value="vodafone_cash">فودافون كاش (Vodafone Cash)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">رقم الدفع / المعرف</label>
                <input type="text" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} className="input-field" placeholder="01xxxxxxxxx أو معرف إنستاباي" required />
              </div>
              <div className="form-group">
                <label className="form-label">ترتيب العرض</label>
                <input type="number" value={newOrder} onChange={(e) => setNewOrder(e.target.value)} className="input-field" min="1" required />
              </div>
              <div className="col-span-full mt-4 flex gap-3">
                <button type="submit" disabled={saving} className="btn btn-primary px-8">
                  {saving ? 'جاري الحفظ...' : <><PlusIcon size={16} /> حفظ الرقم</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-state"><div className="spinner spinner-lg" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <h2 className="card-title text-xl flex items-center gap-2">
                  <CreditCardIcon size={20} />
                  أرقام إنستاباي
                </h2>
                <span className="badge badge-primary">{instapayNumbers.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {instapayNumbers.map(num => (
                  <div key={num.id} className="p-4 rounded-xl border bg-gray-50 hover:border-primary/30 transition-colors flex justify-between items-center gap-4">
                    <div className="flex-1 overflow-hidden">
                      <div className="font-bold text-lg text-primary truncate text-left" dir="ltr">{num.number}</div>
                      <div className="text-xs text-muted mt-1">الترتيب: {num.display_order}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleToggle(num)} className={`btn btn-sm ${num.is_active ? 'btn-success' : 'btn-outline'}`}>
                        {num.is_active ? <><CheckCircleIcon size={14} /> نشط</> : 'معطل'}
                      </button>
                      <button onClick={() => handleDelete(num.id)} className="btn btn-sm btn-danger" title="حذف"><TrashIcon size={14} /></button>
                    </div>
                  </div>
                ))}
                {instapayNumbers.length === 0 && <p className="text-center text-muted p-4">لا توجد أرقام مسجلة</p>}
              </div>
            </div>

            <div className="card">
              <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <h2 className="card-title text-xl flex items-center gap-2">
                  <PhoneIcon size={20} />
                  فودافون كاش
                </h2>
                <span className="badge badge-success">{vodafoneNumbers.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {vodafoneNumbers.map(num => (
                  <div key={num.id} className="p-4 rounded-xl border bg-gray-50 hover:border-success/30 transition-colors flex justify-between items-center gap-4">
                    <div className="flex-1 overflow-hidden">
                      <div className="font-bold text-lg text-success tracking-wider truncate text-left" dir="ltr">{num.number}</div>
                      <div className="text-xs text-muted mt-1">الترتيب: {num.display_order}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleToggle(num)} className={`btn btn-sm ${num.is_active ? 'btn-success' : 'btn-outline'}`}>
                        {num.is_active ? <><CheckCircleIcon size={14} /> نشط</> : 'معطل'}
                      </button>
                      <button onClick={() => handleDelete(num.id)} className="btn btn-sm btn-danger" title="حذف"><TrashIcon size={14} /></button>
                    </div>
                  </div>
                ))}
                {vodafoneNumbers.length === 0 && <p className="text-center text-muted p-4">لا توجد أرقام مسجلة</p>}
              </div>
            </div>
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
