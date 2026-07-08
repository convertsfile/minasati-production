'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuthGuard } from '../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
import api from '@/lib/axios'; // 🚀 العميل المركزي المحمي
import { CheckCircleIcon, AlertCircleIcon } from '../../components/Icons';

interface ForumPost {
  id: number;
  studentName: string;
  studentNumber: string;
  body: string;
  image: string | null;
  adminReply: string | null;
  adminReplyAudio?: string | null;
  adminReplyImage?: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export default function AdminForumPage() {
  const router = useRouter();
  
  // 🚀 درع الحماية الذكي: يمنع دخول غير الإدارة ويعرض شاشة تحميل
  const { isChecking } = useAuthGuard(['admin']);
  
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingReply, setEditingReply] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // إعدادات الميديا (الصوت والصور)
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [replyImage, setReplyImage] = useState<File | null>(null);
  
  // روابط المعاينة الآمنة (لمنع تسريب الذاكرة)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🚀 نظام التنبيهات الموحد الأنيق
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  const [confirmModal, setConfirmModal] = useState<{ id: number; type: 'post' | 'reply' } | null>(null);

  // 🚀 1. حماية الذاكرة: إنشاء ومسح الروابط المؤقتة للصوت والصورة
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioPreviewUrl(url);
      return () => URL.revokeObjectURL(url); // Cleanup
    } else {
      setAudioPreviewUrl(null);
    }
  }, [audioBlob]);

  useEffect(() => {
    if (replyImage) {
      const url = URL.createObjectURL(replyImage);
      setImagePreviewUrl(url);
      return () => URL.revokeObjectURL(url); // Cleanup
    } else {
      setImagePreviewUrl(null);
    }
  }, [replyImage]);

  // 🚀 2. حماية الذاكرة: إيقاف العداد الزمني والمايكروفون عند مغادرة الصفحة
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // دوال تسجيل الصوت
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        // 🚀 التوافقية: السماح للمتصفح باختيار الصيغة المدعومة (مثال: mp4 للسفاري، webm للكروم)
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (e) {
      showToast('لم نتمكن من الوصول للمايكروفون، تأكد من إعطاء الصلاحيات للمتصفح.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const resetMediaState = () => {
    setAudioBlob(null);
    setReplyImage(null);
    setReplyText('');
    if (isRecording) stopRecording();
  };

  // 🚀 جلب البيانات فقط بعد التأكد من الصلاحيات
  useEffect(() => {
    if (!isChecking) {
      fetchPosts(currentPage);
    }
  }, [currentPage, isChecking]);

  // إغلاق التمرير عند فتح نافذة الحذف
  useEffect(() => {
    if (confirmModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [confirmModal]);

  const fetchPosts = async (page = 1) => {
    setLoading(true);
    try {
      // 🚀 الاستعلام عبر العميل المركزي
      const response = await api.get('/admin/forum', { params: { page } });
      const data = response.data;
      
      setPosts(data?.posts || data?.data?.posts || data?.data || []);
      setTotalPages(data?.pagination?.lastPage || data?.meta?.last_page || 1);
    } catch (e: any) {
      showToast(e?.message || 'فشل تحميل المنشورات', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 دالة مركزية للتعامل مع الردود بذكاء
  const handleAction = async (postId: number, method: 'POST' | 'PUT' | 'DELETE', successMsg: string) => {
    setActionLoading(postId);
    try {
      if (method === 'DELETE') {
        // حذف الرد
        await api.delete(`/admin/forum/${postId}/reply`);
        showToast(successMsg, 'success');
        fetchPosts(currentPage);
      } else {
        // إضافة أو تعديل الرد باستخدام FormData
        const formData = new FormData();
        if (replyText) formData.append('reply', replyText);
        
        if (audioBlob) {
          const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
          formData.append('audio', audioBlob, `voice_note.${ext}`);
        }
        
        if (replyImage) formData.append('image', replyImage);
        
        // Laravel يتطلب إرسال الـ PUT كـ POST مع إرفاق _method
        if (method === 'PUT') {
          formData.append('_method', 'PUT');
        }

        const response = await api.post(`/admin/forum/${postId}/reply`, formData);
        
        showToast(successMsg, 'success');
        const updatedPost = response.data?.post || response.data;

        // تحديث الـ UI محلياً بسرعة
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              adminReply: updatedPost?.adminReply || updatedPost?.admin_reply || replyText,
              adminReplyAudio: updatedPost?.adminReplyAudio || updatedPost?.admin_reply_audio,
              adminReplyImage: updatedPost?.adminReplyImage || updatedPost?.admin_reply_image,
              repliedAt: updatedPost?.repliedAt || updatedPost?.replied_at || new Date().toISOString(),
            };
          }
          return p;
        }));
      }

      setReplyingTo(null);
      setEditingReply(null);
      resetMediaState();
    } catch (e: any) {
      showToast(e?.message || e?.error || 'فشلت العملية', 'error');
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  };

  const executeDelete = async () => {
    if (!confirmModal) return;

    if (confirmModal.type === 'reply') {
      await handleAction(confirmModal.id, 'DELETE', 'تم حذف الرد بنجاح');
      return;
    }

    setActionLoading(confirmModal.id);
    try {
      // 🚀 حذف المنشور بالكامل
      await api.delete(`/admin/forum/${confirmModal.id}`);
      showToast('تم حذف المنشور بالكامل بنجاح', 'success');
      
      // التعامل الذكي مع التصفح
      if (posts.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
      } else {
          fetchPosts(currentPage);
      }
    } catch (e: any) {
      showToast(e?.message || 'خطأ أثناء الحذف', 'error');
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  };

  // 🚀 دالة معالجة مسارات الميديا بذكاء
  const getMediaUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
    return `${baseUrl}/storage/${path}`;
  };

  if (isChecking) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="spinner spinner-lg" />
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      <AdminSidebar />
      
      {/* 🚀 نظام التنبيهات الموحد الأنيق */}
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

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmModal(null)}>
          <div className="card max-w-sm w-full mx-4 transform transition-all animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <span className="text-5xl block mb-2">⚠️</span>
              <h3 className="text-xl font-bold text-gray-900">تأكيد الحذف</h3>
              <p className="text-muted text-sm mt-2 font-medium">
                هل أنت متأكد من رغبتك في حذف هذا {confirmModal.type === 'post' ? 'المنشور بالكامل' : 'الرد'}؟ <br/> لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} disabled={actionLoading !== null} className="btn btn-outline flex-1 font-bold">إلغاء</button>
              <button onClick={executeDelete} disabled={actionLoading !== null} className="btn btn-danger flex-1 font-bold shadow-lg shadow-red-200 text-white">
                {actionLoading === confirmModal.id ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="admin-content">
        <div className="page-header mb-8">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <span className="text-2xl">📡</span>
              منتدى الاستفسارات
            </h1>
            <p className="page-subtitle">أجب على أسئلة الطلاب وتابع مشاكلهم بالصوت والصورة</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="spinner spinner-dark spinner-lg" /></div>
        ) : posts.length === 0 ? (
          <div className="card text-center p-12 border-dashed border-2 border-gray-200 bg-gray-50 rounded-2xl">
            <span className="text-6xl block mb-4 opacity-50">📭</span>
            <h3 className="text-xl font-bold text-gray-700">لا توجد استفسارات حالياً</h3>
            <p className="text-muted mt-2 font-medium">عندما يقوم الطلاب بنشر أسئلتهم، ستظهر هنا.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <div key={post.id} className="card shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl" style={{ borderInlineStart: `6px solid ${post.adminReply || post.adminReplyAudio ? '#10b981' : '#f59e0b'}` }}>
                
                {/* رأس المنشور */}
                <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0" style={{ background: 'var(--gradient-primary)' }}>
                      {post.studentName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">{post.studentName}</h4>
                      <p className="text-xs text-muted font-medium bg-gray-100 inline-block px-2 py-1 rounded-md mt-1 font-mono">
                        كود: {post.studentNumber} • {new Date(post.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 shrink-0">
                    {!post.adminReply && !post.adminReplyAudio && !post.adminReplyImage ? (
                      <button onClick={() => { setReplyingTo(post.id); setEditingReply(null); resetMediaState(); }} className="btn btn-sm btn-primary font-bold rounded-lg px-4 shadow-sm shadow-blue-100">
                        ✏️ أضف رداً
                      </button>
                    ) : (
                      <button onClick={() => { setEditingReply(post.id); setReplyingTo(null); resetMediaState(); setReplyText(post.adminReply || ''); }} className="btn btn-sm btn-outline font-bold rounded-lg px-4 border-gray-200">
                        🔄 تعديل الرد
                      </button>
                    )}
                    <button onClick={() => setConfirmModal({ id: post.id, type: 'post' })} className="btn btn-sm btn-danger text-lg px-3 hover:scale-105 transition-transform rounded-lg" title="حذف المنشور">
                      🗑️
                    </button>
                  </div>
                </div>

                {/* محتوى المنشور */}
                <div className="bg-gray-50 rounded-xl p-5 mb-4 border border-gray-100">
                  <p className="leading-relaxed whitespace-pre-wrap text-gray-800 font-medium text-sm md:text-base">{post.body}</p>
                </div>
                
                {/* الصورة المرفقة من الطالب */}
                {post.image && (
                  <div className="mb-4">
                    <a href={getMediaUrl(post.image)} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={getMediaUrl(post.image)} 
                        alt="مرفق الطالب" 
                        className="rounded-xl max-h-64 object-cover border border-gray-200 shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </a>
                  </div>
                )}

                {/* رد الإدارة المكتمل */}
                {(post.adminReply || post.adminReplyAudio || post.adminReplyImage) && editingReply !== post.id && (
                  <div className="p-5 rounded-xl bg-green-50 border border-green-200 relative overflow-hidden mt-6">
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-success"></div>
                    <div className="flex items-center gap-2 mb-4">
                       <span className="text-xl">👨‍🏫</span>
                       <p className="text-sm font-black text-success">رد الإدارة:</p>
                    </div>
                    
                    {post.adminReply && <p className="text-gray-800 whitespace-pre-wrap pl-4 mb-4 font-bold text-sm leading-relaxed">{post.adminReply}</p>}
                    
                    {post.adminReplyAudio && (
                      <div className="mb-4 pl-4">
                        <audio controls src={getMediaUrl(post.adminReplyAudio)} className="w-full max-w-md outline-none rounded-full shadow-sm" />
                      </div>
                    )}
                    
                    {post.adminReplyImage && (
                      <div className="mb-4 pl-4">
                        <a href={getMediaUrl(post.adminReplyImage)} target="_blank" rel="noopener noreferrer">
                          <img src={getMediaUrl(post.adminReplyImage)} alt="مرفق الإدارة" className="rounded-xl max-h-48 object-cover border border-gray-200 shadow-sm hover:opacity-90 transition-opacity cursor-pointer" />
                        </a>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-green-200/50">
                       <span className="text-xs text-green-700 font-bold bg-green-100/50 px-2 py-1 rounded">
                         {post.repliedAt ? `تم الرد في: ${new Date(post.repliedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'})}` : ''}
                       </span>
                       <button onClick={() => setConfirmModal({ id: post.id, type: 'reply' })} className="text-error text-xs font-bold hover:underline bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                         حذف الرد 🗑️
                       </button>
                    </div>
                  </div>
                )}

                {/* حقل إدخال الرد (وضع التعديل أو الإضافة) */}
                {(replyingTo === post.id || editingReply === post.id) && (
                  <div className="mt-6 p-6 border border-gray-200 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-fade-in relative">
                    <label className="block text-sm font-black text-primary mb-3">
                      {editingReply === post.id ? 'تعديل الرد الحالي:' : 'كتابة رد جديد:'}
                    </label>
                    
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="اكتب ردك الواضح هنا... (يمكنك أيضاً إرفاق صورة أو تسجيل صوتي)"
                      className="input-field mb-5 w-full bg-gray-50 focus:bg-white resize-y min-h-[120px] rounded-xl border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all p-4 text-sm"
                    />

                    {/* عرض الميديا قبل الرفع باستخدام الروابط الآمنة */}
                    <div className="flex flex-wrap gap-4 mb-5">
                      {audioPreviewUrl && (
                        <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl border border-gray-200 shadow-sm animate-scale-up">
                          <audio controls src={audioPreviewUrl} className="h-10 w-56 outline-none" />
                          <button onClick={() => setAudioBlob(null)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors bg-white shadow-sm" title="حذف المقطع">
                            🗑️
                          </button>
                        </div>
                      )}
                      {imagePreviewUrl && (
                        <div className="flex items-start gap-2 bg-gray-100 p-2 rounded-xl relative group border border-gray-200 shadow-sm animate-scale-up">
                          <img src={imagePreviewUrl} alt="Preview" className="h-20 w-20 object-cover rounded-lg" />
                          <button onClick={() => setReplyImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* أدوات التحكم (تسجيل، صورة، حفظ) */}
                    <div className="flex justify-between items-center flex-wrap gap-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        {isRecording ? (
                          <div className="flex items-center gap-3 text-red-600 font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                            <span className="font-mono text-lg">{Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                            <button onClick={stopRecording} className="mr-3 text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg shadow-md shadow-red-200 hover:bg-red-700 transition-colors">
                              إيقاف وحفظ
                            </button>
                          </div>
                        ) : (
                          <button onClick={startRecording} className="flex items-center gap-2 text-gray-600 hover:text-primary bg-gray-50 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-colors font-bold text-sm border border-gray-200 hover:border-blue-200" title="تسجيل ملاحظة صوتية">
                            🎤 تسجيل صوتي
                          </button>
                        )}
                        
                        <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-primary bg-gray-50 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-colors font-bold text-sm border border-gray-200 hover:border-blue-200" title="إرفاق صورة مساعدة">
                          📎 إرفاق صورة
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && setReplyImage(e.target.files[0])} />
                        </label>
                      </div>

                      <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={() => { setReplyingTo(null); setEditingReply(null); resetMediaState(); }} className="btn btn-outline flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold border-gray-200">
                          إلغاء
                        </button>
                        <button
                          onClick={() => editingReply === post.id ? handleAction(post.id, 'PUT', 'تم تحديث الرد بنجاح') : handleAction(post.id, 'POST', 'تم إرسال الرد بنجاح')}
                          disabled={actionLoading === post.id || (!replyText.trim() && !audioBlob && !replyImage)}
                          className="btn btn-primary flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm shadow-lg shadow-blue-200 font-bold"
                        >
                          {actionLoading === post.id ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : '🚀 حفظ الرد'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* أزرار التنقل بين الصفحات */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-200 inline-flex mx-auto">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-outline rounded-xl px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">
                  السابق
                </button>
                <span className="font-black text-primary px-4 bg-blue-50 py-2 rounded-xl text-sm">
                  الصفحة {currentPage} من {totalPages}
                </span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn btn-outline rounded-xl px-6 py-2 disabled:opacity-50 font-bold border-none hover:bg-gray-50">
                  التالي
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}