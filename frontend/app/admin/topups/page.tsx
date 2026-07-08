'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابات
import api from '@/lib/axios'; // 🚀 العميل الذكي للشبكة
import { 
  CheckIcon, XIcon, EditIcon, ImageIcon, SearchIcon,
  AlertCircleIcon, CheckCircleIcon, ClockIcon, FilterIcon 
} from '../../components/Icons';

interface TopupRequest {
  id: number;
  amount: number;
  verifiedAmount: number | null;
  finalAmount: number;
  paymentMethod: string;
  status: string;
  adminNotes: string | null;
  proofImageUrl: string;
  createdAt: string;
  student: { id: number; fullName: string; phone: string; walletBalance: number; };
  paymentNumber: { number: string; provider: string; } | null;
}

export default function TopupsPage() {
  const router = useRouter();
  
  // 🚀 درع الحماية: يطرد أي متطفل فوراً
  const { isChecking } = useAuthGuard(['admin']);

  const [loading, setLoading] = useState(true);
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'declined' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState(''); // 🚀 شريط البحث الذكي
  const [selectedTopup, setSelectedTopup] = useState<TopupRequest | null>(null);
  
  const [modalMode, setModalMode] = useState<'approve' | 'adjust' | 'decline' | null>(null);
  
  const [processing, setProcessing] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<string>(''); // محصن ضد الـ NaN
  const [adjustNotes, setAdjustNotes] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 🚀 نظام التنبيهات الموحد العائم
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  // 🚀 تجميد التمرير عند فتح المودال أو صورة الإيصال
  useEffect(() => {
    if (modalMode || lightboxImage) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [modalMode, lightboxImage]);

  // 🚀 جلب البيانات بمجرد عبور الدرع الأمني
  useEffect(() => {
    if (!isChecking) {
      fetchTopups(currentPage);
    }
  }, [filter, currentPage, isChecking]);

  const fetchTopups = async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get('/admin/wallet/topups', {
        params: {
          status: filter === 'all' ? undefined : filter,
          page
        }
      });

      const data = response.data;
      const dataList = data?.data || data || [];
      
      const mappedTopups = dataList.map((t: any) => ({
        id: t.id,
        amount: Number(t.amount) || 0,
        verifiedAmount: t.verified_amount != null ? Number(t.verified_amount) : (t.verifiedAmount != null ? Number(t.verifiedAmount) : null),
        finalAmount: Number(t.final_amount ?? t.finalAmount) || 0,
        paymentMethod: t.payment_method ?? t.paymentMethod ?? 'غير محدد',
        status: t.status || 'pending',
        adminNotes: t.admin_notes ?? t.adminNotes ?? null,
        proofImageUrl: t.proof_image_url ?? t.proofImageUrl ?? '',
        createdAt: t.created_at ?? t.createdAt ?? new Date().toISOString(),
        student: {
          id: t.student?.id,
          fullName: t.student?.full_name ?? t.student?.fullName ?? 'طالب غير معروف',
          phone: t.student?.phone ?? '—',
          walletBalance: Number(t.student?.wallet_balance ?? t.student?.walletBalance ?? 0),
        },
        paymentNumber: t.payment_number || t.paymentNumber ? { 
          number: t.payment_number?.number ?? t.paymentNumber?.number ?? '—', 
          provider: t.payment_number?.provider ?? t.paymentNumber?.provider ?? '—' 
        } : null,
      }));
      
      setTopups(mappedTopups);
      setTotalPages(data?.meta?.last_page ?? data?.meta?.lastPage ?? 1);
    } catch (error: any) {
      showToast(error?.message || 'فشل جلب طلبات الشحن', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTopup) return;
    setProcessing(true);
    try {
      await api.post(`/admin/wallet/topups/${selectedTopup.id}/approve`, {
        verified_amount: Number(selectedTopup.amount),
        admin_notes: 'تمت الموافقة المباشرة'
      });

      showToast('تمت الموافقة على الطلب بنجاح وإضافة الرصيد', 'success');
      fetchTopups(currentPage);
      closeModal();
    } catch (error: any) {
      showToast(error?.message || error?.error || 'فشل في الموافقة على الطلب', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleAdjustAndApprove = async () => {
    const amountNum = Number(adjustAmount);
    if (!selectedTopup || isNaN(amountNum) || amountNum <= 0) {
      showToast('يرجى إدخال مبلغ صحيح أكبر من الصفر', 'error');
      return;
    }
    setProcessing(true);
    try {
      await api.post(`/admin/wallet/topups/${selectedTopup.id}/adjust`, {
        verified_amount: amountNum,
        notes: adjustNotes.trim() || 'تم تعديل المبلغ من قبل الإدارة',
      });

      showToast('تم تعديل المبلغ واعتماده بنجاح', 'success');
      fetchTopups(currentPage);
      closeModal();
    } catch (error: any) {
      showToast(error?.message || error?.error || 'فشل في تعديل المبلغ', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedTopup || !declineReason.trim() || declineReason.length < 10) {
      showToast('يرجى إدخال سبب الرفض بوضوح (10 أحرف على الأقل)', 'error');
      return;
    }
    setProcessing(true);
    try {
      await api.post(`/admin/wallet/topups/${selectedTopup.id}/decline`, {
        admin_notes: declineReason.trim()
      });

      showToast('تم رفض الطلب بنجاح', 'success');
      fetchTopups(currentPage);
      closeModal();
    } catch (error: any) {
      showToast(error?.message || error?.error || 'فشل في رفض الطلب', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const closeModal = () => {
    setSelectedTopup(null);
    setModalMode(null);
    setDeclineReason('');
    setAdjustAmount('');
    setAdjustNotes('');
  };

  // 🚀 معالجة مسارات الصور بذكاء
  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
    return `${baseUrl}/storage/${path}`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      declined: 'bg-red-50 text-red-700 border-red-200',
    };
    const labels: Record<string, string> = {
      pending: 'قيد المراجعة',
      approved: 'مكتمل',
      declined: 'مرفوض',
    };
    return (
      <span className={`px-4 py-1.5 rounded-lg text-xs font-bold border ${styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // 🚀 فلترة الطلبات محلياً للبحث السريع
  const filteredTopups = topups.filter(t => 
    (t.student.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.student.phone || '').includes(searchQuery) ||
    (t.paymentNumber?.number || '').includes(searchQuery)
  );

  if (isChecking) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <div className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="loading-state flex flex-col items-center">
            <div className="spinner spinner-primary spinner-lg mb-4" />
            <p className="text-muted font-bold text-lg">جاري تحميل المعاملات المالية...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="admin-layout relative">
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

      {/* 🚀 عارض الإيصالات (Lightbox) */}
      {lightboxImage && (
        <div className="fixed inset-0 flex items-center justify-center z-[150] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }} onClick={() => setLightboxImage(null)}>
          <div className="bg-white p-2 rounded-2xl max-w-4xl w-[calc(100%-32px)] relative mx-4 shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="absolute -top-4 -right-4 z-10">
               <button className="text-error bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg border border-red-100 cursor-pointer hover:bg-red-50 hover:scale-105 transition-all" onClick={() => setLightboxImage(null)}>
                 <XIcon size={24} />
               </button>
            </div>
            <img src={getImageUrl(lightboxImage)} alt="إيصال الدفع" className="w-full max-h-[85vh] object-contain rounded-xl" />
            <div className="text-center p-4 text-sm font-bold text-gray-500 mt-2 bg-gray-50 rounded-lg border border-gray-100">
              صورة الإيصال المرفقة من الطالب للتحقق
            </div>
          </div>
        </div>
      )}

      {/* 🚀 نافذة الموافقة المباشرة */}
      {selectedTopup && modalMode === 'approve' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={closeModal}>
          <div className="card max-w-sm w-full p-8 text-center animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
            <div className="text-success mb-5 flex justify-center bg-green-50 w-24 h-24 rounded-full items-center mx-auto border border-green-100 shadow-inner">
              <CheckCircleIcon size={56} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3">تأكيد الموافقة</h3>
            <p className="text-gray-600 text-sm mb-8 leading-relaxed font-medium">
              هل أنت متأكد من الموافقة على إضافة <strong className="text-success text-lg bg-green-50 px-2 py-0.5 rounded">{selectedTopup.amount} ج.م</strong> لمحفظة الطالب <strong className="text-gray-900">{selectedTopup.student.fullName}</strong>؟
            </p>
            <div className="flex gap-3">
              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1 font-bold rounded-xl py-3 border-gray-200 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleApprove} disabled={processing} className="btn btn-success flex-1 font-bold shadow-lg shadow-green-200 rounded-xl py-3">
                {processing ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'تأكيد وإضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 نافذة التعديل والموافقة */}
      {selectedTopup && modalMode === 'adjust' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={closeModal}>
          <div className="card max-w-md w-full p-8 animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black mb-6 text-gray-900 flex items-center gap-3 border-b border-gray-100 pb-5">
              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 flex items-center justify-center rounded-full shadow-inner"><EditIcon size={24} /></div>
              تعديل المبلغ المطلوب
            </h3>
            
            <div className="bg-red-50 text-red-800 p-5 rounded-xl mb-6 border border-red-100 flex justify-between items-center shadow-sm">
              <span className="font-bold text-sm">المبلغ المكتوب في الطلب:</span>
              <span className="font-black text-2xl tracking-tight">{selectedTopup.amount} <span className="text-sm">ج.م</span></span>
            </div>

            <div className="form-group mb-6">
              <label className="form-label font-bold text-gray-700 mb-2 block">المبلغ الفعلي المراد إضافته (بالجنيه)</label>
              <input 
                type="number" 
                className="input-field w-full text-xl font-black bg-gray-50 focus:bg-white text-center py-4 rounded-xl border-gray-200 focus:border-yellow-400 focus:ring-yellow-400 transition-all" 
                value={adjustAmount} 
                onChange={(e) => setAdjustAmount(e.target.value.replace(/[^0-9]/g, ''))} 
                placeholder="أدخل المبلغ النهائي..." 
                min="1" 
                dir="ltr"
              />
            </div>

            <div className="form-group mb-8">
              <label className="form-label font-bold text-gray-700 mb-2 block">ملاحظات الإدارة (تظهر للطالب)</label>
              <textarea 
                className="input-field w-full bg-gray-50 focus:bg-white rounded-xl border-gray-200 p-4 text-sm" 
                value={adjustNotes} 
                onChange={(e) => setAdjustNotes(e.target.value)} 
                placeholder="مثال: تم خصم 5 جنيه رسوم تحويل من البنك..." 
                rows={3} 
                style={{ resize: 'none' }} 
              />
            </div>

            <div className="flex gap-3">
              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1 font-bold py-3 rounded-xl border-gray-200 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleAdjustAndApprove} disabled={processing || !adjustAmount} className="btn btn-warning flex-[2] font-bold py-3 text-white shadow-lg shadow-yellow-200/50 rounded-xl">
                {processing ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'اعتماد المبلغ الجديد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 نافذة رفض الطلب */}
      {selectedTopup && modalMode === 'decline' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={closeModal}>
          <div className="card max-w-md w-full p-8 animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black mb-6 text-error flex items-center gap-3 border-b border-gray-100 pb-5">
              <div className="w-12 h-12 bg-red-100 text-error flex items-center justify-center rounded-full shadow-inner"><XIcon size={24} /></div>
              رفض طلب الشحن
            </h3>
            
            <div className="form-group mb-3">
              <label className="form-label font-bold text-gray-700 mb-2 block">سبب الرفض (إجباري ليظهر للطالب)</label>
              <textarea 
                className="input-field w-full bg-gray-50 focus:bg-white rounded-xl border-gray-200 p-4 text-sm" 
                value={declineReason} 
                onChange={(e) => setDeclineReason(e.target.value)} 
                placeholder="مثال: الإيصال غير واضح، أو لم يتم استلام حوالة بهذا الرقم. يرجى مراجعة الدعم الفني..." 
                rows={4} 
                style={{ resize: 'none' }} 
              />
            </div>
            
            <p className="text-xs text-red-600 font-bold mb-8 bg-red-50 p-2.5 rounded-lg inline-block border border-red-100 w-full flex items-center gap-2">
              <AlertCircleIcon size={16} /> يرجى كتابة سبب واضح لتجنب تكرار الطلب.
            </p>
            
            <div className="flex gap-3">
              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1 font-bold py-3 rounded-xl border-gray-200 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleDecline} disabled={processing || declineReason.trim().length < 10} className="btn btn-danger flex-[2] font-bold py-3 shadow-lg shadow-red-200 rounded-xl">
                 {processing ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'تأكيد الرفض النهائي'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="admin-content">
        <div className="page-header mb-8">
          <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
            <FilterIcon size={32} className="text-primary" />
            طلبات شحن المحفظة
          </h1>
          <p className="page-subtitle text-base mt-2">مراجعة الإيصالات المرسلة من الطلاب واعتمادها في النظام.</p>
        </div>

        {/* 🚀 شريط البحث والفلاتر */}
        <div className="card p-6 mb-8 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between bg-white shadow-sm border border-gray-100 rounded-2xl">
          <div className="flex gap-3 flex-wrap items-center">
            {(['pending', 'approved', 'declined', 'all'] as const).map((status) => (
              <button 
                key={status} 
                onClick={() => { setFilter(status); setCurrentPage(1); }} 
                className={`btn ${filter === status ? 'btn-primary shadow-md shadow-blue-200' : 'btn-outline border-gray-200 text-gray-600 hover:bg-gray-50'} text-sm font-bold px-5 py-2.5 rounded-xl transition-all`}
              >
                {status === 'pending' ? <><ClockIcon size={16} className={filter === 'pending' ? 'text-white' : 'text-warning'} /> قيد المراجعة</> : 
                 status === 'approved' ? <><CheckCircleIcon size={16} className={filter === 'approved' ? 'text-white' : 'text-success'} /> موافق عليها</> : 
                 status === 'declined' ? <><XIcon size={16} className={filter === 'declined' ? 'text-white' : 'text-error'} /> مرفوضة</> : 'جميع الطلبات'}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <SearchIcon size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="ابحث بالاسم أو الرقم..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pr-12 py-2.5 bg-gray-50 focus:bg-white rounded-xl border-gray-200 text-sm font-medium transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-state h-64 flex flex-col items-center justify-center">
            <div className="spinner spinner-lg mb-4 text-primary" />
            <p className="font-bold text-muted text-lg">جاري سحب الطلبات المالية...</p>
          </div>
        ) : filteredTopups.length === 0 ? (
          <div className="empty-state bg-white rounded-2xl py-20 shadow-sm">
            <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircleIcon size={48} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-black text-gray-800">صندوق الطلبات فارغ</h3>
            <p className="text-muted mt-2 font-medium max-w-sm mx-auto">لا توجد طلبات شحن تطابق حالة الفلتر أو البحث المحدد حالياً.</p>
          </div>
        ) : (
          <>
            <div className="table-container border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto w-full">
                <table className="table w-full m-0 min-w-[900px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="font-bold text-gray-700 py-5 px-6 text-right whitespace-nowrap">بيانات الطالب</th>
                      <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">المبلغ المطلوب</th>
                      <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">بوابة الدفع</th>
                      <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">الحالة والتاريخ</th>
                      <th className="font-bold text-gray-700 py-5 px-6 text-center whitespace-nowrap">إجراءات المراجعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTopups.map((topup) => (
                      <tr key={topup.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-primary font-black text-lg flex items-center justify-center shadow-inner shrink-0">
                               {topup.student.fullName.charAt(0)}
                             </div>
                             <div>
                               <span className="font-black text-gray-900 block text-base">{topup.student.fullName}</span>
                               <span className="text-sm text-gray-500 block font-mono mt-0.5 font-bold" dir="ltr">{topup.student.phone}</span>
                               <span className="text-xs font-bold text-primary bg-blue-50 px-2 py-1 rounded-md mt-1.5 inline-block border border-blue-100 shadow-sm">الرصيد الحالي: {topup.student.walletBalance} ج.م</span>
                             </div>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center align-middle">
                          <div className="flex flex-col items-center justify-center">
                            <span className={`font-black text-xl ${topup.status === 'approved' ? 'text-success' : 'text-gray-900'}`}>
                               {topup.status === 'approved' && topup.verifiedAmount ? topup.verifiedAmount : topup.amount} ج.م
                            </span>
                            {topup.status === 'approved' && topup.amount !== topup.verifiedAmount && (
                              <span className="inline-block text-xs text-muted line-through mt-1 bg-gray-100 px-2 py-0.5 rounded font-medium">كان: {topup.amount} ج</span>
                            )}
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center align-middle">
                          <span className={`font-bold text-xs px-3 py-1.5 rounded-full inline-block mb-2 shadow-sm ${topup.paymentMethod === 'instapay' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {topup.paymentMethod === 'instapay' ? 'إنستا باي ⚡' : 'فودافون كاش 🔴'}
                          </span>
                          {topup.paymentNumber && (
                            <span className="text-sm font-mono font-bold text-gray-600 block" dir="ltr">{topup.paymentNumber.number}</span>
                          )}
                        </td>
                        <td className="py-5 px-6 text-center align-middle">
                          <div className="flex flex-col items-center gap-2">
                            {getStatusBadge(topup.status)}
                            <span className="text-xs text-gray-500 font-bold bg-gray-50 px-2 py-1 rounded border border-gray-100">
                              {new Date(topup.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                            </span>
                          </div>
                        </td>
                        <td className="py-5 px-6 align-middle">
                          <div className="flex flex-col gap-2.5 max-w-[220px] mx-auto">
                            {topup.proofImageUrl ? (
                              <button 
                                onClick={() => setLightboxImage(topup.proofImageUrl)} 
                                className="btn btn-outline btn-sm flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50 text-gray-700 w-full rounded-xl py-2 font-bold shadow-sm transition-colors"
                              >
                                <ImageIcon size={16} className="text-primary" /> عرض الإيصال المرفق
                              </button>
                            ) : (
                              <span className="text-xs text-muted text-center block bg-gray-50 py-2.5 rounded-xl border border-dashed border-gray-200 font-bold">لا يوجد إيصال مرفق</span>
                            )}
                            
                            {topup.status === 'pending' && (
                              <div className="flex gap-2 w-full">
                                <button onClick={() => { setSelectedTopup(topup); setModalMode('approve'); }} className="btn btn-success flex-1 py-2 px-0 flex items-center justify-center rounded-lg shadow-sm hover:-translate-y-0.5 transition-transform" title="موافقة فورية وإضافة الرصيد"><CheckIcon size={18} /></button>
                                <button onClick={() => { setSelectedTopup(topup); setAdjustAmount(topup.amount.toString()); setModalMode('adjust'); }} className="btn btn-warning flex-1 py-2 px-0 flex items-center justify-center text-white rounded-lg shadow-sm hover:-translate-y-0.5 transition-transform" title="تعديل المبلغ المرفق"><EditIcon size={18} /></button>
                                <button onClick={() => { setSelectedTopup(topup); setModalMode('decline'); }} className="btn btn-danger flex-1 py-2 px-0 flex items-center justify-center rounded-lg shadow-sm hover:-translate-y-0.5 transition-transform" title="رفض الطلب نهائياً"><XIcon size={18} /></button>
                              </div>
                            )}

                            {topup.status !== 'pending' && topup.adminNotes && (
                              <div className="text-xs bg-yellow-50/50 p-3 rounded-xl text-gray-700 text-right border border-yellow-100/50 leading-relaxed shadow-inner">
                                <strong className="block text-gray-900 mb-1 flex items-center gap-1"><EditIcon size={12} className="text-warning" /> ملاحظة الإدارة:</strong>
                                {topup.adminNotes}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-full shadow-sm border border-gray-200 inline-flex mx-auto">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50 transition-colors">السابق</button>
                <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">الصفحة {currentPage} من {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn btn-outline rounded-full px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50 transition-colors">التالي</button>
              </div>
            )}
          </>
        )}
      </main>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </main>
  );
}