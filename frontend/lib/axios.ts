// lib/axios.ts

import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { ApiResponse, ApiError } from '@/types/api';

// 🚀 1. إعداد النسخة الأساسية
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000, // منع تعليق التطبيق إذا كان السيرفر بطيئاً
});

// 🚀 2. معترض الطلبات (Request Interceptor) - حقن التوكن
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🚀 3. معترض الاستجابات (Response Interceptor) - الدرع الأمني وفك التغليف
//
// The interceptor unwraps the ApiResponse<T> envelope so callers receive
// the inner T directly (e.g. `const { token, user } = await api.post(...)`).
// We achieve this by typing the response interceptor's return as
// `AxiosResponse<ApiResponse<T>>` → `T` and the error path as
// `AxiosError<ApiError>` → `ApiError`. The narrowed types flow through to
// the post/get/... call signatures so `api.post<VerifyOtpResponse>(...)`
// returns `Promise<VerifyOtpResponse>`.
api.interceptors.response.use(
  <T>(response: AxiosResponse<ApiResponse<T>>): T => {
    // نرجع البيانات مباشرة لكي لا نضطر لكتابة response.data.data في كل صفحة
    return response.data.data as T;
  },
  (error: AxiosError<ApiError>): Promise<ApiError> => {
    const status = error.response?.status;

    console.error(`🚨 [Axios Error] Status: ${status} | URL: ${error.config?.url} | Message:`, error.response?.data?.message || error.message);

    const errorCode = error.response?.data?.code;

    // 🔴 401 Unauthorized: التوكن منتهي أو تم تدميره (Logout)
    if (status === 401) {
      Cookies.remove('token');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login?session_expired=true';
      }
    }

    // 🔴 403 Forbidden: الدرع الذي بنيناه في الباك إند (ActiveUserMiddleware & VideoViolation)
    if (status === 403) {
      if (errorCode === 'ERR_USER_BLOCKED') {
        Cookies.remove('token');
        if (typeof window !== 'undefined') {
          // توجيه الطالب لصفحة "تم الحظر" التي أراها في صورتك (app/blocked)
          window.location.href = '/blocked';
        }
      } else if (errorCode === 'ERR_USER_NOT_ACTIVE') {
        // Cookies.remove('token');
        if (typeof window !== 'undefined') {
          // توجيه لصفحة الانتظار (app/waiting-room)
          window.location.href = '/waiting-room';
        }
      }
    }

    // 🔴 409 Conflict: محاولة فتح الفيديو من جهازين
    if (status === 409 && errorCode === 'ERR_STREAM_CONFLICT') {
        // يمكنك إطلاق حدث (Event) هنا لإظهار Pop-up إجباري للمستخدم
        console.warn('Stream Conflict Detected!');
    }

    return Promise.reject(error.response?.data || { success: false, message: error.message, code: 'ERR_UNKNOWN' });
  }
);

export default api;