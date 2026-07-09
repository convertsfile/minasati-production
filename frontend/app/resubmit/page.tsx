"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { XIcon, FileTextIcon, ImageIcon, AlertTriangleIcon } from "../components/Icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

export default function ResubmitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [image, setImage] = useState<File | null>(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    const storedReason = localStorage.getItem('rejection_reason');
    if (storedReason) setReason(storedReason);

    setLoading(false);
  }, [router]);

  const handleResubmit = async () => {
    if (!image) {
      showToast("يرجى اختيار صورة هوية جديدة أولاً", "error");
      return;
    }

    setProcessing(true);
    const token = getToken();

    try {
      const formData = new FormData();
      formData.append('id_image', image);

      const response = await fetch(`${API_URL}/api/auth/resubmit-documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        localStorage.removeItem('rejection_reason');
        showToast("تم إرسال الصورة بنجاح! جاري تحويلك...", "success");
        setTimeout(() => {
            router.push("/waiting-room");
        }, 1500);
      } else {
        const errorData = await response.json();
        showToast(errorData.message || "حدث خطأ أثناء رفع الصورة", "error");
        setProcessing(false);
      }
    } catch (e) {
      console.error("Resubmit failed", e);
      showToast("خطأ في الاتصال بالخادم", "error");
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    const token = getToken();
    if (token) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem("token");
    localStorage.removeItem("rejection_reason");
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push("/login");
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-state" style={{ minHeight: "100vh" }}>
          <div className="spinner spinner-lg"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
        <div className={`toast-content ${toast.type}`}>
          {toast.type === 'success' ? '✓' : <AlertTriangleIcon size={18} />}
          {toast.message}
        </div>
      </div>

      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--background)",
        padding: "2rem"
      }}>
        <div className="card" style={{
          maxWidth: "450px",
          width: "100%",
          padding: "2.5rem 2rem",
          textAlign: "center",
          boxShadow: "var(--shadow-xl)",
        }}>

          <div className="empty-state-icon" style={{ margin: '0 auto 1.5rem' }}>
            <XIcon size={32} style={{ color: 'var(--error)' }} />
          </div>

          <h1 style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-display)"
          }}>
            عذراً، لم يتم قبول طلبك
          </h1>

          {reason && (
            <div className="banner banner-error" style={{ marginBottom: '1rem' }}>
              <AlertTriangleIcon size={16} />
              السبب: {reason}
            </div>
          )}

          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6, fontSize: "0.95rem" }}>
            لقد تمت مراجعة طلب التسجيل الخاص بك. يرجى إرفاق صورة هوية جديدة وواضحة ليتمكن فريق الدعم من تفعيل حسابك.
          </p>

          <div className="file-upload-zone" style={{ marginBottom: '1.5rem' }}>
            <input
              type="file"
              accept="image/jpeg, image/png, image/jpg"
              style={{ display: 'none' }}
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
            {image ? (
              <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                <FileTextIcon size={32} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
                {image.name}
              </div>
            ) : (
              <div>
                <ImageIcon size={40} style={{ display: 'block', margin: '0 auto 0.5rem', color: 'var(--text-muted)' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>اضغط لاختيار صورة الهوية الجديدة</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>JPG, PNG (الحد الأقصى 5MB)</p>
              </div>
            )}
          </div>

          <button
            onClick={handleResubmit}
            disabled={processing || !image}
            className="btn btn-primary btn-block"
            style={{
              padding: "1rem",
              fontWeight: 700,
              marginBottom: "1rem",
              fontSize: "1rem"
            }}
          >
            {processing ? "جاري الرفع..." : "إعادة إرسال الطلب للمراجعة"}
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-block"
            style={{
              color: "var(--text-muted)",
            }}
          >
            تسجيل الخروج والعودة لاحقاً
          </button>
        </div>
      </div>
    </>
  );
}
