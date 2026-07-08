// store/useAuthStore.ts

import { create } from 'zustand';
import { User } from '@/types/models';
import { authService } from '@/services/auth.service';
import Cookies from 'js-cookie';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
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

  fetchUser: async () => {
    const token = Cookies.get('token');
    
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const response = await authService.getMe();
      // استجابة السيرفر ستكون مغلفة بـ ApiResponse التي بنيناها
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      // إذا فشل الجلب (مثلاً التوكن منتهي أو الطالب تم حظره)، الـ Axios Interceptor سيتكفل بالباقي
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user: User) => set({ user, isAuthenticated: true }),

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // ميزة للـ UX: تحديث الرصيد فوراً في الـ UI بعد الشراء بدون الحاجة لعمل Refresh
  updateWallet: (newBalance: number) => set((state) => ({
    user: state.user ? { ...state.user, walletBalance: newBalance } : null
  })),
}));