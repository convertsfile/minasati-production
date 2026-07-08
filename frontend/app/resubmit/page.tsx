"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { XIcon, FileTextIcon, ImageIcon, AlertTriangleIcon } from "../components/Icons";
import api from "@/lib/axios"; // 🚀 عميل الشبكة المركزي
import { useAuthStore } from "@/store/useAuthStore"; // 🚀 العقل المدبر

export default function ResubmitPage() {
  const router = useRouter();
  
  // 🚀 جلب البيانات ودالة تسجيل الخروج وتحديث الحالة من Zustand
  const { user, isAuthenticated, isLoading, logout, fetchUser } = useAuthStore();
  
  const [processing, setProcessing] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [image, setImage] = useState<File | null>(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  // 🚀 حارس البوابة الذكي: التحقق من حالة الطالب
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (user?.status !== 'rejected') {
        // إذا كان حسابه معلقاً (pending) أو مفعلاً (active)، يتم طرده من هذه الصفحة
        router.replace("/dashboard");
      } else {
        // جلب سبب الرفض من بيانات المستخدم (إن وُجدت) أو من التخزين المحلي كاحتياطي
        const storedReason = user?.rejectionReason || localStorage.getItem('rejection_reason');
        if (storedReason) setReason(storedReason);
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  const handleResubmit = async () => {
    if (!image) {
      showToast("يرجى اختيار صورة هوية جديدة أولاً", "error");
      return;
    }

    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append('id_image', image);

      // 🚀 إرسال الطلب عبر Axios (يتكفل بالتوكن والـ Headers تلقائياً)
      await api.post('/auth/resubmit-documents', formData);

      // تنظيف السبب من التخزين المحلي بعد النجاح
      localStorage.removeItem('rejection_reason');
      
      // 🚀 تحديث حالة المستخدم في الذاكرة لتتحول من rejected إلى pending
      await fetchUser(); 

      showToast("تم إرسال الصورة بنجاح! جاري تحويلك...", "success");
      
      setTimeout(() => {
          router.replace("/waiting-room");
      }, 1500);

    } catch (e: any) {
      // اصطياد الأخطاء من الباك إند بذكاء
      console.error("Resubmit failed", e);
      showToast(e?.message || e?.error || "حدث خطأ أثناء رفع الصورة", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("rejection_reason");
    await logout(); // 🚀 استخدام الدالة المركزية لضمان تنظيف كل شيء
    router.push("/login");
  };

  // عرض شاشة التحميل أثناء فحص الحالة
  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="loading-state" style={{ minHeight: "100vh", backgroundColor: "var(--background)" }}>
          <div className="spinner spinner-lg"></div>
        </div>
      </>
    );
  }

  // إذا لم يكن مرفوضاً (rejected)، لا تعرض الـ UI وتجنب وميض الشاشة
  if (user?.status !== 'rejected') {
    return null;
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
            <div className="banner banner-error" style={{ marginBottom: '1rem', textAlign: 'right' }}>
              <AlertTriangleIcon size={16} />
              <strong>سبب الرفض:</strong> {reason}
            </div>
          )}

          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6, fontSize: "0.95rem" }}>
            لقد تمت مراجعة طلب التسجيل الخاص بك. يرجى إرفاق صورة هوية جديدة وواضحة ليتمكن فريق الدعم من تفعيل حسابك.
          </p>

          <div className={`file-upload-zone ${image ? 'has-file' : ''}`} style={{ marginBottom: '1.5rem' }}>
            {/* 🚀 إضافة الـ label لجعل المنطقة بالكامل قابلة للنقر */}
            <label style={{ display: 'block', width: '100%', cursor: 'pointer' }}>
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
            </label>
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