import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { BrandService } from '../../../../core/services/brand.service';
import { CategoriaFiltroComponent } from '../../shared/categoria-filtro.component';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { StorageService } from '@alo/core';
import { Ingrediente, CategoriaProducto } from '../../../../core/models/product.model';

@Component({
  selector: 'app-ingredientes-crud',
  standalone: true,
  imports: [FormField, CategoriaFiltroComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-4 md:p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-bebas text-3xl text-neon tracking-widest">🥗 {{ titulo() }}</h2>
        <button class="btn-neon px-4 py-2 rounded-lg text-sm font-bold" (click)="openNew()">
          + Agregar{{ categoriaFiltrada() ? ' a ' + categoriaFiltrada()!.nombre : '' }}
        </button>
      </div>
      <app-categoria-filtro [categorias]="fb.allCategorias()" [(value)]="filtro" />

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        @for (ing of lista(); track ing.id) {
          <div class="card-base p-4 flex flex-col gap-2 relative">
            <div class="text-3xl text-center">{{ ing.emoji }}</div>
            <p class="text-center font-bold text-sm">{{ ing.name }}</p>
            <p class="text-center text-xs" [style.color]="ing.available ? 'var(--neon-green)' : '#ef4444'">
              {{ ing.available ? '✅ Disponible' : '❌ No disponible' }}
            </p>
            @if (ing.precios && ing.precios.length > 0) {
              <p class="text-center text-xs" style="color: var(--texto-muted)">
                💲 {{ getPrecioLabels(ing.precios) }}
              </p>
            } @else {
              <p class="text-center text-xs" style="color: var(--texto-muted)">💲 Todos los precios</p>
            }
            <div class="flex gap-1 mt-1">
              <button class="flex-1 text-xs py-1 rounded bg-[var(--bg-surface)] border border-[var(--neon)]/20 hover:border-[var(--neon)]/60 transition-colors"
                (click)="edit(ing)">Editar</button>
              <button class="flex-1 text-xs py-1 rounded bg-[var(--bg-surface)] border border-red-800/40 hover:border-red-500/60 text-red-400 transition-colors"
                (click)="delete(ing.id)">Borrar</button>
            </div>
          </div>
        }
      </div>

      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.8)">
          <div class="card-base p-6 w-full max-w-md neon-glow" style="max-height:90vh;overflow-y:auto">
            <h3 class="font-bebas text-2xl text-neon mb-4">
              {{ editing() ? 'Editar' : 'Nuevo' }} Ingrediente
            </h3>
            <div class="flex flex-col gap-3">
              <input type="text"   placeholder="Nombre" [formField]="f.name" class="w-full" />
              <input type="text"   placeholder="Emoji (ej: 🧀)" [formField]="f.emoji" class="w-full" />
              <input type="url"    placeholder="URL de imagen (opcional)" [formField]="f.imageUrl" class="w-full" />
              <input type="number" placeholder="Orden (1, 2, 3...)" [formField]="f.order" class="w-full" />

              <label class="text-sm font-bold text-[var(--texto-secondary)] mt-1">Categorías donde aparece:</label>
              @if (categoriasDisponibles().length === 0) {
                <p class="text-xs text-[var(--texto-muted)]">
                  No hay categorías aún. Ve a <strong>Catálogo → Categorías</strong> para crear una.
                </p>
              } @else {
                <div class="flex gap-3 flex-wrap">
                  @for (cat of categoriasDisponibles(); track cat.slug) {
                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" [checked]="formCategorias().includes(cat.slug)"
                        (change)="toggleCat(cat.slug)" class="w-4 h-4 accent-cyan-400" />
                      {{ cat.emoji }} {{ cat.nombre }}
                    </label>
                  }
                </div>
              }

              <!-- PRECIOS APLICABLES -->
              <label class="text-sm font-bold text-[var(--texto-secondary)] mt-1">
                💲 Precios donde aparece este ingrediente:
              </label>
              <p class="text-xs" style="color: var(--texto-muted)">
                Si no seleccionas ninguno, aparece en todos los precios.
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
                      {{ precio.label }} - {{ precio.precio }}
                    </label>
                  }
                </div>
              }

              <label class="flex items-center gap-2 text-sm cursor-pointer mt-1">
                <input type="checkbox" [formField]="f.available" class="w-4 h-4 accent-cyan-400" />
                Disponible
              </label>
            </div>
            <div class="flex gap-3 mt-5">
              <button class="flex-1 btn-neon py-2 rounded-lg font-bold" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
              <button class="flex-1 py-2 rounded-lg font-bold border border-[var(--neon)]/30 hover:border-[var(--neon)]/60 transition-colors"
                (click)="closeModal()">Cancelar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class IngredientesCrudComponent {
  fb      = inject(FirebaseService);
  brand   = inject(BrandService);
  storage = inject(StorageService);

  categoriasDisponibles = computed(() => this.fb.categorias());

  // Precios filtrados reactivamente según categorías seleccionadas
  preciosFiltrados = computed(() =>
    this.fb.precios().filter(p => this.formCategorias().includes(p.categoria))
  );

  showModal = signal(false);
  editing   = signal<Ingrediente | null>(null);
  saving    = signal(false);

  // Filtro por categoría: "" = todas
  filtro = signal('');
  categoriaFiltrada = computed(() => this.fb.allCategorias().find(c => c.slug === this.filtro()) ?? null);
  titulo = computed(() => this.categoriaFiltrada()?.reglas?.ingredienteLabel ?? this.brand.labels.ingredientePlural);
  lista = computed(() =>
    this.fb.allIngredientes().filter(i => !this.filtro() || i.categorias?.includes(this.filtro()))
  );

  // Campos simples (Signal Forms)
  model = signal({ name: '', emoji: '', imageUrl: '', order: 0, available: true });
  f = form(this.model, p => { required(p.name); });

  // Campos reactivos como signals
  formCategorias = signal<CategoriaProducto[]>([]);
  formPrecios    = signal<string[]>([]);

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
    this.model.set({ name: '', emoji: '', imageUrl: '', order: this.fb.allIngredientes().length + 1, available: true });
    this.formCategorias.set(primera ? [primera] : []);
    this.formPrecios.set([]);
    this.showModal.set(true);
  }

  edit(ing: Ingrediente) {
    this.editing.set(ing);
    this.model.set({
      name: ing.name, emoji: ing.emoji ?? '', imageUrl: ing.imageUrl ?? '',
      order: ing.order ?? 0, available: ing.available,
    });
    this.formCategorias.set([...(ing.categorias ?? [])]);
    this.formPrecios.set([...(ing.precios ?? [])]);
    this.showModal.set(true);
  }

  toggleCat(slug: CategoriaProducto) {
    this.formCategorias.update(cats => {
      const nuevas = cats.includes(slug) ? cats.filter(c => c !== slug) : [...cats, slug];
      // Limpiar precios que ya no pertenezcan a ninguna categoría seleccionada
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
    this.formPrecios.update(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  }

  closeModal() { this.showModal.set(false); }

  async save() {
    const m = this.model();
    if (!m.name.trim()) return;
    this.saving.set(true);
    try {
      const data: Omit<Ingrediente, 'id'> = {
        name:       m.name.trim(),
        emoji:      m.emoji.trim(),
        imageUrl:   m.imageUrl.trim(),
        order:      Number(m.order) || 0,
        available:  m.available,
        categorias: this.formCategorias(),
        precios:    this.formPrecios(),
      };
      if (this.editing()) await this.fb.update('ingredientes', this.editing()!.id, data);
      else await this.fb.add('ingredientes', data);
      this.closeModal();
    } finally { this.saving.set(false); }
  }

  async delete(id: string) {
    if (!confirm('¿Eliminar este ingrediente?')) return;
    await this.fb.delete('ingredientes', id);
  }
}
