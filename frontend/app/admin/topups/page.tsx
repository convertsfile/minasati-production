'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { CheckIcon, XIcon, EditIcon, ImageIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, FilterIcon } from '../../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

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
  const [loading, setLoading] = useState(true);
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'declined' | 'all'>('pending');
  const [selectedTopup, setSelectedTopup] = useState<TopupRequest | null>(null);
  
  const [modalMode, setModalMode] = useState<'approve' | 'adjust' | 'decline' | null>(null);
  
  const [processing, setProcessing] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<number | null>(null);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    fetchTopups(currentPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, currentPage]);

  const fetchTopups = async (page = 1) => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { router.push('/login'); return; }

      const response = await fetch(`${API_URL}/api/admin/wallet/topups?status=${filter}&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const json = await response.json();
        const mappedTopups = (json.data || []).map((t: any) => ({
          id: t.id,
          amount: t.amount,
          verifiedAmount: t.verified_amount,
          finalAmount: t.final_amount,
          paymentMethod: t.payment_method,
          status: t.status,
          adminNotes: t.admin_notes,
          proofImageUrl: t.proof_image_url,
          createdAt: t.created_at,
          student: {
            id: t.student?.id,
            fullName: t.student?.full_name || 'غير معروف',
            phone: t.student?.phone || '',
            walletBalance: t.student?.wallet_balance || 0,
          },
          paymentNumber: t.payment_number ? { number: t.payment_number.number, provider: t.payment_number.provider } : null,
        }));
        setTopups(mappedTopups);
        if (json.meta) setTotalPages(json.meta.last_page || 1);
      }
    } catch (error) {
      showToast('فشل جلب الطلبات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTopup) return;
    setProcessing(true);
    try {
      const token = getToken();
      const payload = {
        verified_amount: Number(selectedTopup.amount),
        admin_notes: 'تمت الموافقة المباشرة'
      };

      const response = await fetch(`${API_URL}/api/admin/wallet/topups/${selectedTopup.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast('تمت الموافقة على الطلب بنجاح', 'success');
        fetchTopups(currentPage);
        closeModal();
      } else {
        const error = await response.json();
        showToast(error.message || 'فشل في الموافقة على الطلب', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ أثناء الموافقة', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleAdjustAndApprove = async () => {
    if (!selectedTopup || !adjustAmount || adjustAmount <= 0) {
      showToast('يرجى إدخال مبلغ صحيح', 'error');
      return;
    }
    setProcessing(true);
    try {
      const token = getToken();
      const payload = {
        verified_amount: Number(adjustAmount),
        notes: adjustNotes || 'تم تعديل المبلغ من قبل الإدارة',
      };

      const response = await fetch(`${API_URL}/api/admin/wallet/topups/${selectedTopup.id}/adjust`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast('تم تعديل المبلغ واعتماده بنجاح', 'success');
        fetchTopups(currentPage);
        closeModal();
      } else {
        const error = await response.json();
        showToast(error.message || 'فشل في تعديل المبلغ', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ أثناء التعديل', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedTopup || !declineReason.trim() || declineReason.length < 10) {
      showToast('يرجى إدخال سبب الرفض (10 أحرف على الأقل)', 'error');
      return;
    }
    setProcessing(true);
    try {
      const token = getToken();
      const payload = {
        admin_notes: declineReason
      };

      const response = await fetch(`${API_URL}/api/admin/wallet/topups/${selectedTopup.id}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload), 
      });

      if (response.ok) {
        showToast('تم رفض الطلب بنجاح', 'success');
        fetchTopups(currentPage);
        closeModal();
      } else {
        const error = await response.json();
        showToast(error.message || 'فشل في رفض الطلب', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ أثناء الرفض', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const closeModal = () => {
    setSelectedTopup(null);
    setModalMode(null);
    setDeclineReason('');
    setAdjustAmount(null);
    setAdjustNotes('');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'badge badge-warning',
      approved: 'badge badge-success',
      declined: 'badge badge-error',
    };
    const labels: Record<string, string> = {
      pending: 'معلق',
      approved: 'موافق عليه',
      declined: 'مرفوض',
    };
    return <span className={styles[status] || 'badge'}>{labels[status] || status}</span>;
  };

  return (
    <div className="admin-layout relative">
      <AdminSidebar />
      
      <div className="toast-container" style={{ opacity: toast.visible ? 1 : 0 }}>
        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
          {toast.message}
        </div>
      </div>

      <div className="admin-content">
        <div className="page-header">
          <h1 className="page-title">
            <FilterIcon size={24} />
            طلبات شحن المحفظة
          </h1>
        </div>

        <div className="card p-4 mb-6 flex gap-2 flex-wrap items-center">
          {(['pending', 'approved', 'declined', 'all'] as const).map((status) => (
            <button key={status} onClick={() => { setFilter(status); setCurrentPage(1); }} className={`btn ${filter === status ? 'btn-primary' : 'btn-outline'} text-sm`}>
              {status === 'pending' ? <><ClockIcon size={14} /> معلقة</> : status === 'approved' ? <><CheckCircleIcon size={14} /> موافق عليها</> : status === 'declined' ? <><XIcon size={14} /> مرفوضة</> : 'الكل'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner spinner-lg" /></div>
        ) : topups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><CheckCircleIcon size={48} /></div>
            <h3 className="text-xl font-bold">لا توجد طلبات</h3>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>المبلغ</th>
                    <th>طريقة الدفع</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {topups.map((topup) => (
                    <tr key={topup.id}>
                      <td>
                        <span className="font-bold text-primary block">{topup.student.fullName}</span>
                        <span className="text-xs text-muted block">{topup.student.phone} | رصيد: {topup.student.walletBalance} ج</span>
                      </td>
                      <td><span className="font-bold text-success">{topup.amount} ج.م</span></td>
                      <td>
                        <span className="font-bold">{topup.paymentMethod === 'instapay' ? 'إنستا باي' : 'فودافون كاش'}</span>
                        <span className="text-xs text-muted block">{topup.paymentNumber?.number}</span>
                      </td>
                      <td>{getStatusBadge(topup.status)}</td>
                      <td>
                        <div className="flex flex-col gap-2">
                          {topup.proofImageUrl && (
                            <button onClick={() => setLightboxImage(topup.proofImageUrl)} className="btn btn-outline btn-sm flex items-center gap-1">
                              <ImageIcon size={14} />
                              الإيصال
                            </button>
                          )}
                          {topup.status === 'pending' && (
                            <div className="flex gap-1">
                              <button onClick={() => { setSelectedTopup(topup); setModalMode('approve'); }} className="btn btn-success btn-sm flex-1" title="موافقة"><CheckIcon size={16} /></button>
                              <button onClick={() => { setSelectedTopup(topup); setAdjustAmount(topup.amount); setModalMode('adjust'); }} className="btn btn-warning btn-sm flex-1" title="تعديل"><EditIcon size={16} /></button>
                              <button onClick={() => { setSelectedTopup(topup); setModalMode('decline'); }} className="btn btn-danger btn-sm flex-1" title="رفض"><XIcon size={16} /></button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-outline btn-sm">السابق</button>
                <span className="font-bold flex items-center px-4">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn btn-outline btn-sm">التالي</button>
              </div>
            )}
          </>
        )}
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={() => setLightboxImage(null)}>
          <div className="bg-white p-2 rounded-xl max-w-3xl w-[calc(100%-32px)] relative mx-4" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 left-4 text-2xl font-bold text-error bg-white rounded-full w-8 h-8 flex items-center justify-center shadow border-none cursor-pointer z-10" onClick={() => setLightboxImage(null)}><XIcon size={20} /></button>
            <img src={lightboxImage.startsWith('http') ? lightboxImage : `${API_URL}/storage/${lightboxImage}`} alt="إيصال" className="w-full max-h-[85vh] object-contain rounded-lg" />
          </div>
        </div>
      )}

      {selectedTopup && modalMode === 'approve' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={closeModal}>
          <div className="card max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-success mb-2 flex justify-center">
              <CheckCircleIcon size={48} />
            </div>
            <h3 className="text-xl font-bold mb-2">تأكيد الموافقة</h3>
            <p className="text-muted text-sm mb-6">هل أنت متأكد من الموافقة على إضافة <strong className="text-success">{selectedTopup.amount} ج.م</strong> لمحفظة الطالب <strong>{selectedTopup.student.fullName}</strong>؟</p>
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={processing} className="btn btn-success flex-1">تأكيد</button>
              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {selectedTopup && modalMode === 'adjust' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={closeModal}>
          <div className="card max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><EditIcon size={20} /> تعديل المبلغ</h3>
            <p className="text-sm text-error font-bold mb-4">المبلغ المرسل في الطلب: {selectedTopup.amount} ج.م</p>
            <div className="form-group">
              <label className="form-label">المبلغ الفعلي (بالجنيه)</label>
              <input type="number" className="input-field w-full mb-4" value={adjustAmount || ''} onChange={(e) => setAdjustAmount(parseInt(e.target.value) || null)} placeholder="أدخل المبلغ..." />
            </div>
            <div className="form-group">
              <label className="form-label">ملاحظات (اختياري)</label>
              <textarea className="input-field w-full mb-4" value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="مثال: تم خصم رسوم التحويل..." rows={2} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleAdjustAndApprove} disabled={processing || !adjustAmount} className="btn btn-success flex-1">تأكيد الاعتماد</button>
              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {selectedTopup && modalMode === 'decline' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={closeModal}>
          <div className="card max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-error mb-4 flex items-center gap-2"><XIcon size={20} /> رفض الطلب</h3>
            <div className="form-group">
              <label className="form-label">سبب الرفض (يظهر للطالب)</label>
              <textarea className="input-field w-full mb-2" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="الإيصال غير واضح، أو لم يتم استلام حوالة..." rows={4} />
            </div>
            <p className="text-xs text-muted mb-4">يجب إدخال 10 أحرف على الأقل.</p>
            <div className="flex gap-3">
              <button onClick={handleDecline} disabled={processing || declineReason.length < 10} className="btn btn-danger flex-1">تأكيد الرفض</button>
              <button onClick={closeModal} disabled={processing} className="btn btn-outline flex-1">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
