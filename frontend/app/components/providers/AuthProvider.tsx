// app/components/providers/AuthProvider.tsx
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { fetchUser, isLoading } = useAuthStore();

  useEffect(() => {
    // بمجرد تحميل التطبيق، نحاول جلب بيانات المستخدم بناءً على الـ Cookie
    fetchUser();
  }, [fetchUser]);

  // يمكنك عرض شاشة تحميل كاملة (Splash Screen) هنا أثناء التحقق من الهوية
  // هذا يمنع المستخدم من رؤية واجهات غير مصرح بها للحظات
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-500 font-medium text-lg">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}