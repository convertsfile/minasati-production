// lib/axios.ts

import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { ApiResponse, ApiError } from '@/types/api';

const getBaseURL = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  return url.endsWith('/api') ? url : `${url}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
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
    // ⚠️ Special-case for /api/auth/me: the backend returns a non-standard
    // {status:"success", data:UserResource} envelope via response()->json()
    // (NOT the standard ApiResponse). Unwrap the inner `data` field here so
    // every caller can treat /auth/me like a normal ApiResponse.
    const reqUrl = response.config?.url || '';
    if (typeof reqUrl === 'string' && reqUrl.includes('/auth/me')) {
      const mePayload = response.data;
      // Backend shape: {status:"success", data:UserResource}
      // UserResource itself: {success:true, data:User, ...}
      if (mePayload && typeof mePayload === 'object') {
        if (mePayload.data && typeof mePayload.data === 'object' && 'success' in mePayload.data) {
          return mePayload.data as T;
        }
        if (mePayload.data !== undefined) {
          return mePayload.data as T;
        }
      }
      return mePayload as T;
    }
    // ⚠️ Special-case for /api/exams/my-results: backend returns a raw
    // {data:[...]} without the standard envelope. The interceptor previously
    // returned `response.data.data as T` which was `undefined` because the
    // outer object has no `data.success` pair. Return the outer object so
    // callers can read `.data` directly.
    if (typeof reqUrl === 'string' && reqUrl.includes('/exams/my-results')) {
      return response.data as T;
    }
    // نرجع البيانات مباشرة لكي لا نضطر لكتابة response.data.data في كل صفحة
    return response.data.data as T;
  },
  (error: AxiosError<ApiError>): Promise<ApiError> => {
    const status = error.response?.status;

    console.error(`🚨 [Axios Error] Status: ${status} | URL: ${error.config?.url} | Message:`, error.response?.data?.message || error.message);

    const errorCode = error.response?.data?.code;
    const reqUrl = error.config?.url || '';

    // 🔴 401 Unauthorized: only force a logout for AUTH-endpoint failures.
    // Previously this fired for ANY 401 — including data endpoints such as
    // /api/comprehensive-exams/{id} that return 401 on per-record access
    // checks. That kicked the user out of deep pages (e.g. /comprehensive-exams/[id],
    // /admin/courses/[id]/comprehensive-exams) and dumped them on the login
    // screen, breaking the design audit's CRITICAL findings C-1 and C-2.
    //
    // Auth endpoints that should still trigger the global redirect:
    //   • /auth/login  • /auth/register  • /auth/me  • /auth/verify-otp
    //   • /auth/refresh • /auth/logout  • /auth/forgot/... • /auth/reset/...
    //
    // Data endpoints must surface the 401 to the caller (as a rejected
    // promise) so the page can render an error state with a retry button
    // instead of nuking the navigation.
    if (status === 401) {
      const isAuthEndpoint =
        typeof reqUrl === 'string' && (
          reqUrl.includes('/auth/login') ||
          reqUrl.includes('/auth/register') ||
          reqUrl.includes('/auth/me') ||
          reqUrl.includes('/auth/verify-otp') ||
          reqUrl.includes('/auth/verify/resend') ||
          reqUrl.includes('/auth/refresh') ||
          reqUrl.includes('/auth/logout') ||
          reqUrl.includes('/auth/forgot') ||
          reqUrl.includes('/auth/reset') ||
          reqUrl.includes('/auth/check') ||
          reqUrl.includes('/auth/status') ||
          reqUrl.includes('/auth/resend-otp') ||
          reqUrl.includes('/auth/resubmit-documents') ||
          reqUrl.includes('/sanctum/')
        );
      if (isAuthEndpoint) {
        Cookies.remove('token');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login?session_expired=true';
        }
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