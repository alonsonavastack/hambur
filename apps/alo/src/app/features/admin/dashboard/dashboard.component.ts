import { Component, inject, computed, signal } from '@angular/core';
import { FirebaseService } from '../../../core/services/firebase.service';
import { StorageService } from '@alo/core';
import { BrandService } from '../../../core/services/brand.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  brand = inject(BrandService);
  private fb      = inject(FirebaseService);
  private storage = inject(StorageService);

  // ── Catálogo ──────────────────────────────────────────────────────
  totalIngredientes  = computed(() => this.fb.allIngredientes().length);
  activeIngredientes = computed(() => this.fb.allIngredientes().filter(i => i.available).length);
  totalCarnes        = computed(() => this.fb.allCarnes().length);
  totalPrecios       = computed(() => this.fb.allPrecios().length);
  totalPopulares     = computed(() => this.fb.allPopulares().length);

  // ── Visitas ───────────────────────────────────────────────────────
  visitsTotal = computed(() => this.fb.statsVisits());

  // ── Pedidos ───────────────────────────────────────────────────────
  totalPedidos = computed(() => this.fb.allPedidos().length);

  pedidosHoy = computed(() => {
    const hoy = new Date().toDateString();
    return this.fb.allPedidos().filter(p => {
      const d = p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp);
      return d.toDateString() === hoy;
    }).length;
  });

  pedidosSemana = computed(() => {
    const hace7 = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.fb.allPedidos().filter(p => {
      const ts = p.timestamp instanceof Date ? p.timestamp.getTime() : new Date(p.timestamp).getTime();
      return ts >= hace7;
    }).length;
  });

  pedidosPendientes = computed(() =>
    this.fb.allPedidos().filter(p => (p.status ?? 'pendiente') === 'pendiente').length
  );

  ingresoHoy = computed(() => {
    const hoy = new Date().toDateString();
    return this.fb.allPedidos()
      .filter(p => {
        const d = p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp);
        const entregado = p.status === 'entregado' || p.status === 'listo';
        return d.toDateString() === hoy && entregado;
      })
      .reduce((sum, p) => sum + (p.totalPrecio ?? 0), 0);
  });

  // ── Logo ──────────────────────────────────────────────────────────
  logoUrl       = this.fb.logoUrl;
  uploadingLogo = signal(false);
  logoUrlInput  = signal('');
  logoMode      = signal<'url' | 'file'>('url');

  async onLogoFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingLogo.set(true);
    try {
      const url = await this.storage.uploadImage(file, 'branding');
      await this.fb.saveLogo(url);
    } finally {
      this.uploadingLogo.set(false);
    }
  }

  async saveLogoUrl(): Promise<void> {
    const url = this.logoUrlInput().trim();
    if (!url) return;
    await this.fb.saveLogo(url);
    this.logoUrlInput.set('');
  }

  onLogoUrlInput(event: Event): void {
    this.logoUrlInput.set((event.target as HTMLInputElement).value);
  }

  async exportQR(): Promise<void> {
    const url = this.brand.qrUrl(1000);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `QR_${this.brand.nombre.replace(/\s+/g, '')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, '_blank');
    }
  }
}
