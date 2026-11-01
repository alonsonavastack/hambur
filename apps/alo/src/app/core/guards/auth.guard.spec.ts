import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

function preparar(user: object | null, role: string | undefined) {
  const logout = vi.fn(async () => {});
  const auth = { waitForAuth: async () => user, waitForRole: async () => role, logout };
  const router = { createUrlTree: (c: string[]) => ({ ruta: c.join('/') }) as unknown as UrlTree };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: router },
    ],
  });
  const ejecutar = () => TestBed.runInInjectionContext(() => authGuard({} as never, {} as never)) as Promise<unknown>;
  return { ejecutar, logout };
}

describe('authGuard', () => {
  it('sin sesión manda al login', async () => {
    const { ejecutar } = preparar(null, undefined);
    expect(await ejecutar()).toMatchObject({ ruta: '/admin/login' });
  });

  it('administrador y empleado entran', async () => {
    for (const role of ['admin', 'empleado']) {
      TestBed.resetTestingModule();
      const { ejecutar } = preparar({ uid: '1' }, role);
      expect(await ejecutar()).toBe(true);
    }
  });

  it('usuario inactivo: cierra sesión y manda al login', async () => {
    const { ejecutar, logout } = preparar({ uid: '1' }, 'inactivo');
    expect(await ejecutar()).toMatchObject({ ruta: '/admin/login' });
    expect(logout).toHaveBeenCalledOnce();
  });

  it('rol desconocido nunca se trata como administrador', async () => {
    const { ejecutar, logout } = preparar({ uid: '1' }, undefined);
    expect(await ejecutar()).toMatchObject({ ruta: '/admin/login' });
    expect(logout).toHaveBeenCalledOnce();
  });
});
