'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import {
  BookIcon,
  UserIcon,
  ImageIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from '../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface FormData {
  full_name: string;
  academic_year: string;
  student_number: string;
  phone: string;
  parent_phone: string;
  school: string;
  parent_job: string;
  governorate: string;
  email: string;
  password: string;
  confirmPassword: string;
  id_image: File | null;
}

interface FormErrors {
  [key: string]: string | undefined;
}

const academicYears = ['الاول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي', 'الاول الاعدادي', 'الثاني الاعدادي', 'الثالث الاعدادي', 'الاول الثانوي', 'الثاني الثانوية', 'الثالث الثانوي'];

const governorates = [
  'القاهرة', 'الجيزة', 'الاسكندرية', 'الدقهلية', 'البحيرة', 'الغربية', 'المنوفية', 'الشرقية', 'القليوبية',
  'كفر الشيخ', 'الاقصر', 'اسوان', 'سوهاج', 'المنيا', 'قنا', 'الوادي الجديد', 'البحر الاحمر', 'السويس',
  'الاسماعيلية', 'بورسعيد', 'دمياط', 'شمال سيناء', 'جنوب سيناء'
];

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    academic_year: '',
    student_number: '',
    phone: '',
    parent_phone: '',
    school: '',
    parent_job: '',
    governorate: '',
    email: '',
    password: '',
    confirmPassword: '',
    id_image: null,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.full_name.trim()) newErrors.full_name = 'الاسم الكامل مطلوب';
    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }

    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 8) {
      newErrors.password = 'يجب أن تكون كلمة المرور 8 أحرف على الأقل';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.academic_year) newErrors.academic_year = 'السنة الدراسية مطلوبة';
    if (!formData.student_number.trim()) newErrors.student_number = 'رقم الطالب مطلوب';

    if (!formData.phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^01[0125][0-9]{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'رقم الهاتف غير صالح';
    }

    if (!formData.parent_phone.trim()) {
      newErrors.parent_phone = 'هاتف ولي الأمر مطلوب';
    } else if (!/^01[0125][0-9]{8}$/.test(formData.parent_phone.replace(/\s/g, ''))) {
      newErrors.parent_phone = 'رقم الهاتف غير صالح';
    }

    if (!formData.school.trim()) newErrors.school = 'اسم المدرسة مطلوب';
    if (!formData.parent_job.trim()) newErrors.parent_job = 'وظيفة ولي الأمر مطلوبة';
    if (!formData.governorate) newErrors.governorate = 'المحافظة مطلوبة';
    if (!formData.id_image) newErrors.id_image = 'صورة البطاقة مطلوبة';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, id_image: 'يجب أن يكون الملف صورة' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, id_image: 'حجم الملف يجب أن يكون أقل من 5 ميجابايت' }));
        return;
      }
      setFormData(prev => ({ ...prev, id_image: file }));

      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, id_image: undefined }));
    }
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setIsLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('full_name', formData.full_name);
      formDataToSend.append('academic_year', formData.academic_year);
      formDataToSend.append('student_number', formData.student_number);
      formDataToSend.append('phone', formData.phone.replace(/\s/g, ''));
      formDataToSend.append('parent_phone', formData.parent_phone.replace(/\s/g, ''));
      formDataToSend.append('school', formData.school);
      formDataToSend.append('parent_job', formData.parent_job);
      formDataToSend.append('governorate', formData.governorate);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('password_confirmation', formData.confirmPassword);

      if (formData.id_image) {
        formDataToSend.append('id_image', formData.id_image);
      }

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'حدث خطأ أثناء التسجيل، تأكد من صحة البيانات');
      }

      const result = data.data || data;

      if (result.dev_otp) {
        sessionStorage.setItem('dev_otp', result.dev_otp);
        console.log('Development OTP Code:', result.dev_otp);
      }

      // Stash the phone number on sessionStorage so the OTP page can kick off
      // the Firebase phone-auth flow and exchange the 6-digit code for the
      // firebase_token required by POST /api/auth/verify-otp.
      sessionStorage.setItem('register_phone', `+2${formData.phone.replace(/\s/g, '')}`);

      const tempId = result.temp_user_id || result.tempUserId;
      router.push(`/otp?tempUserId=${encodeURIComponent(tempId)}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      {error && (
        <div className="toast-container show">
          <div className="toast-content error">
            <AlertCircleIcon size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="split-layout">
        <div className="split-branding">
          <div className="branding-content text-center">
            <BookIcon size={64} color="white" />
            <h1 className="branding-title" style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem' }}>منصتنا</h1>
            <p className="branding-subtitle" style={{ fontSize: '1.25rem', opacity: 0.9, maxWidth: '400px', margin: '0 auto' }}>منصتك التعليمية الذكية لتطوير مهاراتك والتفوق في دراستك</p>
          </div>
        </div>

        <div className="split-form">
          <div className="split-card">
            <div className="split-card-header">
              <div className="icon-circle">
                <UserIcon size={28} />
              </div>
              <h2 className="split-card-title">إنشاء حساب جديد</h2>
              <p className="split-card-subtitle">املأ البيانات التالية للتسجيل في منصتنا</p>
            </div>

            <div className="step-indicator">
              <div className={`step-dot ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}`}>
                {step > 1 ? <CheckIcon size={16} /> : '1'}
              </div>
              <div className={`step-line ${step > 1 ? 'completed' : ''}`} />
              <div className={`step-dot ${step === 2 ? 'active' : ''}`}>
                2
              </div>
            </div>

            {step === 1 && (
              <div className="split-card-form">
                <div className="form-group">
                  <label htmlFor="full_name" className="form-label">الاسم الكامل (رباعي)</label>
                  <input
                    id="full_name"
                    type="text"
                    className={`input-field ${errors.full_name ? 'error' : ''}`}
                    placeholder="أدخل الاسم الكامل"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                  />
                  {errors.full_name && <p className="form-error">{errors.full_name}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">البريد الإلكتروني</label>
                  <input
                    id="email"
                    type="email"
                    className={`input-field ${errors.email ? 'error' : ''}`}
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    dir="ltr"
                  />
                  {errors.email && <p className="form-error">{errors.email}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">كلمة المرور</label>
                  <input
                    id="password"
                    type="password"
                    className={`input-field ${errors.password ? 'error' : ''}`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    dir="ltr"
                  />
                  {errors.password && <p className="form-error">{errors.password}</p>}
                  <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>يجب أن تكون 8 أحرف على الأقل مع أرقام وحروف</p>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">تأكيد كلمة المرور</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className={`input-field ${errors.confirmPassword ? 'error' : ''}`}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    dir="ltr"
                  />
                  {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                </div>

                <button type="button" className="btn btn-primary btn-block" onClick={handleNext}>
                  التالي
                  <ArrowLeftIcon size={18} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="split-card-form">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="academic_year" className="form-label">السنة الدراسية</label>
                    <select
                      id="academic_year"
                      className={`input-field ${errors.academic_year ? 'error' : ''}`}
                      value={formData.academic_year}
                      onChange={(e) => handleChange('academic_year', e.target.value)}
                    >
                      <option value="">اختر...</option>
                      {academicYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    {errors.academic_year && <p className="form-error">{errors.academic_year}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="student_number" className="form-label">رقم الطالب السري</label>
                    <input
                      id="student_number"
                      type="text"
                      className={`input-field ${errors.student_number ? 'error' : ''}`}
                      placeholder="رقم الطالب"
                      value={formData.student_number}
                      onChange={(e) => handleChange('student_number', e.target.value)}
                      dir="ltr"
                    />
                    {errors.student_number && <p className="form-error">{errors.student_number}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">رقم الهاتف</label>
                    <input
                      id="phone"
                      type="tel"
                      className={`input-field ${errors.phone ? 'error' : ''}`}
                      placeholder="01xxxxxxxxx"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      dir="ltr"
                    />
                    {errors.phone && <p className="form-error">{errors.phone}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="parent_phone" className="form-label">هاتف ولي الأمر</label>
                    <input
                      id="parent_phone"
                      type="tel"
                      className={`input-field ${errors.parent_phone ? 'error' : ''}`}
                      placeholder="01xxxxxxxxx"
                      value={formData.parent_phone}
                      onChange={(e) => handleChange('parent_phone', e.target.value)}
                      dir="ltr"
                    />
                    {errors.parent_phone && <p className="form-error">{errors.parent_phone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="school" className="form-label">المدرسة</label>
                    <input
                      id="school"
                      type="text"
                      className={`input-field ${errors.school ? 'error' : ''}`}
                      placeholder="اسم المدرسة"
                      value={formData.school}
                      onChange={(e) => handleChange('school', e.target.value)}
                    />
                    {errors.school && <p className="form-error">{errors.school}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="governorate" className="form-label">المحافظة</label>
                    <select
                      id="governorate"
                      className={`input-field ${errors.governorate ? 'error' : ''}`}
                      value={formData.governorate}
                      onChange={(e) => handleChange('governorate', e.target.value)}
                    >
                      <option value="">اختر المحافظة...</option>
                      {governorates.map(gov => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                    {errors.governorate && <p className="form-error">{errors.governorate}</p>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="parent_job" className="form-label">وظيفة ولي الأمر</label>
                  <input
                    id="parent_job"
                    type="text"
                    className={`input-field ${errors.parent_job ? 'error' : ''}`}
                    placeholder="أدخل وظيفة ولي الأمر"
                    value={formData.parent_job}
                    onChange={(e) => handleChange('parent_job', e.target.value)}
                  />
                  {errors.parent_job && <p className="form-error">{errors.parent_job}</p>}
                </div>

                <div className={`file-upload-zone ${errors.id_image ? 'error' : imagePreview ? 'has-file' : ''}`}>
                  <label className="w-full cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                    {imagePreview ? (
                      <div className="flex items-center justify-center gap-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="preview-thumb"
                        />
                        <span className="file-name">{formData.id_image?.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ImageIcon size={36} className="upload-icon" />
                        <p className="upload-text">اضغط لرفع صورة إثبات الهوية</p>
                        <p className="upload-hint">JPG, PNG (الحد الأقصى 5MB)</p>
                      </div>
                    )}
                  </label>
                  {errors.id_image && <p className="form-error mt-2">{errors.id_image}</p>}
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" className="btn btn-outline flex-1" onClick={handleBack}>
                    <ArrowRightIcon size={18} />
                    رجوع
                  </button>
                  <button type="button" className="btn btn-primary btn-submit" onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? (
                      <span className="spinner spinner-white" />
                    ) : (
                      <>
                        <UserIcon size={18} />
                        إنشاء حساب
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="split-card-footer">
              <p>لديك حساب بالفعل؟</p>
              <Link href="/login" className="link-primary">تسجيل الدخول</Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 1rem;
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          color: white;
          box-shadow: 0 10px 15px -3px rgba(11, 79, 108, 0.3);
        }
        .split-card-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .split-card-title {
          font-family: var(--font-display);
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        .split-card-subtitle {
          font-family: var(--font-body);
          font-size: 0.9375rem;
          color: var(--text-secondary);
        }
        .split-card-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .split-card-footer {
          text-align: center;
          margin-top: 1.5rem;
          color: var(--text-secondary);
          font-size: 0.9375rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
        }
        .link-primary {
          color: var(--primary);
          text-decoration: none;
          font-weight: 700;
          transition: color 0.3s;
          display: inline-block;
        }
        .link-primary:hover {
          color: var(--primary-dark);
        }
        .btn-submit {
          flex: 2;
        }
        .preview-thumb {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: var(--radius-sm);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        }
        .file-name {
          color: var(--primary);
          font-weight: 700;
          font-size: 0.875rem;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .upload-icon {
          color: var(--text-muted);
        }
        .upload-text {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text-primary);
        }
        .upload-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        @media (max-width: 768px) {
          .split-branding {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
