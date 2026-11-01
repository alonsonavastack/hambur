import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import type { Categoria } from '../../../core/models/product.model';

/** Barra de filtro por categoría para las pantallas de catálogo. `value` vacío = todas. */
@Component({
  selector: 'app-categoria-filtro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap gap-2 mb-5" role="group" aria-label="Filtrar por categoría">
      <button type="button" class="chip" [class.chip-on]="value() === ''" [attr.aria-pressed]="value() === ''"
        (click)="value.set('')">Todas</button>
      @for (c of categorias(); track c.id) {
        <button type="button" class="chip" [class.chip-on]="value() === c.slug" [attr.aria-pressed]="value() === c.slug"
          (click)="value.set(c.slug)">{{ c.emoji }} {{ c.nombre }}</button>
      }
    </div>
  `,
  styles: [`
    .chip { padding: 0.4rem 0.9rem; border-radius: 999px; font-size: 0.85rem; font-weight: 700; cursor: pointer;
            background: var(--bg-surface); color: var(--texto-secondary); border: 1px solid rgba(var(--neon-rgb), 0.2); }
    .chip:hover { border-color: rgba(var(--neon-rgb), 0.6); }
    .chip-on { background: rgba(var(--neon-rgb), 0.18); color: var(--neon-light); border-color: var(--neon); }
  `],
})
export class CategoriaFiltroComponent {
  categorias = input.required<Categoria[]>();
  value = model<string>('');
}
