'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from './components/Navbar';
import {
  BookIcon,
  VideoIcon,
  UsersIcon,
  SparklesIcon,
  MonitorIcon,
  GraduationCapIcon,
  PlayCircleIcon,
  AwardIcon,
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  ShieldIcon,
  ChevronLeftIcon,
} from './components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface User {
  id: number;
  full_name: string;
  status: string;
  wallet_balance: number;
  isAdmin: boolean;
}

interface Course {
  id: number;
  title: string;
  description: string;
  pricePoints: number;
  validityDate: string | null;
  lecturesCount: number;
  createdAt: string;
}

const features = [
  {
    icon: <GraduationCapIcon size={28} />,
    title: 'تعلم عميق',
    desc: 'نظام تعليمي متكامل يركز على الفهم العميق للمادة وليس الحفظ فقط.',
  },
  {
    icon: <VideoIcon size={28} />,
    title: 'محاضرات تفاعلية',
    desc: 'فيديوهات تفاعلية عالية الجودة مع شرح وافي ومبسط لكل درس.',
  },
  {
    icon: <MonitorIcon size={28} />,
    title: 'لوحة متابعة ذكية',
    desc: 'تتبع تقدمك الدراسي مع إحصائيات وتقارير أداء لحظة بلحظة.',
  },
  {
    icon: <UsersIcon size={28} />,
    title: 'مجتمع تعليمي',
    desc: 'منتدى تفاعلي للتواصل مع زملائك وطرح الأسئلة والاستفسارات.',
  },
  {
    icon: <AwardIcon size={28} />,
    title: 'اختبارات تقويمية',
    desc: 'اختبارات دورية لقياس مستواك وتعزيز الفهم ومراجعة الدروس.',
  },
  {
    icon: <ClockIcon size={28} />,
    title: 'مرونة في التعلم',
    desc: 'ادرس في أي وقت ومن أي مكان وفق جدولك الخاص ووتيرتك المناسبة.',
  },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchLatestCourses();
    // Scroll-triggered animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('section-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    // Observe all sections after render
    setTimeout(() => {
      document.querySelectorAll('.features-section, .courses-section, .stats-section, .cta-section, .footer').forEach((el) => {
        el.classList.add('section-animate');
        observer.observe(el);
      });
    }, 100);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = () => {
    let token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
    if (!token) {
      token = localStorage.getItem('token') || '';
    }
    return token;
  };

  const checkAuth = async () => {
    try {
      let token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      if (!token) {
        token = localStorage.getItem('token') || '';
      }
      if (token) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        document.cookie = `token=${token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
      }
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
        if (data.data.status === 'pending') {
          router.push('/waiting-room');
          return;
        }
        if (data.data.status === 'rejected') {
          router.push('/resubmit');
          return;
        }
      } else {
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestCourses = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/courses`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore logout errors
    } finally {
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ backgroundColor: 'var(--background)' }}>
      <Navbar />

      <style jsx>{`
        /* ===== HERO ===== */
        .hero-section {
          position: relative;
          overflow: hidden;
          padding: 2rem 5% 4rem;
          min-height: 90vh;
          display: flex;
          align-items: center;
        }

        /* Hero Blob Backgrounds (from reference) */
        .hero-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          pointer-events: none;
          animation: blob 15s ease-in-out infinite;
        }

        [data-theme="dark"] .hero-blob {
          opacity: 0.15;
        }

        .hero-blob-1 {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, var(--primary), transparent);
          top: -15%;
          left: -10%;
        }

        .hero-blob-2 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, var(--accent), transparent);
          bottom: -10%;
          right: -8%;
          animation-delay: -5s;
        }

        .hero-blob-3 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, var(--secondary), transparent);
          top: 20%;
          right: 35%;
          animation-delay: -10s;
          opacity: 0.2;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          position: relative;
          z-index: 2;
        }

        .hero-content {
          position: relative;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--hero-badge-bg);
          padding: 0.5rem 1.25rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 1.5rem;
          border: 1px solid var(--hero-badge-border);
        }

        .hero-badge-dot {
          width: 8px;
          height: 8px;
          background: var(--accent);
          border-radius: 50%;
          animation: pulseGlow 2s ease-in-out infinite;
        }

        .hero-title {
          font-size: clamp(2.75rem, 5vw, 4rem);
          font-weight: 800;
          line-height: 1.12;
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }

        .hero-title-gradient {
          background: linear-gradient(135deg, #0B4F6C 0%, #1BBDD4 50%, #0B7A8A 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.125rem;
          line-height: 1.8;
          color: var(--text-secondary);
          margin-bottom: 2rem;
          max-width: 480px;
        }

        .hero-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .hero-stats-row {
          display: flex;
          gap: 2rem;
          margin-top: 2.5rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border-light);
        }

        .hero-stat {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .hero-stat-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .hero-stat-value {
          font-weight: 800;
          font-size: 1.125rem;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .hero-stat-label {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        /* Hero Visual */
        .hero-visual {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 500px;
        }

        .hero-visual-bg {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 40%, rgba(11, 122, 138, 0.06) 0%, rgba(27, 189, 212, 0.03) 40%, transparent 70%);
          animation: blob 12s ease-in-out infinite;
        }

        [data-theme="dark"] .hero-visual-bg {
          background: radial-gradient(circle at 30% 40%, rgba(27, 189, 212, 0.04) 0%, rgba(27, 189, 212, 0.02) 40%, transparent 70%);
        }

        .hero-visual-bg-2 {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          top: 10%;
          right: 10%;
          background: radial-gradient(circle at 70% 60%, rgba(11, 79, 108, 0.04) 0%, transparent 60%);
          animation: blob 15s ease-in-out infinite reverse;
        }

        [data-theme="dark"] .hero-visual-bg-2 {
          background: radial-gradient(circle at 70% 60%, rgba(27, 189, 212, 0.03) 0%, transparent 60%);
        }

        .hero-card-main {
          position: relative;
          width: 360px;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid var(--glass-border);
          box-shadow: 0 20px 60px rgba(11, 79, 108, 0.1);
          overflow: hidden;
          z-index: 2;
          transition: transform 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out);
        }

        [data-theme="dark"] .hero-card-main {
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .hero-card-main:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 80px rgba(11, 79, 108, 0.18);
        }

        .hero-card-header {
          height: 110px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-card-header::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 20px 20px, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        .hero-card-header-content {
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .hero-card-header-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 0.5rem;
          background: rgba(255,255,255,0.15);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .hero-card-header-title {
          color: white;
          font-weight: 700;
          font-size: 1rem;
        }

        .hero-card-body {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .hero-card-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.75rem;
          border-radius: 12px;
          background: var(--soft-bg);
          border: 1px solid var(--border-light);
          transition: all 0.25s var(--ease-out);
        }

        .hero-card-row:hover {
          background: var(--soft-bg-hover);
          transform: translateX(-3px);
        }

        .hero-card-row-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .hero-card-row-text {
          flex: 1;
        }

        .hero-card-row-title {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .hero-card-row-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* Floating badges around the card */
        .hero-badge-float {
          position: absolute;
          background: var(--glass-bg);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border-radius: 14px;
          border: 1px solid var(--glass-border);
          padding: 0.65rem 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          box-shadow: 0 8px 32px rgba(11, 79, 108, 0.08);
          z-index: 3;
          transition: all 0.3s var(--ease-out);
        }

        [data-theme="dark"] .hero-badge-float {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .hero-badge-float:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 40px rgba(11, 79, 108, 0.15);
        }

        .hero-badge-float-1 {
          top: 5%;
          left: -50px;
          animation: floatSlow 4s ease-in-out infinite;
        }

        .hero-badge-float-2 {
          bottom: 18%;
          left: -70px;
          animation: floatSlow 4.5s ease-in-out infinite -1.5s;
        }

        .hero-badge-float-3 {
          top: 25%;
          right: -50px;
          animation: floatSlow 5s ease-in-out infinite -3s;
        }

        .hero-badge-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .hero-badge-value {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .hero-badge-label {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        /* ===== FEATURES ===== */
        .features-section {
          padding: 5rem 5%;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .section-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .section-label {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--muted-bg);
          padding: 0.375rem 1rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 1rem;
          border: 1px solid var(--glass-border);
        }

        .section-title {
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 1rem;
          letter-spacing: -0.01em;
        }

        .section-subtitle {
          color: var(--text-secondary);
          font-size: 1.0625rem;
          max-width: 560px;
          margin: 0 auto;
          line-height: 1.8;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .feature-card {
          background: var(--surface);
          border-radius: 18px;
          border: 1px solid var(--border);
          padding: 2rem;
          position: relative;
          overflow: hidden;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: default;
        }

        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          inset-inline-start: 0;
          width: 100%;
          height: 3px;
          background: var(--gradient-primary);
          opacity: 0;
          transform: scaleX(0.3);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: var(--card-hover-shadow);
          border-color: rgba(11, 122, 138, 0.2);
        }

        .feature-card:hover::before {
          opacity: 1;
          transform: scaleX(1);
        }

        .feature-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: var(--muted-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          margin-bottom: 1.25rem;
          transition: all 0.35s var(--ease-out);
        }

        .feature-card:hover .feature-icon {
          background: var(--gradient-primary);
          color: white;
          transform: scale(1.05);
        }

        .feature-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.625rem;
        }

        .feature-desc {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          line-height: 1.7;
        }

        /* ===== COURSES ===== */
        .courses-section {
          padding: 5rem 5%;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .course-card {
          background: var(--surface);
          border-radius: 18px;
          border: 1px solid var(--border);
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .course-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 48px rgba(11, 79, 108, 0.12);
          border-color: rgba(27, 189, 212, 0.2);
        }

        [data-theme="dark"] .course-card:hover {
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
        }

        .course-cover {
          height: 180px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .course-cover::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--soft-bg) 0%, var(--muted-bg) 100%);
          z-index: 1;
        }

        .course-cover-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.06;
          background-image: 
            radial-gradient(circle at 20% 50%, var(--primary) 1px, transparent 1px),
            radial-gradient(circle at 80% 50%, var(--secondary) 1px, transparent 1px);
          background-size: 40px 40px;
          transition: transform 0.5s ease;
        }

        .course-card:hover .course-cover-pattern {
          transform: scale(1.1);
        }

        .course-cover-icon {
          position: relative;
          z-index: 2;
          color: var(--primary);
          opacity: 0.6;
          transition: all 0.4s ease;
        }

        .course-card:hover .course-cover-icon {
          transform: scale(0.9);
          opacity: 0.8;
        }

        .course-price-badge {
          position: absolute;
          top: 1rem;
          inset-inline-end: 1rem;
          z-index: 3;
        }

        .course-body {
          padding: 1.5rem;
        }

        .course-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .course-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .course-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .course-meta-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }



        /* ===== STATS ===== */
        .stats-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 5%;
          width: 100%;
        }

        .stats-container {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          border-radius: 24px;
          padding: 4rem;
          position: relative;
          overflow: hidden;
        }

        .stats-container::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0.06;
          background-image: radial-gradient(circle at 20px 20px, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          position: relative;
          z-index: 1;
        }

        .stat-item {
          text-align: center;
          padding: 1rem;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 1rem;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
        }

        .stat-value {
          font-family: var(--font-display);
          font-size: 3rem;
          font-weight: 800;
          color: white;
          display: block;
          margin-bottom: 0.25rem;
          letter-spacing: -0.02em;
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 1rem;
          font-weight: 500;
        }

        /* ===== CTA ===== */
        .cta-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 5rem 5%;
          width: 100%;
        }

        .cta-card {
          background: var(--surface);
          border-radius: 24px;
          border: 1px solid var(--border);
          padding: 4rem 2rem;
          text-align: center;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .cta-card::before {
          content: '';
          position: absolute;
          top: 0;
          inset-inline-start: 0;
          width: 100%;
          height: 4px;
          background: var(--gradient-primary);
        }

        .cta-title {
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .cta-subtitle {
          color: var(--text-secondary);
          font-size: 1.125rem;
          max-width: 500px;
          margin: 0 auto 2.5rem;
          line-height: 1.8;
        }

        .cta-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ===== FOOTER ===== */
        .footer {
          border-top: 1px solid var(--border-light);
          background: var(--surface);
          padding: 3rem 5% 2rem;
        }

        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 3rem;
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .footer-logo-icon {
          width: 36px;
          height: 36px;
          background: var(--gradient-primary);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 1rem;
        }

        .footer-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.7;
          max-width: 300px;
        }

        .footer-heading {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .footer-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .footer-link {
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-link:hover {
          color: var(--primary);
        }

        .footer-bottom {
          max-width: 1200px;
          margin: 2rem auto 0;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 1024px) {
          .hero-grid {
            gap: 2rem;
          }

          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .footer-inner {
            grid-template-columns: 1fr 1fr;
          }

          .hero-badge-float-1,
          .hero-badge-float-3 {
            display: none;
          }

          .hero-badge-float-2 {
            bottom: 10%;
            left: -30px;
          }

          .courses-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .hero-section {
            padding: 2rem 5% 3rem;
            min-height: auto;
          }

          .hero-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .hero-visual {
            display: none;
          }

          .hero-title {
            font-size: 2rem;
            text-align: center;
          }

          .hero-subtitle {
            font-size: 1rem;
            text-align: center;
            margin-left: auto;
            margin-right: auto;
          }

          .hero-badge {
            margin-left: auto;
            margin-right: auto;
          }

          .hero-actions {
            justify-content: center;
          }

          .hero-stats-row {
            justify-content: center;
            flex-wrap: wrap;
            gap: 1.5rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .stats-container {
            padding: 2rem 1.5rem;
            border-radius: 18px;
            margin: 0 0.5rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .stat-value {
            font-size: 2.25rem;
          }

          .cta-card {
            padding: 2.5rem 1.5rem;
          }

          .cta-title {
            font-size: 1.75rem;
          }

          .cta-subtitle {
            font-size: 1rem;
          }

          .footer-inner {
            grid-template-columns: 1fr;
            gap: 2rem;
            text-align: center;
          }

          .footer-desc {
            margin: 0 auto;
          }

          .footer-bottom {
            flex-direction: column;
            text-align: center;
          }

          .courses-grid {
            grid-template-columns: 1fr;
          }

          .section-title {
            font-size: 1.75rem;
          }

          .section-header {
            margin-bottom: 2.5rem;
          }

          .hero-stats-mini {
            justify-content: center;
            flex-wrap: wrap;
          }

          .course-card {
            max-width: 100%;
          }
        }

        @media (max-width: 480px) {
          .hero-section {
            padding: 1.5rem 4% 2.5rem;
          }

          .hero-title {
            font-size: 1.75rem;
          }

          .hero-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .hero-actions .btn {
            width: 100%;
            text-align: center;
          }

          .section-padding {
            padding: 3rem 4%;
          }

          .features-section {
            padding: 3rem 4%;
          }

          .courses-section {
            padding: 3rem 4%;
          }

          .cta-section {
            padding: 3rem 4%;
          }

          .cta-card {
            padding: 2rem 1.25rem;
          }

          .cta-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .cta-actions .btn {
            width: 100%;
            text-align: center;
          }

          .feature-card {
            padding: 1.5rem;
          }

          .course-body {
            padding: 1.25rem;
          }

          .stats-container {
            padding: 1.5rem 1rem;
          }

          .stat-value {
            font-size: 1.75rem;
          }

          .section-title {
            font-size: 1.5rem;
          }

          .hero-stat {
            flex-direction: column;
            text-align: center;
          }

          .footer {
            padding: 2rem 4% 1.5rem;
          }
        }

        /* ===== DARK MODE ===== */
        [data-theme="dark"] .hero-badge {
          background: rgba(27, 189, 212, 0.1);
          border-color: rgba(27, 189, 212, 0.15);
          color: var(--accent);
        }

        [data-theme="dark"] .hero-card-main {
          background: rgba(13, 48, 64, 0.85);
          border-color: rgba(27, 189, 212, 0.12);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        [data-theme="dark"] .hero-card-main:hover {
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
        }

        [data-theme="dark"] .hero-card-row {
          background: rgba(27, 189, 212, 0.04);
          border-color: rgba(27, 189, 212, 0.08);
        }

        [data-theme="dark"] .hero-card-row:hover {
          background: rgba(27, 189, 212, 0.08);
        }

        [data-theme="dark"] .hero-badge-float {
          background: rgba(13, 48, 64, 0.85);
          border-color: rgba(27, 189, 212, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        [data-theme="dark"] .hero-badge-float:hover {
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        }

        [data-theme="dark"] .feature-card {
          background: var(--surface);
          border-color: rgba(27, 189, 212, 0.08);
        }

        [data-theme="dark"] .feature-card:hover {
          border-color: rgba(27, 189, 212, 0.2);
        }

        [data-theme="dark"] .section-label {
          background: rgba(27, 189, 212, 0.1);
          color: var(--accent);
          border-color: rgba(27, 189, 212, 0.15);
        }

        [data-theme="dark"] .course-card {
          background: var(--surface);
          border-color: rgba(27, 189, 212, 0.08);
        }

        [data-theme="dark"] .course-card:hover {
          border-color: rgba(27, 189, 212, 0.15);
        }

        [data-theme="dark"] .course-cover {
          background: rgba(27, 189, 212, 0.06) !important;
        }



        [data-theme="dark"] .stats-container {
          background: linear-gradient(135deg, rgba(13, 48, 64, 0.95) 0%, rgba(27, 189, 212, 0.15) 100%);
        }

        [data-theme="dark"] .cta-card {
          background: var(--surface);
          border-color: rgba(27, 189, 212, 0.1);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
        }

        [data-theme="dark"] .cta-card::before {
          background: linear-gradient(90deg, var(--accent), var(--primary));
        }

        [data-theme="dark"] .footer {
          background: var(--surface);
          border-top-color: rgba(27, 189, 212, 0.08);
        }

        [data-theme="dark"] .hero-visual-bg {
          background: radial-gradient(circle at 30% 40%, rgba(27, 189, 212, 0.06) 0%, rgba(11, 122, 138, 0.03) 40%, transparent 70%);
        }

        [data-theme="dark"] .hero-visual-bg-2 {
          background: radial-gradient(circle at 70% 60%, rgba(27, 189, 212, 0.04) 0%, transparent 60%);
        }

        [data-theme="dark"] .footer-logo {
          color: var(--accent);
        }

        [data-theme="dark"] .footer-link:hover {
          color: var(--accent);
        }

        [data-theme="dark"] .hero-blob-1 {
          background: linear-gradient(135deg, rgba(27, 189, 212, 0.15), transparent);
        }

        [data-theme="dark"] .hero-blob-2 {
          background: linear-gradient(135deg, rgba(11, 79, 108, 0.2), transparent);
        }

        [data-theme="dark"] .hero-blob-3 {
          background: linear-gradient(135deg, rgba(27, 189, 212, 0.1), transparent);
        }

        /* ===== UNIFIED SMOOTH ANIMATION (One Entry) ===== */
        .hero-section .hero-content,
        .hero-section .hero-visual,
        .features-section .section-header,
        .features-section .features-grid .feature-card,
        .courses-section .section-header,
        .courses-section .courses-grid .course-card,
        .stats-section .stats-container,
        .cta-section .cta-card,
        .footer {
          opacity: 0;
          animation: fadeInUp 0.7s var(--ease-out) forwards;
        }

        .hero-section .hero-content { animation-delay: 0.1s; }
        .hero-section .hero-visual { animation-delay: 0.25s; }
        .features-section .section-header { animation-delay: 0s; }
        .features-section .features-grid .feature-card:nth-child(1) { animation-delay: 0.05s; }
        .features-section .features-grid .feature-card:nth-child(2) { animation-delay: 0.1s; }
        .features-section .features-grid .feature-card:nth-child(3) { animation-delay: 0.15s; }
        .features-section .features-grid .feature-card:nth-child(4) { animation-delay: 0.2s; }
        .features-section .features-grid .feature-card:nth-child(5) { animation-delay: 0.25s; }
        .features-section .features-grid .feature-card:nth-child(6) { animation-delay: 0.3s; }
        .courses-section .section-header { animation-delay: 0s; }
        .courses-section .courses-grid .course-card:nth-child(1) { animation-delay: 0.05s; }
        .courses-section .courses-grid .course-card:nth-child(2) { animation-delay: 0.12s; }
        .courses-section .courses-grid .course-card:nth-child(3) { animation-delay: 0.19s; }
        .courses-section .courses-grid .course-card:nth-child(4) { animation-delay: 0.26s; }
        .courses-section .courses-grid .course-card:nth-child(5) { animation-delay: 0.33s; }
        .courses-section .courses-grid .course-card:nth-child(6) { animation-delay: 0.4s; }
        .stats-section .stats-container { animation-delay: 0.15s; }
        .cta-section .cta-card { animation-delay: 0.1s; }
        .footer { animation-delay: 0s; }
      `}</style>

      {/* ===== HERO SECTION ===== */}
      <section className="hero-section">
        {/* Hero Blob Backgrounds (from reference design) */}
        <div className="hero-blob hero-blob-1"></div>
        <div className="hero-blob hero-blob-2"></div>
        <div className="hero-blob hero-blob-3"></div>

        <div className="hero-grid">
          <div className="hero-content">
            <div className="hero-badge animate-fade-in-up">
              <span className="hero-badge-dot"></span>
              <span>منصة تعليمية متكاملة</span>
            </div>
            <h1 className="hero-title animate-fade-in-up">
              <span className="hero-title-gradient">تعلم بذكاء</span>
              <br />
              وحقق التميز مع منصتنا
            </h1>
            <p className="hero-subtitle animate-fade-in-up">
              منصة تعليمية عربية تجمع بين الشرح العميق والمحتوى التفاعلي 
              عالي الجودة لتحقيق أقصى استفادة من رحلتك التعليمية.
            </p>
            <div className="hero-actions animate-fade-in-up">
              {user ? (
                <>
                  <Link href="/courses" className="btn btn-primary btn-lg btn-cta">
                    <BookIcon size={18} />
                    تصفح الكورسات
                  </Link>
                  <Link href="/wallet" className="btn btn-outline btn-lg btn-outline-cta">
                    شحن المحفظة
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="btn btn-primary btn-lg btn-cta">
                    <GraduationCapIcon size={18} />
                    سجل الآن مجاناً
                  </Link>
                  <Link href="/login" className="btn btn-outline btn-lg btn-outline-cta">
                    دخول
                  </Link>
                </>
              )}
            </div>

            <div className="hero-stats-row animate-fade-in-up">
              <div className="hero-stat">
                <div className="hero-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                  <UsersIcon size={20} />
                </div>
                <div>
                  <div className="hero-stat-value">+1,000</div>
                  <div className="hero-stat-label">طالب مسجل</div>
                </div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-icon" style={{ background: 'var(--muted-bg)', color: 'var(--accent)' }}>
                  <VideoIcon size={20} />
                </div>
                <div>
                  <div className="hero-stat-value">{courses.length > 0 ? courses.reduce((sum, c) => sum + (c.lecturesCount || 0), 0) : '50'}+</div>
                  <div className="hero-stat-label">محاضرة</div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Visual - Premium Card Display with Floating Badges */}
          <div className="hero-visual animate-fade-in-scale">
            <div className="hero-visual-bg"></div>
            <div className="hero-visual-bg-2"></div>

            {/* Floating badges */}
            <div className="hero-badge-float hero-badge-float-2">
              <div className="hero-badge-icon" style={{ background: 'var(--muted-bg)', color: 'var(--accent)' }}>
                <MonitorIcon size={18} />
              </div>
              <div>
                <div className="hero-badge-value">تعليم عن بعد</div>
                <div className="hero-badge-label">من أي مكان وفي أي وقت</div>
              </div>
            </div>

            <div className="hero-badge-float hero-badge-float-3">
              <div className="hero-badge-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                <ShieldIcon size={18} />
              </div>
              <div>
                <div className="hero-badge-value">محتوى محمي</div>
                <div className="hero-badge-label">بتقنيات التشفير المتقدمة</div>
              </div>
            </div>

            {/* Main card mockup */}
            <div className="hero-card-main">
              <div className="hero-card-header">
                <div className="hero-card-header-content">
                  <div className="hero-card-header-icon">
                    <PlayCircleIcon size={24} />
                  </div>
                  <div className="hero-card-header-title">رحلتك التعليمية تبدأ هنا</div>
                </div>
              </div>
              <div className="hero-card-body">
                <div className="hero-card-row">
                  <div className="hero-card-row-icon" style={{ background: 'var(--muted-bg)', color: 'var(--primary)' }}>
                    <BookIcon size={18} />
                  </div>
                  <div className="hero-card-row-text">
                    <div className="hero-card-row-title">فيزياء - الثالث الثانوي</div>
                    <div className="hero-card-row-desc">شرح كامل للمنهج + اختبارات</div>
                  </div>
                </div>
                <div className="hero-card-row">
                  <div className="hero-card-row-icon" style={{ background: 'rgba(27, 189, 212, 0.1)', color: 'var(--accent)' }}>
                    <ClockIcon size={18} />
                  </div>
                  <div className="hero-card-row-text">
                    <div className="hero-card-row-title">جدول مرن</div>
                    <div className="hero-card-row-desc">ادرس حسب وقتك</div>
                  </div>
                </div>
                <div className="hero-card-row">
                  <div className="hero-card-row-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                    <CheckIcon size={18} />
                  </div>
                  <div className="hero-card-row-text">
                    <div className="hero-card-row-title">متابعة ذكية</div>
                    <div className="hero-card-row-desc">تقارير أداء وتوصيات</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="features-section">
        <div className="section-header animate-fade-in-up">
          <div className="section-label">
            <SparklesIcon size={16} />
            <span>مميزات المنصة</span>
          </div>
          <h2 className="section-title">ليه تختار منصتنا؟</h2>
          <p className="section-subtitle">
            نقدم لك تجربة تعليمية متكاملة تجمع بين أحدث أساليب التعليم 
            وأفضل الممارسات التربوية
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card animate-fade-in-up"
              style={{ animationDelay: `${(index + 1) * 0.1}s` }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== COURSES SECTION ===== */}
      <section className="courses-section">
        <div className="section-header animate-fade-in-up">
          <div className="section-label">
            <PlayCircleIcon size={16} />
            <span>كورساتنا</span>
          </div>
          <h2 className="section-title">أحدث الكورسات</h2>
          <p className="section-subtitle">
            محتوى تعليمي محدث باستمرار لضمان أفضل تجربة تعلم
          </p>
        </div>

        {coursesLoading ? (
          <div className="loading-state">
            <div className="spinner spinner-lg"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <BookIcon size={32} />
            </div>
            <h3>لا توجد كورسات متاحة حالياً</h3>
            <p>سيتم إضافة كورسات جديدة قريباً، تابعنا!</p>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.slice(0, 6).map((course, index) => (
                <div key={course.id} className="course-card animate-fade-in-up" style={{ animationDelay: `${(index + 1) * 0.1}s` }}>
                <div className="course-cover" style={{ background: `linear-gradient(135deg, rgba(11,79,108,0.05) 0%, rgba(11,122,138,0.08) 100%)` }}>
                  <div className="course-cover-pattern"></div>
                  <div className="course-cover-icon">
                    <BookIcon size={48} />
                  </div>
                  <div className="course-price-badge">
                    <span className={`badge ${course.pricePoints === 0 ? 'badge-success' : 'badge-primary'}`}>
                      {course.pricePoints === 0 ? 'مجاني' : `${course.pricePoints} نقطة`}
                    </span>
                  </div>
                </div>
                <div className="course-body">
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-desc">{course.description || 'لا يوجد وصف متاح لهذه الدورة'}</p>
                  <div className="course-meta">
                    <span className="course-meta-item">
                      <VideoIcon size={14} />
                      {course.lecturesCount} محاضرة
                    </span>
                    <span className="course-meta-item">
                      <ClockIcon size={14} />
                      {course.validityDate ? new Date(course.validityDate).toLocaleDateString('ar-EG') : 'مستمر'}
                    </span>
                  </div>
                  <Link href={`/courses/${course.id}`} className="btn btn-outline btn-lg btn-outline-cta btn-block">
                    عرض التفاصيل
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {courses.length > 6 && (
          <div className="text-center mt-8">
            <Link href="/courses" className="btn btn-outline btn-lg btn-outline-cta">
              عرض جميع الكورسات
              <ArrowLeftIcon size={18} />
            </Link>
          </div>
        )}
      </section>

      {/* ===== STATS SECTION ===== */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon">
                <VideoIcon size={22} />
              </div>
              <span className="stat-value">{courses.length > 0 ? courses.reduce((sum, c) => sum + (c.lecturesCount || 0), 0) : '50'}+</span>
              <span className="stat-label">محاضرة تعليمية</span>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <UsersIcon size={22} />
              </div>
              <span className="stat-value">1,000+</span>
              <span className="stat-label">طالب مسجل</span>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <BookIcon size={22} />
              </div>
              <span className="stat-value">{courses.length}</span>
              <span className="stat-label">كورس متاح</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="cta-section">
        <div className="cta-card animate-fade-in-up">
          <h2 className="cta-title">ابدأ رحلتك التعليمية الآن</h2>
          <p className="cta-subtitle">
            انضم إلى مجتمعنا المتنامي من الطلاب وابدأ في تحقيق أهدافك التعليمية 
            مع أفضل المحاضرات والكورسات المتاحة.
          </p>
          <div className="cta-actions">
            {user ? (
              <>
                <Link href="/courses" className="btn btn-primary btn-lg btn-cta">
                  <BookIcon size={18} />
                  تصفح الكورسات
                </Link>
                <Link href="/wallet" className="btn btn-outline btn-lg btn-outline-cta">
                  شحن المحفظة
                </Link>
              </>
            ) : (
              <>
                <Link href="/register" className="btn btn-primary btn-lg btn-cta">
                  <GraduationCapIcon size={18} />
                  سجل مجاناً
                </Link>
                <Link href="/courses" className="btn btn-outline btn-lg btn-outline-cta">
                  شاهد الكورسات
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon">م</div>
              <span>منصتنا</span>
            </div>
            <p className="footer-desc">
              منصتك التعليمية المتكاملة للتميز في التعلم العميق. 
              نقدم أفضل المحاضرات والكورسات التعليمية في الوطن العربي.
            </p>
          </div>
          <div>
            <h4 className="footer-heading">روابط سريعة</h4>
            <ul className="footer-links">
              <li><Link href="/courses" className="footer-link">الكورسات</Link></li>
              <li><Link href="/register" className="footer-link">التسجيل</Link></li>
              <li><Link href="/login" className="footer-link">تسجيل الدخول</Link></li>
              <li><Link href="/forum" className="footer-link">المنتدى</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="footer-heading">الدعم</h4>
            <ul className="footer-links">
              <li><Link href="/wallet" className="footer-link">طرق الدفع</Link></li>
              <li><span className="footer-link">الشروط والأحكام</span></li>
              <li><span className="footer-link">سياسة الخصوصية</span></li>
              <li><span className="footer-link">الدعم الفني</span></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} منصتنا - جميع الحقوق محفوظة</span>
          <span>منصة تعليمية عربية متكاملة</span>
        </div>
      </footer>
    </div>
  );
}
