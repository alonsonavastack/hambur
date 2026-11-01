import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FirebaseService } from '../../../core/services/firebase.service';
import { CategoriaGasto, Gasto } from '../../../core/models/product.model';

type FilterPeriod = 'hoy' | 'semana' | 'mes' | 'todo' | 'personalizado';

@Component({
  selector: 'app-finanzas',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './finanzas.component.html'
})
export class FinanzasComponent {
  firebase = inject(FirebaseService);

  period      = signal<FilterPeriod>('hoy');
  fechaInicio = signal<string>('');
  fechaFin    = signal<string>('');

  showGastoModal = signal<boolean>(false);
  isSaving       = signal<boolean>(false);

  // Campos del formulario de gasto como signals individuales
  gastoMonto     = signal<number | null>(null);
  gastoConcepto  = signal<string>('');
  gastoCategoria = signal<CategoriaGasto>('Insumos');
  gastoNotas     = signal<string>('');

  categorias: CategoriaGasto[] = ['Insumos', 'Empaques', 'Servicios', 'Sueldos', 'Otros'];

  onFechaInicio(e: Event) { this.fechaInicio.set((e.target as HTMLInputElement).value); }
  onFechaFin(e: Event)    { this.fechaFin.set((e.target as HTMLInputElement).value); }

  private isDateInPeriod(date: Date): boolean {
    const now    = new Date();
    const d      = new Date(date);
    const period = this.period();

    if (period === 'todo') return true;
    if (period === 'hoy') return d.toDateString() === now.toDateString();
    if (period === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'semana') {
      const diff = now.getTime() - d.getTime();
      return diff <= 7 * 24 * 60 * 60 * 1000 && diff >= 0;
    }
    if (period === 'personalizado') {
      const start = this.fechaInicio() ? new Date(this.fechaInicio() + 'T00:00:00') : null;
      const end   = this.fechaFin()    ? new Date(this.fechaFin()    + 'T23:59:59') : null;
      if (start && end) return d >= start && d <= end;
      if (start) return d >= start;
      if (end)   return d <= end;
      return true;
    }
    return true;
  }

  ingresosFiltrados = computed(() =>
    this.firebase.allPedidos().filter(p =>
      (p.status === 'entregado' || p.status === 'listo') &&
      this.isDateInPeriod(p.timestamp)
    )
  );

  gastosFiltrados = computed(() =>
    this.firebase.allGastos().filter((g: Gasto) => this.isDateInPeriod(g.timestamp))
  );

  totalIngresos = computed(() => this.ingresosFiltrados().reduce((acc, p) => acc + p.totalPrecio, 0));
  totalEgresos  = computed(() => this.gastosFiltrados().reduce((acc, g: Gasto) => acc + g.monto, 0));
  utilidadNeta  = computed(() => this.totalIngresos() - this.totalEgresos());

  historial = computed(() => {
    const ingresos = this.ingresosFiltrados().map(p => ({
      id:        p.id,
      tipo:      'ingreso' as const,
      monto:     p.totalPrecio,
      concepto:  p.nombreCliente === 'Venta Mostrador' ? 'Venta en Mostrador' : `Pedido Web - ${p.nombreCliente}`,
      categoria: 'Venta',
      timestamp: p.timestamp,
      notas:     `${p.totalItems} item(s)`
    }));
    const egresos = this.gastosFiltrados().map((g: Gasto) => ({
      id:        g.id,
      tipo:      'egreso' as const,
      monto:     g.monto,
      concepto:  g.concepto,
      categoria: g.categoria,
      timestamp: g.timestamp,
      notas:     g.notas
    }));
    return [...ingresos, ...egresos].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  setPeriod(p: FilterPeriod) { this.period.set(p); }

  openNuevoGasto() {
    this.gastoMonto.set(null);
    this.gastoConcepto.set('');
    this.gastoCategoria.set('Insumos');
    this.gastoNotas.set('');
    this.showGastoModal.set(true);
  }

  closeModal() { this.showGastoModal.set(false); }

  onGastoMonto(e: Event)    { this.gastoMonto.set(Number((e.target as HTMLInputElement).value) || null); }
  onGastoConcepto(e: Event) { this.gastoConcepto.set((e.target as HTMLInputElement).value); }
  onGastoNotas(e: Event)    { this.gastoNotas.set((e.target as HTMLInputElement).value); }

  async saveGasto() {
    const monto    = this.gastoMonto();
    const concepto = this.gastoConcepto().trim();
    if (!monto || !concepto) { alert('Por favor ingresa un monto y un concepto.'); return; }

    this.isSaving.set(true);
    try {
      await this.firebase.saveGasto({
        monto,
        concepto,
        categoria: this.gastoCategoria(),
        timestamp: new Date(),
        notas:     this.gastoNotas()
      });
      this.closeModal();
    } catch (e) {
      console.error('Error al guardar gasto:', e);
      alert('Hubo un error al guardar el gasto.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteGasto(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
      await this.firebase.deleteGasto(id);
    }
  }

  periodosOptions: { value: FilterPeriod, label: string }[] = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Semana' },
    { value: 'mes', label: 'Mes' },
    { value: 'todo', label: 'Histórico' },
    { value: 'personalizado', label: 'Fechas' }
  ];
}
