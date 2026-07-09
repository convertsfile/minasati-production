// store/useAuthStore.ts

import { create } from 'zustand';
import { User } from '@/types/models';
import { authService } from '@/services/auth.service';
import Cookies from 'js-cookie';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Alias of `isLoading` exposed under the historical name. Some pages
   * (e.g. /courses) call `authLoading` from the store directly; keeping the
   * alias here avoids touching every call site and preserves back-compat. */
  authLoading: boolean;

  // Actions
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  updateWallet: (newBalance: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // نبدأ بـ true لكي لا نعرض شاشة تسجيل الدخول للحظة ثم ننتقل للداشبورد (FOUC)
  authLoading: true,

  fetchUser: async () => {
    const token = Cookies.get('token');

    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false, authLoading: false });
      return;
    }

    try {
      const response = await authService.getMe();
      // استجابة السيرفر ستكون مغلفة بـ ApiResponse التي بنيناها
      set({ user: response.data, isAuthenticated: true, isLoading: false, authLoading: false });
    } catch (error) {
      // إذا فشل الجلب (مثلاً التوكن منتهي أو الطالب تم حظره)، الـ Axios Interceptor سيتكفل بالباقي
      set({ user: null, isAuthenticated: false, isLoading: false, authLoading: false });
    }
  },

  setUser: (user: User) => set({ user, isAuthenticated: true, isLoading: false, authLoading: false }),

  logout: async () => {
    set({ isLoading: true, authLoading: true });
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, authLoading: false });
    }
  },

  // ميزة للـ UX: تحديث الرصيد فوراً في الـ UI بعد الشراء بدون الحاجة لعمل Refresh
  updateWallet: (newBalance: number) => set((state) => ({
    user: state.user ? { ...state.user, walletBalance: newBalance } : null
  })),
}));