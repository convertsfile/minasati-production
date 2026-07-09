'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import {
  AlertTriangleIcon, AwardIcon, AlertCircleIcon,
  FileTextIcon, ClockIcon, UploadIcon, RefreshIcon,
  CheckIcon, ArrowRightIcon, XIcon
} from '../../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface Question {
  id: number;
  body: string;
  options: string[];
  image_url?: string | null;
  option_images?: string[] | null;
  correctAnswer?: number;
  selectedAnswer?: number | null;
}

interface ExamData {
  exam: {
    id: number;
    formIndex: number;
    durationMinutes: number;
    passScore: number;
  };
  questions: Question[];
  attempt: {
    id: number;
    startedAt: string;
    remainingTime: number;
  };
  isResume: boolean;
}

interface ExamResult {
  score: number;
  passed: boolean;
  passScore: number;
  totalQuestions: number;
  correctAnswers: number;
  hasAnotherVersion?: boolean;
}

export default function ExamPage() {
  const { isChecking } = useAuthGuard();
  const router = useRouter();
  const params = useParams();
  const lectureId = params.lectureId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isReview, setIsReview] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 4000);
  };

  const fetchExam = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const statusRes = await fetch(`${API_URL}/api/auth/status`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (statusRes.status === 401) {
        document.cookie = "token=; Max-Age=0";
        localStorage.removeItem('token');
        router.replace('/login');
        return;
      }
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.data?.status === 'pending') {
          router.replace('/waiting-room');
          return;
        }
      }

      const searchParams = new URLSearchParams(window.location.search);
      const isReviewMode = searchParams.get('review') === 'true';
      const reviewAttemptId = searchParams.get('attempt_id');
      setIsReview(isReviewMode);

      let response;
      if (isReviewMode && reviewAttemptId) {
        response = await fetch(`${API_URL}/api/exams/attempts/${reviewAttemptId}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
      } else {
        response = await fetch(`${API_URL}/api/lectures/${lectureId}/exam`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
      }

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

      const data = await response.json();

      if (response.ok) {
        const d = data.data;

        if (isReviewMode) {
          const mappedExamData: ExamData = {
            exam: {
              id: d.examId,
              formIndex: d.formIndex ?? 1,
              durationMinutes: 0,
              passScore: d.passScore ?? 50,
            },
            questions: d.questions || [],
            attempt: {
              id: d.id,
              startedAt: d.completedAt ?? '',
              remainingTime: 0,
            },
            isResume: false,
          };

          setExamData(mappedExamData);
          setTimeLeft(0);

          const initialAnswers: Record<number, number> = {};
          d.questions.forEach((q: Question) => {
            if (q.selectedAnswer !== null && q.selectedAnswer !== undefined) {
              initialAnswers[q.id] = q.selectedAnswer;
            }
          });
          setAnswers(initialAnswers);

          setResult({
            score: d.score,
            passed: d.passed,
            passScore: d.passScore ?? 50,
            totalQuestions: d.questions.length,
            correctAnswers: d.questions.filter((q: Question) => q.selectedAnswer === q.correctAnswer).length,
          });
          setShowResults(true);
        } else {
          const mappedExamData: ExamData = {
            exam: {
              id: d.exam.id,
              formIndex: d.exam.form_index ?? d.exam.formIndex,
              durationMinutes: d.exam.duration_minutes ?? d.exam.durationMinutes,
              passScore: d.exam.pass_score ?? d.exam.passScore,
            },
            questions: d.questions || [],
            attempt: {
              id: d.attempt.id,
              startedAt: d.attempt.started_at ?? d.attempt.startedAt,
              remainingTime: d.attempt.remaining_time ?? d.attempt.remainingTime,
            },
            isResume: d.is_resume ?? d.isResume ?? false,
          };

          setExamData(mappedExamData);
          setTimeLeft(mappedExamData.attempt.remainingTime);

          if (mappedExamData.isResume) {
            const saved = localStorage.getItem(`exam_answers_${mappedExamData.attempt.id}`);
            if (saved) {
              setAnswers(JSON.parse(saved));
            }
          }
        }
      } else if (data.code === 'ERR_EXAM_LOCKOUT') {
        setError('لقد استنفدت جميع المحاولات المتاحة لهذا الاختبار، وتم تحويلك لقسم المتابعة. يرجى التواصل مع الإدارة.');
      } else if (data.code === 'ERR_LECTURE_LOCKED') {
        setError('يجب عليك اجتياز اختبار المحاضرة السابقة أولاً');
      } else {
        setError(data.error || data.message || 'فشل تحميل الاختبار');
      }
    } catch (err) {
      console.error('Failed to fetch exam:', err);
      setError('حدث خطأ أثناء تحميل الاختبار');
    } finally {
      setLoading(false);
    }
  }, [lectureId, router]);

  useEffect(() => {
    fetchExam();
  }, [fetchExam]);

  useEffect(() => {
    if (!examData || timeLeft <= 0 || result) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          showToast('انتهى الوقت! جاري تسليم الإجابات...', 'error');
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examData, timeLeft, result]);

  useEffect(() => {
    if (examData && Object.keys(answers).length > 0) {
      localStorage.setItem(`exam_answers_${examData.attempt.id}`, JSON.stringify(answers));
    }
  }, [answers, examData]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!examData) return;

    const unansweredCount = examData.questions.length - Object.keys(answers).length;
    if (!autoSubmit && unansweredCount > 0) {
      if (!confirm(`لم تجب على ${unansweredCount} سؤال/أسئلة. هل تريد التسليم الآن؟`)) {
        return;
      }
    }

    setSubmitting(true);

    try {
      const token = getToken();
      const formattedAnswers = examData.questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id] ?? -1,
      }));

      const response = await fetch(`${API_URL}/api/lectures/${lectureId}/exam/${examData.exam.id}/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          attempt_id: examData.attempt.id,
          answers: formattedAnswers,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const resData = data.data;
        setResult({
          score: resData.score,
          passed: resData.passed,
          passScore: resData.pass_score ?? resData.passScore,
          totalQuestions: resData.total_questions ?? resData.totalQuestions,
          correctAnswers: resData.correct_answers ?? resData.correctAnswers,
          hasAnotherVersion: resData.hasAnotherVersion ?? resData.has_another_version ?? false,
        });
        setShowResults(true);
        localStorage.removeItem(`exam_answers_${examData.attempt.id}`);
      } else {
        showToast(data.error || data.message || 'فشل تسليم الاختبار', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء تسليم الاختبار. تأكد من اتصالك بالإنترنت.', 'error');
    } finally {
      setSubmitting(false);
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)', padding: '2rem' }}>
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
            العودة للمحاضرة
          </button>
        </div>
      </div>
    );
  }

  if (!examData) return null;

  if (showResults && result) {
    return (
      <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem' }}>
        <Navbar />
        <div style={{ maxWidth: isReview ? 900 : 700, margin: '0 auto', paddingTop: '2rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div className="empty-state-icon" style={{ margin: '0 auto 1.5rem', width: 88, height: 88, borderRadius: '50%', background: result.passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
              {result.passed ? (
                <AwardIcon size={40} style={{ color: 'var(--success)' }} />
              ) : (
                <AlertCircleIcon size={40} style={{ color: 'var(--error)' }} />
              )}
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 800,
              color: result.passed ? 'var(--success)' : 'var(--error)',
              marginBottom: '1rem'
            }}>
              {result.passed ? 'تهانينا! لقد نجحت' : 'لم تنجح هذه المرة'}
            </h1>

            <div style={{
              background: 'var(--background)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    درجتك
                  </p>
                  <p style={{
                    fontSize: '3rem',
                    fontWeight: 800,
                    color: result.passed ? 'var(--success)' : 'var(--error)'
                  }}>
                    {result.score}%
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    درجة النجاح
                  </p>
                  <p style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {result.passScore}%
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    الإجابات الصحيحة
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {result.correctAnswers} / {result.totalQuestions}
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    النموذج
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    #{examData.exam.formIndex}
                  </p>
                </div>
              </div>
            </div>

            {result.passed ? (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                  أحسنت! لقد اجتزت الاختبار بنجاح ويمكنك الآن الانتقال للمحاضرة التالية.
                </p>
                <button
                  onClick={() => router.back()}
                  className="btn btn-primary"
                >
                  <ArrowRightIcon size={16} style={{ marginInlineEnd: '0.5rem' }} />
                  العودة للكورس
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                  {result.hasAnotherVersion
                    ? 'لا تيأس! يمكنك إعادة المحاولة بالنموذج التالي.'
                    : 'لقد استنفدت جميع المحاولات المتاحة لهذا الاختبار، وتم تحويلك لقسم المتابعة.'}
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  {result.hasAnotherVersion && !isReview && (
                    <button
                      onClick={() => window.location.reload()}
                      className="btn btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <RefreshIcon size={16} />
                      إعادة الاختبار
                    </button>
                  )}
                  <button
                    onClick={() => router.back()}
                    className="btn btn-outline"
                  >
                    العودة للكورس
                  </button>
                </div>
              </div>
            )}

            {isReview && (
              <div style={{ marginTop: '3rem', textAlign: 'right' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.75rem' }}>
                  مراجعة أسئلة الامتحان وإجاباتك
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {examData.questions.map((question: Question, index) => {
                    const selectedAns = answers[question.id];
                    const correctAns = question.correctAnswer;
                    
                    return (
                      <div
                        key={question.id}
                        className="card"
                        style={{
                          border: selectedAns === correctAns
                            ? '2px solid var(--success)'
                            : selectedAns !== undefined && selectedAns !== null
                              ? '2px solid var(--error)'
                              : '2px solid var(--border)',
                          padding: '1.5rem',
                          background: 'var(--surface)',
                          borderRadius: 'var(--radius-lg)'
                        }}
                      >
                        <div style={{ marginBottom: '1.5rem' }}>
                          <span style={{
                            display: 'inline-block',
                            background: selectedAns === correctAns ? 'var(--success)' : selectedAns !== undefined && selectedAns !== null ? 'var(--error)' : 'var(--text-muted)',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            marginBottom: '0.75rem'
                          }}>
                            السؤال {index + 1} • {selectedAns === correctAns ? 'إجابة صحيحة' : selectedAns !== undefined && selectedAns !== null ? 'إجابة خاطئة' : 'لم يتم حل السؤال'}
                          </span>
                          <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            lineHeight: 1.7
                          }}>
                            {question.body}
                          </h3>
                          {question.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={question.image_url} 
                              alt={`Question image`} 
                              style={{ maxWidth: '100%', maxHeight: '300px', display: 'block', margin: '1rem 0', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }} 
                            />
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {question.options.map((option: string, optIndex: number) => {
                            const isCorrect = optIndex === correctAns;
                            const isSelected = selectedAns === optIndex;
                            
                            const btnClass = 'btn-outline';
                            let borderStyle = '2px solid var(--border)';
                            let bgStyle = 'var(--background)';
                            let badgeBg = 'var(--border)';
                            let badgeColor = 'var(--text-muted)';
                            
                            if (isCorrect) {
                              borderStyle = '2px solid var(--success)';
                              bgStyle = 'rgba(16, 185, 129, 0.08)';
                              badgeBg = 'var(--success)';
                              badgeColor = 'white';
                            } else if (isSelected) {
                              borderStyle = '2px solid var(--error)';
                              bgStyle = 'rgba(239, 68, 68, 0.08)';
                              badgeBg = 'var(--error)';
                              badgeColor = 'white';
                            }

                            return (
                              <div
                                key={optIndex}
                                className={`${btnClass} btn`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '1rem',
                                  padding: '1rem 1.25rem',
                                  border: borderStyle,
                                  background: bgStyle,
                                  color: 'var(--text-primary)',
                                  textAlign: 'right',
                                  fontSize: '1rem',
                                  width: '100%',
                                  justifyContent: 'flex-start',
                                  borderRadius: 'var(--radius-md)',
                                  pointerEvents: 'none'
                                }}
                              >
                                <span style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: badgeBg,
                                  color: badgeColor,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.875rem',
                                  flexShrink: 0
                                }}>
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                                  <span>{option}</span>
                                  {question.option_images?.[optIndex] && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                      src={question.option_images[optIndex]} 
                                      alt={`Option ${String.fromCharCode(65 + optIndex)}`} 
                                      style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} 
                                    />
                                  )}
                                </div>

                                {isCorrect && (
                                  <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <CheckIcon size={16} /> الإجابة الصحيحة
                                  </span>
                                )}
                                {isSelected && !isCorrect && (
                                  <span style={{ fontSize: '0.85rem', color: 'var(--error)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <XIcon size={16} /> إجابتك الخاطئة
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', position: 'relative' }}>
      <Navbar />

      <div className={`toast-container ${toast.visible ? 'show' : ''}`}>
        <div className={`toast-content ${toast.type}`}>
          {toast.type === 'success' ? <CheckIcon size={18} /> : <AlertTriangleIcon size={18} />}
          {toast.message}
        </div>
      </div>

      <div className="exam-header" style={{
        background: 'var(--gradient-primary)',
        padding: '1.5rem 2rem',
        color: 'white',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 700,
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FileTextIcon size={20} />
              اختبار المحاضرة
            </h1>
            <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>
              نموذج #{examData.exam.formIndex} • {examData.questions.length} سؤال
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div className={`badge ${timeLeft < 60 ? 'badge-error' : ''}`} style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1.5rem',
              fontFamily: 'monospace',
              fontWeight: 700,
              background: timeLeft < 60 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.15)',
              color: 'white',
              border: timeLeft < 60 ? '2px solid var(--error)' : '2px solid transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ClockIcon size={20} />
              {formatTime(timeLeft)}
            </div>

            <div className="badge" style={{
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: '1.25rem',
              padding: '0.75rem 1rem',
              border: 'none',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {Object.keys(answers).length} / {examData.questions.length}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>تم الإجابة</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {examData.questions.map((question, index) => (
            <div
              key={question.id}
              className="card"
              style={{
                border: answers[question.id] !== undefined
                  ? '2px solid var(--success)'
                  : '2px solid var(--border)',
              }}
            >
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  background: 'var(--primary)',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.75rem'
                }}>
                  السؤال {index + 1}
                </span>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.7
                }}>
                  {question.body}
                </h3>
                {question.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={question.image_url} 
                    alt={`Question image`} 
                    style={{ maxWidth: '100%', maxHeight: '300px', display: 'block', margin: '1rem 0', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }} 
                  />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {question.options.map((option, optIndex) => (
                  <button
                    key={optIndex}
                    onClick={() => handleAnswer(question.id, optIndex)}
                    className={`${answers[question.id] === optIndex ? 'btn-primary' : 'btn-outline'} btn`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      border: answers[question.id] === optIndex
                        ? '2px solid var(--primary)'
                        : '2px solid var(--border)',
                      background: answers[question.id] === optIndex
                        ? 'rgba(11, 79, 108, 0.1)'
                        : 'var(--background)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'right',
                      fontSize: '1rem',
                      width: '100%',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <span style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: answers[question.id] === optIndex
                        ? 'var(--primary)'
                        : 'var(--border)',
                      color: answers[question.id] === optIndex ? 'white' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      flexShrink: 0
                    }}>
                      {String.fromCharCode(65 + optIndex)}
                    </span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <span>{option}</span>
                      {question.option_images?.[optIndex] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={question.option_images[optIndex]} 
                          alt={`Option ${String.fromCharCode(65 + optIndex)}`} 
                          style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} 
                        />
                      )}
                    </div>

                    {answers[question.id] === optIndex && (
                      <CheckIcon size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          position: 'sticky',
          bottom: '1.5rem',
          marginTop: '2rem',
          textAlign: 'center'
        }}>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting || Object.keys(answers).length === 0}
            className="btn btn-primary"
            style={{
              padding: '1rem 3rem',
              fontSize: '1.125rem',
              boxShadow: 'var(--shadow-lg)',
              opacity: submitting || Object.keys(answers).length === 0 ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {submitting ? (
              <>
                <span className="spinner" style={{ width: 20, height: 20 }} /> جاري التسليم...
              </>
            ) : (
              <>
                <UploadIcon size={18} />
                تسليم الاختبار ({Object.keys(answers).length} / {examData.questions.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
