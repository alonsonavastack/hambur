import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../../../core/services/firebase.service';
import { BrandService } from '../../../core/services/brand.service';

@Component({
  selector: 'app-print-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './print-menu.component.html'
})
export class PrintMenuComponent {
  brand = inject(BrandService);
  fb = inject(FirebaseService);

  /** Categorías de armado (se eligen toppings, p. ej. fresas con crema): llevan su propia sección. */
  categoriasArmado = computed(() =>
    this.fb.categorias().filter(c => c.reglas?.modoIngredientes === 'elegir')
  );

  private slugsArmado = computed(() => new Set(this.categoriasArmado().map(c => c.slug)));

  /** Bases e ingredientes del menú general: excluyen los que son solo de categorías de armado. */
  carnesGenerales = computed(() =>
    this.fb.carnes().filter(c => this.esGeneral(c.categorias))
  );
  ingredientesGenerales = computed(() =>
    this.fb.ingredientes().filter(i => this.esGeneral(i.categorias))
  );

  carnesDe(slug: string) { return this.fb.carnes().filter(c => c.categorias?.includes(slug)); }
  ingredientesDe(slug: string) { return this.fb.ingredientes().filter(i => i.categorias?.includes(slug)); }

  private esGeneral(categorias: string[] | undefined): boolean {
    return !categorias?.length || categorias.some(s => !this.slugsArmado().has(s));
  }

  printMenu() {
    window.print();
  }
}
