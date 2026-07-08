'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DashboardIcon,
  BookIcon,
  UsersIcon,
  ClockIcon,
  WalletIcon,
  CreditCardIcon,
  BarChartIcon,
  PhoneIcon,
  KeyIcon,
  TrendingUpIcon,
  MessageIcon,
  ShieldIcon,
  SparklesIcon,
  HomeIcon,
  MoonIcon,
  SunIcon,
  MenuIcon,
  XIcon,
  ChevronDownIcon,
} from './Icons';

interface SubItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  subItems?: SubItem[];
}

const navItems: NavItem[] = [
  { label: 'لوحة التحكم', href: '/admin', icon: <DashboardIcon /> },
  { label: 'الكورسات', href: '/admin/courses', icon: <BookIcon /> },
  { label: 'الطلاب', href: '/admin/students', icon: <UsersIcon /> },
  { label: 'الطلاب المعلقون', href: '/admin/pending-students', icon: <ClockIcon /> },
  { label: 'مراجعة الواجبات', href: '/admin/homework', icon: <BookIcon /> },
  { label: 'الشحن', href: '/admin/topups', icon: <WalletIcon /> },
  {
    label: 'الإحصائيات',
    icon: <BarChartIcon />,
    subItems: [
      { label: 'إحصائيات الكورسات', href: '/admin/stats/courses' },
      { label: 'السجل المالي للمنصة', href: '/admin/stats/finance' },
    ]
  },
  { label: 'أرقام الدفع', href: '/admin/payment-numbers', icon: <PhoneIcon /> },
  { label: 'أكواد المركز', href: '/admin/center-codes', icon: <KeyIcon /> },
  { label: 'قسم المتابعة', href: '/admin/monitoring', icon: <TrendingUpIcon /> },
  { label: 'المنتدى', href: '/admin/forum', icon: <MessageIcon /> },
  { label: 'الأمان', href: '/admin/security', icon: <ShieldIcon /> },
  { label: 'باقة المنصة', href: '/admin/plan', icon: <SparklesIcon /> },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (pathname && pathname.startsWith('/admin/stats')) {
      setStatsOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isStatsDropdownActive = () => {
    return pathname && pathname.startsWith('/admin/stats');
  };

  const sidebarContent = (
    <>
      <div className="admin-sidebar-logo">
        <span className="admin-logo-badge">
          م
        </span>
        <span>منصتنا</span>
        <button
          className="admin-sidebar-close"
          onClick={() => setMobileOpen(false)}
          aria-label="إغلاق"
        >
          <XIcon />
        </button>
      </div>

      <nav className="admin-nav">
        {navItems.map((item, index) => {
          if (item.subItems) {
            const active = isStatsDropdownActive();
            return (
              <div key={index}>
                <button
                  onClick={() => setStatsOpen(prev => !prev)}
                  className={`admin-nav-item w-full justify-between ${active ? 'active' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="admin-nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  <span
                    className="transition-transform duration-200"
                    style={{ transform: statsOpen ? 'rotate(180deg)' : 'none' }}
                  >
                    <ChevronDownIcon />
                  </span>
                </button>
                {statsOpen && (
                  <div className="admin-stats-submenu">
                    {item.subItems.map((sub, subIdx) => {
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={subIdx}
                          href={sub.href}
                          className={`admin-stats-subitem ${subActive ? 'active' : ''}`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href || '#'}
              className={`admin-nav-item ${isActive(item.href) ? 'active' : ''}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto py-4 border-t">
        <Link href="/" className="admin-nav-item">
          <span className="admin-nav-icon"><HomeIcon /></span>
          <span>العودة للرئيسية</span>
        </Link>
        <button onClick={toggleTheme} className="admin-nav-item w-full">
          <span className="admin-nav-icon">
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </span>
          <span>{theme === 'light' ? 'الوضع المظلم' : 'الوضع الفاتح'}</span>
        </button>
      </div>
    </>
  );

  if (!mounted) {
    return (
      <aside className="admin-sidebar">
        {sidebarContent}
      </aside>
    );
  }

  return (
    <>
      <button
        className="admin-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="فتح القائمة"
      >
        <MenuIcon />
      </button>

      {mobileOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
