'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { HomeIcon, MenuIcon, SunIcon, MoonIcon, UserIcon, LogoutIcon, DashboardIcon, XIcon, MessageIcon } from './Icons';

interface NavbarProps {
  transparent?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Navbar({ transparent = false }: NavbarProps) {
  const router = useRouter();
  const { theme, toggleTheme, mounted: themeMounted } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('');
  const [hasCourses, setHasCourses] = useState(false);

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    const localToken = localStorage.getItem('token');
    const authToken = token || localToken;

    if (authToken) {
      setIsLoggedIn(true);
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            const user = data.data || data;
            setIsAdmin(user.is_admin || false);
            setUserName(user.full_name || '');
          }
        })
        .catch(() => {})
        .finally(() => setAuthReady(true));

      // جلب حالة الاشتراك في الكورسات
      fetch(`${API_URL}/api/auth/status`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.data) {
            setHasCourses(!!data.data.hasCourses);
          }
        })
        .catch(() => {});
    } else {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1] || localStorage.getItem('token');

    if (token) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setIsLoggedIn(false);
    setIsAdmin(false);
    setUserName('');
    router.push('/login');
  };

  const AuthPlaceholder = () => (
    <div className="navbar-actions-placeholder" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <div className="skeleton" style={{ width: '80px', height: '36px', borderRadius: 'var(--radius-md)', opacity: 0.3 }} />
      <div className="skeleton" style={{ width: '60px', height: '36px', borderRadius: 'var(--radius-md)', opacity: 0.3 }} />
    </div>
  );

  const AuthButtons = () => (
    <>
      {isLoggedIn ? (
        <>
          {isAdmin ? (
            <Link href="/admin" className="btn btn-outline btn-sm">
              <DashboardIcon size={16} />
              <span>لوحة التحكم</span>
            </Link>
          ) : (
            <Link href="/dashboard" className="btn btn-outline btn-sm">
              <UserIcon size={16} />
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
          {authReady && isLoggedIn && !isAdmin && hasCourses && (
            <li><Link href="/forum" className="navbar-link">المنتدى</Link></li>
          )}
          {authReady && isLoggedIn && !isAdmin && (
            <li><Link href="/wallet" className="navbar-link">المحفظة</Link></li>
          )}
        </ul>

        <div className="navbar-actions">
          {authReady ? <AuthButtons /> : <AuthPlaceholder />}
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
            {authReady && isLoggedIn && !isAdmin && hasCourses && <Link href="/forum" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المنتدى</Link>}
            {authReady && isLoggedIn && !isAdmin && <Link href="/wallet" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>المحفظة</Link>}
            {authReady && isLoggedIn && isAdmin && <Link href="/admin" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>لوحة التحكم</Link>}
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
          <div className="mobile-nav-actions">
            {authReady ? (
              isLoggedIn ? (
                <>
                  {isAdmin ? (
                    <Link href="/admin" className="btn btn-outline" onClick={() => setMobileMenuOpen(false)}>
                      <DashboardIcon size={18} />
                      <span>لوحة التحكم</span>
                    </Link>
                  ) : (
                    <Link href="/dashboard" className="btn btn-outline" onClick={() => setMobileMenuOpen(false)}>
                      <UserIcon size={18} />
                      <span>لوحة التحكم</span>
                    </Link>
                  )}
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="btn btn-danger">
                    <LogoutIcon size={18} />
                    <span>خروج</span>
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-outline" onClick={() => setMobileMenuOpen(false)}>دخول</Link>
                  <Link href="/register" className="btn btn-primary" onClick={() => setMobileMenuOpen(false)}>سجل الآن</Link>
                </>
              )
            ) : null}
          </div>
        </div>
      )}
    </nav>
  );
}
