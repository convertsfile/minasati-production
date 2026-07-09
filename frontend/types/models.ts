// types/models.ts

export type UserRole = 'student' | 'admin';
export type UserStatus = 'pending' | 'active' | 'blocked' | 'rejected';

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  academicYear: string | null;
  studentNumber: string | null;
  parentPhone: string | null;
  school: string | null;
  parentJob: string | null;
  governorate: string | null;
  idImageUrl: string | null;
  status: UserStatus;
  walletBalance: number;
  isBlocked: boolean;
  isVerified: boolean;
  role: UserRole;
  isAdmin: boolean; // UI rendering ONLY
  rejectionReason: string | null;
  joinedAt: string | null;
  /** True if the student has at least one enrolled course. Optional — backend
   * may or may not include it; the UI treats it as false when absent. */
  hasCourses?: boolean;
}

/** Shape returned by Laravel's POST /api/auth/verify-otp endpoint after a
 * student successfully verifies their phone number. */
export interface VerifyOtpResponse {
  token: string;
  user: User;
}

/** Shape returned by Laravel's POST /api/auth/register endpoint (intermediate
 * step that returns a temp_user_id which the client then sends to /verify-otp). */
export interface RegisterResponse {
  temp_user_id: string;
  phone: string;
}