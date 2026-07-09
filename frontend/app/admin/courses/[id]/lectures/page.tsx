'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import {
  UploadIcon, ShieldIcon, TrashIcon, FileTextIcon,
  EditIcon, ClockIcon, AlertTriangleIcon, CheckCircleIcon
} from '@/app/components/Icons';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// دالة مساعدة لتوحيد جلب التوكن
const getToken = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1] || localStorage.getItem('token');
};

interface Lecture {
  id: number;
  title: string;
  description: string | null;
  order_index: number;
  is_locked: boolean;
  m3u8_path: string | null;
  video_status: string;
  video_duration: number | null;
  attachments?: { id: number; file_name: string; file_path: string; }[];
}

interface Course {
  id: number;
  title: string;
}

interface Toast {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface GoProgress {
  phase: string;
  percent: number;
}

export default function AdminLecturesPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  
  const [uploadingVideo, setUploadingVideo] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0); 
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  
  const [goProcessingState, setGoProcessingState] = useState<Record<number, GoProgress>>({});
  
  const [toast, setToast] = useState<Toast>({ visible: false, message: '', type: 'info' });
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order_index: '',
  });



  // -----------------------------------------------------------------
  // 2. المستشعر الحي (Real-time WebSockets) لمعرفة حالة Go
  // -----------------------------------------------------------------
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // 🚀 Singleton Pattern: منع تكاثر الاتصالات عند تغيير الـ state
    if (!(window as any).echoInstance) {
      (window as any).Pusher = Pusher;
      (window as any).echoInstance = new Echo({
        broadcaster: 'reverb',
        key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || "",
        wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || window.location.hostname || '127.0.0.1',
        wsPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT || '8081', 10),
        wssPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT || '8081', 10),
        forceTLS: false,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: `${API_URL}/api/broadcasting/auth`,
        auth: {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          }
        }
      });
    }

    const echo = (window as any).echoInstance;
    const activeChannels: string[] = [];

    lectures.forEach(lec => {
      if (['pending', 'processing', 'uploading'].includes(lec.video_status)) {
        const channelName = `lecture.${lec.id}`;
        
        echo.private(channelName)
          .listen('.progress.updated', (e: any) => {
            console.log("⚡ نبضة جديدة:", e);
            
            setGoProcessingState(prev => ({ 
              ...prev, 
              [lec.id]: { phase: e.phase, percent: e.percent } 
            }));

            if (e.phase === 'completed' || e.phase === 'failed') {
              fetchData(false);
            }
          })
          .error((err: any) => {
             console.error("خطأ في قناة الاستماع المشفرة:", err);
          });

        // 🚀 إصلاح الخطأ القاتل: إضافة اسم القناة بدون بادئة (private-)
        activeChannels.push(channelName);
      }
    });

    return () => {
      // 🚀 إصلاح الخطأ القاتل: الخروج من القناة باستخدام اسمها الحقيقي
      activeChannels.forEach(ch => echo.leave(ch));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectures]);


  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // -----------------------------------------------------------------
  // 3. المستشعر الصامت (Silent Background Poller) - Bulletproof Fallback
  // -----------------------------------------------------------------
  useEffect(() => {
    const hasProcessing = lectures.some(l => l.video_status === 'processing' || l.video_status === 'uploading');
    if (!hasProcessing) return;

    const poller = setInterval(() => {
      fetchData(false); // Silent fetch, won't trigger full loading overlay
    }, 10000);

    return () => clearInterval(poller);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectures]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'info' }), 4000);
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const token = getToken();
      const [courseRes, lecturesRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/courses/${courseId}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
        fetch(`${API_URL}/api/admin/courses/${courseId}/lectures`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }),
      ]);

      if (courseRes.status === 401 || courseRes.status === 403) return router.push('/login');

      const courseData = await courseRes.json();
      const lecturesData = await lecturesRes.json();

      setCourse(courseData.data);
      setLectures(lecturesData.data || []);
    } catch (err) {
      if (showLoading) showToast('فشل جلب البيانات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedOrderIndex = parseInt(formData.order_index);
    const isDuplicateIndex = lectures.some(lecture => 
      lecture.order_index === parsedOrderIndex && lecture.id !== editingLecture?.id
    );

    if (isDuplicateIndex) {
      showToast('رقم الترتيب هذا مستخدم بالفعل لمحاضرة أخرى', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const token = getToken();
      const url = editingLecture ? `${API_URL}/api/admin/lectures/${editingLecture.id}` : `${API_URL}/api/admin/courses/${courseId}/lectures`;
      const res = await fetch(url, {
        method: editingLecture ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ ...formData, order_index: parsedOrderIndex }),
      });
      if (res.ok) {
        setShowForm(false); setEditingLecture(null); setFormData({ title: '', description: '', order_index: '' });
        fetchData(); showToast(editingLecture ? 'تم التعديل' : 'تمت الإضافة', 'success');
      } else {
          showToast('تأكد من صحة البيانات المدخلة', 'error');
      }
    } catch (err) { showToast('فشل حفظ المحاضرة', 'error'); } finally { setIsLoading(false); }
  };

  const handleVideoUpload = async (lectureId: number, file: File) => {
    if (uploadingVideo !== null) return;
    setUploadingVideo(lectureId);
    setUploadProgress(0);

    try {
      const token = getToken();
      showToast('جاري استخراج تذكرة السحابة المباشرة...', 'info');

      const ticketRes = await fetch(`${API_URL}/api/admin/lectures/${lectureId}/upload-ticket`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      
      if (!ticketRes.ok) throw new Error('فشل الحصول على تصريح السحابة');
      
      const ticketData = await ticketRes.json();
      const presignedUrl = ticketData.data?.upload_url || ticketData.upload_url; 
      
      if (!presignedUrl) throw new Error('لم يتم العثور على رابط الرفع الصالح');

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('PUT', presignedUrl, true);
        xhr.setRequestHeader('Content-Type', 'video/mp4');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`رفضت السحابة الملف (${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error('فشل الاتصال بسيرفرات السحابة'));
        xhr.send(file);
      }).finally(() => {
        xhrRef.current = null;
      });

      setGoProcessingState(prev => ({ 
        ...prev, 
        [lectureId]: { phase: 'starting', percent: 2 } 
      }));
      setLectures(prev => prev.map(l => l.id === lectureId ? { ...l, video_status: 'processing' } : l));

      showToast('تم الرفع للسحابة بنجاح! جاري إيقاظ خادم التشفير...', 'success');

      await fetch(`${API_URL}/api/admin/lectures/${lectureId}/start-processing`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });

    } catch (err: any) {
      console.error('Upload Error:', err);
      showToast(err.message || 'حدث خطأ أثناء رفع الفيديو', 'error');
    } finally {
      setUploadingVideo(null);
      setUploadProgress(0);
    }
  };

  const handleCancelUpload = async (lectureId: number) => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }

    setUploadingVideo(null);
    setUploadProgress(0);

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/lectures/${lectureId}/cancel-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        showToast('تم إلغاء الرفع وتنظيف الملفات', 'success');
        fetchData(false);
      } else {
        showToast('فشل تنظيف ملفات الرفع الملغاة من السيرفر', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالسيرفر لإلغاء الرفع', 'error');
    }
  };

  const handleDeleteVideo = (lectureId: number) => {
    setConfirmDialog({
      visible: true, message: 'سيتم تدمير هذا الفيديو للأبد. هل تستمر؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const token = getToken();
          const res = await fetch(`${API_URL}/api/admin/lectures/${lectureId}/video`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
          });
          if (res.ok) { showToast('تم تدمير الفيديو', 'success'); fetchData(false); }
        } catch (err) { showToast('فشل الاتصال', 'error'); }
      }
    });
  };

  const handleAttachmentUpload = async (lectureId: number, file: File) => {
    try {
      const token = getToken();
      showToast('جاري الرفع...', 'info');

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/api/admin/lectures/${lectureId}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        showToast('تم إرفاق الملف بنجاح', 'success');
        fetchData(false);
      } else {
        showToast('فشل إرفاق الملف', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  const handleDeleteAttachment = (lectureId: number, attachmentId: number) => {
    setConfirmDialog({
      visible: true, message: 'سيتم حذف هذا المرفق نهائياً. هل تستمر؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const token = getToken();
          const res = await fetch(`${API_URL}/api/admin/lectures/${lectureId}/attachments/${attachmentId}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
          });
          if (res.ok) { showToast('تم الحذف', 'success'); fetchData(false); }
        } catch (err) { showToast('فشل الاتصال', 'error'); }
      }
    });
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      visible: true, message: 'سيتم حذف المحاضرة بالكامل. هل تستمر؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const token = getToken();
          const res = await fetch(`${API_URL}/api/admin/lectures/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
          if (res.ok) { showToast('تم الحذف', 'success'); fetchData(); }
        } catch (err) { showToast('خطأ في الاتصال', 'error'); }
      }
    });
  };

  const handleEditLecture = (lecture: Lecture) => {
    setEditingLecture(lecture);
    setFormData({
      title: lecture.title,
      description: lecture.description || '',
      order_index: lecture.order_index.toString(),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🚀 تم تصحيح خريطة الحالات لتشمل (completed)
  const getEncodingStatusBadge = (status: string | null) => {
    if (!status || status === 'pending') return null; 
    const statusMap: Record<string, { label: string; class: string }> = {
      processing: { label: '⚙️ جاري التشفير العسكري', class: 'badge-primary' },
      ready: { label: '🛡️ جاهز ومحمي', class: 'badge-success' },
      completed: { label: '🛡️ جاهز ومحمي', class: 'badge-success' }, // إضافة حالة نجاح خادم Go
      failed: { label: '❌ فشل التشفير', class: 'badge-error' },
    };
    return statusMap[status] || { label: status, class: 'badge-secondary' };
  };

  return (
    <div className="admin-layout relative">
      <AdminSidebar />
      <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'all 0.3s', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
        <div style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {toast.message}
        </div>
      </div>
      {confirmDialog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <h3 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.25rem' }}>⚠️ تأكيد الإجراء</h3>
            <p style={{ marginBottom: '1.5rem', lineHeight: '1.5' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={confirmDialog.onConfirm} className="btn btn-danger">نعم، نفذ</button>
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <main className="admin-content">
        <div className="page-header">
          <div>
            <button onClick={() => router.push('/admin/courses')} className="back-link">← العودة للكورسات</button>
            <h1 className="page-title" dir="rtl">{course?.title}</h1>
          </div>
          <button onClick={() => { setShowForm(true); setEditingLecture(null); setFormData({ title: '', description: '', order_index: (lectures.length + 1).toString() }); }} className="btn btn-primary">+ إضافة محاضرة</button>
        </div>

        {showForm && (
           <div className="card">
           <form onSubmit={handleSubmit} className="form-grid">
             <div className="form-group"><label className="form-label">عنوان المحاضرة</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field" required dir="rtl" /></div>
             <div className="form-group"><label className="form-label">ترتيب المحاضرة</label><input type="number" value={formData.order_index} onChange={(e) => setFormData({ ...formData, order_index: e.target.value })} className="input-field" required min="1" /></div>
             <div className="form-actions"><button type="submit" disabled={isLoading} className="btn btn-primary">حفظ</button><button type="button" onClick={() => { setShowForm(false); setEditingLecture(null); }} className="btn btn-outline">إلغاء</button></div>
           </form>
         </div>
        )}

        <div className="lectures-list">
          {lectures.sort((a, b) => a.order_index - b.order_index).map((lecture) => {
            const statusBadge = getEncodingStatusBadge(lecture.video_status);
            const isProcessingBackend = lecture.video_status === 'processing' || lecture.video_status === 'uploading';
            const isUploadingFrontend = uploadingVideo === lecture.id;
            const goState = goProcessingState[lecture.id]; 
            
            // 🚀 الحل الجذري: تحديد وجود الفيديو من خلال الحالة وليس فقط الـ M3U8 Path
            const hasVideo = lecture.video_status === 'completed' || lecture.video_status === 'ready' || !!lecture.m3u8_path;

            return (
              <div key={lecture.id} className="lecture-card">
                <div className="lecture-header">
                  <div className="lecture-number">{lecture.order_index}</div>
                  <div className="lecture-info">
                    <h4 className="lecture-title">{lecture.title}</h4>
                  </div>
                </div>

                {isUploadingFrontend && (
                  <div className="upload-progress mt-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: '600', color: '#3b82f6' }}>🚀 جاري نقل الملف للسحابة مباشرة...</span>
                      <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{uploadProgress}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: '8px', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                      <div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, backgroundColor: '#3b82f6', height: '100%', transition: 'width 1s linear' }} />
                    </div>
                    <button
                      onClick={() => handleCancelUpload(lecture.id)}
                      className="btn btn-sm btn-outline"
                      style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
                    >
                      ❌ إلغاء الرفع
                    </button>
                  </div>
                )}

                {(isProcessingBackend || goState) && !isUploadingFrontend && !hasVideo && (
                  <div className="upload-progress mt-4" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: '600', color: '#059669' }}>
                        {goState?.phase === 'starting' && '🚀 جاري إيقاظ خوادم التشفير...'}
                        {goState?.phase === 'initializing' && '⚙️ جاري تجهيز بيئة العمل المعزولة...'}
                        {goState?.phase === 'pulling' && '📥 جاري سحب الفيديو من السحابة...'}
                        {goState?.phase === 'encoding' && '🔒 جاري تقطيع وتشفير الفيديو (AES-128)...'}
                        {goState?.phase === 'pushing' && '☁️ جاري رفع الأجزاء المشفرة للسحابة...'}
                        {goState?.phase === 'completed' && '✅ اكتمل التشفير بنجاح!'}
                        {goState?.phase === 'failed' && '❌ حدث خطأ فادح أثناء التشفير!'}
                        {!goState && '⏳ في انتظار الاستجابة...'}
                      </span>
                      <span style={{ fontWeight: 'bold', color: '#10b981' }}>
                        {Math.floor(goState?.percent || 0)}%
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: '8px', backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        className="progress-bar-fill" 
                        style={{ 
                          width: `${goState?.percent || 0}%`, 
                          backgroundColor: goState?.phase === 'failed' ? '#ef4444' : '#10b981', 
                          height: '100%',
                          transition: 'width 1s linear' 
                        }} 
                      />
                    </div>
                  </div>
                )}

                {hasVideo && !isUploadingFrontend && statusBadge && (
                  <div className="video-status mt-4">
                    <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
                  </div>
                )}

                <div className="lecture-actions mt-4" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  
                  {!hasVideo && !isProcessingBackend && !isUploadingFrontend && (
                    <label className="upload-btn" style={{ cursor: 'pointer', margin: 0 }}>
                      <input type="file" accept="video/mp4,video/mov,video/avi,video/mkv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleVideoUpload(lecture.id, file); }} />
                      <span className="btn btn-sm btn-primary flex items-center gap-1"><UploadIcon size={14} /><ShieldIcon size={14} /> رفع وتشفير الفيديو</span>
                    </label>
                  )}
                  
                  {hasVideo && (
                    <button onClick={() => handleDeleteVideo(lecture.id)} className="btn btn-sm btn-danger flex items-center gap-1"><TrashIcon size={14} /> تدمير الفيديو</button>
                  )}

                  {hasVideo && (
                    <button 
                      onClick={() => router.push(`/admin/courses/${courseId}/exams?lecture_id=${lecture.id}`)} 
                      className="btn btn-sm btn-success flex items-center gap-1"
                    >
                      <FileTextIcon size={14} /> إدارة الاختبارات
                    </button>
                  )}
                  
                  <button onClick={() => handleEditLecture(lecture)} className="btn btn-sm btn-outline flex items-center gap-1"><EditIcon size={14} /> تعديل</button>
                  
                  <label className="btn btn-sm btn-outline flex items-center gap-1" style={{ cursor: 'pointer', margin: 0 }}>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAttachmentUpload(lecture.id, file); }} />
                    <UploadIcon size={14} /> إرفاق ملف
                  </label>

                  <button onClick={() => handleDelete(lecture.id)} className="btn btn-sm btn-outline flex items-center gap-1" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}><TrashIcon size={14} /> حذف</button>
                </div>

                {lecture.attachments && lecture.attachments.length > 0 && (
                  <div className="attachments-list mt-3" style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 'bold' }} className="flex items-center gap-1"><FileTextIcon size={14} /> المرفقات:</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {lecture.attachments.map(att => (
                        <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)', padding: '0.5rem', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{att.file_name}</span>
                          <button onClick={() => handleDeleteAttachment(lecture.id, att.id)} className="btn btn-sm flex items-center gap-1" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444', backgroundColor: 'transparent', border: '1px solid #ef4444', cursor: 'pointer' }}><TrashIcon size={12} /> حذف</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}