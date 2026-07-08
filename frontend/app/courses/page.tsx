// app/courses/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CourseCard from '../components/CourseCard';
import Navbar from '../components/Navbar';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';
import {
  BookIcon,
  CreditCardIcon,
  CheckCircleIcon,
  SearchIcon,
  VideoIcon,
  CalendarIcon,
  ShieldIcon, 
  ClockIcon,  
  AwardIcon,
  UserIcon
} from '../components/Icons';

interface Course {
  id: number;
  title: string;
  description: string;
  pricePoints: number;
  validityDate: string | null;
  lecturesCount: number;
  isPurchased: boolean;
  createdAt: string;
  enrolledCount: number;
}

interface StandaloneExam {
  id: number;
  title: string;
  courseTitle: string;
  pricePoints: number;
  durationMinutes: number;
  passScore: number;
  isPurchased: boolean;
}

export default function CoursesPage() {
  const router = useRouter();
  const { isAuthenticated, authLoading } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'courses' | 'exams'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [standaloneExams, setStandaloneExams] = useState<StandaloneExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. جلب الكورسات (متاحة للجميع زواراً وطلاباً)
      const coursesRes = await api.get('/courses').catch(() => null);
      
      if (coursesRes && coursesRes.data) {
        // دعم التنسيقات المختلفة لرد الـ API (Resource Wrapping)
        const rawCourses = coursesRes.data.data || coursesRes.data || [];
        setCourses(rawCourses.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description || 'لا يوجد وصف',
          pricePoints: c.price_points ?? c.pricePoints ?? 0,
          validityDate: c.validity_date ?? c.validityDate ?? null,
          // ربط دقيق بأسماء المتغيرات القادمة من الباك إند
          lecturesCount: c.lectures_count ?? c.lecturesCount ?? 0,
          enrolledCount: c.students_count ?? c.studentsCount ?? c.enrolled_count ?? c.enrolledCount ?? 0,
          isPurchased: !!(c.is_purchased ?? c.isPurchased),
          createdAt: c.created_at ?? c.createdAt ?? '',
        })));
      }

      // 2. جلب الاختبارات والمحفظة (فقط إذا كان المستخدم مسجل الدخول)
      if (isAuthenticated) {
        const [examsRes, walletRes] = await Promise.allSettled([
          api.get('/comprehensive-exams/available'), // المسار الصحيح
          api.get('/wallet/balance')
        ]);

        if (examsRes.status === 'fulfilled' && examsRes.value.data) {
          const rawExams = examsRes.value.data.data || examsRes.value.data || [];
          setStandaloneExams(rawExams.map((ex: any) => ({
            id: ex.id,
            title: ex.title,
            courseTitle: ex.course_title ?? ex.courseTitle ?? 'اختبار عام',
            pricePoints: ex.price_points ?? ex.pricePoints ?? 0,
            durationMinutes: ex.duration_minutes ?? ex.durationMinutes ?? 60,
            passScore: ex.pass_score ?? ex.passScore ?? 50,
            isPurchased: !!(ex.is_purchased ?? ex.isPurchased),
          })));
        }

        if (walletRes.status === 'fulfilled' && walletRes.value.data) {
          setWalletBalance(walletRes.value.data.data?.balance ?? walletRes.value.data.balance ?? 0);
        }
      } else {
        // تصفير البيانات الخاصة بالمسجلين للزوار
        setStandaloneExams([]);
        setWalletBalance(null);
      }

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredExams = standaloneExams.filter(exam =>
    exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || authLoading) return (
    <div className="page-container">
      <Navbar />
      <div className="flex justify-center items-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <Navbar />

      <div className="page-content animate-fade-in max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">استكشف الكورسات</h1>
            <p className="text-gray-500 mt-1">اختر الكورس المناسب وابدأ رحلة التعلم</p>
          </div>
          
          {isAuthenticated && walletBalance !== null ? (
            <div className="card border border-blue-100 bg-blue-50/50 p-4 rounded-xl min-w-[160px] text-center">
              <div className="flex items-center gap-2 justify-center mb-1 text-blue-700">
                <CreditCardIcon size={18} />
                <span className="font-bold text-sm">رصيد محفظتك</span>
              </div>
              <div className="font-bold text-2xl text-green-600" dir="ltr">
                {walletBalance} <span className="text-sm font-normal text-gray-500">EGP</span>
              </div>
            </div>
          ) : (
            <div className="card border border-gray-200 bg-white p-4 rounded-xl min-w-[160px] text-center">
              <div className="flex items-center gap-2 justify-center mb-2 text-gray-600">
                <UserIcon size={18} />
                <span className="font-bold text-sm">لست مسجلاً؟</span>
              </div>
              <button onClick={() => router.push('/login')} className="btn btn-primary w-full text-sm py-2">
                سجل الدخول الآن
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mb-8 items-center justify-between">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('courses')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'courses' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <BookIcon size={18} /> الكورسات
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === 'exams' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <ShieldIcon size={18} /> الاختبارات الشاملة
            </button>
          </div>

          <div className="relative w-full max-w-md">
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
              <SearchIcon size={18} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'courses' ? "ابحث عن كورس..." : "ابحث عن اختبار..."}
              className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {activeTab === 'courses' ? (
          filteredCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center">
              <BookIcon size={48} className="text-gray-400 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد كورسات متاحة حالياً'}</h3>
              <p className="text-gray-500">{searchQuery ? 'حاول استخدام كلمات بحث مختلفة' : 'يرجى العودة لاحقاً لاستكشاف الكورسات الجديدة'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div key={course.id} className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <CourseCard
                    id={course.id}
                    title={course.title}
                    description={course.description}
                    pricePoints={course.pricePoints}
                    isPurchased={course.isPurchased}
                    enrolledCount={course.enrolledCount}
                  />

                  <div className="p-4 border-t border-gray-100 bg-gray-50 mt-auto">
                    {course.isPurchased && (
                      <div className="flex items-center justify-center gap-2 py-2 px-3 mb-3 bg-green-100/50 border border-green-200 text-green-700 rounded-md text-sm font-bold">
                        <CheckCircleIcon size={16} />
                        أنت مشترك في هذا الكورس
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span className="flex items-center gap-1.5 font-medium">
                        <VideoIcon size={16} className="text-blue-500"/>
                        {course.lecturesCount} محاضرة
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <UserIcon size={16} className="text-indigo-500"/>
                        {course.enrolledCount} طالب
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          !isAuthenticated ? (
            <div className="flex flex-col items-center justify-center p-12 bg-blue-50/30 rounded-2xl border border-blue-100 text-center">
              <ShieldIcon size={56} className="text-blue-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">تسجيل الدخول مطلوب</h3>
              <p className="text-gray-500 mb-6 max-w-md">يرجى تسجيل الدخول لتتمكن من استعراض وشراء الاختبارات الشاملة المتاحة لحسابك.</p>
              <button onClick={() => router.push('/login')} className="btn btn-primary px-8 py-2.5">
                سجل الدخول للمتابعة
              </button>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center">
              <ShieldIcon size={48} className="text-gray-400 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد اختبارات متاحة حالياً'}</h3>
              <p className="text-gray-500">لم يتم العثور على أي اختبارات شاملة متاحة لك في الوقت الحالي.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="card flex flex-col p-6 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-all h-full">
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold mb-3 border border-blue-100">
                      كورس: {exam.courseTitle}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{exam.title}</h3>
                  </div>

                  <div className="flex gap-4 mb-6 text-sm text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5"><ClockIcon size={16} className="text-gray-400"/> {exam.durationMinutes} دقيقة</span>
                    <span className="flex items-center gap-1.5"><AwardIcon size={16} className="text-gray-400"/> نجاح: {exam.passScore}%</span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100">
                    {exam.isPurchased ? (
                      <button onClick={() => router.push(`/student/exams/${exam.id}`)} className="w-full flex justify-center items-center gap-2 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-lg font-bold hover:bg-green-100 transition-colors">
                        <CheckCircleIcon size={18} /> الدخول للاختبار
                      </button>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-black text-blue-600">
                          {exam.pricePoints > 0 ? `${exam.pricePoints} EGP` : 'مجاني'}
                        </span>
                        <button 
                          onClick={() => router.push(`/student/checkout/exam/${exam.id}`)} 
                          className="btn btn-primary px-6 py-2"
                        >
                          شراء الاختبار
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}