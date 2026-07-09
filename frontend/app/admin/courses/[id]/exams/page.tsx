'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminSidebar from '@/app/components/AdminSidebar';
import {
  FileTextIcon, XIcon, ClockIcon, AwardIcon, RefreshIcon,
  PlusIcon, TrashIcon, SparklesIcon, ImageIcon, CheckIcon,
  CheckCircleIcon, AlertTriangleIcon
} from '@/app/components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const getToken = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('token='))
    ?.split('=')[1] || localStorage.getItem('token');
};

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
  const courseId = params.id;

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<string>('');

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  const [newExam, setNewExam] = useState({
    lecture_id: '',
    form_index: 1 as number | string,
    duration_minutes: 30 as number | string,
    pass_score: 60 as number | string,
    title: '',
    instructions: '',
    shuffle_questions: true,
    shuffle_options: true,
    max_attempts: 1 as number | string,
    show_correct_answers: true,
    show_score: true,
    per_question_time: false,
    random_question_count: null as number | string | null,
  });

  const [newQuestion, setNewQuestion] = useState({
    body: '',
    question_type: 'mcq',
    options: ['', '', '', ''],
    correct_answer: 0,
    correct_answers: [0],
    image_url: '',
    option_images: ['', '', '', ''],
    points: 1 as number | string,
    time_limit_seconds: null as number | null,
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchLectures();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (selectedLectureId) {
      fetchExams();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLectureId]);

  const fetchLectures = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/courses/${courseId}/lectures`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLectures(data.data);
        
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const passedLectureId = urlParams.get('lecture_id');
          
          if (passedLectureId && data.data.find((l: any) => String(l.id) === passedLectureId)) {
            setSelectedLectureId(passedLectureId);
          } else if (data.data.length > 0) {
            setSelectedLectureId(String(data.data[0].id));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch lectures:', err);
    }
  };

  const fetchExams = async () => {
    if (!selectedLectureId) return;
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/lectures/${selectedLectureId}/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/lectures/${selectedLectureId}/exams`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(newExam),
      });

      if (res.ok) {
        showToast('تم إنشاء الاختبار بنجاح!', 'success');
        setShowCreateForm(false);
        fetchExams();
      } else {
        const data = await res.json();
        let errMsg = data.message || 'فشل إنشاء الاختبار';
        if (data.errors) {
          errMsg = Object.values(data.errors).flat().join(' \u2022 ');
        }
        showToast(errMsg, 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleDeleteExam = async (examId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟ سيتم حذف جميع أسئلته.')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/exams/${examId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
      });
      if (res.ok) {
        showToast('تم حذف الاختبار بنجاح', 'success');
        fetchExams();
      }
    } catch (err) {
      showToast('فشل الحذف', 'error');
    }
  };

  const handleQuestionImageUpload = async (file: File, index: number | null) => {
    if (!file.type.startsWith('image/')) {
      showToast('يجب اختيار ملف صورة فقط', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_URL}/api/admin/questions/upload-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const url = data.data.url;
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
      } else {
        showToast('فشل رفع الصورة', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleQuestionImageUpload(file, null);
  };

  const handleOptionImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) handleQuestionImageUpload(file, index);
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
            const token = getToken();
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch(`${API_URL}/api/admin/questions/upload-image`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
              },
              body: formData,
            });

            if (res.ok) {
              const data = await res.json();
              const url = data.data.url;
              if (index === null) {
                setNewQuestion(prev => ({ 
                  ...prev, 
                  image_url: url,
                  body: prev.body + `\n![صورة](${url})`
                }));
              } else {
                setNewQuestion(prev => {
                  const currentImages = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
                  currentImages[index] = url;
                  
                  const currentOptions = [...prev.options];
                  if (!currentOptions[index]) {
                    currentOptions[index] = `صورة الخيار`;
                  }
                  
                  return { 
                    ...prev, 
                    option_images: currentImages,
                    options: currentOptions
                  };
                });
              }
              showToast('تم رفع ولصق الصورة بنجاح!', 'success');
            } else {
              showToast('فشل رفع الصورة الملصقة', 'error');
            }
          } catch (err) {
            showToast('خطأ في الاتصال بالخادم عند لصق الصورة', 'error');
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

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/exams/${selectedExam.id}/questions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(newQuestion),
      });

      if (res.ok) {
        showToast('تم إضافة السؤال بنجاح!', 'success');
        setShowQuestionForm(false);
        setNewQuestion({
          body: '',
          question_type: 'mcq',
          options: ['', '', '', ''],
          correct_answer: 0,
          correct_answers: [0],
          image_url: '',
          option_images: ['', '', '', ''],
          points: 1,
          time_limit_seconds: null,
        });
        fetchExams();
      } else {
        const data = await res.json();
        let errMsg = data.message || 'فشل إضافة السؤال';
        if (data.errors) {
          errMsg = Object.values(data.errors).flat().join(' \u2022 ');
        }
        showToast(errMsg, 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/admin/questions/${questionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
      });
      if (res.ok) {
        showToast('تم حذف السؤال بنجاح', 'success');
        fetchExams();
      }
    } catch (err) {
      showToast('فشل الحذف', 'error');
    }
  };

  const questionTypes = [
    { value: 'mcq', label: 'اختيار من متعدد (MCQ)' },
    { value: 'multi_select', label: 'متعدد الاختيارات' },
  ];

  const getQuestionTypeLabel = (type: string) => {
    return questionTypes.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="admin-layout relative">
      <AdminSidebar />
      
      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
        <div className={`toast-content ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircleIcon size={18} /> : <XIcon size={18} />}
          {toast.message}
        </div>
      </div>

      <main className="admin-content">
        <div className="page-header">
          <div>
            <button onClick={() => router.push(`/admin/courses/${courseId}/lectures`)} className="back-link">
              &larr; العودة للمحاضرات
            </button>
            <h1 className="page-title">إدارة الاختبارات</h1>
            <p className="page-subtitle text-muted">قم بإنشاء وتعديل اختبارات المحاضرات</p>
          </div>
          <button onClick={() => setShowCreateForm(true)} className="btn btn-primary">
            <PlusIcon size={18} /> إضافة اختبار
          </button>
        </div>

        <div className="card mb-6 flex flex-col md:flex-row items-start md:items-center gap-4 p-5 bg-[#1f293a]/30 border border-white/5">
          <label className="form-label mb-0 whitespace-nowrap text-muted">حدد المحاضرة:</label>
          <select
            value={selectedLectureId}
            onChange={(e) => setSelectedLectureId(e.target.value)}
            className="input-field flex-1 text-lg font-medium bg-[#1a1b26]/50 border-white/10"
            style={{ maxWidth: 400 }}
          >
            {lectures.map(lecture => (
              <option key={lecture.id} value={lecture.id}>{lecture.title}</option>
            ))}
          </select>
        </div>

        {showCreateForm && (
          <div className="card mb-6 border border-primary/20 shadow-xl animate-fade-in">
            <div className="border-b border-white/10 pb-4 mb-5 flex justify-between items-center">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2"><FileTextIcon size={22} /> إنشاء اختبار جديد لهذه المحاضرة</h3>
              <button type="button" onClick={() => setShowCreateForm(false)} className="text-muted hover:text-error text-3xl"><XIcon size={24} /></button>
            </div>
            <form onSubmit={handleCreateExam} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 p-4 rounded-xl bg-black/20 border border-white/5">
                <div className="form-group">
                  <label className="form-label text-muted">رقم النموذج (1-3)</label>
                  <input type="number" min="1" max="3" value={newExam.form_index} onChange={(e) => setNewExam(prev => ({ ...prev, form_index: e.target.value === '' ? '' : parseInt(e.target.value) }))} className="input-field w-full text-center text-xl font-bold" required />
                </div>
                <div className="form-group">
                  <label className="form-label text-muted">الوقت (دقائق)</label>
                  <input type="number" min="1" max="180" value={newExam.duration_minutes} onChange={(e) => setNewExam(prev => ({ ...prev, duration_minutes: e.target.value === '' ? '' : parseInt(e.target.value) }))} className="input-field w-full text-center text-xl font-bold" required />
                </div>
                <div className="form-group">
                  <label className="form-label text-muted">درجة النجاح (%)</label>
                  <input type="number" min="1" max="100" value={newExam.pass_score} onChange={(e) => setNewExam(prev => ({ ...prev, pass_score: e.target.value === '' ? '' : parseInt(e.target.value) }))} className="input-field w-full text-center text-xl font-bold" required />
                </div>
                <div className="form-group">
                  <label className="form-label text-muted">عدد المحاولات</label>
                  <input type="number" min="1" value={newExam.max_attempts} onChange={(e) => setNewExam(prev => ({ ...prev, max_attempts: e.target.value === '' ? '' : parseInt(e.target.value) }))} className="input-field w-full text-center text-xl font-bold" />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label text-muted">عنوان الاختبار (اختياري)</label>
                <input type="text" value={newExam.title} onChange={(e) => setNewExam(prev => ({ ...prev, title: e.target.value }))} className="input-field w-full p-4 bg-black/20" placeholder="مثال: اختبار نهاية الفصل الأول" />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-xl bg-[#1f293a]/30 border border-white/5">
                {[ { label: 'خلط الأسئلة', checked: newExam.shuffle_questions, key: 'shuffle_questions' }, { label: 'خلط الخيارات', checked: newExam.shuffle_options, key: 'shuffle_options' }, { label: 'عرض الإجابات', checked: newExam.show_correct_answers, key: 'show_correct_answers' }, { label: 'عرض النتيجة', checked: newExam.show_score, key: 'show_score' }, ].map(item => (
                  <label key={item.key} className="flex items-center gap-3 cursor-pointer text-sm p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <input type="checkbox" checked={item.checked} onChange={(e) => setNewExam(prev => ({ ...prev, [item.key]: e.target.checked }))} className="accent-primary w-5 h-5" />
                    <span className="text-gray-300">{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-outline px-10">إلغاء</button>
                <button type="submit" className="btn btn-primary px-12 font-bold shadow-lg shadow-primary/30">حفظ وإنشاء</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner-lg"></div>
            <p className="mt-4 font-bold">جاري تحميل الاختبارات...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileTextIcon size={36} />
            </div>
            <h3>لا توجد اختبارات مسجلة</h3>
            <p>لم يتم إنشاء أي نموذج اختبار لهذه المحاضرة بعد. ابدأ الآن بإنشاء النموذج الأول.</p>
            <button onClick={() => setShowCreateForm(true)} className="btn btn-primary btn-lg"><PlusIcon size={18} /> أضف الاختبار الأول</button>
          </div>
        ) : (
          <div className="space-y-6">
            {exams.map(exam => (
              <div key={exam.id} className="card relative overflow-hidden transition-transform duration-300 hover:-translate-y-1">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-white/10 pb-5 gap-4 bg-black/10 p-5 rounded-t-xl -m-6 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-3 flex items-center gap-3">
                      <span>نموذج الاختبار #{exam.form_index}</span>
                      {exam.title && <span className="text-muted text-sm font-normal truncate max-w-[200px]">| {exam.title}</span>}
                    </h3>
                    <div className="flex gap-2 flex-wrap text-xs font-bold">
                      <span className="p-2 rounded-lg bg-gray-700 text-white flex items-center gap-1.5"><ClockIcon size={14} /> {exam.duration_minutes} دقيقة</span>
                      <span className="p-2 rounded-lg bg-success/10 text-success flex items-center gap-1.5"><AwardIcon size={14} /> نجاح: {exam.pass_score}%</span>
                      <span className="p-2 rounded-lg bg-primary/10 text-primary flex items-center gap-1.5"><RefreshIcon size={14} /> محاولات: {exam.max_attempts}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button onClick={() => { setSelectedExam(exam); setShowQuestionForm(true); }} className="btn btn-primary px-6 py-2 font-bold rounded-lg flex items-center gap-1.5" style={{ minWidth: 'fit-content' }}><PlusIcon size={16} /> إضافة سؤال</button>
                    <button onClick={() => handleDeleteExam(exam.id)} className="btn btn-danger px-6 py-2 font-bold rounded-lg flex items-center gap-1.5" style={{ backgroundColor: '#ef4444', color: 'white', minWidth: 'fit-content' }}><TrashIcon size={16} /> حذف النموذج</button>
                  </div>
                </div>

                {exam.questions && exam.questions.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-4 text-sm text-muted">الأسئلة المدرجة في هذا النموذج ({exam.questions.length}):</h4>
                    <div className="space-y-3">
                      {exam.questions.map((question, index) => (
                        <div key={question.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#1a1b26]/30 rounded-lg border border-white/5 hover:border-primary/20 transition-colors gap-3">
                          <div className="flex items-start gap-3 flex-1 w-full">
                            <span className="font-bold text-background bg-primary/90 w-8 h-8 flex items-center justify-center rounded-full shrink-0 text-sm shadow-md">
                              {index + 1}
                            </span>
                            <div className="flex-1 w-0">
                              <span className="font-medium block mb-2 break-words text-gray-100">{question.body}</span>
                              <div className="flex gap-2 text-xs">
                                <span className="badge badge-secondary p-1 px-2 opacity-70">{getQuestionTypeLabel(question.question_type)}</span>
                                <span className="badge badge-success p-1 px-2 opacity-70"><AwardIcon size={12} /> {question.points} نقاط</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteQuestion(question.id)} className="text-error hover:bg-error/10 p-2.5 rounded-full transition-colors shrink-0" title="حذف السؤال"><TrashIcon size={18} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Question Modal */}
        {showQuestionForm && selectedExam && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
            
            <form 
              onSubmit={handleAddQuestion} 
              className="bg-[#1a1b26] w-full max-w-4xl flex flex-col shadow-2xl border border-white/10 rounded-2xl overflow-hidden relative"
              style={{ maxHeight: '90vh' }}
            >
              
              {/* 1. Header */}
              <div className="shrink-0 bg-black/40 border-b border-white/10 px-6 sm:px-8 py-5 flex justify-between items-center">
                <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                  <SparklesIcon size={22} /> إضافة سؤال للنموذج #{selectedExam.form_index}
                </h3>
                <button type="button" onClick={() => { setShowQuestionForm(false); setSelectedExam(null); }} className="text-muted hover:text-error text-3xl leading-none transition-colors"><XIcon size={24} /></button>
              </div>

              {/* 2. Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-8 custom-scrollbar space-y-7" dir="rtl">
                
                <div className="form-group bg-[#1f293a]/30 p-5 rounded-xl border border-white/5">
                  <label className="form-label font-bold text-lg mb-3 block">نوع السؤال</label>
                  <select value={newQuestion.question_type} onChange={(e) => setNewQuestion(prev => ({ ...prev, question_type: e.target.value }))} className="input-field w-full text-lg p-3 bg-black/20 border-white/10" style={{ color: 'white' }}>
                    {questionTypes.map(type => (
                      <option key={type.value} value={type.value} className="bg-gray-900 text-white">{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label font-bold text-lg mb-2 block">عنوان / نص السؤال</label>
                  <textarea value={newQuestion.body} onChange={(e) => setNewQuestion(prev => ({ ...prev, body: e.target.value }))} onPaste={(e) => handlePaste(e, null)} className="input-field w-full p-4 text-lg bg-black/20 border-white/10" rows={3} required placeholder="اكتب سؤالك بوضوح هنا... (أو الصق صورة هنا مباشرة)" style={{ color: 'white' }} />
                </div>

                <div className="form-group bg-[#1f293a]/30 p-5 rounded-xl border border-white/5">
                  <label className="form-label font-bold text-lg mb-3 block">صورة السؤال (اختياري)</label>
                  <div className="flex items-center gap-4 flex-wrap">
                    <input
                      type="file"
                      id="question-image-upload"
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="question-image-upload"
                      className="btn btn-outline cursor-pointer font-bold text-sm flex items-center gap-2"
                      style={{ padding: '0.5rem 1.25rem' }}
                    >
                      {uploadingImage ? <><ClockIcon size={16} /> جاري رفع الصورة...</> : <><ImageIcon size={16} /> رفع صورة السؤال</>}
                    </label>

                    {newQuestion.image_url && (
                      <div className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-[#10b981]/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={newQuestion.image_url} alt="Question" className="w-16 h-16 object-cover rounded-lg border" />
                        <button
                          type="button"
                          onClick={() => setNewQuestion(prev => ({ ...prev, image_url: '' }))}
                          className="btn btn-danger btn-xs font-bold text-xs"
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          إزالة الصورة
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {(newQuestion.question_type === 'mcq' || newQuestion.question_type === 'multi_select') && (
                  <div className="form-group bg-black/20 p-6 rounded-xl border border-white/10 space-y-4">
                    <label className="form-label font-bold mb-5 block text-lg border-b border-white/10 pb-3 text-white">الخيارات المتاحة للطلاب</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      {newQuestion.options.map((opt, i) => {
                        const optImg = newQuestion.option_images?.[i] || '';
                        return (
                          <div key={i} className="flex flex-col bg-black/30 p-3 rounded-lg border border-white/5 space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-white bg-primary/70 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-lg text-sm">
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
                                className="input-field flex-1 p-3 bg-black/30 border-white/10" 
                                placeholder={`اكتب الخيار ${String.fromCharCode(65 + i)} (أو الصق صورة هنا)`} 
                                required 
                                style={{ color: 'white' }} 
                              />
                              <input
                                type="file"
                                id={`option-image-upload-${i}`}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={(e) => handleOptionImageUpload(e, i)}
                                disabled={uploadingImage}
                              />
                              <label
                                htmlFor={`option-image-upload-${i}`}
                                className="btn btn-outline p-2 hover:bg-white/5 cursor-pointer rounded-lg border border-white/10 shrink-0"
                                title="رفع صورة لهذا الخيار"
                              >
                                <ImageIcon size={18} />
                              </label>
                            </div>
                            
                            {optImg && (
                              <div className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-[#10b981]/20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={optImg} alt={`Option ${String.fromCharCode(65 + i)}`} className="w-12 h-12 object-cover rounded-lg border border-white/10" />
                                <button
                                  type="button"
                                  onClick={() => setNewQuestion(prev => {
                                    const currentImages = prev.option_images ? [...prev.option_images] : ['', '', '', ''];
                                    currentImages[i] = '';
                                    return { ...prev, option_images: currentImages };
                                  })}
                                  className="btn btn-danger btn-xs font-bold text-xs"
                                  style={{ padding: '0.15rem 0.4rem', backgroundColor: '#ef4444' }}
                                >
                                  إزالة الصورة
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
                  <div className="form-group bg-success/10 p-5 rounded-xl border border-[#10b981]/30">
                    <label className="form-label font-bold text-lg mb-3 block flex items-center gap-2" style={{ color: '#10b981' }}><CheckCircleIcon size={20} /> حدد الإجابة الصحيحة</label>
                    <select value={newQuestion.correct_answer} onChange={(e) => setNewQuestion(prev => ({ ...prev, correct_answer: parseInt(e.target.value) }))} className="input-field w-full p-3 font-bold bg-black/40 border-[#10b981]/30" style={{ color: '#10b981' }}>
                      {newQuestion.options.map((opt, i) => (
                        <option key={i} value={i} className="bg-gray-900 text-white">الخيار {String.fromCharCode(65 + i)}: {opt || `(فارغ)`}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newQuestion.question_type === 'multi_select' && (
                  <div className="form-group bg-success/10 p-6 rounded-xl border border-[#10b981]/30 space-y-3">
                    <label className="form-label font-bold text-lg mb-3 block flex items-center gap-2" style={{ color: '#10b981' }}><CheckCircleIcon size={20} /> الإجابات الصحيحة (حدد أكثر من خيار)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {newQuestion.options.map((opt, i) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer bg-black/40 p-3.5 rounded-lg border border-[#10b981]/30 hover:border-[#10b981]/50 transition-colors">
                          <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: '#10b981' }} checked={newQuestion.correct_answers?.includes(i)} onChange={(e) => { const current = newQuestion.correct_answers || []; const newAnswers = e.target.checked ? [...current, i] : current.filter(a => a !== i); setNewQuestion(prev => ({ ...prev, correct_answers: newAnswers })); }} />
                          <span className="font-bold text-white text-lg">{String.fromCharCode(65 + i)}: <span className="font-normal text-gray-300">{opt || `(فارغ)`}</span></span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group bg-[#1f293a]/30 p-5 rounded-xl border border-white/5 inline-block">
                  <label className="form-label font-bold text-lg mb-2 block text-white">النقاط (درجة هذا السؤال)</label>
                  <input type="number" min="1" value={newQuestion.points} onChange={(e) => setNewQuestion(prev => ({ ...prev, points: e.target.value === '' ? '' : parseInt(e.target.value) }))} className="input-field w-32 p-3 text-center text-xl font-bold bg-black/30 border-white/10" style={{ color: 'white' }} />
                </div>

              </div>

              {/* 3. Footer */}
              <div className="shrink-0 bg-black/60 border-t border-white/10 px-6 sm:px-8 py-5 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowQuestionForm(false); setSelectedExam(null); }} className="btn btn-outline px-10 py-2.5 font-bold" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>إلغاء</button>
                <button type="submit" className="btn btn-primary px-12 py-2.5 font-bold shadow-lg text-lg flex items-center gap-2"><CheckIcon size={20} /> حفظ السؤال</button>
              </div>

            </form>
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .bg-3xl {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
        }
      `}</style>
    </div>
  );
}
