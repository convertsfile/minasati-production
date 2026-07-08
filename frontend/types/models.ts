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
}