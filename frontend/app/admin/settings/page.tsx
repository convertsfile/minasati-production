'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 حارس البوابة
import api from '@/lib/axios'; // 🚀 العميل المركزي المحمي
import { 
  SettingsIcon, PhoneIcon, CheckCircleIcon, 
  AlertCircleIcon, ShieldIcon 
} from '../../components/Icons';

export default function AdminSettingsPage() {
  // 🚀 درع الحماية: يطرد أي شخص ليس أدمن فوراً ويعرض شاشة التحميل
  const { isChecking } = useAuthGuard(['admin']);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  useEffect(() => {
    // 🚀 لا نطلب البيانات إلا بعد التأكد من صلاحيات الأدمن
    if (!isChecking) {
      fetchSettings();
    }
  }, [isChecking]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // 🚀 استخدام العميل المركزي لجلب الإعدادات
      const response = await api.get('/admin/settings');
      
      // التوافق مع هيكل البيانات العائد من Laravel
      const data = response.data;
      setWhatsappNumber(data?.whatsapp_number || data?.whatsappNumber || '');
      
    } catch (error: any) {
      showToast(error?.message || 'فشل في جلب إعدادات المنصة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!whatsappNumber.trim()) {
      showToast('يرجى إدخال رقم الواتساب أولاً', 'error');
      return;
    }

    setSaving(true);
    try {
      // 🚀 إرسال التحديثات عبر العميل المركزي
      await api.put('/admin/settings', { 
        whatsapp_number: whatsappNumber.replace(/\s/g, '') // تنظيف المسافات
      });
      
      showToast('تم حفظ الإعدادات بنجاح', 'success');
    } catch (error: any) {
      showToast(error?.message || error?.error || 'فشل حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 🚀 منع وميض الشاشة وعرض Loader أثناء التأكد من أن المستخدم أدمن
  if (isChecking || loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content">
          <div className="loading-state">
            <div className="spinner spinner-lg" />
            <p className="mt-4 font-bold text-muted">جاري تحميل إعدادات المنصة...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      <AdminSidebar />

      {/* 🚀 نظام التنبيهات الموحد */}
      <div className={`toast-container ${toast.visible ? 'show' : ''}`} style={{ position: 'fixed', top: '2rem', left: '2rem', zIndex: 1000 }}>
        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
          {toast.message}
        </div>
      </div>

      <main className="admin-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <SettingsIcon size={28} />
              الإعدادات العامة
            </h1>
            <p className="page-subtitle">إدارة متغيرات المنصة وطرق التواصل</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* قسم إعدادات التواصل */}
          <div className="card shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-primary flex items-center justify-center">
                <PhoneIcon size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">إعدادات الدعم والتواصل</h2>
            </div>

            <div className="space-y-6">
              <div className="form-group">
                <label className="form-label font-bold text-gray-700 flex items-center gap-2">
                  رقم الواتساب (للدعم الفني)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm" dir="ltr">
                    +20
                  </span>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    placeholder="1000000000"
                    className="input-field w-full text-left font-mono text-lg bg-gray-50 focus:bg-white pl-12"
                    dir="ltr"
                  />
                </div>
                <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 rounded-lg text-primary text-sm font-medium">
                  <ShieldIcon size={16} className="mt-0.5 flex-shrink-0" />
                  <p>
                    هذا الرقم سيظهر في صفحة الطلاب المحظورين ليتمكنوا من التواصل مع الإدارة لطلب رفع الحظر أو الاستفسار.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !whatsappNumber}
                className="btn btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition-all"
              >
                {saving ? <span className="spinner spinner-light w-5 h-5 border-2" /> : 'حفظ التغييرات الآن'}
              </button>
            </div>
          </div>

          {/* قسم معلومات الباقة (استعداداً للمستقبل) */}
          <div className="card shadow-sm border border-gray-100 p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
                <ShieldIcon size={20} />
              </div>
              <h2 className="text-xl font-bold text-white">معلومات النظام</h2>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <span className="text-gray-300">نسخة المنصة</span>
                <span className="font-mono font-bold text-white">v2.0.0 Enterprise</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <span className="text-gray-300">حالة السيرفر</span>
                <span className="flex items-center gap-2 font-bold text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  متصل ومستقر
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}