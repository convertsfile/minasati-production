import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;

  // 1. تحديد المسارات المحمية فقط (لا نتدخل في مسارات الضيوف هنا أبداً)
  const isProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/admin');

  // 2. إذا حاول الدخول لمسار محمي بدون توكن، اطرده لصفحة الدخول
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path); 
    return NextResponse.redirect(loginUrl);
  }

  // 3. السماح بالمرور لأي شيء آخر
  return NextResponse.next();
}

// تحديد المسارات التي يعمل عليها الميدل وير
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};