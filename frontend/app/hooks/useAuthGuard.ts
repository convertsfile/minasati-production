'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuthGuard() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // دالة جلب التوكن
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1] || localStorage.getItem('token');

    if (!token) {
      // ❌ هنا كان يوجد الـ alert المزعج! قمنا بإزالته.
      // توجيه صامت وفوري لصفحة الدخول
      router.replace('/login'); 
    } else {
      setIsChecking(false); // التوكن موجود، اسمح بعرض الصفحة
    }
  }, [router]);

  return { isChecking };
}