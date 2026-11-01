import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  resolverReglas, seleccionInicial, alternarIngrediente, recortarSeleccion, limiteIngredientes,
} from '@alo/core';
import { FirebaseService } from '../../../core/services/firebase.service';
import { BrandService } from '../../../core/services/brand.service';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import {
  ItemPedido,
  Ingrediente,
  TipoCarne,
  PrecioProducto,
} from '../../../core/models/product.model';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`:host { display: block; height: 100%; }`],
  templateUrl: './pos.component.html',
})
export class PosComponent {
  brand = inject(BrandService);
  fb   = inject(FirebaseService);
  sync = inject(OfflineSyncService);

  tabActivo            = signal<string>('');
  selectedPrecio       = signal<PrecioProducto | null>(null);
  selectedCarne        = signal<TipoCarne | null>(null);
  selectedIngredientes = signal<string[]>([]);
  cantidad             = signal<number>(1);
  combinado            = signal<boolean>(false);
  notasModel           = signal({ notas: '' });
  fn                   = form(this.notasModel);

  cart           = signal<ItemPedido[]>([]);
  cartTotal      = computed(() => this.cart().reduce((acc, i) => acc + i.precio * i.cantidad, 0));
  cartTotalItems = computed(() => this.cart().reduce((acc, i) => acc + i.cantidad, 0));

  isSaving       = signal(false);
  successMessage = signal('');
  errorMessage   = signal('');

  categoriasActivas = computed(() => this.fb.categorias());

  constructor() {
    effect(() => {
      const cats = this.categoriasActivas();
      if (cats.length > 0 && !this.tabActivo()) {
        const slug = cats[0].slug;
        this.tabActivo.set(slug);
        this.selectedIngredientes.set(this.ingsIniciales(slug));
      }
    }, { allowSignalWrites: true });
  }

  /**
   * Normaliza un slug para comparación tolerante:
   * - minúsculas
   * - quita guiones, underscores, espacios
   * - quita 's' final (singular/plural: hamburguesa === hamburguesas)
   */
  private normSlug(s: string): string {
    return (s ?? '').toLowerCase().replace(/[-_\s]/g, '').replace(/s$/, '');
  }

  categoriaActiva = computed(() =>
    this.categoriasActivas().find(c => c.slug === this.tabActivo()) ?? null
  );

  preciosDeTab = computed(() => {
    const normTab = this.normSlug(this.tabActivo());
    return this.fb.precios().filter(p => this.normSlug(p.categoria) === normTab);
  });

  carnesDeTab = computed(() => {
    const normTab = this.normSlug(this.tabActivo());
    const precio  = this.selectedPrecio();
    return this.fb.carnes().filter(c => {
      const enCategoria = Array.isArray(c.categorias)
        ? c.categorias.some(cat => this.normSlug(cat) === normTab)
        : this.normSlug((c as any).categoria) === normTab;
      if (!enCategoria) return false;
      // Si la carne tiene precios definidos, filtrar por el precio seleccionado
      if (c.precios && c.precios.length > 0 && precio) {
        return c.precios.includes(precio.id);
      }
      return true;
    });
  });

  ingredientesDeTab = computed(() => {
    const normTab = this.normSlug(this.tabActivo());
    const precio  = this.selectedPrecio();
    return this.fb.ingredientes().filter(i => {
      if (!Array.isArray(i.categorias) || i.categorias.length === 0) return false;
      if (!i.categorias.some(cat => this.normSlug(cat) === normTab)) return false;
      if (i.precios && i.precios.length > 0 && precio) {
        return i.precios.includes(precio.id);
      }
      return true;
    });
  });

  reglas = computed(() => resolverReglas(this.tabActivo(), this.categoriaActiva()?.reglas));
  limite = computed(() => limiteIngredientes(this.reglas(), this.combinado()));

  puedeAgregar = computed(() => {
    if (!this.selectedPrecio()) return false;
    if (this.reglas().requiereBase && !this.selectedCarne()) return false;
    return true;
  });

  /** Selección inicial de ingredientes de una categoría según sus reglas. */
  private ingsIniciales(slug: string, precio: PrecioProducto | null = null): string[] {
    const norm = this.normSlug(slug);
    const cat = this.categoriasActivas().find(c => c.slug === slug);
    const ids = this.fb.ingredientes()
      .filter(i => {
        if (!Array.isArray(i.categorias) || !i.categorias.some(c => this.normSlug(c) === norm)) return false;
        if (i.precios && i.precios.length > 0 && precio) return i.precios.includes(precio.id);
        return true;
      })
      .map(i => i.id);
    return seleccionInicial(resolverReglas(slug, cat?.reglas), ids);
  }

  setTab(slug: string): void {
    this.tabActivo.set(slug);
    this.selectedPrecio.set(null);
    this.selectedCarne.set(null);
    this.cantidad.set(1);
    this.combinado.set(false);
    this.notasModel.set({ notas: '' });
    this.selectedIngredientes.set(this.ingsIniciales(slug));
  }

  incCantidad(): void { this.cantidad.update(c => c + 1); }
  decCantidad(): void { this.cantidad.update(c => Math.max(1, c - 1)); }

  selectPrecio(p: PrecioProducto): void {
    this.selectedPrecio.set(p);
    // Limpiar carne si ya no aplica al nuevo precio
    const carneActual = this.selectedCarne();
    if (carneActual) {
      const sigueDisponible = !carneActual.precios || carneActual.precios.length === 0 || carneActual.precios.includes(p.id);
      if (!sigueDisponible) this.selectedCarne.set(null);
    }
    this.selectedIngredientes.set(this.ingsIniciales(this.tabActivo(), p));
  }
  selectCarne(c: TipoCarne): void       { this.selectedCarne.set(c); }

  toggleIngrediente(ing: Ingrediente): void {
    this.selectedIngredientes.update(ids =>
      alternarIngrediente(ids, ing.id, this.reglas(), this.combinado())
    );
  }

  toggleCombinado(): void {
    this.combinado.update(v => !v);
    this.selectedIngredientes.update(ids => recortarSeleccion(ids, this.reglas(), this.combinado()));
  }

  emojiDeCategoria(slug: string): string {
    return this.fb.categorias().find(c => c.slug === slug)?.emoji ?? '🍽️';
  }

  agregarItem(): void {
    if (!this.puedeAgregar()) return;
    const precio     = this.selectedPrecio()!;
    const carne      = this.selectedCarne();
    const ingIds     = this.selectedIngredientes();
    const cat        = this.categoriaActiva();
    const ingNombres = this.ingredientesDeTab()
      .filter(i => ingIds.includes(i.id))
      .map(i => i.name);

    const item: ItemPedido = {
      id:               crypto.randomUUID(),
      categoria:        this.tabActivo(),
      categoriaLabel:   cat?.nombre ?? this.tabActivo(),
      categoriaEmoji:   cat?.emoji,
      combinado:        this.reglas().permiteCombinado ? this.combinado() : undefined,
      baseEmoji:        this.reglas().baseLabel ? carne?.emoji : undefined,
      tipoCarne:        carne?.id   ?? '',
      tipoCarneName:    carne?.name ?? '',
      precioId:         precio.id,
      precio:           precio.precio,
      precioLabel:      precio.label,
      ingredientes:     [...ingIds],
      ingredienteNames: ingNombres,
      cantidad:         this.cantidad(),
      notas:            this.notasModel().notas.trim(),
    };

    this.cart.update(curr => [...curr, item]);
    this.selectedPrecio.set(null);
    this.selectedCarne.set(null);
    this.cantidad.set(1);
    this.combinado.set(false);
    this.notasModel.set({ notas: '' });
    this.selectedIngredientes.set(this.ingsIniciales(this.tabActivo()));
  }

  removeFromCart(index: number): void {
    this.cart.update(curr => curr.filter((_, i) => i !== index));
  }

  showError(msg: string): void {
    this.errorMessage.set(msg);
    setTimeout(() => this.errorMessage.set(''), 3500);
  }

  async checkout(): Promise<void> {
    if (this.cart().length === 0) return;
    this.isSaving.set(true);
    try {
      const esOffline = !this.sync.isOnline();

      const result = await this.sync.checkout({
        nombreCliente:   'Venta Mostrador',
        telefonoCliente: 'N/A',
        items:           this.cart(),
        totalItems:      this.cartTotalItems(),
        totalPrecio:     this.cartTotal(),
        timestamp:       new Date(),
        mensaje:         'Venta registrada desde Punto de Venta',
        // Offline → pendiente (aparece en pedidos para saber qué preparar)
        // Online  → entregado (venta inmediata en caja)
        status:          esOffline ? 'pendiente' : 'entregado',
        tipo:            'mostrador',
      });

      this.cart.set([]);
      this.successMessage.set(
        esOffline
          ? '💾 Sin conexión — pedido guardado como PENDIENTE. Aparecerá en la sección Pedidos al reconectarse'
          : '✅ Venta registrada exitosamente'
      );
      setTimeout(() => this.successMessage.set(''), 5000);
    } catch (e) {
      console.error('Error en checkout POS:', e);
      this.showError('❌ Error al registrar la venta');
    } finally {
      this.isSaving.set(false);
    }
  }
}
