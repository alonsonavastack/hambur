import { Component, inject, computed, signal } from '@angular/core';
import { FirebaseService } from '../../../core/services/firebase.service';
import { AuthService } from '../../../core/services/auth.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import { Pedido, PedidoStatus } from '../../../core/models/product.model';
import { BrandService } from '../../../core/services/brand.service';

const STATUS_CONFIG: Record<PedidoStatus, { label: string; emoji: string; color: string; bg: string }> = {
  pendiente:      { label: 'Pendiente',      emoji: '⏳', color: '#facc15', bg: 'rgba(250,204,21,0.12)'  },
  recibido:       { label: 'Recibido',        emoji: '✅', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  en_preparacion: { label: 'En preparación',  emoji: '👨‍🍳', color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  listo:          { label: 'Listo',           emoji: '🍔', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  entregado:      { label: 'Entregado',       emoji: '🎉', color: '#86efac', bg: 'rgba(134,239,172,0.12)' },
  cancelado:      { label: 'Cancelado',       emoji: '❌', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const STATUS_ORDER: PedidoStatus[] = ['pendiente', 'recibido', 'en_preparacion', 'listo', 'entregado', 'cancelado'];

const STATUS_PROGRESO: PedidoStatus[] = ['pendiente', 'recibido', 'en_preparacion', 'listo', 'entregado'];

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [],
  templateUrl: './pedidos.component.html'
})
export class PedidosComponent {
  brand = inject(BrandService);
  private fb = inject(FirebaseService);
  auth       = inject(AuthService);
  offline    = inject(OfflineSyncService);

  pedidos       = this.fb.allPedidos;
  pedidoAbierto = signal<string | null>(null);
  updatingId    = signal<string | null>(null);

  busqueda     = signal('');
  filtroFecha  = signal<'todos' | 'hoy' | 'semana'>('todos');
  filtroStatus = signal<PedidoStatus | 'todos'>('todos');

  readonly statusConfig   = STATUS_CONFIG;
  readonly statusOrder    = STATUS_ORDER;
  readonly statusProgreso = STATUS_PROGRESO;

  // Mezcla pedidos de Firestore + pedidos locales offline sin duplicados
  todosPedidos = computed<Pedido[]>(() => {
    const firestore = this.pedidos();
    const locales   = this.offline.pedidosLocales() as unknown as Pedido[];

    // Set de localIds que ya están en Firestore (sincronizados)
    const localIdsEnFirestore = new Set(
      firestore.map(p => p.localId).filter(Boolean)
    );

    // Filtrar locales que ya subieron a Firestore
    const soloLocales = locales.filter(l =>
      !localIdsEnFirestore.has(l.id)   // l.id === localId
    );

    return [...soloLocales, ...firestore];
  });

  pedidosFiltrados = computed(() => {
    const texto  = this.busqueda().toLowerCase().trim();
    const fecha  = this.filtroFecha();
    const status = this.filtroStatus();
    const hoy    = new Date();

    return this.todosPedidos().filter(p => {
      const d = p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp);

      if (fecha === 'hoy' && d.toDateString() !== hoy.toDateString()) return false;
      if (fecha === 'semana') {
        const hace7 = new Date(hoy);
        hace7.setDate(hoy.getDate() - 7);
        if (d < hace7) return false;
      }

      if (status !== 'todos' && (p.status ?? 'pendiente') !== status) return false;
      if (texto && !p.nombreCliente.toLowerCase().includes(texto)) return false;

      return true;
    });
  });

  totalFiltrados = computed(() => this.pedidosFiltrados().length);
  totalIngresos  = computed(() =>
    this.pedidosFiltrados()
      .filter(p => p.status !== 'cancelado')
      .reduce((s, p) => s + p.totalPrecio, 0)
  );
  promedio = computed(() =>
    this.totalFiltrados() > 0 ? Math.round(this.totalIngresos() / this.totalFiltrados()) : 0
  );

  countByStatus(s: PedidoStatus | 'todos'): number {
    if (s === 'todos') return this.todosPedidos().length;
    return this.todosPedidos().filter(p => (p.status ?? 'pendiente') === s).length;
  }

  togglePedido(id: string): void {
    this.pedidoAbierto.update(c => (c === id ? null : id));
  }

  onBusqueda(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  getStatusCfg(status?: PedidoStatus) {
    return STATUS_CONFIG[status ?? 'pendiente'];
  }

  setFiltroFecha(valor: string): void {
    if (valor === 'hoy' || valor === 'semana' || valor === 'todos') {
      this.filtroFecha.set(valor);
    }
  }

  async cambiarStatus(pedidoId: string, nuevoStatus: PedidoStatus): Promise<void> {
    this.updatingId.set(pedidoId);
    try {
      await this.fb.updatePedidoStatus(pedidoId, nuevoStatus);
    } finally {
      this.updatingId.set(null);
    }
  }

  async eliminarPedido(pedidoId: string): Promise<void> {
    if (!confirm('¿Estás seguro de que deseas ELIMINAR permanentemente este pedido? Esta acción no se puede deshacer.')) return;
    this.updatingId.set(pedidoId);
    try {
      await this.fb.delete('pedidos', pedidoId);
    } catch (e) {
      console.error('Error al eliminar:', e);
      alert('Hubo un error al eliminar el pedido.');
    } finally {
      this.updatingId.set(null);
    }
  }

  formatFecha(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
