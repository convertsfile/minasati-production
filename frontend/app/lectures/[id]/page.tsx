// app/lectures/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { useAuthGuard } from '@/app/hooks/useAuthGuard';
import SecureVideoPlayer from '@/components/SecureVideoPlayer';
import api from '@/lib/axios'; // 🚀 الاعتماد الكلي على Axios
import {
  ArrowRightIcon, ArrowLeftIcon, BookIcon, FileTextIcon,
  ShieldIcon, CheckIcon, AlertTriangleIcon, LockIcon,
  MonitorIcon, UploadIcon, DownloadIcon, CheckCircleIcon
} from '@/app/components/Icons';

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
  
  const [streamId] = useState(() => Math.random().toString(36).substring(2, 15) + Date.now().toString(36));
  
  const [initialTime, setInitialTime] = useState<number>(0);
  const [isLectureCompleted, setIsLectureCompleted] = useState<boolean>(false);
  const [viewsCount, setViewsCount] = useState<number>(0);
  const [maxViews, setMaxViews] = useState<number | null>(null);
  
  const [homeworkData, setHomeworkData] = useState<any>(null);
  const [submittingHomework, setSubmittingHomework] = useState(false);
  const [homeworkError, setHomeworkError] = useState('');

  const lastSyncTimeRef = useRef<number>(0);
  const latestProgressRef = useRef<{time: number, duration: number} | null>(null);

  // تحديث التقدم عند مغادرة الصفحة
  useEffect(() => {
    return () => {
      if (latestProgressRef.current) {
        const { time, duration } = latestProgressRef.current;
        api.post(`/lectures/${lectureId}/progress`, { 
          watch_time: time, 
          total_duration: duration, 
          stream_id: streamId 
        }).catch(() => {});
      }
    };
  }, [lectureId, streamId]);

  useEffect(() => {
    // 🚀 استخراج التوكن لتمريره إلى مشغل الفيديو الذي يعتمد على XHR داخلي
    const currentToken = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
    
    if (!currentToken) {
      router.push('/login');
      return;
    }
    setToken(currentToken);

    const loadData = async () => {
      try {
        // 🚀 كل الاستدعاءات أصبحت بـ Axios بدون إضافة /api وبدون Header يدوي
        const courseId = await fetchLectureDetails();
        const promises = [
          fetchViolationCount(),
          fetchProgress(),
          fetchLecturePlayback(),
          fetchHomeworkStatus()
        ];

        if (courseId) {
          promises.push(fetchCourseLectures(courseId));
        }

        await Promise.all(promises);
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setLoading(false);
      }
    };

    if (!isChecking) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId, isChecking]);

  const fetchProgress = async () => {
    try {
      const response = await api.get(`/lectures/${lectureId}/progress`);
      const data = response.data?.data || response.data;
      setInitialTime(data?.watchTime ?? data?.watch_time ?? 0);
      setIsLectureCompleted(data?.isCompleted ?? data?.is_completed ?? false);
      setViewsCount(data?.viewsCount ?? data?.views_count ?? 0);
      setMaxViews(data?.maxViews ?? data?.max_views ?? null);
    } catch (error) {}
  };

  const fetchLecturePlayback = async () => {
    try {
      const response = await api.get(`/video/playback/${lectureId}`);
      const data = response.data;
      setPlayback({
        url: data.data?.playbackUrl || data.playbackUrl || data.playback_url,
        watermark: data.data?.watermark || data.watermark
      });
    } catch (error: any) {
      if (error.response?.status === 401) router.replace('/login');
      else setError(error.response?.data?.message || error.response?.data?.error || 'الفيديو غير متاح أو قيد المعالجة.');
    }
  };

  const fetchLectureDetails = async () => {
     try {
      const response = await api.get(`/lectures/${lectureId}`);
      const data = response.data?.data || response.data;
      const extractedCourseId = data.courseId || data.course_id || data.course?.id;
      setLecture({
        id: data.id,
        title: data.title,
        description: data.description,
        courseId: extractedCourseId,
      });
      return extractedCourseId;
    } catch (error) {}
    return null;
  };

  const fetchViolationCount = async () => {
    try {
      const response = await api.get(`/violations/count`);
      const data = response.data?.data || response.data;
      setViolationCount(data?.fatalStrikes ?? data?.fatal_strikes ?? 0);
    } catch (error) {}
  };

  const fetchCourseLectures = async (courseId: number | string) => {
    try {
      const response = await api.get(`/courses/${courseId}`);
      const data = response.data?.data || response.data;
      const list = Array.isArray(data.lectures) ? data.lectures : [];
      setCourseLectures(list.map((l: any) => ({
        id: l.id,
        title: l.title,
        isCompleted: l.isCompleted ?? l.is_completed ?? false,
        hasExam: l.hasExam ?? l.has_exam ?? false,
      })));
    } catch (error) {}
  };

  const fetchHomeworkStatus = async () => {
    try {
      const response = await api.get(`/lectures/${lectureId}/homework/status`);
      setHomeworkData(response.data?.data || response.data);
    } catch (error) {}
  };

  const handleHomeworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      await api.post(`/lectures/${lectureId}/homework/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('تم تسليم الواجب بنجاح!');
      fetchHomeworkStatus();
    } catch (err: any) {
      setHomeworkError(err.response?.data?.message || err.response?.data?.error || 'فشل رفع الواجب');
    } finally {
      setSubmittingHomework(false);
    }
  };

  const handleViolation = async (violationType: string) => {
    try {
      const response = await api.post(`/lectures/${lectureId}/violation`, { violation_type: violationType });
      const data = response.data?.data || response.data;
      setViolationCount(data?.fatalStrikes ?? data?.fatal_strikes ?? violationCount);
    } catch (error) {}
  };

  const saveProgressToBackend = async (currentTime: number, totalDuration: number) => {
    try {
      const response = await api.post(`/lectures/${lectureId}/progress`, { 
        watch_time: currentTime, 
        total_duration: totalDuration, 
        stream_id: streamId 
      });

      const data = response.data?.data || response.data;
      if (data?.isCompleted || data?.is_completed) {
        setIsLectureCompleted(true);
        setCourseLectures(prev => prev.map(l => l.id.toString() === lectureId ? { ...l, isCompleted: true } : l));
      }
    } catch (error) {}
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-xl border border-gray-100">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangleIcon size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-4">تنبيه</h2>
            <p className="text-gray-600 font-bold mb-8 leading-relaxed">{error}</p>
            <button onClick={() => router.back()} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors">
              العودة للخلف
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!playback) return null;

  const completedLecturesCount = courseLectures.filter(l => l.isCompleted).length;
  const progressPercentage = courseLectures.length > 0 ? (completedLecturesCount / courseLectures.length) * 100 : 0;
  const currentIdx = courseLectures.findIndex(l => l.id.toString() === lectureId);
  const currentLectureData = currentIdx !== -1 ? courseLectures[currentIdx] : null;
  const nextLecture = currentIdx !== -1 && currentIdx < courseLectures.length - 1 ? courseLectures[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-16">
      <Navbar />
      
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button
            onClick={() => lecture?.courseId ? router.push(`/courses/${lecture.courseId}`) : router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors"
          >
            <ArrowRightIcon size={20} />
            العودة لمحتويات الكورس
          </button>

          <div className="flex gap-3">
            {maxViews !== null && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 font-bold text-sm shadow-sm">
                <MonitorIcon size={16} />
                <span>مشاهداتك: {viewsCount} / {maxViews}</span>
              </div>
            )}
            {violationCount > 0 && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm shadow-sm ${violationCount >= 3 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                <LockIcon size={16} />
                <span>مخالفات أمنية: {violationCount}/3</span>
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-gray-900/5">
              <SecureVideoPlayer
                lectureId={lectureId}
                videoUrl={playback.url}
                token={token}
                watermarkText={playback.watermark}
                onViolation={handleViolation}
                initialTime={initialTime}
                streamId={streamId}
                onCompleted={() => {
                  setIsLectureCompleted(true);
                  setCourseLectures(prev => prev.map(l => l.id.toString() === lectureId ? { ...l, isCompleted: true } : l));
                }}
                onProgress={handleVideoProgress}
              />
            </div>

            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-center">
              <div className="flex-1 w-full text-center md:text-right">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 flex items-center justify-center md:justify-start gap-3">
                  <BookIcon size={32} className="text-blue-600" />
                  {lecture?.title || 'جاري التحميل...'}
                </h1>
                {lecture?.description && (
                  <p className="text-gray-500 font-medium leading-relaxed max-w-2xl">
                    {lecture.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                {currentLectureData?.hasExam && (
                  <button onClick={() => router.push(`/exams/${lectureId}`)} className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200">
                    <FileTextIcon size={20} />
                    اختبار المحاضرة
                  </button>
                )}
                {nextLecture && (
                  <button onClick={() => router.push(`/lectures/${nextLecture.id}`)} className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-100 hover:border-blue-600 px-8 py-3.5 rounded-xl font-bold transition-all">
                    <ArrowLeftIcon size={20} />
                    المحاضرة التالية
                  </button>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start md:items-center gap-4 shadow-sm">
              <div className="text-blue-600 shrink-0 bg-white p-2 rounded-full shadow-sm"><ShieldIcon size={24} /></div>
              <p className="text-sm md:text-base text-blue-900 font-medium leading-relaxed">
                <strong className="font-black block md:inline mb-1 md:mb-0 ml-1">سياسة الحماية الصارمة:</strong> 
                هذا المحتوى محمي بأنظمة تتبع رقمية. محاولة استخدام أدوات المطور، أو إضافات التحميل، أو مشاركة الحساب ستؤدي للحظر النهائي مباشرة.
              </p>
            </div>

            {homeworkData && homeworkData.homework && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm mt-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100 mb-6">
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <BookIcon size={24} className="text-indigo-500" />
                    الواجب الدراسي: {homeworkData.homework.title}
                  </h3>
                  <a href={homeworkData.homework.filePath} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl font-bold transition-colors text-sm">
                    <DownloadIcon size={18} />
                    تحميل ملف الأسئلة
                  </a>
                </div>

                {homeworkData.submission ? (
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-700">حالة الواجب:</span>
                      {homeworkData.submission.status === 'approved' && (
                        <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5">
                          <CheckCircleIcon size={16} /> مقبول {homeworkData.submission.score !== null && `(${homeworkData.submission.score}%)`}
                        </span>
                      )}
                      {homeworkData.submission.status === 'pending' && (
                        <span className="bg-yellow-100 text-yellow-700 px-4 py-1.5 rounded-lg text-sm font-bold">قيد المراجعة</span>
                      )}
                      {homeworkData.submission.status === 'rejected' && (
                        <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-lg text-sm font-bold">مرفوض</span>
                      )}
                    </div>

                    {homeworkData.submission.status === 'rejected' && homeworkData.submission.rejectionReason && (
                      <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-100 text-sm font-bold">
                        <span className="text-red-600 block mb-1">سبب الرفض:</span>
                        {homeworkData.submission.rejectionReason}
                      </div>
                    )}

                    {homeworkData.submission.status === 'rejected' && (
                      <form onSubmit={handleHomeworkSubmit} className="mt-2 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <label className="block font-bold text-gray-700 mb-3">أعد إرسال الحل بعد التصحيح:</label>
                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                          <input type="file" id="homework-file" accept="image/*,application/pdf" className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                          <button type="submit" disabled={submittingHomework} className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-70">
                            <UploadIcon size={18} />
                            {submittingHomework ? 'جاري الرفع...' : 'إعادة التسليم'}
                          </button>
                        </div>
                        {homeworkError && <p className="text-red-500 text-sm font-bold mt-2">{homeworkError}</p>}
                      </form>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleHomeworkSubmit} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <label className="block font-bold text-gray-900 mb-4">أرفق ملف إجابتك (صورة واضحة أو PDF):</label>
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      <input type="file" id="homework-file" accept="image/*,application/pdf" className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
                      <button type="submit" disabled={submittingHomework} className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-70 shadow-lg shadow-indigo-200">
                        <UploadIcon size={20} />
                        {submittingHomework ? 'جاري الرفع...' : 'تسليم الواجب'}
                      </button>
                    </div>
                    {homeworkError && <p className="text-red-500 text-sm font-bold mt-3">{homeworkError}</p>}
                  </form>
                )}
              </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm sticky top-6">
              <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-3xl">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-4">
                  <FileTextIcon size={22} className="text-blue-600" />
                  محتويات المنهج
                </h3>
                
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-gray-500">نسبة الإنجاز</span>
                    <span className="text-sm font-black text-green-600">{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
                {courseLectures.length > 0 ? (
                  courseLectures.map((lec, index) => {
                    const isCurrent = lec.id.toString() === lectureId;
                    const isCompleted = lec.isCompleted;

                    return (
                      <button
                        key={lec.id}
                        onClick={() => { if (!isCurrent) router.push(`/lectures/${lec.id}`); }}
                        className={`flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all border text-right
                          ${isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.02]' : 
                            isCompleted ? 'bg-green-50 border-green-100 text-gray-700 hover:bg-green-100' : 
                            'bg-white border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-200'}
                        `}
                      >
                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-sm
                          ${isCurrent ? 'bg-white/20 text-white' : 
                            isCompleted ? 'bg-green-100 text-green-600' : 
                            'bg-gray-100 text-gray-400'}
                        `}>
                          {isCompleted && !isCurrent ? <CheckIcon size={16} /> : index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isCurrent || isCompleted ? 'font-black' : 'font-bold'}`}>
                            {lec.title}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-gray-400 text-center font-bold py-8">جاري تحميل المحاضرات...</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}