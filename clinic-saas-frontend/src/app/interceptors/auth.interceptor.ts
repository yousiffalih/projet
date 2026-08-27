import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * مراقب HTTP — يُضيف التوكن لكل طلب
 * يدعم كلاً من: توكن المستخدم العادي (token) وتوكن السوبر أدمن (sa_token)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const isSuperAdminRequest = req.url.includes('/api/superadmin');
  const isAuthRequest =
    req.url.includes('/login') ||
    req.url.includes('/register-clinic') ||
    req.url.includes('/create-admin');

  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = isSuperAdminRequest
      ? (localStorage.getItem('sa_token') || localStorage.getItem('token'))
      : (localStorage.getItem('token') || localStorage.getItem('sa_token'));
  }

  const authReq = (token && !isAuthRequest)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if ((error.status === 401 || error.status === 403) && !isAuthRequest) {
        if (typeof window !== 'undefined') {
          if (isSuperAdminRequest) {
            localStorage.removeItem('sa_token');
            localStorage.removeItem('sa_user');
            router.navigate(['/superadmin/login']);
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
          }
        }
      }
      return throwError(() => error);
    })
  );
};
