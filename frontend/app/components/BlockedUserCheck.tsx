'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

export default function BlockedUserCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (pathname === '/locked') return;
    if (checkedRef.current) return;
    checkedRef.current = true;

    const checkBlocked = async () => {
      const token = getToken();
      if (!token) return;
      try {
        // /api/auth/status is DEAD; use /api/auth/me instead.
        // /auth/me returns a non-standard envelope { status, data: UserResource }.
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          // Unwrap the wire envelope: {status:"success", data:UserResource}
          // then the inner ApiResponse {success, message, data:User}.
          const user = data?.data?.data ?? data?.data ?? data;
          if (user && (user.is_blocked || user.status === 'blocked')) {
            router.replace('/locked');
          }
        }
      } catch (e) {
        console.error('Blocked check failed:', e);
      }
    };

    checkBlocked();
  }, [pathname, router]);

  return <>{children}</>;
}
