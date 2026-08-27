import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SuperAdminService } from '../services/super-admin.service';

/** يحمي مسارات /superadmin/dashboard — يجب أن يكون السوبر أدمن مسجل دخول */
export const superAdminGuard: CanActivateFn = () => {
  const sa = inject(SuperAdminService);
  const router = inject(Router);

  if (sa.isLoggedIn()) {
    return true;
  }
  router.navigate(['/superadmin/login']);
  return false;
};

/** يمنع السوبر أدمن المسجل من الوصول لصفحة الدخول */
export const superAdminGuestGuard: CanActivateFn = () => {
  const sa = inject(SuperAdminService);
  const router = inject(Router);

  if (!sa.isLoggedIn()) {
    return true;
  }
  router.navigate(['/superadmin/dashboard']);
  return false;
};
