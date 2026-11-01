import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** El panel exige sesión iniciada y un rol activo (admin o empleado). */
export const authGuard: CanActivateFn = async () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const user = await auth.waitForAuth();
  if (!user) return router.createUrlTree(['/admin/login']);

  const role = await auth.waitForRole();
  if (role !== 'admin' && role !== 'empleado') {
    await auth.logout();
    return router.createUrlTree(['/admin/login']);
  }

  return true;
};
