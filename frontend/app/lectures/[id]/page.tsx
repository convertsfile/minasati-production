'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import SecureVideoPlayer from '@/components/SecureVideoPlayer';
import {
  ArrowRightIcon, ArrowLeftIcon, BookIcon, FileTextIcon,
  ShieldIcon, CheckIcon, AlertTriangleIcon, LockIcon,
  MonitorIcon, UploadIcon, DownloadIcon
} from '../../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface Lecture {
  id: number;
  title: string;
  description: string;
  courseId: number;
}

interface PlaybackData {
  url: string;
  watermark: string;
}

interface CourseLecture {
  id: number;
  title: string;
  isCompleted: boolean;
  hasExam: boolean;
}

export default function LecturePage() {
  const { isChecking } = useAuthGuard();
  const router = useRouter();
  const params = useParams();
  const lectureId = params.id as string;

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [playback, setPlayback] = useState<PlaybackData | null>(null);
  const [courseLectures, setCourseLectures] = useState<CourseLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [violationCount, setViolationCount] = useState(0);
  const [token, setToken] = useState<string>('');
  const [initialTime, setInitialTime] = useState<number>(0);
  const [isLectureCompleted, setIsLectureCompleted] = useState<boolean>(false);
  const [viewsCount, setViewsCount] = useState<number>(0);
  const [maxViews, setMaxViews] = useState<number | null>(null);
  
  // Homework state
  const [homeworkData, setHomeworkData] = useState<any>(null);
  const [submittingHomework, setSubmittingHomework] = useState(false);
  const [homeworkError, setHomeworkError] = useState('');

  const lastSyncTimeRef = useRef<number>(0);
  const latestProgressRef = useRef<{time: number, duration: number} | null>(null);

  useEffect(() => {
    return () => {
      if (latestProgressRef.current && token) {
        const { time, duration } = latestProgressRef.current;
        fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ watch_time: time, total_duration: duration }),
          keepalive: true
        }).catch(console.error);
      }
    };
  }, [token, lectureId]);

  useEffect(() => {
    const currentToken = getToken();

    if (!currentToken) {
      router.push('/login');
      return;
    }

    setToken(currentToken);

    const checkPendingStatus = async () => {
      try {
        const statusRes = await fetch(`${API_URL}/api/auth/status`, {
          headers: { Authorization: `Bearer ${currentToken}`, Accept: 'application/json' },
        });
        if (statusRes.status === 401) {
          document.cookie = "token=; Max-Age=0";
          localStorage.removeItem('token');
          router.replace('/login');
          return true;
        }
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.data?.status === 'pending') {
            router.replace('/waiting-room');
            return true;
          }
        }
      } catch (e) {
        console.error('Status check failed:', e);
      }
      return false;
    };

    const loadData = async () => {
      const isPending = await checkPendingStatus();
      if (isPending) return;

      try {
        const courseId = await fetchLectureDetails(currentToken);

        const promises: Promise<any>[] = [
          fetchViolationCount(currentToken),
          fetchProgress(currentToken),
          fetchLecturePlayback(currentToken),
          fetchHomeworkStatus(currentToken)
        ];

        if (courseId) {
          promises.push(fetchCourseLectures(currentToken, courseId));
        }

        await Promise.all(promises);
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId]);

  const fetchProgress = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });
      if (response.ok) {
        const res = await response.json();
        const data = res.data || res;
        setInitialTime(data.watch_time || data.watchTime || 0);
        setIsLectureCompleted(data.is_completed || data.isCompleted || false);
        setViewsCount(data.views_count || 0);
        setMaxViews(data.max_views || null);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  const fetchLecturePlayback = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/api/video/playback/${lectureId}`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });

      if (response.status === 401) {
        document.cookie = "token=; Max-Age=0";
        localStorage.removeItem('token');
        router.replace('/login');
        return;
      }
      if (response.status === 403) {
        router.replace('/dashboard');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPlayback({
          url: data.playback_url || data.playbackUrl,
          watermark: data.watermark
        });
      } else {
        let errorMsg = 'الفيديو غير متاح أو قيد المعالجة حالياً.';
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.error || errorMsg;
        } catch (e) {
            if (response.status === 403) {
                errorMsg = 'غير مصرح لك بمشاهدة هذا الفيديو. يرجى التأكد من اشتراكك في الكورس.';
            }
        }
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Failed to fetch lecture playback:', error);
      setError('حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.');
    }
  };

  const fetchLectureDetails = async (authToken: string) => {
     try {
      const response = await fetch(`${API_URL}/api/lectures/${lectureId}`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });

      if (response.status === 401) {
        document.cookie = "token=; Max-Age=0";
        localStorage.removeItem('token');
        router.replace('/login');
        return null;
      }
      if (response.status === 403) {
        router.replace('/dashboard');
        return null;
      }

      if (response.ok) {
        const data = await response.json();
        const d = data.data || data;

        const extractedCourseId = d.course_id || d.courseId || d.course?.id;

        setLecture({
          id: d.id,
          title: d.title,
          description: d.description,
          courseId: extractedCourseId,
        });
        return extractedCourseId;
      }
    } catch (error) {
      console.error('Failed to fetch lecture details:', error);
    }
    return null;
  };

  const fetchViolationCount = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/api/violations/count`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });

      if (response.ok) {
        const res = await response.json();
        const data = res.data || res;
        setViolationCount(data.fatalStrikes || data.fatal_strikes || 0);
      }
    } catch (error) {
      console.error('Failed to fetch violation count:', error);
    }
  };

  const fetchCourseLectures = async (authToken: string, courseId: number | string) => {
    try {
      const url = `${API_URL}/api/courses/lectures?course_id=${courseId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });

      if (response.ok) {
        const res = await response.json();

        const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data?.lectures) ? res.data.lectures : Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];

        const mappedList = list.map((l: any) => ({
          id: l.id,
          title: l.title,
          isCompleted: l.is_completed ?? l.isCompleted ?? false,
          hasExam: l.has_exam ?? l.hasExam ?? false,
        }));

        setCourseLectures(mappedList);
      } else {
        console.error('Server rejected the request with status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch course lectures:', error);
    }
  };

  const fetchHomeworkStatus = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/api/lectures/${lectureId}/homework/status`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setHomeworkData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch homework status:', error);
    }
  };

  const handleHomeworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const fileInput = document.getElementById('homework-file') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setHomeworkError('يرجى اختيار ملف أولاً');
      return;
    }

    setSubmittingHomework(true);
    setHomeworkError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/lectures/${lectureId}/homework/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      if (response.ok) {
        alert('تم تسليم الواجب بنجاح!');
        fetchHomeworkStatus(token);
      } else {
        const data = await response.json();
        setHomeworkError(data.message || data.error || 'فشل رفع الواجب');
      }
    } catch (err) {
      setHomeworkError('حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setSubmittingHomework(false);
    }
  };

  const handleViolation = async (violationType: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/lectures/${lectureId}/violation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ violation_type: violationType }),
      });

      if (response.ok) {
        const res = await response.json();
        const data = res.data || res;
        if (data.fatalStrikes !== undefined) setViolationCount(data.fatalStrikes);
        if (data.fatal_strikes !== undefined) setViolationCount(data.fatal_strikes);
      }
    } catch (error) {
      console.error('Failed to log violation:', error);
    }
  };

  const saveProgressToBackend = async (currentTime: number, totalDuration: number) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/lectures/${lectureId}/progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          watch_time: currentTime,
          total_duration: totalDuration
        }),
      });

      if (response.ok) {
        const res = await response.json();
        const data = res.data || res;

        if (data.is_completed) {
          setIsLectureCompleted(true);
          setCourseLectures(prev => prev.map(l => l.id.toString() === lectureId ? { ...l, isCompleted: true } : l));
        }
      }
    } catch (error) {
      console.error('فشل حفظ التقدم في السيرفر:', error);
    }
  };

  const handleVideoProgress = (currentTime: number, totalDuration: number) => {
    latestProgressRef.current = { time: currentTime, duration: totalDuration };
    const now = Date.now();
    if (now - lastSyncTimeRef.current >= 10000) {
      saveProgressToBackend(currentTime, totalDuration);
      lastSyncTimeRef.current = now;
    }
  };

  if (isChecking || loading) {
    return (
      <div className="loading-state" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)', padding: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: 500 }}>
          <div className="empty-state-icon" style={{ margin: '0 auto 1rem' }}>
            <AlertTriangleIcon size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error)', marginBottom: '1rem' }}>
            تنبيه
          </h2>
          <div className="banner banner-error" style={{ marginBottom: '1.5rem' }}>
            <AlertTriangleIcon size={16} />
            {error}
          </div>
          <button onClick={() => router.back()} className="btn btn-primary">
            <ArrowRightIcon size={16} style={{ marginInlineEnd: '0.5rem' }} />
            العودة
          </button>
        </div>
      </div>
    );
  }

  if (!playback) return null;

  const completedLecturesCount = courseLectures.filter(l => l.isCompleted).length;
  const progressPercentage = courseLectures.length > 0 ? (completedLecturesCount / courseLectures.length) * 100 : 0;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      fontFamily: 'var(--font-body)',
    }}>
      <Navbar />
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '1.5rem',
      }}>
        <header className="flex items-center justify-between mb-6">
          <button
            onClick={() => lecture?.courseId ? router.push(`/courses/${lecture.courseId}`) : router.back()}
            className="btn btn-outline"
            style={{ gap: '0.5rem', display: 'inline-flex', alignItems: 'center' }}
          >
            <ArrowRightIcon size={16} />
            العودة للكورس
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {maxViews !== null && (
              <div className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <MonitorIcon size={14} />
                مشاهداتك: {viewsCount} / {maxViews}
              </div>
            )}

            {violationCount > 0 && (
              <div className={`badge ${violationCount >= 3 ? 'badge-error' : 'badge-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <LockIcon size={14} />
                تحذيرات أمنية: {violationCount}/3
              </div>
            )}
          </div>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '1.5rem',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#000' }}>
              <div className="video-player-container">
                <SecureVideoPlayer
                  lectureId={lectureId}
                  videoUrl={playback.url}
                  token={token}
                  watermarkText={playback.watermark}
                  onViolation={handleViolation}
                  initialTime={initialTime}
                  onCompleted={() => {
                    setIsLectureCompleted(true);
                    setCourseLectures(prev => prev.map(l => l.id.toString() === lectureId ? { ...l, isCompleted: true } : l));
                  }}
                  onProgress={handleVideoProgress}
                  streamId={''}                />
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <h1 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-display)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <BookIcon size={24} />
                  {lecture?.title || 'جاري التحميل...'}
                </h1>

                {lecture?.description && (
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '1rem',
                    lineHeight: 1.7,
                  }}>
                    {lecture.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}>

                 {(() => {
                   const currentIdx = courseLectures.findIndex(l => l.id.toString() === lectureId);
                   const currentLectureData = currentIdx !== -1 ? courseLectures[currentIdx] : null;
                   const nextLecture = currentIdx !== -1 && currentIdx < courseLectures.length - 1 ? courseLectures[currentIdx + 1] : null;

                   if (currentLectureData?.hasExam) {
                     return (
                       <button
                         onClick={() => router.push(`/exams/${lectureId}`)}
                         className="btn btn-primary"
                         style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                       >
                         <FileTextIcon size={16} />
                         الانتقال لاختبار المحاضرة
                       </button>
                     );
                   }

                   if (nextLecture) {
                     return (
                       <button
                         onClick={() => router.push(`/lectures/${nextLecture.id}`)}
                         className="btn btn-outline"
                         style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                       >
                         <ArrowLeftIcon size={16} />
                         المحاضرة التالية
                       </button>
                     );
                   }

                   return null;
                 })()}

              </div>
            </div>

            <div className="banner banner-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldIcon size={20} />
              <span>
                <strong>سياسة الاستخدام الصارم:</strong> هذا الفيديو محمي بأنظمة متطورة. محاولة استخدام أدوات المطور (F12)، أو إضافات تحميل الفيديو، أو تسجيل الشاشة ستؤدي إلى إغلاق حسابك نهائياً وحظر الـ IP الخاص بك.
              </span>
            </div>

            {/* Homework Card */}
            {homeworkData && homeworkData.homework && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', background: '#1a1b26/30', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <BookIcon size={20} />
                    الواجب الدراسي: {homeworkData.homework.title}
                  </h3>
                  <a
                    href={homeworkData.homework.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <DownloadIcon size={14} />
                    تحميل ملف الواجب
                  </a>
                </div>

                {homeworkData.submission ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="font-bold">حالة تسليم الواجب:</span>
                      {homeworkData.submission.status === 'approved' && (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckIcon size={14} />
                          مقبول {homeworkData.submission.score !== null && `(${homeworkData.submission.score}%)`}
                        </span>
                      )}
                      {homeworkData.submission.status === 'pending' && (
                        <span className="badge badge-warning">قيد المراجعة</span>
                      )}
                      {homeworkData.submission.status === 'rejected' && (
                        <span className="badge badge-error">مرفوض</span>
                      )}
                    </div>

                    {homeworkData.submission.status === 'rejected' && homeworkData.submission.rejectionReason && (
                      <div className="banner banner-error" style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                        <strong>سبب الرفض:</strong> {homeworkData.submission.rejectionReason}
                      </div>
                    )}

                    {homeworkData.submission.status === 'rejected' && (
                      <form onSubmit={handleHomeworkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <label className="form-label" style={{ fontWeight: 'bold' }}>أعد رفع ملف الواجب الجديد:</label>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <input type="file" id="homework-file" accept="image/*,application/pdf" className="input-field" required />
                          <button type="submit" disabled={submittingHomework} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <UploadIcon size={16} />
                            {submittingHomework ? 'جاري الرفع...' : 'إعادة إرسال'}
                          </button>
                        </div>
                        {homeworkError && <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: 0 }}>{homeworkError}</p>}
                      </form>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleHomeworkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label className="form-label" style={{ fontWeight: 'bold' }}>قم برفع حل الواجب (صورة أو ملف PDF):</label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="file" id="homework-file" accept="image/*,application/pdf" className="input-field" required />
                      <button type="submit" disabled={submittingHomework} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <UploadIcon size={16} />
                        {submittingHomework ? 'جاري الرفع...' : 'تسليم الواجب'}
                      </button>
                    </div>
                    {homeworkError && <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: 0 }}>{homeworkError}</p>}
                  </form>
                )}
              </div>
            )}
          </div>

          <aside>
            <div className="card" style={{ position: 'sticky', top: '2rem' }}>
              <div className="card-header" style={{ border: 'none', padding: 0, marginBottom: '1rem' }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <FileTextIcon size={18} />
                  محتويات الكورس
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {courseLectures.length > 0 ? (
                  courseLectures.map((lec, index) => {
                    const isCurrent = lec.id.toString() === lectureId;
                    const isCompleted = lec.isCompleted;

                    return (
                      <button
                        key={lec.id}
                        onClick={() => {
                          if (!isCurrent) {
                             router.push(`/lectures/${lec.id}`);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.875rem',
                          background: isCurrent
                                      ? 'var(--primary)'
                                      : isCompleted
                                          ? 'rgba(16, 185, 129, 0.05)'
                                          : 'var(--background)',
                          color: isCurrent ? 'white' : 'var(--text-secondary)',
                          border: isCurrent
                                  ? 'none'
                                  : isCompleted
                                      ? '1px solid rgba(16, 185, 129, 0.3)'
                                      : '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          cursor: isCurrent ? 'default' : 'pointer',
                          textAlign: 'start',
                          transition: 'all 0.2s ease',
                          width: '100%',
                        }}
                      >
                        <span style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: isCurrent
                              ? 'rgba(255,255,255,0.2)'
                              : isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'var(--border)',
                          color: isCurrent
                              ? 'white'
                              : isCompleted ? 'var(--success)' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}>
                          {isCompleted && !isCurrent ? <CheckIcon size={14} /> : index + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: isCurrent || isCompleted ? 700 : 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {lec.title}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.875rem' }}>
                    جاري تحميل المحاضرات...
                  </p>
                )}
              </div>

              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: 'var(--background)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                 نسبة إنجازك في الكورس
                </p>
                <div className="progress-bar" style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div className="progress-bar-fill" style={{
                    width: `${progressPercentage}%`,
                    background: 'var(--success)',
                    height: '100%',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 'bold' }}>
                  {Math.round(progressPercentage)}%
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          aside > div {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}
