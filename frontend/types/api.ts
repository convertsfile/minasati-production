// types/api.ts

export interface PaginatedMeta {
  total: number;
  currentPage: number;
  lastPage: number;
  perPage?: number;
}

// 🚀 هذا هو الهيكل الذي برمجناه في Backend ApiResponse بالضبط
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  code?: string;
  meta?: PaginatedMeta; // يظهر فقط في حالة ApiResponse::paginated()
}

// نوع موحد للأخطاء لكي نستطيع التقاطها في الـ Components
export interface ApiError {
  success: boolean;
  message: string;
  code: string;
}