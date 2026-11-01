import { Injectable, signal, computed } from '@angular/core';
import { ItemPedido } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  nombreCliente   = signal<string>('');
  telefonoCliente = signal<string>('');
  items = signal<ItemPedido[]>([]);

  totalItems  = computed(() => this.items().reduce((s, i) => s + i.cantidad, 0));
  totalPrecio = computed(() => this.items().reduce((s, i) => s + i.precio * i.cantidad, 0));

  hasItems = computed(() =>
    this.items().length > 0 &&
    this.items().every(i => i.precio > 0) &&
    this.nombreCliente().trim().length > 0
  );

  // ✅ addItem recibe ItemPedido completo (no un string de categoría)
  addItem(item: ItemPedido): void {
    this.items.update(prev => [...prev, item]);
  }

  updateItem(updated: ItemPedido): void {
    this.items.update(items => items.map(i => i.id === updated.id ? updated : i));
  }

  removeItem(id: string): void {
    this.items.update(items => items.filter(i => i.id !== id));
  }

  reset(): void {
    this.items.set([]);
    this.nombreCliente.set('');
    this.telefonoCliente.set('');
  }
}
