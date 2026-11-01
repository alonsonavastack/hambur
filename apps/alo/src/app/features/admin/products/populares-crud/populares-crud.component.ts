import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { CategoriaFiltroComponent } from '../../shared/categoria-filtro.component';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { StorageService } from '@alo/core';
import { ProductoPopular, CategoriaProducto } from '../../../../core/models/product.model';

@Component({
  selector: 'app-populares-crud',
  standalone: true,
  imports: [FormField, CategoriaFiltroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="p-4 md:p-6">
  <div class="flex items-center justify-between mb-6">
    <h2 class="font-bebas text-3xl text-neon tracking-widest">⭐ Productos Populares</h2>
    <button class="btn-neon px-4 py-2 rounded-lg text-sm font-bold" (click)="openCreate()">
      + Nuevo Popular{{ categoriaFiltrada() ? ' de ' + categoriaFiltrada()!.nombre : '' }}
    </button>
  </div>
  <app-categoria-filtro [categorias]="fb.allCategorias()" [(value)]="filtro" />

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    @for (item of lista(); track item.id) {
      <div class="card-base p-4 flex flex-col gap-2">
        @if (item.imageUrl) {
          <img [src]="item.imageUrl" class="w-full h-32 object-cover rounded-lg" />
        }
        <p class="font-bold text-sm">{{ item.nombre }}</p>
        <p class="text-xs" style="color:var(--texto-muted)">{{ categoriaLabel(item.categoria) }}</p>
        <p class="text-xs" style="color:var(--texto-secondary)">{{ item.descripcion }}</p>
        <p class="text-xs" [style.color]="item.visible ? 'var(--neon-green)' : '#ef4444'">
          {{ item.visible ? '✅ Visible' : '❌ Oculto' }}
        </p>
        <div class="flex gap-1 mt-1">
          <button class="flex-1 text-xs py-1 rounded bg-[var(--bg-surface)] border border-[var(--neon)]/20 hover:border-[var(--neon)]/60 transition-colors"
            (click)="openEdit(item)">Editar</button>
          <button class="flex-1 text-xs py-1 rounded bg-[var(--bg-surface)] border border-red-800/40 hover:border-red-500/60 text-red-400 transition-colors"
            (click)="delete(item)">Borrar</button>
        </div>
      </div>
    }
  </div>

  @if (modalOpen()) {
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.85);">
      <div class="card-base p-6 w-full max-w-md neon-glow overflow-y-auto" style="max-height:90vh;">
        <h3 class="font-bebas text-2xl text-neon mb-4">
          {{ editingItem() ? 'Editar' : 'Nuevo' }} Popular
        </h3>

        <form (submit)="$event.preventDefault()" class="flex flex-col gap-3">
          <input type="text" placeholder="Nombre del producto" [formField]="f.nombre" />
          <input type="text" placeholder="Descripción breve" [formField]="f.descripcion" />

          <select [formField]="f.categoria">
            @for (c of fb.allCategorias(); track c.id) {
              <option [value]="c.slug">{{ c.emoji }} {{ c.nombre }}</option>
            }
          </select>

          <div>
            <label class="block text-sm font-bold mb-1" style="color:var(--texto-secondary)">Precio al tocar el popular</label>
            <select [formField]="f.precioId">
              @for (p of preciosDeCategoria(); track p.id) {
                <option [value]="p.id">{{ p.label }} — {{ '$' + p.precio }}</option>
              }
            </select>
            @if (preciosDeCategoria().length === 0) {
              <p class="text-xs mt-1" style="color:#f87171;">Esta categoría no tiene precios. Créalos en Precios para que el popular se pueda pedir.</p>
            }
          </div>

          <div>
            <label class="block text-sm font-bold mb-1" style="color:var(--texto-secondary)">Imagen</label>
            <div class="flex gap-2 mb-2">
              <button type="button" (click)="uploadMode.set('url')"
                [style.color]="uploadMode() === 'url' ? 'var(--neon)' : 'var(--texto-muted)'"
                class="text-xs font-bold border-b-2 pb-0.5 transition-colors"
                [style.borderColor]="uploadMode() === 'url' ? 'var(--neon)' : 'transparent'">URL</button>
              <button type="button" (click)="uploadMode.set('file')"
                [style.color]="uploadMode() === 'file' ? 'var(--neon)' : 'var(--texto-muted)'"
                class="text-xs font-bold border-b-2 pb-0.5 transition-colors"
                [style.borderColor]="uploadMode() === 'file' ? 'var(--neon)' : 'transparent'">Subir archivo</button>
            </div>
            @if (uploadMode() === 'url') {
              <input type="url" placeholder="URL de imagen" [formField]="f.imageUrl" />
            } @else {
              <input type="file" accept="image/*" (change)="onFileChange($event)"
                style="font-size:0.8rem; padding:0.3rem;" />
              @if (uploading()) {
                <p class="text-xs mt-1" style="color:var(--neon);">Subiendo imagen...</p>
              }
            }
          </div>

          <input type="number" placeholder="Orden (1, 2, 3...)" [formField]="f.orden" />

          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" [formField]="f.visible" class="w-4 h-4 accent-cyan-400" />
            Visible en la página
          </label>
        </form>

        <div class="flex gap-3 mt-5">
          <button class="flex-1 btn-neon py-2 rounded-lg font-bold"
            (click)="save()" [disabled]="f().invalid() || saving()">
            {{ saving() ? 'Guardando...' : 'Guardar' }}
          </button>
          <button class="flex-1 py-2 rounded-lg font-bold border border-[var(--neon)]/30 hover:border-[var(--neon)]/60 transition-colors"
            (click)="closeModal()">Cancelar</button>
        </div>
      </div>
    </div>
  }
</div>
  `
})
export class PopularesCrudComponent {
  fb      = inject(FirebaseService);   // public — usado en template
  private storage = inject(StorageService);

  fb2         = this.fb; // alias para template (legacy)
  modalOpen   = signal(false);
  editingItem = signal<ProductoPopular | null>(null);
  uploading   = signal(false);
  saving      = signal(false);
  uploadMode  = signal<'url' | 'file'>('url');

  model = signal({
    nombre: '', descripcion: '', categoria: '' as CategoriaProducto,
    precioId: '', imageUrl: '', visible: true, orden: 1,
  });
  f = form(this.model, p => {
    required(p.nombre);
    required(p.categoria);
  });

  // Filtro por categoría: "" = todas
  filtro = signal('');
  categoriaFiltrada = computed(() => this.fb.allCategorias().find(c => c.slug === this.filtro()) ?? null);
  lista = computed(() =>
    this.fb.allPopulares().filter(p => !this.filtro() || p.categoria === this.filtro())
  );

  preciosDeCategoria = computed(() =>
    this.fb.allPrecios().filter(p => p.categoria === this.model().categoria && p.available)
  );

  categoriaLabel(cat: CategoriaProducto): string {
    const c = this.fb.allCategorias().find(x => x.slug === cat);
    return c ? `${c.emoji} ${c.nombre}` : cat;
  }

  private categoriaPorDefecto(): CategoriaProducto {
    return this.filtro() || (this.fb.allCategorias()[0]?.slug ?? '');
  }

  openCreate(): void {
    const categoria = this.categoriaPorDefecto();
    this.model.set({
      nombre: '', descripcion: '', categoria, precioId: this.primerPrecio(categoria),
      imageUrl: '', visible: true, orden: this.fb.allPopulares().length + 1,
    });
    this.editingItem.set(null);
    this.uploadMode.set('url');
    this.modalOpen.set(true);
  }

  openEdit(item: ProductoPopular): void {
    this.model.set({
      nombre: item.nombre,
      descripcion: item.descripcion,
      categoria: item.categoria,
      precioId: item.precioId || this.primerPrecio(item.categoria),
      imageUrl: item.imageUrl,
      visible: item.visible,
      orden: item.orden,
    });
    this.editingItem.set(item);
    this.uploadMode.set('url');
    this.modalOpen.set(true);
  }

  private primerPrecio(categoria: CategoriaProducto): string {
    return this.fb.allPrecios().find(p => p.categoria === categoria && p.available)?.id ?? '';
  }

  closeModal(): void { this.modalOpen.set(false); }

  async onFileChange(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    try {
      const url = await this.storage.uploadImage(file, 'populares');
      this.model.update(m => ({ ...m, imageUrl: url }));
    } finally { this.uploading.set(false); }
  }

  async save(): Promise<void> {
    if (this.f().invalid()) return;
    this.saving.set(true);
    try {
      const m = this.model();
      // Si cambió la categoría y el precio elegido ya no le corresponde, se usa el primero de la nueva.
      const precioValido = this.preciosDeCategoria().some(p => p.id === m.precioId);
      const data = {
        nombre:      m.nombre.trim(),
        descripcion: m.descripcion.trim(),
        categoria:   m.categoria || this.categoriaPorDefecto(),
        precioId:    precioValido ? m.precioId : this.primerPrecio(m.categoria),
        imageUrl:    m.imageUrl.trim(),
        visible:     m.visible,
        orden:       Number(m.orden) || 0,
      };
      if (this.editingItem()) {
        await this.fb.update('populares', this.editingItem()!.id, data);
      } else {
        await this.fb.add('populares', { ...data, ingredientesIds: [], tipoCarne: '' });
      }
      this.closeModal();
    } finally { this.saving.set(false); }
  }

  async delete(item: ProductoPopular): Promise<void> {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    await this.fb.delete('populares', item.id);
  }
}
