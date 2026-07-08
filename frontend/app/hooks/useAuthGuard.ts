// frontend/app/hooks/useAuthGuard.ts
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Cookies from 'js-cookie';

export function useAuthGuard(allowedRoles?: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  
  // 1. استدعاء الذاكرة المركزية
  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore();
  
  // 2. حالة الترطيب: تمنع أي طرد متسرع حتى نتحقق من التوكن
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const initGuard = async () => {
      const token = Cookies.get('token') || localStorage.getItem('token');

      // إذا لا يوجد توكن إطلاقاً، أنهي الترطيب ليتم الطرد
      if (!token) {
        setIsHydrating(false);
        return;
      }

      // إذا كان هناك توكن، لكن الذاكرة فارغة (حدث ريفريش أو انتقال)
      if (!isAuthenticated) {
        try {
          await fetchUser(); // السحر هنا: نجبر النظام على جلب البيانات
        } catch (error) {
          Cookies.remove('token');
          localStorage.removeItem('token');
        }
      }
      
      // انتهت عملية التحقق بنجاح
      setIsHydrating(false);
    };

    initGuard();
  }, []); // تعمل مرة واحدة فقط عند فتح الصفحة

  // حماية ذكية لمنع مشكلة (Infinite Loop) إذا تم تمرير المصفوفة مباشرة
  const rolesString = allowedRoles ? allowedRoles.join(',') : '';

  // 3. درع التوجيه الصارم (لا يتدخل إلا بعد انتهاء الترطيب)
  useEffect(() => {
    if (isHydrating || isLoading) return;

    // إذا لم ينجح الدخول، اطرده لصفحة التسجيل
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${pathname}`);
      return;
    }

    // التوجيه الإجباري حسب نوع الحساب (الفصل بين الإدارة والطلاب)
    if (user) {
      // منع الطالب من دخول الإدارة
      if (user.role !== 'admin' && pathname.startsWith('/admin')) {
        router.replace('/dashboard');
        return;
      }
      
      // توجيه الأدمن للإدارة فقط إذا حاول الدخول للوحة الطالب الخاصة (مثال: /dashboard)
      if (user.role === 'admin' && pathname.startsWith('/dashboard')) {
        router.replace('/admin');
        return;
      }

      // if (allowedRoles && !allowedRoles.includes(user.role)) {
      //   const redirectPath = user.role === 'admin' ? '/admin' : '/dashboard';
      //   router.replace(redirectPath);
      // }
    }
  }, [isHydrating, isLoading, isAuthenticated, user, pathname, rolesString, router]);

  return { isChecking: isHydrating || isLoading, user, isAuthenticated };
}