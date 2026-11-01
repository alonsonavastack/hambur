import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { form, FormField, min, required } from '@angular/forms/signals';
import { CategoriaFiltroComponent } from '../../shared/categoria-filtro.component';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { PrecioProducto, CategoriaProducto, Categoria } from '../../../../core/models/product.model';

@Component({
  selector: 'app-precios-crud',
  standalone: true,
  imports: [FormField, CategoriaFiltroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './precios-crud.component.html',
})
export class PreciosCrudComponent {
  fb = inject(FirebaseService);

  // Todos los precios (incluyendo inactivos) para el admin
  // Filtro por categoría: "" = todas
  filtro = signal('');
  items = computed(() => this.fb.allPrecios().filter(p => !this.filtro() || p.categoria === this.filtro()));

  // Categorías dinámicas desde Firestore (todas, no solo activas)
  categorias = computed(() => this.fb.allCategorias());

  modalOpen   = signal(false);
  editingItem = signal<PrecioProducto | null>(null);
  saving      = signal(false);

  model = signal({ categoria: '' as CategoriaProducto, label: '', precio: 0, available: true });
  f = form(this.model, p => {
    required(p.categoria);
    required(p.label);
    min(p.precio, 1);
  });

  // Obtiene la etiqueta con emoji de una categoría dado su slug
  categoriaLabel(slug: CategoriaProducto): string {
    const cat = this.fb.allCategorias().find(c => c.slug === slug);
    return cat ? `${cat.emoji} ${cat.nombre}` : slug;
  }

  openCreate(): void {
    // Usa el slug de la primera categoría disponible como valor por defecto
    const primerSlug = this.filtro() || (this.categorias()[0]?.slug ?? '');
    this.model.set({ categoria: primerSlug, label: '', precio: 0, available: true });
    this.editingItem.set(null);
    this.modalOpen.set(true);
  }

  openEdit(item: PrecioProducto): void {
    this.model.set({
      categoria: item.categoria,
      label:     item.label,
      precio:    item.precio,
      available: item.available,
    });
    this.editingItem.set(item);
    this.modalOpen.set(true);
  }

  closeModal(): void { this.modalOpen.set(false); }

  onSubmit(event: Event): void {
    event.preventDefault();
    void this.save();
  }

  async save(): Promise<void> {
    if (this.f().invalid()) return;
    this.saving.set(true);
    try {
      const m = this.model();
      const data = {
        categoria: m.categoria,
        label:     m.label.trim(),
        precio:    Number(m.precio) || 0,
        available: m.available,
      };
      if (this.editingItem()) {
        await this.fb.update('precios', this.editingItem()!.id, data);
      } else {
        await this.fb.add('precios', data);
      }
      this.closeModal();
    } finally { this.saving.set(false); }
  }

  async delete(item: PrecioProducto): Promise<void> {
    if (!confirm(`¿Eliminar "${item.label}"?`)) return;
    await this.fb.delete('precios', item.id);
  }
}
