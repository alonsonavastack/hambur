import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { form, FormField, maxLength, min, required } from '@angular/forms/signals';
import type { ReglasCategoria } from '@alo/core';
import { resolverReglas } from '@alo/core';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { BrandService } from '../../../../core/services/brand.service';
import { Categoria } from '../../../../core/models/product.model';

@Component({
  selector: 'app-categorias-crud',
  standalone: true,
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-4 md:p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-bebas text-3xl text-neon tracking-widest">🏷️ Categorías</h2>
        <button class="btn-neon px-4 py-2 rounded-lg text-sm font-bold" (click)="openNew()">
          + Nueva Categoría
        </button>
      </div>

      <p class="text-sm text-[var(--texto-muted)] mb-4">
        Las categorías definen los tipos de productos (Hamburguesa, Hot-Dog, Taco…).
        Se usan en ingredientes, carnes y precios. Puedes agregar todas las que necesites.
      </p>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        @for (cat of fb.allCategorias(); track cat.id) {
          <div class="card-base p-4 flex flex-col gap-2">
            <div class="text-3xl text-center">{{ cat.emoji }}</div>
            <p class="text-center font-bold text-sm">{{ cat.nombre }}</p>
            <p class="text-center text-xs text-[var(--texto-muted)]">{{ cat.slug }}</p>
            <p class="text-center text-xs" [style.color]="cat.activa ? 'var(--neon-green)' : '#ef4444'">
              {{ cat.activa ? '✅ Activa' : '❌ Inactiva' }}
            </p>
            <div class="flex gap-1 mt-1">
              <button
                class="flex-1 text-xs py-1 rounded bg-[var(--bg-surface)] border border-[var(--neon)]/20 hover:border-[var(--neon)]/60 transition-colors"
                (click)="edit(cat)">Editar</button>
              <button
                class="flex-1 text-xs py-1 rounded bg-[var(--bg-surface)] border border-red-800/40 hover:border-red-500/60 text-red-400 transition-colors"
                (click)="delete(cat)">Borrar</button>
            </div>
          </div>
        }

        @if (fb.allCategorias().length === 0) {
          <div class="col-span-full text-center text-[var(--texto-muted)] py-12">
            <div class="text-5xl mb-3">🏷️</div>
            <p>No hay categorías aún. ¡Crea la primera!</p>
          </div>
        }
      </div>

      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.85)">
          <div class="card-base p-6 w-full max-w-md neon-glow">
            <h3 class="font-bebas text-2xl text-neon mb-4">
              {{ editing() ? 'Editar' : 'Nueva' }} Categoría
            </h3>
            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[var(--texto-muted)]">Nombre</label>
                <input type="text" placeholder="ej: Hamburguesa" [formField]="f.nombre" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[var(--texto-muted)]">Emoji</label>
                <input type="text" placeholder="ej: 🍔" [formField]="f.emoji" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[var(--texto-muted)]">
                  Slug <span class="font-normal">(identificador único, sin espacios)</span>
                </label>
                <input type="text" placeholder="ej: hamburguesa" [formField]="f.slug"
                  style="font-family: monospace;" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[var(--texto-muted)]">Orden</label>
                <input type="number" placeholder="1, 2, 3…" [formField]="f.orden" />
              </div>
              <label class="flex items-center gap-2 text-sm cursor-pointer mt-1">
                <input type="checkbox" [formField]="f.activa" class="w-4 h-4" />
                Activa
              </label>

              <p class="text-xs font-bold text-[var(--texto-muted)] mt-3 uppercase tracking-wide">Reglas de pedido</p>
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" [formField]="f.requiereBase" class="w-4 h-4" />
                Pide elegir una base ({{ brand.labels.base.toLowerCase() }})
              </label>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-[var(--texto-muted)]">{{ brand.labels.ingredientePlural }}</label>
                <select [formField]="f.modoIngredientes">
                  <option value="quitar">Vienen todos marcados y el cliente quita</option>
                  <option value="elegir">El cliente elige los que quiere</option>
                </select>
              </div>
              @if (f.modoIngredientes().value() === 'elegir') {
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-bold text-[var(--texto-muted)]">Máximo a elegir (0 = sin límite)</label>
                  <input type="number" [formField]="f.maxIngredientes" />
                </div>
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" [formField]="f.permiteCombinado" class="w-4 h-4" />
                  Permite combinado (sube el máximo)
                </label>
                @if (f.permiteCombinado().value()) {
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-[var(--texto-muted)]">Máximo en combinado</label>
                    <input type="number" [formField]="f.maxCombinado" />
                  </div>
                }
              }
            </div>

            @if (errorMsg()) {
              <p class="text-red-400 text-sm mt-3">⚠️ {{ errorMsg() }}</p>
            }

            <div class="flex gap-3 mt-5">
              <button class="flex-1 btn-neon py-2 rounded-lg font-bold" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
              <button
                class="flex-1 py-2 rounded-lg font-bold border border-[var(--neon)]/30 hover:border-[var(--neon)]/60 transition-colors"
                (click)="closeModal()">Cancelar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CategoriasCrudComponent {
  fb = inject(FirebaseService);
  brand = inject(BrandService);

  showModal = signal(false);
  editing   = signal<Categoria | null>(null);
  saving    = signal(false);
  errorMsg  = signal('');

  private readonly vacio = {
    nombre: '', emoji: '', slug: '', orden: 1, activa: true,
    requiereBase: true,
    modoIngredientes: 'quitar' as 'quitar' | 'elegir',
    maxIngredientes: 0,
    permiteCombinado: false,
    maxCombinado: 2,
  };

  model = signal({ ...this.vacio });
  f = form(this.model, p => {
    required(p.nombre, { message: 'El nombre es obligatorio.' });
    required(p.slug,   { message: 'El slug es obligatorio.' });
    required(p.emoji,  { message: 'El emoji es obligatorio.' });
    maxLength(p.emoji, 8);
    min(p.orden, 0);
    min(p.maxIngredientes, 0);
    min(p.maxCombinado, 1);
  });

  constructor() {
    // El slug se sugiere a partir del nombre solo al crear una categoría nueva.
    effect(() => {
      const nombre = this.f.nombre().value();
      untracked(() => {
        if (this.editing()) return;
        const slug = nombre
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        this.model.update(m => ({ ...m, slug }));
      });
    });
  }

  openNew() {
    this.editing.set(null);
    this.errorMsg.set('');
    this.model.set({ ...this.vacio, orden: this.fb.allCategorias().length + 1 });
    this.showModal.set(true);
  }

  edit(cat: Categoria) {
    this.editing.set(cat);
    this.errorMsg.set('');
    const r = resolverReglas(cat.slug, cat.reglas);
    this.model.set({
      nombre: cat.nombre, emoji: cat.emoji, slug: cat.slug, orden: cat.orden ?? 0, activa: cat.activa,
      requiereBase: r.requiereBase,
      modoIngredientes: r.modoIngredientes,
      maxIngredientes: r.maxIngredientes,
      permiteCombinado: r.permiteCombinado,
      maxCombinado: r.maxIngredientesCombinado || 2,
    });
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  async save() {
    this.errorMsg.set('');
    const m = this.model();
    if (!m.nombre.trim()) { this.errorMsg.set('El nombre es obligatorio.'); return; }
    if (!m.slug.trim())   { this.errorMsg.set('El slug es obligatorio.'); return; }
    if (!m.emoji.trim())  { this.errorMsg.set('El emoji es obligatorio.'); return; }

    const slugExiste = this.fb.allCategorias().some(
      c => c.slug === m.slug.trim() && c.id !== this.editing()?.id
    );
    if (slugExiste) { this.errorMsg.set('Ya existe una categoría con ese slug.'); return; }

    // Firestore no acepta `undefined`: solo se guardan los campos con valor.
    const reglas: ReglasCategoria = {
      requiereBase: m.requiereBase,
      modoIngredientes: m.modoIngredientes,
      maxIngredientes: m.modoIngredientes === 'elegir' ? Math.max(0, Number(m.maxIngredientes) || 0) : 0,
      permiteCombinado: m.modoIngredientes === 'elegir' && m.permiteCombinado,
      maxIngredientesCombinado: m.permiteCombinado ? Math.max(1, Number(m.maxCombinado) || 2) : 0,
    };

    this.saving.set(true);
    try {
      const data = {
        nombre: m.nombre.trim(),
        emoji:  m.emoji.trim(),
        slug:   m.slug.trim(),
        orden:  Number(m.orden) || 0,
        activa: m.activa,
        reglas,
      };
      if (this.editing()) {
        await this.fb.update('categorias', this.editing()!.id, data);
      } else {
        await this.fb.add('categorias', data);
      }
      this.closeModal();
    } finally {
      this.saving.set(false);
    }
  }

  async delete(cat: Categoria) {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) return;
    await this.fb.delete('categorias', cat.id);
  }
}
