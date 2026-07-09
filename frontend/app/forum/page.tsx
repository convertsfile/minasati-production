'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/app/components/Navbar';
import { useRouter } from 'next/navigation';
import {
  MessageIcon,
  UserIcon,
  GraduationCapIcon,
  TrashIcon,
  ImageIcon,
  UploadIcon,
  FileTextIcon,
  ClockIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '@/app/components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ForumPost {
  id: number;
  body: string;
  image: string | null;
  authorName?: string;
  isOwn?: boolean;
  adminReply: string | null;
  adminReplyAudio?: string | null;
  adminReplyImage?: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export default function StudentForumPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [academicYear, setAcademicYear] = useState('');

  const [newBody, setNewBody] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; postId: number } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  const getToken = () => {
    return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
  };

  const fetchPosts = async (page = 1, append = false) => {
    try {
      const token = getToken();
      if (!token) return router.push('/login');

      // /api/auth/status is DEAD; use /api/auth/me. The /me endpoint returns
      // a non-standard envelope {status:"success", data:UserResource}.
      const statusRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        // Unwrap nested envelopes to reach the User object
        const user = statusData?.data?.data ?? statusData?.data ?? statusData;
        if (user && user.status === 'pending') {
          router.replace('/waiting-room');
          return;
        }
      }

      const res = await fetch(`${API_URL}/api/forum?page=${page}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        // Defensive: API may return either {data: {posts, ...}} or a flat
        // array, and `data.data.posts` can be undefined if the envelope
        // shape drifts. Always coerce to an array so downstream `posts.length`
        // / `posts.map(...)` cannot throw "Cannot read properties of
        // undefined (reading 'length')" and replace the whole page with
        // the Next.js dev error overlay.
        const fetchedPosts: ForumPost[] = Array.isArray(data?.data?.posts)
          ? data.data.posts
          : Array.isArray(data?.data)
            ? data.data
            : [];
        const pagination = data?.data?.pagination;
        const year = data?.data?.academicYear;

        if (append) {
          setPosts(prev => [...prev, ...fetchedPosts]);
        } else {
          setPosts(fetchedPosts);
        }

        if (year) {
          setAcademicYear(year);
        }

        if (pagination) {
          setCurrentPage(pagination.currentPage ?? 1);
          setLastPage(pagination.lastPage ?? 1);
        }
      } else {
        // API returned non-OK — make sure we don't leave a previous user's
        // posts in state when re-fetching from page 1.
        if (!append) setPosts([]);
      }
    } catch (err) {
      showToast('خطأ في جلب البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      showToast('الصيغ المسموحة هي JPG, PNG, WEBP فقط', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newBody.trim().length < 5) {
      showToast('نص السؤال يجب أن يكون 5 أحرف على الأقل', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = getToken();

      const formData = new FormData();
      formData.append('body', newBody);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await fetch(`${API_URL}/api/forum`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: formData,
      });

      if (res.ok) {
        showToast('تم إرسال استفسارك بنجاح!', 'success');
        setNewBody('');
        removeImage();
        fetchPosts(1, false);
      } else {
        const errorData = await res.json();
        showToast(errorData.message || 'فشل إرسال السؤال', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDialog) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/forum/${confirmDialog.postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });

      if (res.ok) {
        showToast('تم حذف السؤال بنجاح', 'success');
        setPosts(prev => prev.filter(p => p.id !== confirmDialog.postId));
      } else {
        showToast('فشل حذف السؤال', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setConfirmDialog(null);
    }
  };

  const getImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    return `${API_URL}/storage/${path}`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  return (
    <div className="page-container">
      <Navbar />

      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
        <div className={`toast-content ${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}</span>
          {toast.message}
        </div>
      </div>

      {confirmDialog && (
        <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <div className="empty-state-icon" style={{ margin: '0 auto 1rem' }}>
              <TrashIcon size={32} />
            </div>
            <h3 style={{ color: 'var(--error)', marginBottom: '1rem' }}>تأكيد الحذف</h3>
            <p className="text-muted" style={{ marginBottom: '2rem', lineHeight: '1.6' }}>هل أنت متأكد من حذف هذا السؤال؟ سيتم إخفاؤه تماماً.</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline" style={{ flex: 1 }}>إلغاء</button>
              <button onClick={handleDelete} className="btn btn-danger" style={{ flex: 1 }}>نعم، احذف</button>
            </div>
          </div>
        </div>
      )}

      <main className="page-content animate-fade-in">

        <div className="page-header" style={{ justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 className="page-title flex items-center justify-center gap-3">
              <MessageIcon size={28} />
              منتدى {academicYear || 'المنتدى الأكاديمي'}
            </h1>
            <p className="page-subtitle">اسأل، شارك، وتفاعل مع طلاب {academicYear || 'صفك'} وفريق الدعم.</p>
          </div>
        </div>

        <div className="card mb-8" style={{ borderColor: 'var(--primary)' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group mb-4">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '1.125rem' }}>اطرح سؤالك هنا:</label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                className="input-field"
                style={{ minHeight: '120px', padding: '1rem', fontSize: '1.125rem' }}
                rows={4}
                placeholder="اكتب استفسارك بوضوح، وسيتم الرد عليك في أقرب وقت..."
                required
              />
            </div>

            {imagePreview && (
              <div className="relative inline-block mb-4" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--surface)', padding: '0.5rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" style={{ maxHeight: '12rem', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }} />
                <button
                  type="button"
                  onClick={removeImage}
                  className="btn btn-danger btn-sm"
                  style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', minWidth: 'unset', width: '2rem', height: '2rem', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="حذف الصورة"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
              <div className="w-full sm:w-auto">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-outline w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <ImageIcon size={18} />
                  {imageFile ? 'تغيير الصورة' : 'إرفاق صورة'}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting || newBody.trim().length < 5}
                className="btn btn-primary w-full sm:w-auto"
                style={{ paddingInline: '2rem' }}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-white" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <UploadIcon size={18} />
                    إرسال السؤال
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {loading && (posts?.length ?? 0) === 0 ? (
          <div className="loading-state">
            <div className="spinner spinner-lg"></div>
            <p style={{ marginTop: '1rem' }}>جاري تحميل الأسئلة...</p>
          </div>
        ) : (posts?.length ?? 0) === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileTextIcon size={32} />
            </div>
            <h3>لا توجد أسئلة سابقة</h3>
            <p>كن أول من يطرح سؤالاً في المنتدى!</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="flex items-center gap-2 font-bold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <MessageIcon size={20} />
              سجّل استفساراتك
            </h3>

            {(posts ?? []).map(post => (
              <div key={post.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                <div className="p-6" style={{ backgroundColor: 'rgba(0,0,0,0.03)' }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="student-avatar" style={{ width: '2.5rem', height: '2.5rem', minWidth: '2.5rem', fontSize: '0.875rem' }}>
                        {(post.authorName || '?').charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold" style={{ color: 'var(--text-primary)', display: 'block' }}>
                          {post.isOwn ? 'أنت' : (post.authorName || 'طالب')}
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }} dir="ltr">{formatDate(post.createdAt)}</span>
                      </div>
                    </div>
                    {post.isOwn && (
                      <button onClick={() => setConfirmDialog({ visible: true, postId: post.id })} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
                        <TrashIcon size={16} />
                      </button>
                    )}
                  </div>

                  <p className="text-secondary" style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap', fontSize: '1.125rem', color: 'var(--text-primary)' }}>{post.body}</p>

                  {post.image && (
                    <div className="mt-4" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', display: 'inline-block' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getImageUrl(post.image)} alt="مرفق الطالب" style={{ maxHeight: '16rem', objectFit: 'contain' }} />
                    </div>
                  )}
                </div>

                {(post.adminReply || post.adminReplyAudio || post.adminReplyImage) ? (
                  <div style={{ padding: '1.5rem', backgroundColor: 'rgba(11, 79, 108, 0.04)', borderTop: '1px solid rgba(11, 79, 108, 0.15)', position: 'relative' }}>
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', background: 'var(--gradient-primary)' }}></div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--gradient-primary)', color: 'white', boxShadow: 'var(--shadow-md)' }}>
                        <GraduationCapIcon size={20} />
                      </div>
                      <div>
                        <span className="font-bold" style={{ color: 'var(--primary)', display: 'block' }}>فريق الدعم (الإدارة)</span>
                        {post.repliedAt && <span className="text-muted" style={{ fontSize: '0.75rem' }} dir="ltr">{formatDate(post.repliedAt)}</span>}
                      </div>
                    </div>

                    <div style={{ marginRight: '3rem' }}>
                      {post.adminReply && (
                        <p className="card-content" style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                          {post.adminReply}
                        </p>
                      )}
                      {post.adminReplyAudio && (
                        <div className="mt-3">
                          <audio controls src={getImageUrl(post.adminReplyAudio)} className="w-full" style={{ maxWidth: '28rem', height: '2.5rem' }} />
                        </div>
                      )}
                      {post.adminReplyImage && (
                        <div className="mt-3" style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)', display: 'inline-block' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={getImageUrl(post.adminReplyImage)} alt="مرفق الإدارة" style={{ maxHeight: '16rem', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="banner banner-warning" style={{ borderRadius: 0, margin: 0 }}>
                    <ClockIcon size={16} />
                    قيد الانتظار... سيتم الرد عليك قريباً.
                  </div>
                )}

              </div>
            ))}

            {currentPage < lastPage && (
              <div className="text-center pt-4">
                <button
                  onClick={() => fetchPosts(currentPage + 1, true)}
                  className="btn btn-outline"
                  style={{ borderRadius: 'var(--radius-full)', paddingInline: '2rem' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                      جاري التحميل...
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon size={18} />
                      عرض الأسئلة الأقدم
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
