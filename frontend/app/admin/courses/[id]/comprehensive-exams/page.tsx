'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useAuthGuard } from '../../../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
import api from '@/lib/axios'; // 🚀 العميل الشبكي الذكي
import {
  FileTextIcon, XIcon, ClockIcon, AwardIcon, CalendarIcon,
  PlusIcon, TrashIcon, SparklesIcon, ImageIcon, CheckIcon,
  CheckCircleIcon, AlertTriangleIcon, ShieldIcon, EditIcon, UsersIcon,
  CreditCardIcon 
} from '@/app/components/Icons';

interface ComprehensiveExam {
  id: number;
  courseId: number;
  title: string;
  instructions: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  passScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  delayResults: boolean;
  questionsCount: number;
  hasEssayQuestions: boolean;
  status: 'upcoming' | 'active' | 'ended';
  accessibility: 'enrolled_only' | 'everyone';
  pricePoints: number;
  /** Form/variant number (1-based). Multiple forms per exam are used to randomise
   * the question order delivered to different students. Optional in API responses
   * for backward compatibility with the original single-form endpoint. */
  form_index?: number;
}

interface Question {
  id: number;
  body: string;
  questionType: 'mcq' | 'multi_select' | 'essay';
  options: string[];
  correctAnswers: number[];
  imageUrl: string | null;
  optionImages: string[] | null;
  points: number;
}

export default function AdminComprehensiveExamsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;

  // 🚀 درع الحماية الذكي
  const { isChecking } = useAuthGuard();

  const [courseTitle, setCourseTitle] = useState('جاري التحميل...');
  const [exams, setExams] = useState<ComprehensiveExam[]>([]);
  const [loading, setLoading] = useState(true);
  // 🛑 Audit fix (C-2): explicit error state so the admin sees a retry
  // card instead of an infinite spinner when the data endpoint fails.
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // View States: 'list' | 'settings' | 'questions'
  const [currentView, setCurrentView] = useState<'list' | 'settings' | 'questions'>('list');
  const [selectedExam, setSelectedExam] = useState<ComprehensiveExam | null>(null);
  
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  // -----------------------------------------------------
  // 📝 إعدادات نموذج الاختبار (Exam Settings Form)
  // -----------------------------------------------------
  const [examForm, setExamForm] = useState({
    title: '',
    instructions: '',
    start_time: '',
    end_time: '',
    duration_minutes: '60',
    pass_score: '50',
    max_attempts: '1',
    shuffle_questions: true,
    shuffle_options: true,
    delay_results: true,
    accessibility: 'enrolled_only' as 'enrolled_only' | 'everyone',
    price_points: '0',
  });

  // -----------------------------------------------------
  // 📝 إعدادات نموذج السؤال (Question Form)
  // -----------------------------------------------------
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    body: '',
    question_type: 'mcq' as 'mcq' | 'multi_select' | 'essay',
    options: ['', '', '', ''],
    correct_answers: [0],
    image_url: '',
    option_images: ['', '', '', ''],
    points: '1',
  });

  // تجميد التمرير للنوافذ
  useEffect(() => {
    if (confirmDialog || showQuestionModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [confirmDialog, showQuestionModal]);

  useEffect(() => {
    if (!isChecking && courseId) {
      fetchCourseData();
      fetchExams();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isChecking]);

  const fetchCourseData = async () => {
    try {
      const response = await api.get(`/admin/courses/${courseId}`);
      setCourseTitle(response.data?.data?.title || response.data?.title || 'كورس غير محدد');
    } catch (err) {
      showToast('فشل جلب بيانات الكورس', 'error');
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/courses/${courseId}/comprehensive-exams`);
      const rawExams = response.data?.data || response.data || [];
      const validExams = Array.isArray(rawExams) ? rawExams : [];
      
      const mappedExams: ComprehensiveExam[] = validExams.map((ex: any) => ({
        id: ex.id,
        courseId: ex.course_id ?? ex.courseId,
        title: ex.title,
        instructions: ex.instructions || '',
        startTime: ex.start_time ?? ex.startTime,
        endTime: ex.end_time ?? ex.endTime,
        durationMinutes: Number(ex.duration_minutes ?? ex.durationMinutes ?? 60),
        passScore: Number(ex.pass_score ?? ex.passScore ?? 50),
        maxAttempts: Number(ex.max_attempts ?? ex.maxAttempts ?? 1),
        shuffleQuestions: !!(ex.shuffle_questions ?? ex.shuffleQuestions),
        shuffleOptions: !!(ex.shuffle_options ?? ex.shuffleOptions),
        delayResults: !!(ex.delay_results ?? ex.delayResults),
        questionsCount: Number(ex.questions_count ?? ex.questionsCount ?? 0),
        hasEssayQuestions: !!(ex.has_essay_questions ?? ex.hasEssayQuestions),
        accessibility: ex.accessibility ?? 'enrolled_only',
        pricePoints: Number(ex.price_points ?? ex.pricePoints ?? 0),
        status: determineStatus(ex.start_time ?? ex.startTime, ex.end_time ?? ex.endTime),
      }));

      setExams(mappedExams);
    } catch (err: any) {
      const message = err?.message || 'فشل تحميل الاختبارات الشاملة (تأكد من عمل Migrate للقاعدة)';
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const determineStatus = (start: string, end: string) => {
    const now = new Date().getTime();
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    if (now < startTime) return 'upcoming';
    if (now > endTime) return 'ended';
    return 'active';
  };

  const fetchQuestions = async (examId: number) => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/comprehensive-exams/${examId}/questions`);
      const rawQs = response.data?.data || response.data || [];
      const validQs = Array.isArray(rawQs) ? rawQs : [];
      
      setQuestions(validQs.map((q: any) => ({
        id: q.id,
        body: q.body,
        questionType: q.question_type ?? q.questionType ?? 'mcq',
        options: q.options || [],
        correctAnswers: q.correct_answers ?? q.correctAnswers ?? [q.correct_answer ?? q.correctAnswer ?? 0],
        imageUrl: q.image_url ?? q.imageUrl,
        optionImages: q.option_images ?? q.optionImages,
        points: Number(q.points ?? 1),
      })));
    } catch (err: any) {
      showToast('فشل تحميل بنك الأسئلة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExamSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 🚀 تجهيز الحزمة بأمان (تحويل النصوص لأرقام)
      const payload = {
        ...examForm,
        duration_minutes: parseInt(examForm.duration_minutes) || 60,
        pass_score: parseInt(examForm.pass_score) || 50,
        max_attempts: parseInt(examForm.max_attempts) || 1,
        price_points: examForm.accessibility === 'everyone' ? (parseInt(examForm.price_points) || 0) : 0,
      };

      if (selectedExam) {
        await api.put(`/admin/comprehensive-exams/${selectedExam.id}`, payload);
        showToast('تم تحديث إعدادات الاختبار بنجاح', 'success');
      } else {
        await api.post(`/admin/courses/${courseId}/comprehensive-exams`, payload);
        showToast('تم إنشاء الاختبار الشامل بنجاح', 'success');
      }
      setCurrentView('list');
      fetchExams();
    } catch (err: any) {
      showToast(err?.message || err?.error || 'فشل حفظ الإعدادات، راجع التواريخ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = (examId: number) => {
    setConfirmDialog({
      visible: true,
      message: '🚨 تحذير: سيتم حذف الاختبار الشامل وجميع أسئلته وإجابات الطلاب عليه للأبد!',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/admin/comprehensive-exams/${examId}`);
          showToast('تم تدمير الاختبار بالكامل', 'success');
          fetchExams();
        } catch (err) {
          showToast('فشل حذف الاختبار', 'error');
        }
      }
    });
  };

  // رفع الصور الذكي
  const handleImageUpload = async (file: File, index: number | null) => {
    if (!file.type.startsWith('image/')) return showToast('يجب اختيار ملف صورة', 'error');
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await api.post('/admin/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = response.data?.data?.url || response.data?.url;
      
      if (index === null) {
        setQuestionForm(prev => ({ ...prev, image_url: url }));
      } else {
        setQuestionForm(prev => {
          const imgs = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
          imgs[index] = url;
          return { ...prev, option_images: imgs };
        });
      }
      showToast('تم إرفاق الصورة', 'success');
    } catch (err) {
      showToast('فشل رفع الصورة للسحابة', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>, index: number | null) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          setUploadingImage(true);
          try {
            const formData = new FormData();
            formData.append('image', file);
            const response = await api.post('/admin/questions/upload-image', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            const url = response.data?.data?.url || response.data?.url;
            
            if (index === null) {
              setQuestionForm(prev => ({ ...prev, image_url: url, body: prev.body + `\n![صورة مرفقة](${url})` }));
            } else {
              setQuestionForm(prev => {
                const imgs = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
                imgs[index] = url;
                const opts = [...prev.options];
                if (!opts[index]) opts[index] = `صورة مرفقة`;
                return { ...prev, option_images: imgs, options: opts };
              });
            }
            showToast('تم لصق الصورة ورفعها بنجاح', 'success');
          } catch (err) {
            showToast('خطأ في رفع الصورة الملصقة', 'error');
          } finally {
            setUploadingImage(false);
          }
        }
        break;
      }
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    if (!questionForm.body.trim() && !questionForm.image_url) {
      showToast('يرجى كتابة نص السؤال أو إرفاق صورة له', 'error');
      return;
    }

    try {
      await api.post(`/admin/comprehensive-exams/${selectedExam.id}/questions`, {
        body: questionForm.body,
        question_type: questionForm.question_type,
        points: parseInt(questionForm.points) || 1,
        image_url: questionForm.image_url || null,
        options: questionForm.question_type === 'essay' ? [] : questionForm.options,
        option_images: questionForm.question_type === 'essay' ? [] : questionForm.option_images,
        correct_answers: questionForm.question_type === 'essay' ? [] : questionForm.correct_answers,
      });

      showToast('تم إضافة السؤال لبنك الأسئلة!', 'success');
      setShowQuestionModal(false);
      fetchQuestions(selectedExam.id);
      
      setQuestionForm({
        body: '', question_type: 'mcq', options: ['', '', '', ''], correct_answers: [0], image_url: '', option_images: ['', '', '', ''], points: '1',
      });
    } catch (err: any) {
      showToast(err?.message || 'فشل حفظ السؤال', 'error');
    }
  };

  const handleDeleteQuestion = (qId: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل تريد حذف هذا السؤال من نموذج الاختبار؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          // ⚠️ DELETE /api/admin/questions/{id} is registered twice: once for
          // regular-exam questions and once for comprehensive-exam questions.
          // The regular-exam handler is registered first and wins the route
          // match, so the call from the comprehensive-exams page would delete
          // a regular question by mistake. Use a dedicated route
          // (comprehensive-exams/questions/{id}) once the backend adds it.
          // Until then, surface a clear error to the admin instead of
          // silently deleting the wrong row.
          try {
            await api.delete(`/admin/comprehensive-exams/questions/${qId}`);
            showToast('تم الحذف', 'success');
            fetchQuestions(selectedExam!.id);
          } catch (err: any) {
            // Fall back to the legacy route only if the dedicated one is not
            // available in the deployed backend; warn the admin that the
            // wrong handler may have answered.
            const code = err?.code || err?.response?.data?.code;
            if (code === 'ERR_ROUTE_NOT_FOUND') {
              showToast('لا يمكن حذف سؤال الاختبار الشامل من هذه الواجهة حالياً.', 'error');
            } else {
              showToast(err?.message || 'فشل الحذف', 'error');
            }
          }
        } catch (err) {
          showToast('فشل الحذف', 'error');
        }
      }
    });
  };

  const formatDateTimeLocal = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
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

      {/* 🚀 نظام التنبيهات الموحد في الجذر */}
      <div className="toast-container" style={{ position: 'fixed', top: '2rem', left: '2rem', zIndex: 1000, transition: 'all 0.3s', opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? 'auto' : 'none' }}>
        <div className={`toast-content ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertTriangleIcon size={20} />}
          {toast.message}
        </div>
      </div>

      {/* 🚀 نافذة التأكيد المحسنة في الجذر */}
      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmDialog(null)}>
          <div className="card shadow-2xl max-w-sm w-full text-center p-8 animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-4 text-error"><AlertTriangleIcon size={56} /></div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الإجراء</h3>
            <p className="text-gray-600 mb-8 font-medium">{confirmDialog.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 py-3 font-bold">إلغاء</button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1 py-3 font-bold shadow-lg shadow-red-200">نعم، نفذ الإجراء</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 نافذة إضافة سؤال - تم نقلها للجذر لحل مشكلة الظهور بالأسفل */}
      {showQuestionModal && selectedExam && (
        <div className="fixed inset-0 flex items-center justify-center z-[150] p-4 sm:p-6 animate-fade-in" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowQuestionModal(false)}>
          <form 
            onSubmit={handleSaveQuestion} 
            className="bg-white w-full max-w-4xl flex flex-col shadow-2xl rounded-2xl overflow-hidden relative animate-scale-up h-full max-h-[95vh] md:max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 bg-white border-b border-gray-100 px-6 sm:px-8 py-5 flex justify-between items-center z-10 shadow-sm">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-full"><SparklesIcon size={20} /></div>
                إضافة سؤال لنموذج #{selectedExam.form_index}
              </h3>
              <button type="button" onClick={() => setShowQuestionModal(false)} className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-full text-gray-400 hover:text-error hover:bg-red-50 flex justify-center items-center transition-colors shadow-sm"><XIcon size={18} /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-8 bg-gray-50/50" dir="rtl">
              <div className="form-group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <label className="form-label font-black text-lg mb-3 block text-gray-800">نوع السؤال وطريقة الإجابة</label>
                <select value={questionForm.question_type} onChange={(e) => setQuestionForm(prev => ({ ...prev, question_type: e.target.value as any }))} className="input-field w-full text-lg p-4 bg-gray-50 font-bold border-gray-200 shadow-inner text-primary rounded-xl focus:bg-white transition-colors">
                  <option value="mcq">اختيار إجابة واحدة صحيحة (MCQ)</option>
                  <option value="multi_select">تحديد عدة إجابات صحيحة معاً</option>
                  <option value="essay">سؤال مقالي (يتطلب تصحيح يدوي من المعلم)</option>
                </select>
                {questionForm.question_type === 'essay' && (
                  <div className="mt-4 bg-orange-50 text-orange-800 p-4 rounded-xl text-sm font-bold flex items-center gap-2 border border-orange-200 shadow-sm">
                    <AlertTriangleIcon size={20} /> الأسئلة المقالية تعني أن النتيجة النهائية للامتحان ستكون معلقة (Pending) حتى تقوم بتصحيحها من لوحة التحكم.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label font-black text-lg mb-3 block text-gray-900">نص السؤال (إمكانية اللصق المباشر)</label>
                <textarea 
                  value={questionForm.body} 
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, body: e.target.value }))} 
                  onPaste={(e) => handlePaste(e, null)} 
                  className="input-field w-full p-5 text-lg bg-white border-gray-200 focus:border-primary shadow-sm font-medium text-gray-900 leading-relaxed rounded-2xl" 
                  rows={4} 
                  placeholder="اكتب صيغة السؤال هنا، أو اضغط (Ctrl+V / Cmd+V) للصق صورة من الحافظة مباشرة وسيتم رفعها وإرفاقها تلقائياً..." 
                />
                
                <div className="mt-4 flex items-center gap-4 flex-wrap bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                  <input type="file" id="question-image-upload" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { handleImageUpload(f, null); e.target.value = ''; } }} disabled={uploadingImage} />
                  <label htmlFor="question-image-upload" className="btn btn-outline bg-gray-50 cursor-pointer font-bold text-sm flex items-center gap-2 shadow-sm border-gray-200 hover:border-primary hover:bg-blue-50 hover:text-primary transition-all rounded-xl m-0" style={{ padding: '0.75rem 1.5rem' }}>
                    {uploadingImage ? <><span className="spinner spinner-primary w-4 h-4 border-2" /> جاري الرفع...</> : <><ImageIcon size={16} /> إرفاق صورة للسؤال (اختياري)</>}
                  </label>
                  {questionForm.image_url && (
                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-green-200 shadow-sm animate-scale-up">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={questionForm.image_url} alt="Question" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      <button type="button" onClick={() => setQuestionForm(prev => ({ ...prev, image_url: '' }))} className="btn btn-danger btn-xs font-bold px-3 py-1.5 rounded-lg">إزالة</button>
                    </div>
                  )}
                </div>
              </div>

              {questionForm.question_type !== 'essay' && (
                <div className="form-group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                  <label className="form-label font-black mb-2 block text-xl border-b border-gray-100 pb-4 text-gray-900 flex items-center gap-2">
                     <FileTextIcon size={24} className="text-primary"/> خيارات الإجابة المتاحة
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    {questionForm.options.map((opt, i) => {
                      const optImg = questionForm.option_images?.[i] || '';
                      return (
                        <div key={i} className="flex flex-col bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 focus-within:border-primary focus-within:shadow-md transition-all">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-primary bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner text-base">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <input 
                              type="text" 
                              value={opt} 
                              onChange={(e) => { const newOpts = [...questionForm.options]; newOpts[i] = e.target.value; setQuestionForm(prev => ({ ...prev, options: newOpts })); }} 
                              onPaste={(e) => handlePaste(e, i)}
                              className="input-field flex-1 p-3 bg-white border-gray-200 font-medium text-gray-900 shadow-sm rounded-lg" 
                              placeholder={`الخيار ${String.fromCharCode(65 + i)}`} 
                              required={!optImg} 
                            />
                            <input type="file" id={`option-image-${i}`} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { handleImageUpload(f, i); e.target.value = ''; } }} disabled={uploadingImage} />
                            <label htmlFor={`option-image-${i}`} className="btn btn-outline p-3 bg-white hover:bg-gray-100 cursor-pointer rounded-lg border border-gray-200 shrink-0 shadow-sm m-0">
                              <ImageIcon size={18} className="text-gray-500" />
                            </label>
                          </div>
                          {optImg && (
                            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-green-200 shadow-sm animate-scale-up">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={optImg} alt={`Option`} className="w-12 h-12 object-cover rounded-lg border border-gray-100" />
                              <button type="button" onClick={() => setQuestionForm(prev => { const imgs = [...(prev.option_images||[])]; imgs[i] = ''; return { ...prev, option_images: imgs }; })} className="btn btn-danger btn-xs font-bold px-3 py-1.5 rounded-lg">حذف</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {questionForm.question_type === 'mcq' && (
                <div className="form-group bg-green-50/50 p-6 rounded-2xl border border-green-200 shadow-sm">
                  <label className="form-label font-black text-xl mb-4 block flex items-center gap-2 text-green-800 border-b border-green-200/50 pb-3">
                    <CheckCircleIcon size={24} /> حدد الإجابة الصحيحة الوحيدة
                  </label>
                  <select 
                     value={questionForm.correct_answers[0]} 
                     onChange={(e) => setQuestionForm(prev => ({ ...prev, correct_answers: [parseInt(e.target.value)] }))} 
                     className="input-field w-full p-4 font-black text-lg bg-white border-green-300 text-green-800 shadow-sm rounded-xl focus:border-green-500"
                  >
                    {questionForm.options.map((opt, i) => (
                      <option key={i} value={i}>الخيار {String.fromCharCode(65 + i)}: {opt || `(مرفق صورة)`}</option>
                    ))}
                  </select>
                </div>
              )}

              {questionForm.question_type === 'multi_select' && (
                <div className="form-group bg-green-50/50 p-6 rounded-2xl border border-green-200 shadow-sm space-y-4">
                  <label className="form-label font-black text-xl mb-2 block flex items-center gap-2 text-green-800 border-b border-green-200/50 pb-3">
                     <CheckCircleIcon size={24} /> تحديد الإجابات الصحيحة (اختر 1 أو أكثر)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {questionForm.options.map((opt, i) => (
                      <label key={i} className="flex items-center gap-4 cursor-pointer bg-white p-4 rounded-xl border border-green-200 hover:border-green-400 transition-colors shadow-sm hover:shadow-md">
                        <input 
                           type="checkbox" 
                           className="w-6 h-6 rounded accent-success cursor-pointer border-gray-300" 
                           checked={questionForm.correct_answers?.includes(i)} 
                           onChange={(e) => { 
                             const current = questionForm.correct_answers || []; 
                             const newAnswers = e.target.checked ? [...current, i] : current.filter(a => a !== i); 
                             setQuestionForm(prev => ({ ...prev, correct_answers: newAnswers })); 
                           }} 
                        />
                        <span className="font-black text-gray-900 text-lg">{String.fromCharCode(65 + i)}: <span className="font-medium text-gray-600 text-base">{opt || `(صورة)`}</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group bg-blue-50/50 p-6 rounded-2xl border border-blue-100 inline-block shadow-sm w-full sm:w-auto">
                <label className="form-label font-black text-lg mb-3 block text-primary flex items-center gap-2 justify-center sm:justify-start"><AwardIcon size={20}/> درجة السؤال (نقاط)</label>
                <input type="text" value={questionForm.points} onChange={(e) => setQuestionForm(prev => ({ ...prev, points: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full sm:w-32 p-3 text-center text-2xl font-black bg-white border-blue-200 text-primary shadow-inner rounded-xl mx-auto block" required dir="ltr" />
              </div>

            </div>

            {/* Footer */}
            <div className="shrink-0 bg-white border-t border-gray-100 px-6 sm:px-8 py-5 flex flex-col sm:flex-row justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={() => setShowQuestionModal(false)} className="btn btn-outline px-10 py-3.5 font-bold border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-xl w-full sm:w-auto transition-colors">إلغاء النافذة</button>
              <button type="submit" className="btn btn-primary px-12 py-3.5 font-black shadow-lg shadow-blue-200 text-lg flex items-center justify-center gap-2 rounded-xl w-full sm:w-auto hover:-translate-y-0.5 transition-transform">
                 <CheckIcon size={20} /> حفظ وإضافة السؤال للبنك
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 🚀 محتوى الصفحة الرئيسي */}
      <main className="admin-content">
        <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <button onClick={() => currentView === 'list' ? router.push('/admin/courses') : setCurrentView('list')} className="text-sm font-bold text-gray-400 hover:text-primary mb-2 flex items-center gap-1 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm w-fit">
               &rarr; {currentView === 'list' ? 'العودة للكورسات' : 'العودة لقائمة الاختبارات'}
            </button>
            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3 mt-3">
              <ShieldIcon size={32} className="text-primary" />
              الاختبارات الشاملة (الميدتيرم / النهائي)
            </h1>
            <p className="page-subtitle text-base mt-2">كورس: <span className="font-bold text-primary bg-blue-50 px-2 py-0.5 rounded">{courseTitle}</span></p>
          </div>
          {currentView === 'list' && (
            <button 
              onClick={() => {
                setSelectedExam(null);
                setExamForm({ title: '', instructions: '', start_time: '', end_time: '', duration_minutes: '60', pass_score: '50', max_attempts: '1', shuffle_questions: true, shuffle_options: true, delay_results: true, accessibility: 'enrolled_only', price_points: '0' });
                setCurrentView('settings');
              }} 
              className="btn btn-primary font-bold shadow-lg shadow-blue-200 rounded-xl px-6 py-3 flex items-center gap-2"
            >
              <SparklesIcon size={18} /> إنشاء اختبار شامل جديد
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 1. قائمة الاختبارات الشاملة (List View) */}
        {/* ========================================================================= */}
        {currentView === 'list' && (
          loading ? (
            <div className="card p-16 flex justify-center bg-white rounded-2xl shadow-sm border border-gray-100"><div className="spinner spinner-primary spinner-lg" /></div>
          ) : loadError ? (
            // 🛑 Audit fix (C-2): visible error card with retry button so the
            // admin can recover without leaving the page.
            <div className="card bg-white border border-red-100 shadow-sm rounded-2xl py-16 text-center">
              <div className="empty-state-icon bg-red-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner"><AlertTriangleIcon size={48} className="text-error" /></div>
              <h3 className="text-2xl font-black text-gray-800">تعذّر تحميل الاختبارات الشاملة</h3>
              <p className="text-gray-500 font-medium text-lg mt-2 mb-8 max-w-md mx-auto leading-relaxed">{loadError}</p>
              <button
                onClick={() => { setLoadError(null); setLoading(true); fetchExams(); }}
                className="btn btn-primary px-6 py-3 rounded-xl shadow-lg shadow-blue-200 font-bold"
              >
                <CheckCircleIcon size={18} className="ml-2 inline" /> إعادة المحاولة
              </button>
            </div>
          ) : exams.length === 0 ? (
            <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
              <div className="empty-state-icon bg-blue-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner"><ShieldIcon size={48} className="text-primary" /></div>
              <h3 className="text-2xl font-black text-gray-800">لا توجد اختبارات شاملة</h3>
              <p className="text-gray-500 font-medium text-lg mt-2 mb-8 max-w-sm mx-auto">قم بإنشاء امتحانات ميدتيرم أو امتحانات نهائية تخضع لنوافذ زمنية صارمة.</p>
              <button onClick={() => setCurrentView('settings')} className="btn btn-primary px-6 py-3 rounded-xl shadow-lg shadow-blue-200 font-bold"><PlusIcon size={18} className="ml-2 inline" /> أضف الاختبار الشامل الأول</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {exams.map(exam => (
                <div key={exam.id} className="card bg-white border border-gray-200 shadow-sm rounded-2xl p-0 relative overflow-hidden transition-all hover:shadow-md group">
                  {/* شريط الحالة */}
                  <div className={`h-2 w-full transition-colors ${exam.status === 'active' ? 'bg-success animate-pulse' : exam.status === 'upcoming' ? 'bg-warning' : 'bg-gray-400'}`} />
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">{exam.title}</h3>
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                          <CalendarIcon size={16} className="text-primary" />
                          يبدأ: <span dir="ltr">{new Date(exam.startTime).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-500 mt-1">
                          <ClockIcon size={16} className="text-error" />
                          ينتهي: <span dir="ltr">{new Date(exam.endTime).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                      <span className={`px-4 py-1.5 rounded-lg text-xs font-black border shadow-sm ${exam.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : exam.status === 'upcoming' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {exam.status === 'active' ? '🟢 متاح الآن للحل' : exam.status === 'upcoming' ? '⏳ لم يبدأ بعد' : '🔒 انتهى وأُغلق'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
                      <div className="text-center">
                        <span className="block text-xs font-bold text-gray-500 mb-1">المدة</span>
                        <span className="font-black text-gray-800 text-lg bg-white px-2 py-0.5 rounded border border-gray-100 shadow-sm">{exam.durationMinutes} د</span>
                      </div>
                      <div className="text-center border-x border-gray-200">
                        <span className="block text-xs font-bold text-gray-500 mb-1">الأسئلة</span>
                        <span className="font-black text-primary text-lg bg-white px-2 py-0.5 rounded border border-blue-100 shadow-sm">{exam.questionsCount}</span>
                      </div>
                      <div className="text-center border-l border-gray-200">
                        <span className="block text-xs font-bold text-gray-500 mb-1">النجاح</span>
                        <span className="font-black text-success text-lg bg-white px-2 py-0.5 rounded border border-green-100 shadow-sm">{exam.passScore}%</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-xs font-bold text-gray-500 mb-1">الإتاحة</span>
                        {exam.accessibility === 'everyone' ? (
                          <span className="font-black text-purple-600 text-sm bg-purple-50 px-2 py-1 rounded-md border border-purple-100 shadow-sm">{exam.pricePoints > 0 ? `${exam.pricePoints} ج` : 'مجاني'}</span>
                        ) : (
                          <span className="font-bold text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200 shadow-sm">للمشتركين</span>
                        )}
                      </div>
                    </div>

                    {exam.hasEssayQuestions && (
                      <div className="mb-6 bg-orange-50 text-orange-800 p-3 rounded-lg text-xs font-bold flex items-center gap-2 border border-orange-200 shadow-sm">
                        <AlertTriangleIcon size={16} /> يحوي أسئلة مقالية تتطلب التصحيح اليدوي قبل إعلان النتائج.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2.5">
                      <button 
                        onClick={() => {
                          setSelectedExam(exam);
                          setExamForm({ 
                            title: exam.title || '', 
                            instructions: exam.instructions, 
                            start_time: formatDateTimeLocal(exam.startTime), 
                            end_time: formatDateTimeLocal(exam.endTime), 
                            duration_minutes: exam.durationMinutes.toString(), 
                            pass_score: exam.passScore.toString(), 
                            max_attempts: exam.maxAttempts.toString(), 
                            shuffle_questions: exam.shuffleQuestions, 
                            shuffle_options: exam.shuffleOptions, 
                            delay_results: exam.delayResults,
                            accessibility: exam.accessibility,
                            price_points: exam.pricePoints.toString(),
                          });
                          setCurrentView('settings');
                        }} 
                        className="btn btn-sm btn-outline flex-1 font-bold border-gray-300 hover:bg-gray-50 rounded-xl py-2.5"
                      >
                        <EditIcon size={14} /> التكوين
                      </button>
                      <button 
                        onClick={() => { setSelectedExam(exam); fetchQuestions(exam.id); setCurrentView('questions'); }} 
                        className="btn btn-sm btn-primary flex-[1.5] font-bold shadow-sm rounded-xl py-2.5"
                      >
                        <FileTextIcon size={14} /> بنك الأسئلة
                      </button>
                      <button onClick={() => showToast('سيتم برمجة صفحة التصحيح قريباً', 'info')} className="btn btn-sm btn-success flex-1 font-bold shadow-sm text-white rounded-xl py-2.5">
                        <UsersIcon size={14} /> التصحيح
                      </button>
                      <button onClick={() => handleDeleteExam(exam.id)} className="btn btn-sm btn-outline text-error border-red-200 hover:bg-red-50 rounded-xl px-4 py-2.5">
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* 2. إعدادات الاختبار (Settings View) */}
        {/* ========================================================================= */}
        {currentView === 'settings' && (
          <div className="card bg-white border border-gray-200 shadow-xl rounded-2xl p-6 md:p-8 animate-fade-in">
            <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3 border-b border-gray-100 pb-5">
              <div className="w-12 h-12 bg-blue-50 text-primary flex items-center justify-center rounded-full shadow-inner"><SparklesIcon size={24} /></div>
              {selectedExam ? 'تعديل الإعدادات واللوجستيات' : 'تكوين اللوجستيات لاختبار شامل جديد'}
            </h3>
            
            <form onSubmit={handleSaveExamSettings} className="space-y-8">
              
              <div className="space-y-5">
                <div className="form-group mb-0">
                  <label className="form-label font-black text-gray-700">عنوان الاختبار الشامل</label>
                  <input type="text" value={examForm.title} onChange={e => setExamForm(prev => ({ ...prev, title: e.target.value }))} className="input-field w-full text-xl font-bold bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl py-3" required placeholder="مثال: امتحان منتصف العام الدراسي" dir="rtl" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label font-black text-gray-700">تعليمات للطلاب (تظهر قبل البدء)</label>
                  <textarea value={examForm.instructions} onChange={e => setExamForm(prev => ({ ...prev, instructions: e.target.value }))} className="input-field w-full bg-white border-gray-200 focus:border-primary shadow-sm rounded-xl p-4 text-sm leading-relaxed" rows={3} placeholder="اكتب القواعد المسموحة والممنوعة..." dir="rtl" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-purple-50/30 border border-purple-100 shadow-inner">
                <div className="col-span-full mb-2 border-b border-purple-200/50 pb-3">
                  <h4 className="font-black text-purple-700 flex items-center gap-2 text-lg"><CreditCardIcon size={22} /> نظام المبيعات وإمكانية الوصول</h4>
                  <p className="text-sm font-bold text-gray-500 mt-1.5">يمكنك بيع هذا الامتحان كمنتج مستقل لطلاب غير المشتركين في الكورس.</p>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-700 text-sm">من يمكنه دخول هذا الامتحان؟</label>
                  <select 
                    value={examForm.accessibility} 
                    onChange={e => setExamForm(prev => ({ ...prev, accessibility: e.target.value as 'enrolled_only' | 'everyone' }))} 
                    className="input-field w-full font-bold bg-white text-primary border-gray-200 rounded-xl py-3 shadow-sm"
                  >
                    <option value="enrolled_only">الطلاب المشتركون في الكورس فقط (مجاني لهم)</option>
                    <option value="everyone">متاح لجميع طلاب المنصة (كمنتج مستقل)</option>
                  </select>
                </div>
                
                {examForm.accessibility === 'everyone' && (
                  <div className="form-group mb-0 animate-fade-in">
                    <label className="form-label font-bold text-gray-700 text-sm">سعر الامتحان لغير المشتركين (بالنقاط/جنيه)</label>
                    <input 
                      type="text" 
                      value={examForm.price_points} 
                      onChange={e => setExamForm(prev => ({ ...prev, price_points: e.target.value.replace(/[^0-9]/g, '') }))} 
                      className="input-field w-full font-black text-xl text-center bg-white text-success border-green-200 focus:border-green-500 rounded-xl py-3 shadow-sm" 
                      placeholder="0 يعني مجاني"
                      required 
                      dir="ltr"
                    />
                    <small className="text-xs font-bold text-green-600 block mt-2 leading-relaxed">
                      ملاحظة: الطلاب المشتركون في الكورس أصلاً سيدخلون مجاناً دائماً. وضع القيمة (0) يجعله مجانياً للجميع.
                    </small>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-blue-50/30 border border-blue-100 shadow-inner">
                <div className="col-span-full mb-2 border-b border-blue-200/50 pb-3">
                  <h4 className="font-black text-primary flex items-center gap-2 text-lg"><ClockIcon size={22} /> نافذة الإتاحة والتوقيتات</h4>
                  <p className="text-sm font-bold text-gray-500 mt-1.5">تُطبق بصرامة بتوقيت السيرفر. الدخول المتأخر يؤدي لتسليم إجباري.</p>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-700 text-sm block mb-2">تاريخ ووقت الفتح (Start)</label>
                  <input type="datetime-local" value={examForm.start_time} onChange={e => setExamForm(prev => ({ ...prev, start_time: e.target.value }))} className="input-field w-full font-mono text-sm bg-white border-gray-200 rounded-xl py-3 shadow-sm text-center" required />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-700 text-sm block mb-2">تاريخ ووقت الإغلاق (End)</label>
                  <input type="datetime-local" value={examForm.end_time} onChange={e => setExamForm(prev => ({ ...prev, end_time: e.target.value }))} className="input-field w-full font-mono text-sm bg-white border-gray-200 rounded-xl py-3 shadow-sm text-center" required />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-700 text-sm block mb-2">مدة الحل (بالدقائق)</label>
                  <input type="text" value={examForm.duration_minutes} onChange={e => setExamForm(prev => ({ ...prev, duration_minutes: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full font-black text-xl text-center bg-white text-primary border-gray-200 rounded-xl py-3 shadow-sm" required dir="ltr" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-700 text-sm block mb-2">درجة النجاح (%)</label>
                  <input type="text" value={examForm.pass_score} onChange={e => setExamForm(prev => ({ ...prev, pass_score: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full font-black text-xl text-center bg-green-50 text-success border-green-200 focus:border-green-500 rounded-xl py-3 shadow-sm" required dir="ltr" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-2xl bg-gray-50 border border-gray-200 shadow-inner">
                <div className="col-span-full mb-3 border-b border-gray-200/50 pb-3">
                   <h4 className="font-black text-gray-800 flex items-center gap-2 text-lg"><ShieldIcon size={22} /> قواعد النزاهة والتصحيح</h4>
                </div>
                {[ 
                  { label: 'تأجيل النتيجة (تُخفى حتى انتهاء نافذة الامتحان بالكامل لمنع الغش)', checked: examForm.delay_results, key: 'delay_results' }, 
                  { label: 'خلط ترتيب الأسئلة لكل طالب عشوائياً', checked: examForm.shuffle_questions, key: 'shuffle_questions' }, 
                  { label: 'خلط ترتيب الخيارات (A,B,C,D) عشوائياً', checked: examForm.shuffle_options, key: 'shuffle_options' }, 
                ].map(item => (
                  <label key={item.key} className={`flex items-center gap-3 cursor-pointer text-sm p-4 bg-white rounded-xl shadow-sm border transition-all ${item.checked ? 'border-primary shadow-blue-100' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={item.checked} onChange={(e) => setExamForm(prev => ({ ...prev, [item.key]: e.target.checked }))} className="w-5 h-5 accent-primary rounded cursor-pointer" />
                    <span className="font-bold text-gray-800 leading-tight">{item.label}</span>
                  </label>
                ))}
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-700 text-sm block mb-2">الحد الأقصى للمحاولات المسموحة</label>
                  <input type="text" value={examForm.max_attempts} onChange={e => setExamForm(prev => ({ ...prev, max_attempts: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full font-black bg-white border-gray-200 rounded-xl py-3 shadow-sm text-center text-lg" required dir="ltr" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setCurrentView('list')} className="btn btn-outline px-10 py-3.5 font-bold border-gray-200 hover:bg-gray-50 bg-white rounded-xl transition-colors">إلغاء والتراجع</button>
                <button type="submit" disabled={loading} className="btn btn-primary px-12 py-3.5 font-black shadow-lg shadow-blue-200 text-lg rounded-xl hover:-translate-y-0.5 transition-transform">
                  {loading ? <span className="spinner spinner-light w-5 h-5 border-2 mx-auto" /> : 'حفظ الهيكل والتوقيتات'}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. بنك أسئلة الاختبار (Questions View) */}
        {/* ========================================================================= */}
        {currentView === 'questions' && selectedExam && (
          <div className="animate-fade-in space-y-6">
             <div className="card bg-gray-900 border-gray-800 text-white p-6 md:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black flex items-center gap-3 text-white mb-2">
                    <FileTextIcon size={28} className="text-primary" />
                    بنك أسئلة: {selectedExam.title}
                  </h2>
                  <p className="text-gray-400 font-medium text-sm">إجمالي الأسئلة المدرجة: <span className="text-white font-bold bg-gray-800 px-2 py-0.5 rounded border border-gray-700">{questions.length}</span> سؤال.</p>
                </div>
                <button onClick={() => setShowQuestionModal(true)} className="btn btn-primary font-bold shadow-lg shadow-primary/30 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl w-full md:w-auto hover:scale-105 transition-transform">
                  <PlusIcon size={18} /> إضافة سؤال جديد
                </button>
             </div>

             {loading ? (
               <div className="card p-16 flex justify-center bg-white rounded-2xl border border-gray-100 shadow-sm"><div className="spinner spinner-primary spinner-lg" /></div>
             ) : questions.length === 0 ? (
               <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
                 <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner"><FileTextIcon size={48} className="text-gray-400" /></div>
                 <h3 className="text-2xl font-black text-gray-800">بنك الأسئلة فارغ</h3>
                 <p className="text-gray-500 font-medium mt-2 max-w-sm mx-auto">ابدأ بإدراج الأسئلة المختلفة (مقالي، اختر، متعدد) لهذا الامتحان لكي يتمكن الطلاب من حله.</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {questions.map((q, index) => (
                   <div key={q.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-5 items-start transition-all hover:border-primary/40 hover:shadow-md group">
                     <div className="w-12 h-12 bg-blue-50 text-primary border border-blue-100 font-black text-xl rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                       {index + 1}
                     </div>
                     <div className="flex-1 w-full">
                       <div className="flex flex-wrap gap-2 mb-4">
                         <span className="badge font-bold px-3 py-1.5 rounded-md text-xs bg-gray-100 text-gray-700 border border-gray-200">{q.questionType === 'essay' ? 'مقالي (كتابة)' : q.questionType === 'multi_select' ? 'تحديد إجابات متعددة' : 'اختيار من متعدد'}</span>
                         <span className="badge font-bold px-3 py-1.5 rounded-md text-xs bg-green-50 text-green-700 border border-green-200 flex items-center gap-1.5"><AwardIcon size={14} /> {q.points} درجة</span>
                       </div>
                       <p className="text-lg font-bold text-gray-900 leading-relaxed whitespace-pre-wrap">{q.body}</p>
                       {q.imageUrl && <img src={q.imageUrl} alt="مرفق السؤال" className="mt-4 rounded-xl border border-gray-200 max-h-56 object-contain shadow-sm" />}
                       
                       {q.questionType !== 'essay' && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                           {q.options.map((opt, i) => {
                             const isCorrect = q.correctAnswers.includes(i);
                             return (
                               <div key={i} className={`p-4 rounded-xl border transition-colors ${isCorrect ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200'} flex items-center gap-3`}>
                                 <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-sm shrink-0 shadow-inner ${isCorrect ? 'bg-green-500 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>{String.fromCharCode(65 + i)}</span>
                                 <div className="flex-1">
                                   <span className={`font-medium text-sm block ${isCorrect ? 'text-green-900 font-bold' : 'text-gray-700'}`}>{opt || '(صورة فقط)'}</span>
                                   {q.optionImages?.[i] && <img src={q.optionImages[i]} alt="خيار" className="mt-2 rounded-lg max-h-24 object-contain border border-gray-200 shadow-sm" />}
                                 </div>
                                 {isCorrect && <CheckCircleIcon size={20} className="text-success shrink-0" />}
                               </div>
                             );
                           })}
                         </div>
                       )}
                     </div>
                     <button onClick={() => handleDeleteQuestion(q.id)} className="bg-red-50 text-error hover:bg-error hover:text-white w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0 border border-red-100 hover:border-red-600" title="حذف السؤال بالكامل">
                       <TrashIcon size={20} />
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}