// services/auth.service.ts

import api from '@/lib/axios';
import Cookies from 'js-cookie';
import { ApiResponse } from '@/types/api';

// يمكنك إنشاء ملف types/models.ts لاحقاً لتحديد هيكل User
export const authService = {
  // حفظ التوكن بأمان
  setToken: (token: string) => {
    Cookies.set('token', token, { expires: 30, secure: true, sameSite: 'strict' });
  },

  // مسح التوكن
  removeToken: () => {
    Cookies.remove('token');
  },

  // جلب التوكن
  getToken: () => {
    return Cookies.get('token');
  },

  // جلب بيانات الطالب الحالي
  getMe: async () => {
    return await api.get<any, ApiResponse>('/auth/me');
  },

  // تسجيل الخروج في السيرفر
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }
};