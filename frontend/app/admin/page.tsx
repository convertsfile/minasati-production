'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import StatCard from '../components/StatCard';
import {
  UsersIcon,
  WalletIcon,
  ShieldIcon,
  AlertTriangleIcon,
  HomeIcon,
  LogoutIcon,
  ClockIcon,
  BookIcon,
  BellIcon,
  ExternalLinkIcon,
  KeyIcon,
  BarChartIcon,
  PhoneIcon,
  CheckCircleIcon,
} from '../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

interface Stats {
  pendingStudents: number;
  pendingTopups: number;
  totalViolations: number;
}

interface RecentActivity {
  type: string;
  message: string;
  time: string;
}

interface LimitInfo {
  plan: string;
  planName: string;
  students: { current: number; max: number; percentage: number };
  storage: { current_bytes: number; max_bytes: number; percentage: number };
  warning: boolean;
}

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
  color: 'warning' | 'success' | 'primary' | 'error';
  badge?: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<Stats>({
    pendingStudents: 0,
    pendingTopups: 0,
    totalViolations: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [limitsInfo, setLimitsInfo] = useState<LimitInfo | null>(null);

  useEffect(() => {
    checkAdminAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAuth = async () => {
    try {
      const token = getToken();

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        // /auth/me returns {status:"success", data:UserResource} →
        // UserResource is {success, message, data:User}. Unwrap twice to
        // reach the flat User object so role/email checks below work.
        const user = data?.data?.data ?? data?.data ?? data;

        const isAdmin = 
          user?.is_admin === true || 
          user?.is_admin === 1 || 
          user?.isAdmin === true || 
          user?.role === 'admin' ||
          user?.email === 'admin@eduplatform.com';
        
        if (!isAdmin) {
          router.push('/');
          return;
        }
        
        setAuthorized(true);
        fetchStats(token);
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (authToken: string) => {
    try {
      const pendingResponse = await fetch(`${API_URL}/api/admin/users/pending`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });
      if (pendingResponse.ok) {
        const data = await pendingResponse.json();
        const pendingCount = data.data?.length || 0;
        setStats(prev => ({ ...prev, pendingStudents: pendingCount }));
        
        if (pendingCount > 0) {
          setRecentActivity(prev => [{
            type: 'warning',
            message: `${pendingCount} طلب تسجيل جديد في الانتظار`,
            time: 'الآن'
          }, ...prev].slice(0, 5));
        }
      }

      const topupsResponse = await fetch(`${API_URL}/api/admin/wallet/topups?status=pending`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });
      if (topupsResponse.ok) {
        const data = await topupsResponse.json();
        const topupsCount = data.data?.length || 0;
        setStats(prev => ({ ...prev, pendingTopups: topupsCount }));
        
        if (topupsCount > 0) {
          setRecentActivity(prev => [{
            type: 'info',
            message: `${topupsCount} طلب شحن في انتظار المراجعة`,
            time: 'الآن'
          }, ...prev].slice(0, 5));
        }
      }

      const violationsResponse = await fetch(`${API_URL}/api/admin/security/violations`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });
      if (violationsResponse.ok) {
        const data = await violationsResponse.json();
        const violationsCount = data.data?.length || 0;
        setStats(prev => ({ ...prev, totalViolations: violationsCount }));
      }

      const limitsResponse = await fetch(`${API_URL}/api/admin/limits`, {
        headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
      });
      if (limitsResponse.ok) {
        const data = await limitsResponse.json();
        if (data.success && data.data) {
          setLimitsInfo(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const token = getToken();
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
      localStorage.removeItem('token');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  const quickActions: QuickAction[] = [
    { label: 'الطلاب المعلقين', description: 'مراجعة طلبات التسجيل', href: '/admin/pending-students', icon: <UsersIcon size={22} />, color: 'warning', badge: stats.pendingStudents },
    { label: 'طلبات الشحن', description: 'الموافقة على الشحن', href: '/admin/topups', icon: <WalletIcon size={22} />, color: 'success', badge: stats.pendingTopups },
    { label: 'إدارة الكورسات', description: 'إنشاء وتعديل الكورسات', href: '/admin/courses', icon: <BookIcon size={22} />, color: 'primary' },
    { label: 'الأمان والمخالفات', description: 'مراقبة المخالفات', href: '/admin/security', icon: <ShieldIcon size={22} />, color: 'error', badge: stats.totalViolations },
  ];

  const quickLinks = [
    { label: 'إدارة الطلاب', href: '/admin/students', icon: <UsersIcon size={20} /> },
    { label: 'أكواد المراكز', href: '/admin/center-codes', icon: <KeyIcon size={20} /> },
    { label: 'إحصائيات المحفظة', href: '/admin/wallet-stats', icon: <BarChartIcon size={20} /> },
    { label: 'أرقام الدفع', href: '/admin/payment-numbers', icon: <PhoneIcon size={20} /> },
  ];

  return (
    <div className="admin-layout">
      <AdminSidebar />
      
      <main className="admin-content">
        <div className="page-content">
          {limitsInfo?.warning && (
            <div
              className="card mb-8"
              style={{
                borderColor: 'var(--warning)',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(245, 158, 11, 0.02) 100%)',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangleIcon size={22} style={{ color: 'var(--warning)' }} />
                <span className="font-bold" style={{ fontSize: '1.1rem', color: 'var(--warning-dark)' }}>
                  تنبيه استهلاك الباقة ({limitsInfo.planName})
                </span>
              </div>
              <p className="text-secondary mb-2" style={{ fontSize: '0.9rem' }}>
                لقد اقتربت من أو تجاوزت الحد الأقصى للموارد المتاحة في باقتك الحالية (أكثر من 80%):
              </p>
              <ul className="mb-2" style={{ paddingRight: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {limitsInfo.students.percentage >= 80 && (
                  <li>الطلاب: {limitsInfo.students.current} من أصل {limitsInfo.students.max} طالب ({limitsInfo.students.percentage}%)</li>
                )}
                {limitsInfo.storage.percentage >= 80 && (
                  <li>المساحة المستخدمة: {(limitsInfo.storage.current_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB من أصل {(limitsInfo.storage.max_bytes / (1024 * 1024 * 1024)).toFixed(0)} GB ({limitsInfo.storage.percentage}%)</li>
                )}
              </ul>

              {limitsInfo.students.percentage >= 80 && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-secondary font-semibold" style={{ fontSize: '0.8rem', minWidth: '5rem' }}>الطلاب:</span>
                  <div className="progress-bar flex-1">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(limitsInfo.students.percentage, 100)}%`, background: 'var(--gradient-primary)' }}></div>
                  </div>
                  <span className="font-bold" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{limitsInfo.students.percentage}%</span>
                </div>
              )}
              {limitsInfo.storage.percentage >= 80 && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-secondary font-semibold" style={{ fontSize: '0.8rem', minWidth: '5rem' }}>المساحة:</span>
                  <div className="progress-bar flex-1">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(limitsInfo.storage.percentage, 100)}%`, background: 'var(--gradient-accent)' }}></div>
                  </div>
                  <span className="font-bold" style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>{limitsInfo.storage.percentage}%</span>
                </div>
              )}

              <p className="font-bold mb-3" style={{ fontSize: '0.8rem', color: 'var(--warning-dark)' }}>
                برجاء ترقية باقة المنصة لتجنب توقف الميزات.
              </p>
              <div className="flex gap-3 flex-wrap">
                <a
                  href="https://api.whatsapp.com/send/?phone=201067473845&text=%D8%AD%D8%A7%D8%A8%D8%A8+%D8%A7%D8%B1%D9%81%D8%B9+%D8%A7%D9%84%D8%A8%D8%A7%D9%82%D8%A9&type=phone_number&app_absent=0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success btn-sm"
                >
                  ترقية الباقة (تواصل معنا)
                </a>
                <button
                  onClick={() => router.push('/admin/plan')}
                  className="btn btn-primary btn-sm"
                >
                  تفاصيل الاستهلاك
                </button>
              </div>
            </div>
          )}

          <div className="page-header">
            <div>
              <h1 className="page-title">لوحة التحكم</h1>
              <p className="page-subtitle">مرحباً بك في منصاتك التعليمية</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/')}
                className="btn btn-outline btn-sm"
              >
                <HomeIcon size={18} />
                الرئيسية
              </button>
              <button
                onClick={handleLogout}
                className="btn btn-danger btn-sm"
              >
                <LogoutIcon size={18} />
                خروج
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <StatCard
              title="الطلاب المعلقين"
              value={stats.pendingStudents}
              icon={<ClockIcon size={22} />}
              color="warning"
            />
            <StatCard
              title="طلبات الشحن"
              value={stats.pendingTopups}
              icon={<WalletIcon size={22} />}
              color="success"
            />
            <StatCard
              title="المخالفات الأمنية"
              value={stats.totalViolations}
              icon={<ShieldIcon size={22} />}
              color="error"
            />
          </div>

          <section className="mb-8">
            <h2 className="card-title mb-6 flex items-center gap-2">
              الإجراءات السريعة
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {quickActions.map((action) => (
                <div
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    position: 'relative',
                    borderColor: `var(--${action.color})`,
                    borderWidth: '2px',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                >
                  {action.badge !== undefined && action.badge > 0 && (
                    <div className="badge badge-error" style={{ position: 'absolute', top: '1rem', insetInlineEnd: '1rem' }}>
                      {action.badge}
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center" style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(11, 79, 108, 0.08)',
                      color: 'var(--primary)',
                      flexShrink: 0,
                    }}>
                      {action.icon}
                    </div>
                    <div>
                      <h3 className="font-bold mb-1" style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}>
                        {action.label}
                      </h3>
                      <p className="text-muted" style={{ fontSize: '0.8125rem' }}>
                        {action.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-6">
            <section className="card">
              <div className="card-header">
                <h3 className="card-title flex items-center gap-2">
                  <BellIcon size={20} />
                  النشاط الأخير
                </h3>
              </div>
              {recentActivity.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3"
                      style={{
                        background: 'var(--background)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: activity.type === 'warning' ? 'var(--warning)' : 
                                   activity.type === 'info' ? 'var(--secondary)' : 'var(--success)',
                        flexShrink: 0,
                      }}></span>
                      <div className="flex-1">
                        <p className="font-medium" style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {activity.message}
                        </p>
                        <p className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <CheckCircleIcon size={32} />
                  </div>
                  <p className="text-muted">لا يوجد نشاط حديث</p>
                </div>
              )}
            </section>

            <section className="card">
              <div className="card-header">
                <h3 className="card-title flex items-center gap-2">
                  <ExternalLinkIcon size={20} />
                  الروابط السريعة
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {quickLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => router.push(link.href)}
                    className="flex items-center gap-2"
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-body)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.background = 'rgba(11, 79, 108, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.background = 'var(--background)';
                    }}
                  >
                    <span style={{ color: 'var(--primary)', display: 'flex' }}>{link.icon}</span>
                    <span>{link.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
