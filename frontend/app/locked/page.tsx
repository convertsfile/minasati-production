'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockIcon, MessageIcon } from '../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getToken = () => {
  return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || localStorage.getItem('token');
};

export default function LockedPage() {
  const router = useRouter();
  const [whatsappNumber, setWhatsappNumber] = useState('201000000000');

  useEffect(() => {
    const checkBlockStatus = async () => {
      const token = getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      try {
        const [statusRes, settingsRes] = await Promise.all([
          fetch(`${API_URL}/api/auth/status`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          }),
          fetch(`${API_URL}/api/settings`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          }),
        ]);

        if (statusRes.ok) {
          const data = await statusRes.json();
          const user = data.data?.user || data.data || data;
          if (!user.is_blocked && user.status !== 'blocked') {
            router.replace('/');
          }
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          const number = settingsData.data?.whatsapp_number || settingsData.whatsapp_number;
          if (number) setWhatsappNumber(number);
        }
      } catch (e) {
        console.error('Failed to check block status:', e);
      }
    };
    checkBlockStatus();
  }, [router]);

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: 500, padding: '2.5rem 2rem', textAlign: 'center', border: '2px solid rgba(239, 68, 68, 0.2)' }}>
        <div style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: 'var(--gradient-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 10px 25px rgba(11, 79, 108, 0.3)',
        }}>
          <LockIcon size={40} style={{ color: 'white' }} />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--error)', marginBottom: '0.75rem' }}>
          تم حظر حسابك
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.8, marginBottom: '1.5rem' }}>
          تم حظر حسابك بسبب مخالفات أمنية متكررة. يرجى التواصل مع الإدارة عبر الواتساب لحل المشكلة.
        </p>

        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            background: '#25D366', color: 'white', textDecoration: 'none',
            padding: '1rem 2rem',
            fontSize: '1.125rem', fontWeight: 700, width: '100%',
            border: 'none', cursor: 'pointer',
          }}
        >
          <MessageIcon size={24} style={{ color: 'white' }} />
          التواصل مع الإدارة عبر الواتساب
        </a>
      </div>
    </div>
  );
}
