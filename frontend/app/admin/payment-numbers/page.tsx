'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابة المركزي
import api from '@/lib/axios'; // 🚀 العميل الشبكي المحمي
import { 
  PlusIcon, XIcon, TrashIcon, CheckCircleIcon, 
  AlertCircleIcon, PhoneIcon, CreditCardIcon, AlertTriangleIcon 
} from '../../components/Icons';

interface PaymentNumber {
  id: number;
  provider: 'instapay' | 'vodafone_cash';
  number: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function PaymentNumbersPage() {
  // 🚀 درع الحماية: يطرد المتطفلين فوراً ويعرض شاشة التحميل ريثما يتأكد
  const { isChecking } = useAuthGuard(['admin']);

  const [instapayNumbers, setInstapayNumbers] = useState<PaymentNumber[]>([]);
  const [vodafoneNumbers, setVodafoneNumbers] = useState<PaymentNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newProvider, setNewProvider] = useState<'instapay' | 'vodafone_cash'>('instapay');
  const [newNumber, setNewNumber] = useState('');
  const [newOrder, setNewOrder] = useState('1');
  const [saving, setSaving] = useState(false);

  // 🚀 نظام التنبيهات الموحد الأنيق
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  // إغلاق التمرير عند فتح نافذة التأكيد
  useEffect(() => {
    if (confirmDialog) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [confirmDialog]);

  // 🚀 جلب البيانات فقط بعد التأكد من الصلاحيات
  useEffect(() => {
    if (!isChecking) {
      fetchNumbers();
    }
  }, [isChecking]);

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      // 🚀 الاستعلام عبر العميل المركزي
      const response = await api.get('/admin/payment-numbers');
      
      const allNumbers = response.data?.data || response.data || [];
      
      // التوافقية والأمان في استخراج البيانات
      const mappedNumbers: PaymentNumber[] = allNumbers.map((n: any) => ({
        id: n.id,
        provider: n.provider,
        number: n.number,
        displayOrder: n.display_order ?? n.displayOrder ?? 1,
        isActive: n.is_active ?? n.isActive ?? false,
        createdAt: n.created_at ?? n.createdAt ?? '',
      }));

      // 🚀 ترتيب الأرقام حسب ترتيب العرض (displayOrder) لضمان دقة العرض
      mappedNumbers.sort((a, b) => a.displayOrder - b.displayOrder);

      setInstapayNumbers(mappedNumbers.filter(n => n.provider === 'instapay'));
      setVodafoneNumbers(mappedNumbers.filter(n => n.provider === 'vodafone_cash'));
    } catch (err: any) {
      showToast(err?.message || 'فشل الاتصال بالخادم لجلب الأرقام', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim() || !newOrder) {
      showToast('يرجى تعبئة جميع الحقول المطلوبة', 'error');
      return;
    }

    setSaving(true);
    try {
      // 🚀 الإرسال الآمن عبر Axios
      await api.post('/admin/payment-numbers', {
        provider: newProvider,
        number: newNumber.trim(),
        display_order: parseInt(newOrder) || 1, // حماية من القيم الفارغة
        is_active: true
      });

      showToast('تم إضافة حساب الدفع بنجاح', 'success');
      setShowAddForm(false);
      setNewNumber('');
      setNewOrder('1');
      fetchNumbers(); // تحديث القوائم فوراً
    } catch (err: any) {
      showToast(err?.message || err?.error || 'فشل الحفظ، تأكد من صحة البيانات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من حذف حساب الدفع هذا؟ الإجراء نهائي.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          // 🚀 الحذف عبر Axios
          await api.delete(`/admin/payment-numbers/${id}`);
          
          showToast('تم حذف الحساب بنجاح', 'success');
          fetchNumbers();
        } catch (err: any) {
          showToast(err?.message || err?.error || 'لا يمكن حذف حساب يمتلك سجل معاملات مالية', 'error');
        }
      }
    });
  };

  const handleToggle = async (num: PaymentNumber) => {
    try {
      // 🚀 التحديث الآمن
      await api.patch(`/admin/payment-numbers/${num.id}`, { 
        is_active: !num.isActive 
      });

      showToast('تم تحديث حالة الحساب بنجاح', 'success');
      fetchNumbers();
    } catch (err: any) {
      showToast(err?.message || 'فشل تحديث حالة الحساب من الخادم', 'error');
    }
  };

  // 🚀 شاشة التحميل الأولية لمنع وميض الواجهة
  if (isChecking || (loading && instapayNumbers.length === 0 && vodafoneNumbers.length === 0)) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <div className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="loading-state text-center flex flex-col items-center">
            <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
            <p className="text-muted font-bold text-lg">جاري تحميل قنوات الدفع المتاحة...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      <AdminSidebar />
      
      {/* 🚀 نافذة التأكيد المحسنة والاحترافية */}
      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmDialog(null)}>
          <div className="card shadow-2xl max-w-sm w-full text-center p-8 animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-5 text-error">
              <AlertTriangleIcon size={56} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 font-bold py-3 rounded-xl hover:bg-gray-50 border-gray-200">إلغاء</button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1 font-bold py-3 rounded-xl shadow-lg shadow-red-200">نعم، احذف</button>
            </div>
          </div>
        </div>
      )}

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
        <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
              <PhoneIcon size={32} className="text-primary" />
              أرقام وحسابات الدفع
            </h1>
            <p className="page-subtitle text-base mt-2">إدارة الحسابات البنكية ومحافظ الهاتف المتاحة لشحن رصيد الطلاب.</p>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className={`btn ${showAddForm ? 'btn-outline border-error text-error hover:bg-red-50' : 'btn-primary shadow-lg shadow-blue-200'} font-bold transition-all rounded-xl px-6 py-3 h-auto`}
          >
            {showAddForm ? <><XIcon size={18} /> إلغاء الإضافة</> : <><PlusIcon size={18} /> إضافة حساب جديد</>}
          </button>
        </div>

        {/* 🚀 نموذج إضافة حساب جديد */}
        {showAddForm && (
          <div className="card mb-8 animate-fade-in border-2 border-primary/20 shadow-xl shadow-blue-50/50 p-6 bg-gradient-to-b from-blue-50/50 to-white rounded-2xl">
            <h2 className="text-xl font-black mb-6 text-primary flex items-center gap-2 pb-4">
              <PlusIcon size={22} className="text-success" /> 
              إدراج قناة دفع جديدة
            </h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="form-group mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">مزود الخدمة</label>
                <select 
                  value={newProvider} 
                  onChange={(e) => setNewProvider(e.target.value as any)} 
                  className="input-field bg-white font-bold shadow-sm rounded-xl py-3 border-gray-200 w-full" 
                  dir="rtl"
                >
                  <option value="instapay">إنستاباي (InstaPay)</option>
                  <option value="vodafone_cash">فودافون كاش (Vodafone Cash)</option>
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">رقم الهاتف / المُعرّف (Username)</label>
                <input 
                  type="text" 
                  value={newNumber} 
                  // 🚀 تأمين الإدخال: إزالة أي مسافات لمنع الأخطاء أثناء نسخ الطالب للرقم
                  onChange={(e) => setNewNumber(e.target.value.replace(/\s/g, ''))} 
                  className="input-field bg-white font-mono text-lg font-bold shadow-sm rounded-xl py-3 border-gray-200 w-full" 
                  placeholder={newProvider === 'instapay' ? 'user@instapay' : '01012345678'} 
                  required 
                  dir="ltr"
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label font-bold text-gray-700 mb-2 block">ترتيب الظهور للطلاب (1, 2, 3..)</label>
                <input 
                  type="number" 
                  value={newOrder} 
                  // منع الحروف والمسافات
                  onChange={(e) => setNewOrder(e.target.value.replace(/[^0-9]/g, ''))} 
                  className="input-field bg-white font-bold text-lg shadow-sm rounded-xl py-3 border-gray-200 w-full text-center" 
                  min="1" 
                  required 
                  dir="ltr"
                />
              </div>
              <div className="col-span-full mt-2">
                <button type="submit" disabled={saving} className="btn btn-success font-bold text-base px-10 py-3.5 rounded-xl shadow-lg shadow-green-200 w-full md:w-auto">
                  {saving ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'حفظ وإضافة الحساب ✔️'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* قسم إنستاباي */}
          <div className="card shadow-sm border border-gray-200 bg-white rounded-2xl h-full flex flex-col p-6">
            <div className="flex justify-between items-center mb-6 pb-4">
              <h2 className="text-2xl font-black flex items-center gap-3 text-gray-800">
                <CreditCardIcon size={28} className="text-purple-600" />
                حسابات إنستاباي
              </h2>
              <span className="badge font-bold px-4 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' }}>
                {instapayNumbers.length} حساب
              </span>
            </div>
            
            <div className="flex flex-col gap-4 flex-1">
              {instapayNumbers.map(num => (
                <div key={num.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-purple-300 hover:shadow-md transition-all flex justify-between items-center gap-4 group">
                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-xl text-gray-900 truncate text-left font-mono tracking-wide" dir="ltr">{num.number}</div>
                    <div className="text-sm font-bold text-gray-500 mt-1.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-300 inline-block"></span> ترتيب العرض: {num.displayOrder}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => handleToggle(num)} 
                      className={`btn btn-sm font-bold rounded-lg px-4 ${num.isActive ? 'btn-success bg-green-50 text-green-700 hover:bg-green-100 border-none shadow-sm' : 'btn-outline bg-white text-gray-500 hover:bg-gray-50 border-gray-200 shadow-sm'}`}
                    >
                      {num.isActive ? <><CheckCircleIcon size={16} /> مُفعل</> : 'معطل'}
                    </button>
                    <button 
                      onClick={() => handleDelete(num.id)} 
                      className="btn btn-sm btn-outline border-red-100 text-error bg-white hover:bg-red-50 hover:border-red-200 rounded-lg px-3 shadow-sm transition-colors" 
                      title="حذف الحساب"
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {instapayNumbers.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted bg-gray-50/50 rounded-2xl">
                  <CreditCardIcon size={56} className="mb-4 text-gray-300" />
                  <p className="font-bold text-gray-500">لا توجد حسابات إنستاباي مسجلة</p>
                </div>
              )}
            </div>
          </div>

          {/* قسم فودافون كاش */}
          <div className="card shadow-sm border border-gray-200 bg-white rounded-2xl h-full flex flex-col p-6">
            <div className="flex justify-between items-center mb-6 pb-4">
              <h2 className="text-2xl font-black flex items-center gap-3 text-gray-800">
                <PhoneIcon size={28} className="text-red-600" />
                محافظ فودافون كاش
              </h2>
              <span className="badge font-bold px-4 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
                {vodafoneNumbers.length} محفظة
              </span>
            </div>
            
            <div className="flex flex-col gap-4 flex-1">
              {vodafoneNumbers.map(num => (
                <div key={num.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-red-300 hover:shadow-md transition-all flex justify-between items-center gap-4 group">
                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-xl text-red-600 tracking-widest truncate text-left font-mono" dir="ltr">{num.number}</div>
                    <div className="text-sm font-bold text-gray-500 mt-1.5 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-gray-300 inline-block"></span> ترتيب العرض: {num.displayOrder}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => handleToggle(num)} 
                      className={`btn btn-sm font-bold rounded-lg px-4 ${num.isActive ? 'btn-success bg-green-50 text-green-700 hover:bg-green-100 border-none shadow-sm' : 'btn-outline bg-white text-gray-500 hover:bg-gray-50 border-gray-200 shadow-sm'}`}
                    >
                      {num.isActive ? <><CheckCircleIcon size={16} /> مُفعل</> : 'معطل'}
                    </button>
                    <button 
                      onClick={() => handleDelete(num.id)} 
                      className="btn btn-sm btn-outline border-red-100 text-error bg-white hover:bg-red-50 hover:border-red-200 rounded-lg px-3 shadow-sm transition-colors" 
                      title="حذف المحفظة"
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {vodafoneNumbers.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 py-12 text-muted bg-gray-50/50 rounded-2xl">
                  <PhoneIcon size={56} className="mb-4 text-gray-300" />
                  <p className="font-bold text-gray-500">لا توجد محافظ فودافون كاش مسجلة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}