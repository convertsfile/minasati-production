'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore'; // 🚀 استدعاء العقل المدبر
import { 
  HomeIcon, MenuIcon, SunIcon, MoonIcon, 
  UserIcon, LogoutIcon, DashboardIcon, XIcon, MessageIcon 
} from './Icons';

interface NavbarProps {
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const router = useRouter();
  const { theme, toggleTheme, mounted: themeMounted } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 🚀 السحر هنا: جلب البيانات وحالة التحميل من الذاكرة المركزية بسطر واحد فقط!
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  // تحديد الصلاحيات بناءً على البيانات المخزنة
  const isAdmin = user?.role === 'admin';
  // ملاحظة: تأكد أن الباك إند يقوم بإرسال hasCourses أو يمكننا الاعتماد على دور الطالب فقط
  const hasCourses = user?.hasCourses ?? false;

  // إغلاق التمرير (Scroll) عند فتح قائمة الموبايل
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // تسجيل الخروج المركزي
  const handleLogout = async () => {
    await logout(); // 🚀 الـ Store يتكفل بالاتصال بالباك إند ومسح الكوكيز
    setMobileMenuOpen(false);
    router.push('/login');
  };

  // مكون التحميل الوهمي (Skeleton) أثناء جلب البيانات في الخلفية
  const AuthPlaceholder = () => (
    <div className="navbar-actions-placeholder" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <div className="skeleton" style={{ width: '80px', height: '36px', borderRadius: 'var(--radius-md)', opacity: 0.3 }} />
      <div className="skeleton" style={{ width: '60px', height: '36px', borderRadius: 'var(--radius-md)', opacity: 0.3 }} />
    </div>
  );

  // أزرار التحكم بناءً على الصلاحيات
  const AuthButtons = () => (
    <>
      {isAuthenticated ? (
        <>
          {/* 🚀 إظهار الرصيد المالي في الـ Navbar مباشرة من الذاكرة */}
          {!isAdmin && user && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[var(--soft-bg)] border border-[var(--border-light)] rounded-full text-sm font-semibold text-[var(--primary)] mx-2">
              <span>الرصيد:</span>
              <span>{user.walletBalance}</span>
            </div>
          )}

          {isAdmin ? (
            <Link href="/admin" className="btn btn-outline btn-sm">
              <DashboardIcon size={16} />
              <span>لوحة التحكم</span>
            </Link>
          ) : (
            <Link href="/dashboard" className="btn btn-outline btn-sm">
              <UserIcon size={16} />
              <span>حسابي</span>
            </Link>
          )}
          <button onClick={handleLogout} className="btn btn-primary btn-sm" style={{ background: 'var(--error)' }}>
            <LogoutIcon size={16} />
            <span>خروج</span>
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="btn btn-outline btn-sm btn-outline-cta">
            دخول
          </Link>
          <Link href="/register" className="btn btn-primary btn-sm btn-cta">
            تسجيل
          </Link>
        </>
      )}
    </>
  );

  return (
    <nav className={`navbar ${transparent ? 'bg-transparent border-none' : ''}`}>
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          <span className="navbar-logo-icon">م</span>
          <span>منصتنا</span>
        </Link>

        <ul className="navbar-links">
          <li><Link href="/" className="navbar-link">الرئيسية</Link></li>
          <li><Link href="/courses" className="navbar-link">الكورسات</Link></li>
          {!isLoading && isAuthenticated && user?.status === 'active' && !isAdmin && hasCourses && (
              <Link href="/forum" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المنتدى</Link>
          )}
          {!isLoading && isAuthenticated && user?.status === 'active' && !isAdmin && (
            <Link href="/wallet" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المحفظة</Link>
          )}
          {!isLoading && isAuthenticated && isAdmin && (
            <Link href="/admin" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>لوحة التحكم</Link>
          )}
        </ul>

        <div className="navbar-actions">
          {/* 🚀 تبديل سلس بين الهيكل الوهمي والأزرار الحقيقية */}
          {isLoading ? <AuthPlaceholder /> : <AuthButtons />}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="تبديل الوضع" suppressHydrationWarning>
            {themeMounted ? (theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />) : <SunIcon size={18} />}
          </button>
        </div>

        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="القائمة"
        >
          <MenuIcon size={24} />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav active">
          <div className="mobile-nav-header">
            <Link href="/" className="navbar-logo">
              <span className="navbar-logo-icon">م</span>
              <span>منصتنا</span>
            </Link>
            <button className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)} aria-label="إغلاق">
              <XIcon size={20} />
            </button>
          </div>
          
          <div className="mobile-nav-links">
            <Link href="/" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>الرئيسية</Link>
            <Link href="/courses" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>الكورسات</Link>
            {!isLoading && isAuthenticated && !isAdmin && hasCourses && (
              <Link href="/forum" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المنتدى</Link>
            )}
            {!isLoading && isAuthenticated && !isAdmin && (
              <Link href="/wallet" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المحفظة</Link>
            )}
            {!isLoading && isAuthenticated && isAdmin && (
              <Link href="/admin" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>لوحة التحكم</Link>
            )}
          </div>

          <button
            className="mobile-theme-toggle"
            onClick={toggleTheme}
            aria-label="تبديل الوضع"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--soft-bg)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.3s ease' }}
          >
            {themeMounted ? (theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />) : <SunIcon size={18} />}
            <span>{theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}</span>
          </button>
          
          <div className="mobile-nav-actions mt-4">
            {!isLoading && (
              isAuthenticated ? (
                <>
                  {isAdmin ? (
                    <Link href="/admin" className="btn btn-outline w-full justify-center mb-2" onClick={() => setMobileMenuOpen(false)}>
                      <DashboardIcon size={18} />
                      <span>لوحة التحكم</span>
                    </Link>
                  ) : (
                    <Link href="/dashboard" className="btn btn-outline w-full justify-center mb-2" onClick={() => setMobileMenuOpen(false)}>
                      <UserIcon size={18} />
                      <span>حسابي</span>
                    </Link>
                  )}
                  <button onClick={handleLogout} className="btn btn-danger w-full justify-center">
                    <LogoutIcon size={18} />
                    <span>خروج</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <Link href="/login" className="btn btn-outline w-full justify-center" onClick={() => setMobileMenuOpen(false)}>دخول</Link>
                  <Link href="/register" className="btn btn-primary w-full justify-center" onClick={() => setMobileMenuOpen(false)}>سجل الآن</Link>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </nav>
  );
}