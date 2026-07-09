'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1] || localStorage.getItem('token');
};

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
  
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingReply, setEditingReply] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Media State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🚀 نظام الإشعارات البديل لـ alert
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  // 🚀 نظام مودال الحذف البديل لـ confirm
  const [confirmModal, setConfirmModal] = useState<{ id: number; type: 'post' | 'reply' } | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (e) {
      showToast('لم نتمكن من الوصول للمايكروفون', 'error');
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

  useEffect(() => {
    fetchPosts(currentPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchPosts = async (page = 1) => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { router.push('/login'); return; }

      // 🚀 تم تصحيح الرابط ليتطابق مع الكنترولر الخاص بك
      const res = await fetch(`${API_URL}/api/admin/forum?page=${page}`, {
        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
      });
      
      if (res.ok) {
        const result = await res.json();
        setPosts(result.data?.posts || []);
        if (result.data?.pagination) {
          setTotalPages(result.data.pagination.lastPage);
        }
      } else {
        showToast('فشل تحميل المنشورات', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (postId: number, method: 'POST' | 'PUT' | 'DELETE', successMsg: string) => {
    setActionLoading(postId);
    try {
      const token = getToken();
      
      let bodyData: FormData | string | null = null;
      let headersData: any = {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json'
      };

      if (method !== 'DELETE') {
        const formData = new FormData();
        if (replyText) formData.append('reply', replyText);
        if (audioBlob) formData.append('audio', audioBlob, 'voice_note.webm');
        if (replyImage) formData.append('image', replyImage);
        
        if (method === 'PUT') {
          formData.append('_method', 'PUT');
        }
        bodyData = formData;
      } else {
        headersData['Content-Type'] = 'application/json';
      }

      const fetchMethod = method === 'PUT' ? 'POST' : method;

      const res = await fetch(`${API_URL}/api/admin/forum/${postId}/reply`, {
        method: fetchMethod,
        headers: headersData,
        body: bodyData,
      });

      if (res.ok) {
        showToast(successMsg, 'success');
        setReplyingTo(null);
        setEditingReply(null);
        resetMediaState();

        if (method === 'DELETE') {
          fetchPosts(currentPage);
        } else {
          const data = await res.json();
          const updatedPost = data.data;

          setPosts(prev => prev.map(p => {
            if (p.id === postId) {
              return {
                ...p,
                adminReply: updatedPost.adminReply,
                adminReplyAudio: updatedPost.adminReplyAudio,
                adminReplyImage: updatedPost.adminReplyImage,
                repliedAt: updatedPost.repliedAt,
              };
            }
            return p;
          }));
        }
      } else {
        const error = await res.json();
        showToast(error.message || 'فشلت العملية', 'error');
      }
    } catch (e) {
      showToast('حدث خطأ أثناء الاتصال', 'error');
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

    // إذا كان الحذف لمنشور كامل
    setActionLoading(confirmModal.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/forum/${confirmModal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
      });
      if (res.ok) {
        showToast('تم حذف المنشور بنجاح', 'success');
        if (posts.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
        } else {
            fetchPosts(currentPage);
        }
      } else {
        showToast('فشل الحذف', 'error');
      }
    } catch (e) {
      showToast('خطأ أثناء الحذف', 'error');
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  };

  return (
    <div className="admin-layout relative">
      <AdminSidebar />
      
      {/* Toast Notification */}
      <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'all 0.3s ease', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
        <div style={{ padding: '0.75rem 2rem', borderRadius: '50px', fontWeight: 'bold', color: '#fff', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setConfirmModal(null)}>
          <div className="card max-w-sm w-full mx-4 transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <span className="text-5xl block mb-2">⚠️</span>
              <h3 className="text-xl font-bold text-gray-900">تأكيد الحذف</h3>
              <p className="text-muted text-sm mt-2">
                هل أنت متأكد من رغبتك في حذف هذا {confirmModal.type === 'post' ? 'المنشور بالكامل' : 'الرد'}؟ <br/> لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} disabled={actionLoading !== null} className="btn btn-outline flex-1">إلغاء</button>
              <button onClick={executeDelete} disabled={actionLoading !== null} className="btn btn-danger flex-1">
                {actionLoading === confirmModal.id ? 'جاري الحذف...' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="admin-content">
        <div className="page-header mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary mb-2">📡 منتدى الاستفسارات</h1>
            <p className="text-muted">أجب على أسئلة الطلاب وتابع مشاكلهم</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="spinner spinner-dark" /></div>
        ) : posts.length === 0 ? (
          <div className="card text-center p-12 border-dashed border-2">
            <span className="text-6xl block mb-4 opacity-50">📭</span>
            <h3 className="text-xl font-bold text-gray-700">لا توجد استفسارات حالياً</h3>
            <p className="text-muted mt-2">عندما يقوم الطلاب بنشر أسئلتهم، ستظهر هنا.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <div key={post.id} className="card shadow-sm hover:shadow-md transition-shadow" style={{ borderInlineStart: `6px solid ${post.adminReply ? '#10b981' : '#f59e0b'}` }}>
                
                {/* رأس المنشور */}
                <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner" style={{ background: 'var(--gradient-primary)' }}>
                      {post.studentName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">{post.studentName}</h4>
                      <p className="text-xs text-muted font-medium bg-gray-100 inline-block px-2 py-1 rounded-md mt-1">
                        كود: {post.studentNumber} • {new Date(post.createdAt).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {!post.adminReply && !post.adminReplyAudio && !post.adminReplyImage ? (
                      <button onClick={() => { setReplyingTo(post.id); setEditingReply(null); resetMediaState(); }} className="btn btn-sm btn-primary">
                        ✏️ أضف رداً
                      </button>
                    ) : (
                      <button onClick={() => { setEditingReply(post.id); setReplyingTo(null); resetMediaState(); setReplyText(post.adminReply || ''); }} className="btn btn-sm btn-outline">
                        🔄 تعديل الرد
                      </button>
                    )}
                    <button onClick={() => setConfirmModal({ id: post.id, type: 'post' })} className="btn btn-sm btn-danger text-lg px-3" title="حذف المنشور">
                      🗑️
                    </button>
                  </div>
                </div>

                {/* محتوى المنشور */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                  <p className="leading-relaxed whitespace-pre-wrap text-gray-800">{post.body}</p>
                </div>
                
                {/* الصورة المرفقة */}
                {post.image && (
                  <div className="mb-4">
                    <a href={post.image.startsWith('http') ? post.image : `${API_URL}/storage/${post.image}`} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={post.image.startsWith('http') ? post.image : `${API_URL}/storage/${post.image}`} 
                        alt="مرفق الطالب" 
                        className="rounded-lg max-h-64 object-cover border shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </a>
                  </div>
                )}

                {/* رد الإدارة */}
                {(post.adminReply || post.adminReplyAudio || post.adminReplyImage) && editingReply !== post.id && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-success"></div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-xl">👨‍🏫</span>
                       <p className="text-sm font-bold text-success">رد الإدارة:</p>
                    </div>
                    {post.adminReply && <p className="text-gray-800 whitespace-pre-wrap pl-4 mb-3">{post.adminReply}</p>}
                    {post.adminReplyAudio && (
                      <div className="mb-3 pl-4">
                        <audio controls src={`${API_URL}/storage/${post.adminReplyAudio}`} className="w-full max-w-md" />
                      </div>
                    )}
                    {post.adminReplyImage && (
                      <div className="mb-3 pl-4">
                        <a href={`${API_URL}/storage/${post.adminReplyImage}`} target="_blank" rel="noopener noreferrer">
                          <img src={`${API_URL}/storage/${post.adminReplyImage}`} alt="مرفق الإدارة" className="rounded-lg max-h-48 object-cover border shadow-sm hover:opacity-90 transition-opacity cursor-pointer" />
                        </a>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-green-100">
                       <span className="text-xs text-green-600/70 font-medium">
                         {post.repliedAt ? `تم الرد في: ${new Date(post.repliedAt).toLocaleDateString('ar-EG', { hour: 'numeric', minute: 'numeric'})}` : ''}
                       </span>
                       <button onClick={() => setConfirmModal({ id: post.id, type: 'reply' })} className="text-error text-xs font-bold hover:underline bg-red-50 px-2 py-1 rounded">
                         حذف الرد 🗑️
                       </button>
                    </div>
                  </div>
                )}

                {/* حقل إدخال الرد */}
                {(replyingTo === post.id || editingReply === post.id) && (
                  <div className="mt-4 p-4 border rounded-lg bg-white shadow-inner animate-fade-in">
                    <label className="block text-sm font-bold text-primary mb-2">
                      {editingReply === post.id ? 'تعديل الرد:' : 'إضافة رد جديد:'}
                    </label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="اكتب ردك الواضح هنا..."
                      className="input-field mb-3 w-full bg-gray-50 focus:bg-white"
                      rows={3}
                    />

                    {/* Media Previews */}
                    <div className="flex flex-wrap gap-4 mb-3">
                      {audioBlob && (
                        <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                          <audio controls src={URL.createObjectURL(audioBlob)} className="h-8 w-48" />
                          <button onClick={() => setAudioBlob(null)} className="text-red-500 hover:text-red-700 p-1">
                            🗑️
                          </button>
                        </div>
                      )}
                      {replyImage && (
                        <div className="flex items-start gap-2 bg-gray-100 p-2 rounded-lg relative group">
                          <img src={URL.createObjectURL(replyImage)} alt="Preview" className="h-16 w-16 object-cover rounded" />
                          <button onClick={() => setReplyImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                            ❌
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        {isRecording ? (
                          <div className="flex items-center gap-2 text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
                            <button onClick={stopRecording} className="mr-2 text-sm bg-red-500 text-white px-2 py-0.5 rounded shadow-sm hover:bg-red-600">
                              إيقاف
                            </button>
                          </div>
                        ) : (
                          <button onClick={startRecording} className="text-gray-500 hover:text-primary transition-colors" title="تسجيل صوتي">
                            🎤
                          </button>
                        )}
                        
                        <label className="cursor-pointer text-gray-500 hover:text-primary transition-colors" title="إرفاق صورة">
                          📎
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && setReplyImage(e.target.files[0])} />
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => { setReplyingTo(null); setEditingReply(null); resetMediaState(); }} className="btn btn-outline text-sm">
                          إلغاء
                        </button>
                        <button
                          onClick={() => editingReply === post.id ? handleAction(post.id, 'PUT', 'تم تحديث الرد') : handleAction(post.id, 'POST', 'تم إرسال الرد')}
                          disabled={actionLoading === post.id || (!replyText.trim() && !audioBlob && !replyImage)}
                          className="btn btn-primary text-sm shadow-md"
                        >
                          {actionLoading === post.id ? 'جاري الحفظ...' : '🚀 حفظ الرد'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 bg-white p-3 rounded-full shadow-sm border inline-flex mx-auto">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn btn-outline btn-sm rounded-full px-4 disabled:opacity-50">
                  السابق
                </button>
                <span className="font-bold text-primary px-2">الصفحة {currentPage} من {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn btn-outline btn-sm rounded-full px-4 disabled:opacity-50">
                  التالي
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}