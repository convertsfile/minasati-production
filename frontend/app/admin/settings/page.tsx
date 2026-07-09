'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { SettingsIcon, PhoneIcon, CheckCircleIcon, AlertCircleIcon } from '../../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

export default function AdminSettingsPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const token = getToken();
      try {
        const res = await fetch(`${API_URL}/api/admin/settings`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          setWhatsappNumber(data.data?.whatsapp_number || '');
        }
      } catch (e) {
        console.error('Failed to fetch settings:', e);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ whatsapp_number: whatsappNumber }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
      } else {
        setMessage({ type: 'error', text: 'فشل حفظ الإعدادات' });
      }
    } catch {
      setMessage({ type: 'error', text: 'خطأ في الاتصال بالخادم' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content">
        <div className="page-header">
          <h1 className="page-title">
            <SettingsIcon size={28} />
            الإعدادات
          </h1>
          <p className="page-subtitle">إعدادات المنصة العامة</p>
        </div>

        <div className="card max-w-lg">
          <div className="form-group">
            <label className="form-label">
              <PhoneIcon size={16} className="inline ml-1" />
              رقم الواتساب (للطلاب المحظورين)
            </label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="201000000000"
              className="input-field w-full text-left"
              dir="ltr"
            />
            <p className="text-xs text-muted mt-2">
              هذا الرقم سيظهر للطلاب المحظورين للتواصل مع الإدارة
            </p>
          </div>

          {message && (
            <div className={`toast-content mt-4 ${message.type === 'success' ? 'toast-success' : 'toast-error'}`} style={{ position: 'relative', top: 0, left: 0, transform: 'none' }}>
              {message.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
              {message.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary w-full mt-4"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>
    </div>
  );
}
