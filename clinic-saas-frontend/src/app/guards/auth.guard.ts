import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// حارس المسارات المحمية — يمنع الوصول بدون تسجيل دخول
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // ✅ المستخدم مسجّل → اسمح له بالدخول
  }

  // ❌ غير مسجّل → أعِده لصفحة تسجيل الدخول
  return router.createUrlTree(['/login']);
};

// حارس صفحة تسجيل الدخول — يمنع المستخدم المسجّل من رؤيتها
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true; // ✅ غير مسجّل → اسمح له برؤية صفحة الدخول
  }

  // ❌ مسجّل بالفعل → وجّهه للوحة التحكم مباشرةً
  return router.createUrlTree(['/dashboard']);
};
