import { Component, inject, signal, computed, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { BrandService } from '../../../core/services/brand.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html'
})
export class AdminLayoutComponent {
  brand = inject(BrandService);
  auth     = inject(AuthService);
  fb       = inject(FirebaseService);
  router   = inject(Router);
  menuOpen = signal(false);

  pendingCount = computed(() => this.fb.allPedidos().filter(p => (p.status ?? 'pendiente') === 'pendiente').length);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkAccess(event.urlAfterRedirects);
    });

    effect(() => {
      // Re-evaluar acceso cuando el rol se cargue
      this.checkAccess(this.router.url);
    });
  }

  private checkAccess(url: string) {
    const role = this.auth.userRole();
    if (role === 'empleado') {
      const allowed = ['/admin/pedidos', '/admin/pos', '/admin/visitas'];
      const isAllowed = allowed.some(route => url.includes(route));
      if (!isAllowed) {
        this.router.navigate(['/admin/pedidos']);
      }
    }
  }

  toggleMenu(): void { this.menuOpen.update(v => !v); }
  closeMenu(): void  { this.menuOpen.set(false); }

  logout(): void {
    this.auth.logout();
  }
}
