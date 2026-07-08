'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import { useAuthGuard } from '../../../../hooks/useAuthGuard'; // 🚀 الدرع المركزي
import api from '@/lib/axios'; // 🚀 العميل الشبكي الذكي
import {
  FileTextIcon, XIcon, ClockIcon, AwardIcon, RefreshIcon,
  PlusIcon, TrashIcon, SparklesIcon, ImageIcon, CheckIcon,
  CheckCircleIcon, AlertTriangleIcon, BookIcon, UploadIcon
} from '@/app/components/Icons';

interface Exam {
  id: number;
  lecture_id: number;
  form_index: number;
  duration_minutes: number;
  pass_score: number;
  title: string | null;
  instructions: string | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  max_attempts: number;
  show_correct_answers: boolean;
  show_score: boolean;
  per_question_time: boolean;
  random_question_count: number | null;
  questions: Question[];
}

interface Question {
  id: number;
  body: string;
  options: string[];
  correct_answer: number;
  question_type: string;
  image_url: string | null;
  option_images: string[] | null;
  correct_answers: number[] | null;
  points: number;
  time_limit_seconds: number | null;
  order_index: number;
}

interface Lecture {
  id: number;
  title: string;
}

export default function AdminExamsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id;

  // 🚀 درع الحماية الذكي
  const { isChecking } = useAuthGuard(['admin']);

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<string>('');

  const [confirmDialog, setConfirmDialog] = useState<{ visible: boolean; message: string; onConfirm: () => void } | null>(null);
  
  // 🚀 نظام التنبيهات الموحد الأنيق
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  }, []);

  const [newExam, setNewExam] = useState({
    lecture_id: '',
    form_index: '1',
    duration_minutes: '30',
    pass_score: '60',
    title: '',
    instructions: '',
    shuffle_questions: true,
    shuffle_options: true,
    max_attempts: '1',
    show_correct_answers: true,
    show_score: true,
    per_question_time: false,
    random_question_count: '' as string,
  });

  const [newQuestion, setNewQuestion] = useState({
    body: '',
    question_type: 'mcq',
    options: ['', '', '', ''],
    correct_answer: 0,
    correct_answers: [0],
    image_url: '',
    option_images: ['', '', '', ''],
    points: '1',
    time_limit_seconds: null as number | null,
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  // تجميد التمرير للنوافذ المنبثقة
  useEffect(() => {
    if (showQuestionForm || confirmDialog) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [showQuestionForm, confirmDialog]);

  useEffect(() => {
    if (!isChecking) fetchLectures();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isChecking]);

  useEffect(() => {
    if (selectedLectureId && !isChecking) {
      fetchExams();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLectureId, isChecking]);

  const fetchLectures = async () => {
    try {
      const response = await api.get(`/admin/courses/${courseId}/lectures`);
      const data = response.data?.data || response.data || [];
      const validLectures = Array.isArray(data) ? data : [];
      setLectures(validLectures);
      
      const passedLectureId = searchParams.get('lecture_id');
      
      if (passedLectureId && validLectures.find((l: any) => String(l.id) === passedLectureId)) {
        setSelectedLectureId(passedLectureId);
      } else if (validLectures.length > 0) {
        setSelectedLectureId(String(validLectures[0].id));
      }
    } catch (err: any) {
      showToast(err?.message || 'فشل تحميل قائمة المحاضرات', 'error');
    }
  };

  const fetchExams = async () => {
    if (!selectedLectureId) return;
    setLoading(true);
    try {
      const response = await api.get(`/admin/lectures/${selectedLectureId}/exams`);
      const data = response.data?.data || response.data || [];
      setExams(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err?.message || 'فشل تحميل نماذج الاختبارات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newExam,
        form_index: parseInt(newExam.form_index) || 1,
        duration_minutes: parseInt(newExam.duration_minutes) || 30,
        pass_score: parseInt(newExam.pass_score) || 60,
        max_attempts: parseInt(newExam.max_attempts) || 1,
        random_question_count: newExam.random_question_count ? parseInt(newExam.random_question_count) : null,
      };

      await api.post(`/admin/lectures/${selectedLectureId}/exams`, payload);

      showToast('تم إنشاء نموذج الاختبار بنجاح!', 'success');
      setShowCreateForm(false);
      fetchExams();
    } catch (err: any) {
      showToast(err?.message || err?.error || 'فشل إنشاء الاختبار، راجع البيانات المدخلة', 'error');
    }
  };

  const handleDeleteExam = (examId: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من حذف هذا الاختبار؟ سيتم تدمير جميع أسئلته ولن يمكن التراجع.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/admin/exams/${examId}`);
          showToast('تم حذف الاختبار بنجاح', 'success');
          fetchExams();
        } catch (err: any) {
          showToast(err?.message || 'فشل حذف الاختبار', 'error');
        }
      }
    });
  };

  // رفع الصور ذكياً
  const handleQuestionImageUpload = async (file: File, index: number | null) => {
    if (!file.type.startsWith('image/')) {
      showToast('يجب اختيار ملف صورة فقط', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/admin/questions/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const url = response.data?.data?.url || response.data?.url;
      
      if (index === null) {
        setNewQuestion(prev => ({ ...prev, image_url: url }));
      } else {
        setNewQuestion(prev => {
          const currentImages = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
          currentImages[index] = url;
          return { ...prev, option_images: currentImages };
        });
      }
      showToast('تم رفع الصورة بنجاح!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'فشل رفع الصورة', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleQuestionImageUpload(file, null);
      e.target.value = ''; // تفريغ الحقل
    }
  };

  const handleOptionImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      handleQuestionImageUpload(file, index);
      e.target.value = ''; // تفريغ الحقل
    }
  };

  // معالج اللصق (Paste) الذكي للصور
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
              setNewQuestion(prev => ({ 
                ...prev, 
                image_url: url,
                body: prev.body + `\n![صورة مرفقة](${url})`
              }));
            } else {
              setNewQuestion(prev => {
                const currentImages = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
                currentImages[index] = url;
                
                const currentOptions = [...prev.options];
                if (!currentOptions[index]) {
                  currentOptions[index] = `صورة مرفقة كخيار`;
                }
                
                return { 
                  ...prev, 
                  option_images: currentImages,
                  options: currentOptions
                };
              });
            }
            showToast('تم رفع ولصق الصورة بنجاح!', 'success');
          } catch (err: any) {
            showToast(err?.message || 'خطأ في رفع الصورة الملصقة', 'error');
          } finally {
            setUploadingImage(false);
          }
        }
        break;
      }
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    // 🚀 حماية إرسال السؤال (Validation)
    if (!newQuestion.body.trim() && !newQuestion.image_url) {
      showToast('يرجى كتابة نص السؤال أو إرفاق صورة له على الأقل', 'error');
      return;
    }

    try {
      const payload = {
        ...newQuestion,
        points: parseInt(newQuestion.points) || 1,
      };

      await api.post(`/admin/exams/${selectedExam.id}/questions`, payload);

      showToast('تم إضافة السؤال بنجاح!', 'success');
      setShowQuestionForm(false);
      
      // تفريغ النموذج بأمان
      setNewQuestion({
        body: '',
        question_type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: 0,
        correct_answers: [0],
        image_url: '',
        option_images: ['', '', '', ''],
        points: '1',
        time_limit_seconds: null,
      });
      fetchExams();
    } catch (err: any) {
      showToast(err?.message || err?.error || 'فشل إضافة السؤال', 'error');
    }
  };

  const handleDeleteQuestion = (questionId: number) => {
    setConfirmDialog({
      visible: true,
      message: 'هل أنت متأكد من حذف هذا السؤال من نموذج الاختبار؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/admin/questions/${questionId}`);
          showToast('تم حذف السؤال بنجاح', 'success');
          fetchExams();
        } catch (err: any) {
          showToast(err?.message || 'فشل الحذف', 'error');
        }
      }
    });
  };

  const questionTypes = [
    { value: 'mcq', label: 'اختيار إجابة واحدة (MCQ)' },
    { value: 'multi_select', label: 'تحديد إجابات متعددة (Multi Select)' },
  ];

  const getQuestionTypeLabel = (type: string) => {
    return questionTypes.find(t => t.value === type)?.label || type;
  };

  if (isChecking) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-content flex items-center justify-center min-h-[60vh]">
          <div className="loading-state text-center flex flex-col items-center">
             <div className="spinner spinner-primary spinner-lg mb-4 mx-auto" />
             <p className="font-bold text-muted text-lg">جاري تجهيز محرر الاختبارات...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout relative">
      <AdminSidebar />
      
      {/* 🚀 نظام التنبيهات الموحد العائم - تم وضعه في الجذر ليعلو كل شيء */}
      <div 
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300" 
        style={{ 
          opacity: toast.visible ? 1 : 0, 
          transform: toast.visible ? 'translate(-50%, 0)' : 'translate(-50%, -20px)', 
          pointerEvents: toast.visible ? 'auto' : 'none' 
        }}
      >
        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl text-sm font-bold ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={20} /> : <AlertTriangleIcon size={20} />}
          <span>{toast.message}</span>
        </div>
      </div>

      {/* 🚀 نافذة التأكيد - تم وضعها في الجذر */}
      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmDialog(null)}>
          <div className="card shadow-2xl max-w-sm w-full text-center p-8 animate-scale-up bg-white rounded-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-4 text-error">
              <AlertTriangleIcon size={56} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4">تأكيد الإجراء</h3>
            <p className="text-gray-600 mb-8 leading-relaxed font-medium">{confirmDialog.message}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setConfirmDialog(null)} className="btn btn-outline flex-1 py-3 font-bold rounded-xl hover:bg-gray-50 border-gray-200">إلغاء</button>
              <button onClick={confirmDialog.onConfirm} className="btn btn-danger flex-1 py-3 font-bold shadow-lg shadow-red-200 rounded-xl text-white">نعم، متأكد</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 نافذة إضافة سؤال - تم نقلها خارج الـ <main> لتحل مشكلة الظهور في الأسفل */}
      {showQuestionForm && selectedExam && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] p-4 sm:p-6 animate-fade-in" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowQuestionForm(false)}>
          <form 
            onSubmit={handleAddQuestion} 
            className="bg-white w-full max-w-4xl flex flex-col shadow-2xl rounded-2xl overflow-hidden relative animate-scale-up h-full max-h-[95vh] md:max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* 1. Header */}
            <div className="shrink-0 bg-white border-b border-gray-100 px-6 sm:px-8 py-5 flex justify-between items-center z-10 shadow-sm">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-full shadow-inner"><SparklesIcon size={20} /></div>
                إضافة سؤال لنموذج #{selectedExam.form_index}
              </h3>
              <button type="button" onClick={() => { setShowQuestionForm(false); setSelectedExam(null); }} className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-full text-gray-400 hover:text-error hover:border-red-200 hover:bg-red-50 flex justify-center items-center transition-colors shadow-sm"><XIcon size={18} /></button>
            </div>

            {/* 2. Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-8 custom-scrollbar space-y-8 bg-gray-50/50" dir="rtl">
              
              <div className="form-group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <label className="form-label font-black text-lg mb-3 block text-gray-800">نوع السؤال</label>
                <select value={newQuestion.question_type} onChange={(e) => setNewQuestion(prev => ({ ...prev, question_type: e.target.value }))} className="input-field w-full text-lg p-4 bg-gray-50 font-bold border-gray-200 shadow-inner text-primary rounded-xl focus:bg-white transition-colors">
                  {questionTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label font-black text-lg mb-3 block text-gray-900">نص السؤال (إمكانية اللصق المباشر)</label>
                <textarea 
                  value={newQuestion.body} 
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, body: e.target.value }))} 
                  onPaste={(e) => handlePaste(e, null)} 
                  className="input-field w-full p-5 text-lg bg-white border-gray-200 focus:border-primary shadow-sm font-medium text-gray-900 leading-relaxed rounded-2xl" 
                  rows={4} 
                  placeholder="اكتب صيغة السؤال هنا، أو اضغط (Ctrl+V / Cmd+V) للصق صورة من الحافظة مباشرة وسيتم رفعها وإرفاقها تلقائياً..." 
                />
              </div>

              <div className="form-group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <label className="form-label font-black text-lg mb-4 block text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3"><ImageIcon size={20} className="text-primary" /> صورة توضيحية للسؤال (اختياري)</label>
                <div className="flex items-center gap-4 flex-wrap">
                  <input
                    type="file"
                    id="question-image-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="question-image-upload"
                    className="btn btn-outline bg-gray-50 cursor-pointer font-bold text-sm flex items-center gap-2 shadow-sm border-gray-200 hover:border-primary hover:bg-blue-50 hover:text-primary transition-all rounded-xl"
                    style={{ padding: '0.75rem 1.5rem' }}
                  >
                    {uploadingImage ? <><span className="spinner spinner-primary w-4 h-4 border-2" /> جاري الرفع...</> : <><UploadIcon size={16} /> رفع صورة يدوياً</>}
                  </label>

                  {newQuestion.image_url && (
                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-green-200 shadow-sm animate-scale-up">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={newQuestion.image_url} alt="Question" className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm" />
                      <button
                        type="button"
                        onClick={() => setNewQuestion(prev => ({ ...prev, image_url: '' }))}
                        className="btn btn-danger btn-xs font-bold text-xs px-3 py-1.5 rounded-lg"
                      >
                        حذف الصورة
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {(newQuestion.question_type === 'mcq' || newQuestion.question_type === 'multi_select') && (
                <div className="form-group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                  <label className="form-label font-black mb-2 block text-xl border-b border-gray-100 pb-4 text-gray-900 flex items-center gap-2">
                     <FileTextIcon size={24} className="text-primary"/> خيارات الإجابة المتاحة
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    {newQuestion.options.map((opt, i) => {
                      const optImg = newQuestion.option_images?.[i] || '';
                      return (
                        <div key={i} className="flex flex-col bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 focus-within:border-primary focus-within:shadow-md transition-all">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-primary bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner text-base">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <input 
                              type="text" 
                              value={opt} 
                              onChange={(e) => { 
                                const newOpts = [...newQuestion.options]; 
                                newOpts[i] = e.target.value; 
                                setNewQuestion(prev => ({ ...prev, options: newOpts })); 
                              }} 
                              onPaste={(e) => handlePaste(e, i)}
                              className="input-field flex-1 p-3 bg-white border-gray-200 font-medium text-gray-900 shadow-sm rounded-lg" 
                              placeholder={`اكتب الخيار ${String.fromCharCode(65 + i)} (أو الصق صورة)`} 
                              required={!optImg} 
                            />
                            <input
                              type="file"
                              id={`option-image-upload-${i}`}
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleOptionImageUpload(e, i)}
                              disabled={uploadingImage}
                            />
                            <label
                              htmlFor={`option-image-upload-${i}`}
                              className="btn btn-outline p-3 bg-white hover:bg-gray-100 cursor-pointer rounded-lg border border-gray-200 shrink-0 shadow-sm transition-colors"
                              title="إرفاق صورة لهذا الخيار"
                            >
                              <ImageIcon size={18} className="text-gray-500" />
                            </label>
                          </div>
                          
                          {optImg && (
                            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-green-200 shadow-sm animate-scale-up">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={optImg} alt={`Option ${String.fromCharCode(65 + i)}`} className="w-12 h-12 object-cover rounded-lg border border-gray-100" />
                              <button
                                type="button"
                                onClick={() => setNewQuestion(prev => {
                                  const currentImages = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
                                  currentImages[i] = '';
                                  return { ...prev, option_images: currentImages };
                                })}
                                className="btn btn-danger btn-xs font-bold text-xs px-3 py-1.5 rounded-lg"
                              >
                                حذف
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {newQuestion.question_type === 'mcq' && (
                <div className="form-group bg-green-50/50 p-6 rounded-2xl border border-green-200 shadow-sm">
                  <label className="form-label font-black text-xl mb-4 block flex items-center gap-2 text-green-800 border-b border-green-200/50 pb-3">
                    <CheckCircleIcon size={24} /> تحديد الإجابة الصحيحة
                  </label>
                  <select 
                     value={newQuestion.correct_answer} 
                     onChange={(e) => setNewQuestion(prev => ({ ...prev, correct_answer: parseInt(e.target.value) }))} 
                     className="input-field w-full p-4 font-black text-lg bg-white border-green-300 text-green-800 shadow-sm rounded-xl focus:border-green-500"
                  >
                    {newQuestion.options.map((opt, i) => (
                      <option key={i} value={i}>الخيار {String.fromCharCode(65 + i)}: {opt || `(صورة)`}</option>
                    ))}
                  </select>
                </div>
              )}

              {newQuestion.question_type === 'multi_select' && (
                <div className="form-group bg-green-50/50 p-6 rounded-2xl border border-green-200 shadow-sm space-y-4">
                  <label className="form-label font-black text-xl mb-2 block flex items-center gap-2 text-green-800 border-b border-green-200/50 pb-3">
                     <CheckCircleIcon size={24} /> تحديد الإجابات الصحيحة (حدد أكثر من خيار)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {newQuestion.options.map((opt, i) => (
                      <label key={i} className="flex items-center gap-4 cursor-pointer bg-white p-4 rounded-xl border border-green-200 hover:border-green-400 transition-all shadow-sm hover:shadow-md">
                        <input 
                           type="checkbox" 
                           className="w-6 h-6 rounded accent-success cursor-pointer border-gray-300" 
                           checked={newQuestion.correct_answers?.includes(i)} 
                           onChange={(e) => { 
                             const current = newQuestion.correct_answers || []; 
                             const newAnswers = e.target.checked ? [...current, i] : current.filter(a => a !== i); 
                             setNewQuestion(prev => ({ ...prev, correct_answers: newAnswers })); 
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
                <input type="text" value={newQuestion.points} onChange={(e) => setNewQuestion(prev => ({ ...prev, points: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full sm:w-32 p-3 text-center text-2xl font-black bg-white border-blue-200 text-primary shadow-inner rounded-xl mx-auto block" required dir="ltr" />
              </div>

            </div>

            {/* 3. Footer */}
            <div className="shrink-0 bg-white border-t border-gray-100 px-6 sm:px-8 py-5 flex flex-col sm:flex-row justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button type="button" onClick={() => { setShowQuestionForm(false); setSelectedExam(null); }} className="btn btn-outline px-10 py-3.5 font-bold border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-xl w-full sm:w-auto transition-colors">إلغاء النافذة</button>
              <button type="submit" className="btn btn-primary px-12 py-3.5 font-black shadow-lg shadow-blue-200 text-lg flex items-center justify-center gap-2 rounded-xl w-full sm:w-auto hover:-translate-y-0.5 transition-transform">
                 <CheckIcon size={20} /> حفظ وإضافة السؤال للبنك
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 🚀 محتوى الصفحة الرئيسي */}
      <main className="admin-content">
        <div className="mb-6 flex">
          <button 
            onClick={() => router.push(`/admin/courses/${courseId}/lectures`)} 
            className="btn btn-outline bg-white text-gray-600 hover:text-primary hover:bg-blue-50 border-gray-200 shadow-sm rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 transition-all w-fit"
          >
            <span className="text-xl leading-none">&rarr;</span> العودة للمحاضرات
          </button>
        </div>

        <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="page-title text-3xl font-black text-gray-900 flex items-center gap-3">
              <FileTextIcon size={32} className="text-primary" />
              بنك الأسئلة والاختبارات
            </h1>
            <p className="page-subtitle text-base mt-2">قم ببناء نماذج الاختبارات، تحديد الدرجات، وإضافة الأسئلة المدعمة بالصور.</p>
          </div>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className={`btn ${showCreateForm ? 'btn-outline border-error text-error hover:bg-red-50' : 'btn-primary shadow-lg shadow-blue-200'} font-bold rounded-xl px-6 py-3 transition-all`}>
            {showCreateForm ? <><XIcon size={18} /> إلغاء الإنشاء</> : <><PlusIcon size={18} /> إضافة نموذج اختبار جديد</>}
          </button>
        </div>

        <div className="card mb-8 flex flex-col md:flex-row items-start md:items-center gap-4 p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
          <label className="form-label mb-0 whitespace-nowrap font-bold text-gray-700 flex items-center gap-2">
             <BookIcon size={20} className="text-primary" /> استعراض اختبارات المحاضرة:
          </label>
          <select
            value={selectedLectureId}
            onChange={(e) => setSelectedLectureId(e.target.value)}
            className="input-field flex-1 text-lg font-black bg-gray-50 border-gray-200 shadow-inner rounded-xl py-3 focus:bg-white focus:border-primary transition-colors"
            style={{ maxWidth: 500 }}
          >
            {lectures.length === 0 ? <option value="">لا توجد محاضرات في هذا الكورس</option> : null}
            {lectures.map(lecture => (
              <option key={lecture.id} value={lecture.id}>{lecture.title}</option>
            ))}
          </select>
        </div>

        {showCreateForm && (
          <div className="card mb-8 border border-blue-200 shadow-xl rounded-2xl animate-fade-in bg-gradient-to-b from-blue-50/50 to-white p-6 md:p-8">
            <div className="border-b border-gray-100 pb-5 mb-6 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-primary flex items-center justify-center rounded-full shadow-inner"><SparklesIcon size={20} /></div>
                تكوين نموذج اختبار جديد
              </h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-error bg-gray-50 border border-gray-200 hover:border-red-200 hover:bg-red-50 w-10 h-10 rounded-full flex justify-center items-center transition-colors shadow-sm">
                <XIcon size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateExam} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-700 block mb-2">رقم النموذج (مثال: 1)</label>
                  <input type="text" value={newExam.form_index} onChange={(e) => setNewExam(prev => ({ ...prev, form_index: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full text-center text-xl font-black bg-gray-50 focus:bg-white rounded-xl py-3 border-gray-200" required dir="ltr" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-700 block mb-2">مدة الاختبار (بالدقائق)</label>
                  <input type="text" value={newExam.duration_minutes} onChange={(e) => setNewExam(prev => ({ ...prev, duration_minutes: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full text-center text-xl font-black bg-gray-50 focus:bg-white rounded-xl py-3 border-gray-200" required dir="ltr" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-700 block mb-2">درجة النجاح المطلوبة (%)</label>
                  <input type="text" value={newExam.pass_score} onChange={(e) => setNewExam(prev => ({ ...prev, pass_score: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full text-center text-xl font-black bg-green-50 text-success border-green-200 focus:border-green-500 rounded-xl py-3" required dir="ltr" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label font-bold text-gray-700 block mb-2">الحد الأقصى للمحاولات</label>
                  <input type="text" value={newExam.max_attempts} onChange={(e) => setNewExam(prev => ({ ...prev, max_attempts: e.target.value.replace(/[^0-9]/g, '') }))} className="input-field w-full text-center text-xl font-black bg-gray-50 text-primary focus:bg-white border-gray-200 rounded-xl py-3" required dir="ltr" />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label font-bold text-gray-700 text-lg block mb-2">عنوان وصفي للاختبار (اختياري)</label>
                <input type="text" value={newExam.title} onChange={(e) => setNewExam(prev => ({ ...prev, title: e.target.value }))} className="input-field w-full p-4 text-lg font-bold bg-white shadow-sm border-gray-200 rounded-xl" placeholder="مثال: اختبار شامل على الباب الأول" dir="rtl" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-2xl bg-blue-50/50 border border-blue-100 shadow-inner">
                {[ 
                  { label: 'خلط الأسئلة عشوائياً', checked: newExam.shuffle_questions, key: 'shuffle_questions' }, 
                  { label: 'خلط الخيارات عشوائياً', checked: newExam.shuffle_options, key: 'shuffle_options' }, 
                  { label: 'السماح برؤية الإجابات بعد الانتهاء', checked: newExam.show_correct_answers, key: 'show_correct_answers' }, 
                  { label: 'السماح برؤية النتيجة المئوية', checked: newExam.show_score, key: 'show_score' }, 
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-3 cursor-pointer text-sm p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary/30 transition-colors">
                    <input type="checkbox" checked={item.checked} onChange={(e) => setNewExam(prev => ({ ...prev, [item.key]: e.target.checked }))} className="w-5 h-5 accent-primary rounded cursor-pointer border-gray-300" />
                    <span className="font-bold text-gray-800">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-outline px-10 py-3.5 font-bold border-gray-200 hover:bg-gray-50 bg-white rounded-xl">إلغاء التكوين</button>
                <button type="submit" className="btn btn-primary px-12 py-3.5 font-black shadow-lg shadow-blue-200 rounded-xl">حفظ وإنشاء النموذج</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="card p-16 flex flex-col justify-center items-center shadow-sm border border-gray-100 rounded-2xl bg-white">
            <div className="spinner spinner-primary spinner-lg mb-4"></div>
            <p className="font-bold text-gray-500">جاري سحب بنك الأسئلة من السيرفر...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="empty-state bg-white border border-gray-100 rounded-2xl py-20 shadow-sm text-center">
            <div className="empty-state-icon bg-gray-50 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
              <FileTextIcon size={48} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-black text-gray-800">لا توجد اختبارات مسجلة</h3>
            <p className="text-gray-500 font-medium text-lg mt-2 mb-8 max-w-sm mx-auto">لم يتم إنشاء أي نموذج اختبار لهذه المحاضرة بعد. يمكنك إضافة نموذج جديد الآن.</p>
            <button onClick={() => setShowCreateForm(true)} className="btn btn-primary btn-lg shadow-lg shadow-blue-200 font-bold px-8 rounded-xl"><PlusIcon size={20} className="ml-2 inline" /> أضف النموذج الأول للمحاضرة</button>
          </div>
        ) : (
          <div className="space-y-8">
            {exams.map(exam => (
              <div key={exam.id} className="card bg-white border border-gray-200 shadow-sm rounded-2xl p-0 relative overflow-hidden transition-all hover:shadow-md group">
                
                {/* رأس نموذج الاختبار */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-5 gap-4 bg-gray-50 p-6">
                  <div>
                    <h3 className="text-2xl font-black text-primary mb-3 flex items-center gap-3">
                      <span className="bg-gradient-to-br from-primary to-blue-500 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-inner text-lg">#{exam.form_index}</span>
                      <span>نموذج الاختبار</span>
                      {exam.title && <span className="text-gray-600 text-sm font-bold truncate max-w-[250px] bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">{exam.title}</span>}
                    </h3>
                    <div className="flex gap-2.5 flex-wrap text-xs font-black mt-4">
                      <span className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 flex items-center gap-1.5 shadow-sm"><ClockIcon size={14} className="text-primary"/> {exam.duration_minutes} دقيقة</span>
                      <span className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-1.5 shadow-sm"><AwardIcon size={14} /> نجاح: {exam.pass_score}%</span>
                      <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-1.5 shadow-sm"><RefreshIcon size={14} /> محاولات: {exam.max_attempts}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button onClick={() => { setSelectedExam(exam); setShowQuestionForm(true); }} className="btn btn-primary px-6 py-3 font-bold rounded-xl shadow-md shadow-blue-200 flex items-center gap-2 w-full md:w-auto justify-center transition-transform hover:-translate-y-0.5"><PlusIcon size={18} /> أضف سؤال للنموذج</button>
                    <button onClick={() => handleDeleteExam(exam.id)} className="btn btn-outline border-red-200 text-error bg-white hover:bg-red-50 hover:border-red-300 px-4 py-3 font-bold rounded-xl flex items-center justify-center w-full md:w-auto transition-colors" title="حذف النموذج بالكامل"><TrashIcon size={18} /></button>
                  </div>
                </div>

                {/* قائمة الأسئلة المدرجة */}
                <div className="p-6">
                  <h4 className="font-black mb-5 text-gray-600 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <FileTextIcon size={18} className="text-primary" />
                    الأسئلة المدرجة حالياً ({exam.questions?.length || 0})
                  </h4>
                  
                  {(!exam.questions || exam.questions.length === 0) ? (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="font-bold text-gray-400">لا توجد أي أسئلة مضافة في هذا النموذج حتى الآن.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {exam.questions.map((question, index) => (
                        <div key={question.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-primary/30 hover:shadow-md transition-all gap-4 group/question">
                          <div className="flex items-start gap-4 flex-1 w-full">
                            <span className="font-black text-primary bg-blue-50 w-10 h-10 flex items-center justify-center rounded-xl shrink-0 text-lg border border-blue-100 shadow-sm">
                              {index + 1}
                            </span>
                            <div className="flex-1 w-0">
                              <span className="font-bold block mb-3 break-words text-gray-900 text-lg leading-relaxed">{question.body}</span>
                              <div className="flex gap-2 text-[11px] font-bold">
                                <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md border border-gray-200">{getQuestionTypeLabel(question.question_type)}</span>
                                <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-md border border-green-200 flex items-center gap-1.5"><AwardIcon size={14} /> {question.points} نقاط</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteQuestion(question.id)} className="text-gray-400 hover:text-white bg-gray-50 hover:bg-red-500 w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 shadow-sm border border-gray-200 hover:border-red-600" title="حذف السؤال"><TrashIcon size={18} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}