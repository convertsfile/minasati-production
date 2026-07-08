'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useAuthGuard } from '../../../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
import api from '@/lib/axios'; // 🚀 العميل الشبكي الذكي
import {
  UploadIcon, ShieldIcon, TrashIcon, FileTextIcon,
  EditIcon, CheckCircleIcon, AlertTriangleIcon, 
  XIcon, BookIcon, SparklesIcon, CheckIcon
} from '@/app/components/Icons';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

interface Lecture {
  id: number;
  title: string;
  description: string | null;
  orderIndex: number;
  isLocked: boolean;
  m3u8Path: string | null;
  videoStatus: string;
  videoDuration: number | null;
  attachments?: { id: number; fileName: string; filePath: string; }[];
}

interface Course {
  id: number;
  title: string;
}

interface GoProgress {
  phase: string;
  percent: number;
}

export default function AdminLecturesPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;

  // 🚀 درع الحماية الذكي
  const { isChecking } = useAuthGuard(['admin']);

  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  
  // States الرفع المباشر
  const [uploadingVideo, setUploadingVideo] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0); 
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  
  // State خادم التشفير (Go Encoder)
  const [goProcessingState, setGoProcessingState] = useState<Record<number, GoProgress>>({});
  
  // نظام النوافذ والإشعارات الموحد
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, message: '', type: 'info' });
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order_index: '',
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'info' }), 4000);
  }, []);

  // تجميد الشاشة للمودال
  useEffect(() => {
    if (confirmDialog) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [confirmDialog]);

  // -----------------------------------------------------------------
  // 🚀 المستشعر الحي (Real-time WebSockets) لمعرفة حالة خادم التشفير
  // -----------------------------------------------------------------
  useEffect(() => {
    if (isChecking) return;

    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
    if (!token) return;

    if (!(window as any).echoInstance) {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
      const authEndpoint = baseURL.endsWith('/api') 
        ? `${baseURL}/broadcasting/auth` 
        : `${baseURL}/api/broadcasting/auth`;

      (window as any).Pusher = Pusher;
      (window as any).echoInstance = new Echo({
        broadcaster: 'reverb',
        key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || "",
        wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || window.location.hostname || '127.0.0.1',
        wsPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT || '8081', 10),
        wssPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT || '8081', 10),
        forceTLS: false,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: authEndpoint,
        auth: {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        }
      });
    }
  }, [isChecking]);

  useEffect(() => {
    if (isChecking) return;
    
    const echo = (window as any).echoInstance;
    if (!echo) return;

    const activeChannels: string[] = [];

    lectures.forEach(lec => {
      if (['pending', 'processing', 'uploading'].includes(lec.videoStatus)) {
        const channelName = `lecture.${lec.id}`;
        
        echo.private(channelName)
          .listen('.progress.updated', (e: any) => {
            setGoProcessingState(prev => ({ 
              ...prev, 
              [lec.id]: { phase: e.phase, percent: e.percent } 
            }));

            if (e.phase === 'completed' || e.phase === 'failed') {
              fetchData(false);
            }
          })
          .error((err: any) => {
             console.error("WebSocket Auth Error for Channel:", channelName, err);
          });

        activeChannels.push(channelName);
      }
    });

    return () => {
      activeChannels.forEach(ch => echo.leave(ch));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectures, isChecking]);


  // -----------------------------------------------------------------
  // 🚀 المستشعر الصامت (Fallback Poller)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (isChecking) return;

    const hasProcessing = lectures.some(l => l.videoStatus === 'processing' || l.videoStatus === 'uploading');
    if (!hasProcessing) return;

    const poller = setInterval(() => {
      fetchData(false);
    }, 15000);

    return () => clearInterval(poller);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectures, isChecking]);


  // جلب البيانات الأساسية
  useEffect(() => {
    if (!isChecking && courseId) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isChecking]);

  const fetchData = async (showLoadingUI = true) => {
    if (showLoadingUI) setIsLoading(true);
    try {
      const [courseRes, lecturesRes] = await Promise.allSettled([
        api.get(`/admin/courses/${courseId}`),
        api.get(`/admin/courses/${courseId}/lectures`),
      ]);

      if (courseRes.status === 'fulfilled') {
        setCourse(courseRes.value.data?.data || courseRes.value.data);
      }

      if (lecturesRes.status === 'fulfilled') {
        const rawLectures = lecturesRes.value.data?.data || lecturesRes.value.data || [];
        const validLectures = Array.isArray(rawLectures) ? rawLectures : [];

        const mappedLectures: Lecture[] = validLectures.map((l: any) => ({
          id: l.id,
          title: l.title || 'محاضرة بدون عنوان',
          description: l.description,
          orderIndex: Number(l.order_index ?? l.orderIndex ?? 0),
          isLocked: l.is_locked ?? l.isLocked ?? false,
          m3u8Path: l.m3u8_path ?? l.m3u8Path ?? null,
          videoStatus: l.video_status ?? l.videoStatus ?? 'pending',
          videoDuration: l.video_duration ?? l.videoDuration ?? null,
          attachments: (Array.isArray(l.attachments) ? l.attachments : []).map((att: any) => ({
            id: att.id,
            fileName: att.file_name ?? att.fileName ?? 'ملف مرفق',
            filePath: att.file_path ?? att.filePath,
          })),
        }));
        setLectures(mappedLectures);
      }
    } catch (err: any) {
      if (showLoadingUI) showToast(err?.message || 'فشل جلب بيانات المحاضرات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedOrderIndex = parseInt(formData.order_index) || 1;
    const isDuplicateIndex = lectures.some(lecture => 
      lecture.orderIndex === parsedOrderIndex && lecture.id !== editingLecture?.id
    );

    if (isDuplicateIndex) {
      showToast('رقم الترتيب هذا مستخدم بالفعل لمحاضرة أخرى في نفس الكورس', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        order_index: parsedOrderIndex,
      };

      if (editingLecture) {
        await api.put(`/admin/lectures/${editingLecture.id}`, payload);
        showToast('تم تعديل بيانات المحاضرة بنجاح', 'success');
      } else {
        await api.post(`/admin/courses/${courseId}/lectures`, payload);
        showToast('تم إضافة المحاضرة بنجاح', 'success');
      }

      setShowForm(false); 
      setEditingLecture(null); 
      setFormData({ title: '', description: '', order_index: '' });
      fetchData(); 
    } catch (err: any) { 
      showToast(err?.message || err?.error || 'تأكد من صحة البيانات المدخلة', 'error'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // -----------------------------------------------------------------
  // 🚀 رفع الفيديو إلى السحابة المباشرة
  // -----------------------------------------------------------------
  const handleVideoUpload = async (lectureId: number, file: File) => {
    if (uploadingVideo !== null) return;
    setUploadingVideo(lectureId);
    setUploadProgress(0);

    try {
      showToast('جاري استخراج تذكرة السحابة المباشرة لتخطي السيرفر...', 'info');

      const ticketRes = await api.get(`/admin/lectures/${lectureId}/upload-ticket`);
      const presignedUrl = ticketRes.data?.data?.upload_url || ticketRes.data?.upload_url; 
      
      if (!presignedUrl) throw new Error('فشلت خوادم التخزين في إصدار رابط صالح للرفع');

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('PUT', presignedUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`رفضت السحابة استقبال الملف (كود الخطأ: ${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error('فشل الاتصال بسيرفرات التخزين السحابية (انقطاع بالشبكة)'));
        xhr.send(file);
      }).finally(() => {
        xhrRef.current = null;
      });

      setGoProcessingState(prev => ({ 
        ...prev, 
        [lectureId]: { phase: 'starting', percent: 2 } 
      }));
      setLectures(prev => prev.map(l => l.id === lectureId ? { ...l, videoStatus: 'processing' } : l));

      showToast('✅ تم النقل للسحابة بنجاح! جاري إيقاظ خادم التشفير العسكري...', 'success');

      await api.post(`/admin/lectures/${lectureId}/start-processing`);

    } catch (err: any) {
      console.error('Upload Error:', err);
      showToast(err.message || 'حدث خطأ فادح أثناء الرفع', 'error');
      setUploadingVideo(null);
      setUploadProgress(0);
      fetchData(false);
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
      await api.post(`/admin/lectures/${lectureId}/cancel-upload`);
      showToast('تم إجهاض عملية الرفع وتنظيف المخلفات من السيرفر', 'success');
      fetchData(false);
    } catch (err: any) {
      showToast('حدث خطأ أثناء تنظيف الملفات الملغاة', 'error');
      fetchData(false);
    }
  };

  const handleDeleteVideo = (lectureId: number) => {
    setConfirmDialog({
      visible: true, 
      message: '🚨 سيتم تدمير هذا الفيديو والأجزاء المشفرة الخاصة به للأبد من خوادم السحابة. هل تستمر؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/admin/lectures/${lectureId}/video`);
          showToast('تم تدمير الفيديو ومسحه من قاعدة البيانات', 'success'); 
          fetchData(false); 
        } catch (err: any) { 
          showToast(err?.message || 'فشل الاتصال بخادم الحذف', 'error'); 
        }
      }
    });
  };

  // -----------------------------------------------------------------
  // 🚀 رفع المرفقات (الحل الجذري لمشكلة الـ FormData)
  // -----------------------------------------------------------------
  const handleAttachmentUpload = async (lectureId: number, file: File) => {
    try {
      showToast('جاري رفع المرفق... يرجى الانتظار', 'info');
      
      const formData = new FormData();
      formData.append('file', file);

      // 🚀 إجبار Axios على إرسال البيانات كـ Multipart Form Data
      await api.post(`/admin/lectures/${lectureId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('تم إرفاق الملف بنجاح', 'success');
      fetchData(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err?.message || 'فشل إرفاق الملف';
      showToast(errorMsg, 'error');
    }
  };

  const handleDeleteAttachment = (lectureId: number, attachmentId: number) => {
    setConfirmDialog({
      visible: true, 
      message: 'سيتم حذف هذا الملف المرفق نهائياً. هل أنت متأكد؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/admin/lectures/${lectureId}/attachments/${attachmentId}`);
          showToast('تم حذف المرفق بنجاح', 'success'); 
          fetchData(false); 
        } catch (err: any) { 
          showToast(err?.message || 'فشل الاتصال', 'error'); 
        }
      }
    });
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      visible: true, 
      message: '⚠️ تحذير: سيتم حذف المحاضرة بالكامل، بما فيها الفيديو المدمج والاختبارات المرتبطة بها. لا يمكن التراجع عن هذا!',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/admin/lectures/${id}`);
          showToast('تم مسح المحاضرة من الكورس', 'success'); 
          fetchData(); 
        } catch (err: any) { 
          showToast(err?.message || 'حدث خطأ يمنع الحذف', 'error'); 
        }
      }
    });
  };

  const handleEditLecture = (lecture: Lecture) => {
    setEditingLecture(lecture);
    setFormData({
      title: lecture.title,
      description: lecture.description || '',
      order_index: lecture.orderIndex.toString(),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getEncodingStatusBadge = (status: string | null) => {
    if (!status || status === 'pending') return null; 
    const statusMap: Record<string, { label: string; class: string }> = {
      processing: { label: '⚙️ جاري التشفير (Go Encoder)', class: 'bg-blue-50 text-blue-700 border-blue-200' },
      ready: { label: '🛡️ تم التشفير ومحمي بالكامل', class: 'bg-green-50 text-green-700 border-green-200' },
      completed: { label: '🛡️ تم التشفير ومحمي بالكامل', class: 'bg-green-50 text-green-700 border-green-200' },
      failed: { label: '❌ فشل التشفير (راجع السيرفر)', class: 'bg-red-50 text-red-700 border-red-200' },
    };
    const mapped = statusMap[status] || { label: status, class: 'bg-gray-50 text-gray-700 border-gray-200' };
    
    return <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${mapped.class}`}>{mapped.label}</span>;
  };

  if (isChecking) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="loading-state text-center flex flex-col items-center">
             <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
             <p className="font-bold text-muted text-lg">جاري التحقق وتجهيز محرر المحاضرات...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      <AdminSidebar />
      
      {/* 🚀 نظام التنبيهات الموحد */}
      <div 
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
        style={{ 
          opacity: toast.visible ? 1 : 0, 
          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
          pointerEvents: toast.visible ? 'auto' : 'none' 
        }}
      >
        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : toast.type === 'error' ? <AlertTriangleIcon size={20} /> : <UploadIcon size={20} />}
          <span>{toast.message}</span>
        </div>
      </div>

      {/* 🚀 نافذة التأكيد المحسنة */}
      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmDialog(null)}>
          <div className="card shadow-2xl max-w-sm w-full text-center p-8 animate-scale-up border border-gray-100 bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-5 text-error">
              <AlertTriangleIcon size={56} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الإجراء الخطير</h3>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 py-3 font-bold rounded-xl border-gray-200 hover:bg-gray-50">إلغاء</button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1 py-3 font-bold shadow-lg shadow-red-200 rounded-xl text-white">نعم، نفذ فوراً</button>
            </div>
          </div>
        </div>
      )}

      <main className="admin-content">
        
        <div className="mb-6 flex">
          <button 
            onClick={() => router.push('/admin/courses')} 
            className="btn btn-outline bg-white text-gray-600 hover:text-primary hover:bg-blue-50 border-gray-200 shadow-sm rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 transition-all w-fit"
          >
            <span className="text-xl leading-none">&rarr;</span> العودة لقائمة الكورسات
          </button>
        </div>

        <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
              <BookIcon size={32} className="text-primary" /> 
              {course?.title || 'جاري التحميل...'}
            </h1>
          </div>
          <button 
            onClick={() => { setShowForm(true); setEditingLecture(null); setFormData({ title: '', description: '', order_index: (lectures.length + 1).toString() }); }} 
            className="btn btn-primary font-bold shadow-lg shadow-blue-200 rounded-xl px-6 py-3 flex items-center gap-2"
          >
            <SparklesIcon size={18} /> إضافة محاضرة جديدة
          </button>
        </div>

        {/* نموذج الإضافة/التعديل */}
        {showForm && (
           <div className="card mb-8 shadow-xl border border-blue-100 p-8 bg-gradient-to-b from-blue-50/50 to-white rounded-2xl animate-fade-in">
             <h3 className="text-xl font-black mb-6 text-primary flex items-center gap-2 border-b border-gray-100 pb-4">
               {editingLecture ? <><EditIcon size={22} /> تعديل المحاضرة: {editingLecture.title}</> : <><SparklesIcon size={22} className="text-success" /> إنشاء محاضرة جديدة (بدون فيديو مبدئياً)</>}
             </h3>
             <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="form-group md:col-span-1 mb-0">
                 <label className="form-label font-bold text-gray-700 mb-2 block">عنوان المحاضرة الرئيسي</label>
                 <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field w-full font-bold text-lg bg-white rounded-xl py-3 border-gray-200 focus:border-primary shadow-sm" required dir="rtl" placeholder="مثال: الباب الأول - الدرس الأول..." />
               </div>
               <div className="form-group md:col-span-1 mb-0">
                 <label className="form-label font-bold text-gray-700 mb-2 block">ترتيب المحاضرة (الرقم المتسلسل)</label>
                 <input type="text" value={formData.order_index} onChange={(e) => setFormData({ ...formData, order_index: e.target.value.replace(/[^0-9]/g, '') })} className="input-field w-full font-black text-primary text-xl bg-white rounded-xl py-3 border-gray-200 focus:border-primary shadow-sm" required min="1" dir="ltr" />
                 <small className="text-gray-400 text-xs mt-2 block font-bold">لا يمكن تكرار نفس الرقم لمحاضرتين متتاليتين.</small>
               </div>
               <div className="form-group col-span-full mb-0">
                 <label className="form-label font-bold text-gray-700 mb-2 block">وصف قصير (اختياري)</label>
                 <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field w-full bg-white rounded-xl p-4 border-gray-200 focus:border-primary shadow-sm" rows={3} dir="rtl" style={{ resize: 'none' }} placeholder="ملاحظات تظهر تحت الفيديو للطالب..." />
               </div>
               <div className="col-span-full flex flex-col md:flex-row gap-3 pt-6 border-t border-gray-100 mt-2">
                 <button type="submit" disabled={isLoading} className="btn btn-primary px-10 py-3.5 font-bold text-base shadow-lg shadow-blue-200 rounded-xl flex-1 md:flex-none">
                   {isLoading ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto block" /> : 'حفظ التكوين الأساسي'}
                 </button>
                 <button type="button" onClick={() => { setShowForm(false); setEditingLecture(null); }} className="btn btn-outline py-3.5 px-8 font-bold border-gray-200 hover:bg-gray-50 rounded-xl flex-1 md:flex-none">إلغاء الإغلاق</button>
               </div>
             </form>
           </div>
        )}

        {/* قائمة المحاضرات */}
        {isLoading && lectures.length === 0 ? (
          <div className="card p-16 flex justify-center border border-gray-100 bg-white rounded-2xl"><div className="spinner spinner-primary spinner-lg" /></div>
        ) : lectures.length === 0 && !showForm ? (
          <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
            <div className="empty-state-icon bg-blue-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner"><FileTextIcon size={48} className="text-primary" /></div>
            <h3 className="text-2xl font-black text-gray-800">هذا الكورس فارغ تماماً</h3>
            <p className="text-muted mt-2 font-medium mb-8 max-w-sm mx-auto">قم بإضافة الهيكل الأساسي للمحاضرات أولاً، ثم ارفع الفيديوهات المشفرة إليها.</p>
            <button onClick={() => { setShowForm(true); setFormData(f => ({ ...f, order_index: '1' })); }} className="btn btn-primary shadow-lg shadow-blue-200 rounded-xl px-6 py-3 font-bold"><SparklesIcon size={20} className="ml-2 inline" /> أضف المحاضرة رقم 1</button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {lectures.sort((a, b) => a.orderIndex - b.orderIndex).map((lecture) => {
              const isProcessingBackend = lecture.videoStatus === 'processing' || lecture.videoStatus === 'uploading';
              const isUploadingFrontend = uploadingVideo === lecture.id;
              const goState = goProcessingState[lecture.id]; 
              
              const hasVideo = lecture.videoStatus === 'completed' || lecture.videoStatus === 'ready' || !!lecture.m3u8Path;

              return (
                <div key={lecture.id} className="card bg-white border border-gray-200 shadow-sm rounded-2xl p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
                  
                  {/* الشريط الجانبي لتوضيح الحالة */}
                  <div className={`absolute top-0 right-0 w-1.5 h-full transition-colors ${hasVideo ? 'bg-green-500' : isProcessingBackend || isUploadingFrontend ? 'bg-blue-500 animate-pulse' : 'bg-orange-400 group-hover:bg-orange-500'}`}></div>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center text-2xl font-black text-gray-800 shadow-inner shrink-0">
                        {lecture.orderIndex}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-gray-900 leading-tight">{lecture.title}</h4>
                        {lecture.description && <p className="text-sm text-gray-500 font-medium mt-1.5 line-clamp-2">{lecture.description}</p>}
                      </div>
                    </div>
                    
                    {hasVideo && !isUploadingFrontend && (
                      <div className="shrink-0">{getEncodingStatusBadge(lecture.videoStatus)}</div>
                    )}
                  </div>

                  {/* شريط الرفع إلى السحابة المباشرة */}
                  {isUploadingFrontend && (
                    <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 mb-5 shadow-inner">
                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="font-bold text-blue-700 flex items-center gap-2"><UploadIcon size={18} className="animate-bounce" /> جاري نقل الملف المشفر للسحابة...</span>
                        <span className="font-black text-blue-800 text-lg">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-blue-100 h-3 rounded-full overflow-hidden mb-4 border border-blue-200">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 ease-out relative" style={{ width: `${uploadProgress}%` }}>
                           <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                      <button onClick={() => handleCancelUpload(lecture.id)} className="text-xs font-bold text-error hover:text-white bg-red-50 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 w-fit border border-red-100 hover:border-red-600">
                        <XIcon size={14} /> إيقاف الإرسال وإلغاء
                      </button>
                    </div>
                  )}

                  {/* شريط التشفير العسكري */}
                  {(isProcessingBackend || goState) && !isUploadingFrontend && !hasVideo && (
                    <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 mb-5 shadow-inner">
                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="font-bold text-emerald-800 flex items-center gap-2">
                          <ShieldIcon size={18} className={goState?.phase !== 'failed' && goState?.phase !== 'completed' ? 'animate-spin' : ''} />
                          {goState?.phase === 'starting' && 'إيقاظ خوادم التشفير العسكرية...'}
                          {goState?.phase === 'initializing' && 'تجهيز حاوية التقطيع الآمنة...'}
                          {goState?.phase === 'pulling' && 'سحب الفيديو من محطة الرفع...'}
                          {goState?.phase === 'encoding' && 'جاري التقطيع والتشفير...'}
                          {goState?.phase === 'pushing' && 'رفع الأجزاء للسحابة النهائية...'}
                          {goState?.phase === 'completed' && 'اكتمل التشفير! تحديث البيانات...'}
                          {goState?.phase === 'failed' && 'خطأ: رفض الخادم التشفير.'}
                          {!goState && 'في انتظار إشارة الخادم...'}
                        </span>
                        <span className="font-black text-emerald-700 text-lg">{Math.floor(goState?.percent || 0)}%</span>
                      </div>
                      <div className="w-full bg-emerald-100 h-3 rounded-full overflow-hidden border border-emerald-200">
                        <div 
                          className={`h-full transition-all duration-500 ease-out relative ${goState?.phase === 'failed' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`} 
                          style={{ width: `${goState?.percent || 0}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* لوحة التحكم */}
                  <div className="flex flex-wrap gap-3 mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100 items-center">
                    
                    {!hasVideo && !isProcessingBackend && !isUploadingFrontend && (
                      <label className="btn btn-sm btn-primary font-bold shadow-sm shadow-blue-200 cursor-pointer hover:-translate-y-0.5 transition-transform m-0 flex items-center gap-2 rounded-lg px-4">
                        <input type="file" accept="video/mp4,video/mov,video/avi,video/mkv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleVideoUpload(lecture.id, file); }} />
                        <UploadIcon size={16} /> <ShieldIcon size={16} /> رفع وتشفير الفيديو
                      </label>
                    )}
                    
                    {hasVideo && (
                      <button onClick={() => handleDeleteVideo(lecture.id)} className="btn btn-sm bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 font-bold flex items-center gap-1.5 transition-colors rounded-lg px-4">
                        <TrashIcon size={16} /> تدمير الفيديو المدمج
                      </button>
                    )}

                    <button 
                      onClick={() => router.push(`/admin/courses/${courseId}/exams?lecture_id=${lecture.id}`)} 
                      className="btn btn-sm btn-success font-bold flex items-center gap-1.5 shadow-sm shadow-green-100 rounded-lg px-4"
                    >
                      <FileTextIcon size={16} /> بنك الأسئلة
                    </button>
                    
                    <button onClick={() => handleEditLecture(lecture)} className="btn btn-sm btn-outline border-gray-200 hover:bg-white text-gray-700 font-bold flex items-center gap-1.5 rounded-lg px-3">
                      <EditIcon size={16} /> التكوين
                    </button>
                    
                    {/* 🚀 الحقل المحصن لرفع المرفقات */}
                    <label className="btn btn-sm btn-outline border-gray-200 hover:bg-white text-gray-700 font-bold cursor-pointer m-0 flex items-center gap-1.5 rounded-lg px-3">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" 
                        onChange={(e) => { 
                          const file = e.target.files?.[0]; 
                          if (file) {
                            handleAttachmentUpload(lecture.id, file);
                            e.target.value = ''; // 🚀 تفريغ الحقل للسماح برفع نفس الملف لاحقاً إذا فشل
                          } 
                        }} 
                      />
                      <UploadIcon size={16} /> رفع ملزمة/مرفق
                    </label>

                    <button onClick={() => handleDelete(lecture.id)} className="btn btn-sm btn-outline border-red-100 text-error hover:bg-red-50 hover:border-red-200 font-bold flex items-center gap-1.5 mr-auto md:ml-auto md:mr-0 rounded-lg px-3 transition-colors">
                      <TrashIcon size={16} /> إزالة الدرس
                    </button>
                  </div>

                  {/* قائمة المرفقات */}
                  {lecture.attachments && lecture.attachments.length > 0 && (
                    <div className="mt-5 bg-gray-50/50 p-5 rounded-xl border border-dashed border-gray-200">
                      <h5 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2 border-b border-gray-200/50 pb-3">
                        <FileTextIcon size={18} className="text-primary" /> ملازم وملفات مساعدة تابعة للدرس:
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {lecture.attachments.map(att => (
                          <div key={att.id} className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded-xl shadow-sm group hover:border-primary/40 transition-colors">
                            <span className="text-xs font-bold text-gray-800 truncate pl-2" title={att.fileName}>{att.fileName}</span>
                            <button onClick={() => handleDeleteAttachment(lecture.id, att.id)} className="text-gray-400 hover:text-white bg-gray-50 hover:bg-red-500 w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0" title="حذف الملف">
                              <TrashIcon size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </main>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}