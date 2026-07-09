'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CourseCard from '../components/CourseCard';
import Navbar from '../components/Navbar';
import {
  BookIcon,
  CreditCardIcon,
  CheckCircleIcon,
  SearchIcon,
  VideoIcon,
  CalendarIcon,
} from '../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface Course {
  id: number;
  title: string;
  description: string;
  pricePoints: number;
  validityDate: string | null;
  lecturesCount: number;
  isPurchased: boolean;
  createdAt: string;
  enrolledCount?: number;
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCourses();
    fetchWalletBalance();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/courses`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const token = getToken();
      if (!token) {
        setWalletBalance(null);
        return;
      }

      const response = await fetch(`${API_URL}/api/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.data?.balance ?? 0);
      } else {
        setWalletBalance(null);
      }
    } catch (error) {
      setWalletBalance(null);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="page-container">
      <Navbar />
      <div className="loading-state">
        <div className="spinner spinner-lg"></div>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <Navbar />

      <div className="page-content animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">استكشف الكورسات</h1>
            <p className="page-subtitle">اختر الكورس المناسب وابدأ رحلة التعلم</p>
          </div>
          {walletBalance !== null && (
            <div className="card" style={{ padding: '1rem 1.5rem', minWidth: 160, textAlign: 'center', borderColor: 'var(--accent)', background: 'rgba(27, 189, 212, 0.05)' }}>
              <div className="flex items-center gap-2 justify-center mb-2">
                <CreditCardIcon size={18} />
                <span className="font-bold text-sm text-primary">رصيد محفظتك</span>
              </div>
              <div className="font-bold text-success" style={{ fontSize: '1.5rem' }} dir="ltr">
                {walletBalance} <span className="text-sm text-muted">EGP</span>
              </div>
            </div>
          )}
        </div>

        {courses.length > 0 && (
          <div className="relative mb-6" style={{ maxWidth: 400 }}>
            <span className="absolute" style={{ top: '50%', right: '0.75rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <SearchIcon size={18} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن كورس..."
              className="input-field"
              style={{ paddingRight: '2.5rem' }}
            />
          </div>
        )}

        {filteredCourses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <BookIcon size={32} />
            </div>
            <h3>{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد كورسات متاحة حالياً'}</h3>
            <p>{searchQuery ? 'حاول استخدام كلمات بحث مختلفة' : 'يرجى العودة لاحقاً لاستكشاف الكورسات الجديدة'}</p>
          </div>
        ) : (
          <div className="courses-grid-container">
            {filteredCourses.map((course) => (
              <div key={course.id} className="relative">
                <CourseCard
                  id={course.id}
                  title={course.title}
                  description={course.description || 'لا يوجد وصف'}
                  pricePoints={course.pricePoints}
                  isPurchased={course.isPurchased}
                  enrolledCount={course.enrolledCount}
                />

                {course.isPurchased && (
                  <div className="mt-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)', color: 'var(--success-dark)', fontSize: '0.8125rem', fontWeight: 700 }}>
                    <CheckCircleIcon size={16} />
                    أنت مشترك في هذا الكورس
                  </div>
                )}

                <div className="flex justify-between mt-3 text-sm text-muted">
                  <span className="flex items-center gap-1">
                    <VideoIcon size={16} />
                    {course.lecturesCount} محاضرة
                  </span>
                  {course.validityDate && (
                    <span className="flex items-center gap-1">
                      <CalendarIcon size={16} />
                      صلاحية: {new Date(course.validityDate).toLocaleDateString('ar-EG')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .courses-grid-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          width: 100%;
        }
        @media (max-width: 992px) {
          .courses-grid-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 576px) {
          .courses-grid-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
