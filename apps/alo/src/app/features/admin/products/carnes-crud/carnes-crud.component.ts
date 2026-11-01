import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { CurrencyPipe } from '@angular/common';
import { BrandService } from '../../../../core/services/brand.service';
import { CategoriaFiltroComponent } from '../../shared/categoria-filtro.component';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { TipoCarne, CategoriaProducto } from '../../../../core/models/product.model';

@Component({
  selector: 'app-carnes-crud',
  standalone: true,
  imports: [FormField, CurrencyPipe, CategoriaFiltroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-4 md:p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-bebas text-3xl text-neon-pink tracking-widest">🥩 {{ titulo() }}</h2>
        <button class="btn-neon-pink px-4 py-2 rounded-lg text-sm font-bold" (click)="openNew()">
          + Agregar{{ categoriaFiltrada() ? ' a ' + categoriaFiltrada()!.nombre : '' }}
        </button>
      </div>
      <app-categoria-filtro [categorias]="fb.allCategorias()" [(value)]="filtro" />

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        @for (carne of lista(); track carne.id) {
          <div class="card-base p-4 flex flex-col gap-2">
            <div class="text-3xl text-center">{{ carne.emoji }}</div>
            <p class="text-center font-bold text-sm">{{ carne.name }}</p>
            <p class="text-center text-xs" [style.color]="carne.available ? 'var(--neon-green)' : '#ef4444'">
              {{ carne.available ? '✅ Disponible' : '❌ No disponible' }}
            </p>
            @if (carne.precios && carne.precios.length > 0) {
              <p class="text-center text-xs" style="color: var(--texto-muted)">
                💲 {{ getPrecioLabels(carne.precios) }}
              </p>
            } @else {
              <p class="text-center text-xs" style="color: var(--texto-muted)">💲 Todos los precios</p>
            }
            <div class="flex gap-1 mt-1">
              <button class="flex-1 text-xs py-1 rounded bg-[var(--bg-surface)] border border-[var(--neon-pink)]/20 hover:border-[var(--neon-pink)]/60 transition-colors"
                (click)="edit(carne)">Editar</button>
              <button class="flex-1 text-xs py-1 rounded bg-[var(--bg-surface)] border border-red-800/40 hover:border-red-500/60 text-red-400 transition-colors"
                (click)="delete(carne.id)">Borrar</button>
            </div>
          </div>
        }
      </div>

      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.8)">
          <div class="card-base p-6 w-full max-w-md neon-glow-pink" style="max-height:90vh;overflow-y:auto">
            <h3 class="font-bebas text-2xl text-neon-pink mb-4">
              {{ editing() ? 'Editar' : 'Nueva' }} Carne
            </h3>
            <div class="flex flex-col gap-3">
              <input type="text" placeholder="Nombre (ej: Arrachera)" [formField]="f.name" />
              <input type="text" placeholder="Emoji (ej: 🥩)" [formField]="f.emoji" />

              <label class="text-sm font-bold text-[var(--texto-secondary)]">Categorías:</label>
              @if (categoriasDisponibles().length === 0) {
                <p class="text-xs text-[var(--texto-muted)]">
                  No hay categorías aún. Ve a <strong>Catálogo → Categorías</strong> para crear una.
                </p>
              } @else {
                <div class="flex gap-3 flex-wrap">
                  @for (cat of categoriasDisponibles(); track cat.slug) {
                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" [checked]="formCategorias().includes(cat.slug)"
                        (change)="toggleCat(cat.slug)" class="w-4 h-4 accent-pink-400" />
                      {{ cat.emoji }} {{ cat.nombre }}
                    </label>
                  }
                </div>
              }

              <!-- PRECIOS APLICABLES -->
              <label class="text-sm font-bold text-[var(--texto-secondary)] mt-1">
                💲 Precios disponibles para esta carne:
              </label>
              <p class="text-xs" style="color: var(--texto-muted)">
                Si no seleccionas ninguno, la carne aparece en todos los precios.
              </p>
              @if (preciosFiltrados().length === 0) {
                <p class="text-xs" style="color: var(--texto-muted)">
                  Selecciona primero una categoría para ver sus precios.
                </p>
              } @else {
                <div class="flex gap-3 flex-wrap">
                  @for (precio of preciosFiltrados(); track precio.id) {
                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" [checked]="formPrecios().includes(precio.id)"
                        (change)="togglePrecio(precio.id)" class="w-4 h-4 accent-orange-400" />
                      {{ precio.label }} - {{ precio.precio | currency:'MXN':'symbol-narrow':'1.0-0' }}
                    </label>
                  }
                </div>
              }

              <label class="flex items-center gap-2 text-sm cursor-pointer mt-1">
                <input type="checkbox" [formField]="f.available" class="w-4 h-4 accent-pink-400" />
                Disponible
              </label>
            </div>
            <div class="flex gap-3 mt-5">
              <button class="flex-1 btn-neon-pink py-2 rounded-lg font-bold" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
              <button class="flex-1 py-2 rounded-lg font-bold border border-[var(--neon-pink)]/30 hover:border-[var(--neon-pink)]/60 transition-colors"
                (click)="closeModal()">Cancelar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CarnesCrudComponent {
  fb = inject(FirebaseService);
  brand = inject(BrandService);

  categoriasDisponibles = computed(() => this.fb.categorias());

  // Campos del form como signals para reactividad correcta
  // Filtro por categoría: "" = todas
  filtro = signal('');
  categoriaFiltrada = computed(() => this.fb.allCategorias().find(c => c.slug === this.filtro()) ?? null);
  titulo = computed(() => this.categoriaFiltrada()?.reglas?.baseLabel
    ? this.categoriaFiltrada()!.reglas!.baseLabel + 's'
    : this.brand.labels.basePlural);
  lista = computed(() =>
    this.fb.allCarnes().filter(c => !this.filtro() || c.categorias?.includes(this.filtro()))
  );

  model = signal({ name: '', emoji: '🥩', available: true });
  f = form(this.model, p => { required(p.name); });
  formCategorias = signal<CategoriaProducto[]>([]);
  formPrecios    = signal<string[]>([]);

  // Reactivo: precios filtrados según categorías seleccionadas en el form
  preciosFiltrados = computed(() =>
    this.fb.precios().filter(p => this.formCategorias().includes(p.categoria))
  );

  showModal = signal(false);
  editing   = signal<TipoCarne | null>(null);
  saving    = signal(false);

  getPrecioLabels(precioIds: string[]): string {
    return precioIds
      .map(id => this.fb.precios().find(p => p.id === id))
      .filter(Boolean)
      .map(p => `${p!.label} $${p!.precio}`)
      .join(', ');
  }

  openNew() {
    this.editing.set(null);
    const primera = this.filtro() || (this.categoriasDisponibles()[0]?.slug ?? '');
    this.model.set({ name: '', emoji: '🥩', available: true });
    this.formCategorias.set(primera ? [primera] : []);
    this.formPrecios.set([]);
    this.showModal.set(true);
  }

  edit(c: TipoCarne) {
    this.editing.set(c);
    this.model.set({ name: c.name, emoji: c.emoji ?? '🥩', available: c.available });
    this.formCategorias.set([...(c.categorias ?? [])]);
    this.formPrecios.set([...(c.precios ?? [])]);
    this.showModal.set(true);
  }

  toggleCat(slug: CategoriaProducto) {
    this.formCategorias.update(cats => {
      const idx = cats.indexOf(slug);
      const nuevas = idx === -1 ? [...cats, slug] : cats.filter(c => c !== slug);
      // Limpiar precios que ya no apliquen a ninguna categoría seleccionada
      this.formPrecios.update(pids =>
        pids.filter(pid => {
          const precio = this.fb.precios().find(p => p.id === pid);
          return precio && nuevas.includes(precio.categoria);
        })
      );
      return nuevas;
    });
  }

  togglePrecio(id: string) {
    this.formPrecios.update(ids => {
      const idx = ids.indexOf(id);
      return idx === -1 ? [...ids, id] : ids.filter(x => x !== id);
    });
  }

  closeModal() { this.showModal.set(false); }

  async save() {
    if (!this.model().name.trim()) return;
    this.saving.set(true);
    try {
      const data: Omit<TipoCarne, 'id'> = {
        name:       this.model().name.trim(),
        emoji:      this.model().emoji,
        available:  this.model().available,
        categorias: this.formCategorias(),
        precios:    this.formPrecios(),
      };
      if (this.editing()) await this.fb.update('carnes', this.editing()!.id, data);
      else await this.fb.add('carnes', data);
      this.closeModal();
    } finally { this.saving.set(false); }
  }

  async delete(id: string) {
    if (!confirm('¿Eliminar este tipo de carne?')) return;
    await this.fb.delete('carnes', id);
  }
}
