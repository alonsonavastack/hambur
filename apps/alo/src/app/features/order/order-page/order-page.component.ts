import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { UpperCasePipe } from '@angular/common';
import { FirebaseService } from '../../../core/services/firebase.service';
import { OrderService } from '../../../core/services/order.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import {
  resolverReglas, seleccionInicial, alternarIngrediente, recortarSeleccion, limiteIngredientes,
} from '@alo/core';
import { OfflineSyncService } from '../../../core/services/offline-sync.service';
import {
  ItemPedido, TipoCarne,
  PrecioProducto, ProductoPopular,
} from '../../../core/models/product.model';
import { BrandService } from '../../../core/services/brand.service';

@Component({
  selector: 'app-order-page',
  standalone: true,
  imports: [FormField, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-page.component.html',
})
export class OrderPageComponent implements OnInit {
  brand = inject(BrandService);
  fb      = inject(FirebaseService);
  order   = inject(OrderService);
  offline = inject(OfflineSyncService);
  private whatsapp = inject(WhatsappService);

  Math = Math;

  logoLoaded = false;
  logoError  = false;
  isSending  = false;

  tabActivo            = signal<string>('');
  selectedPrecio       = signal<PrecioProducto | null>(null);
  selectedCarne        = signal<TipoCarne | null>(null);
  selectedIngredientes = signal<string[]>([]);
  cantidad             = signal<number>(1);
  combinado            = signal<boolean>(false);

  // Datos del cliente y notas del producto en edición (Signal Forms)
  datos = signal({ nombre: '', telefono: '', notas: '' });
  fd = form(this.datos);
  nombreCliente   = computed(() => this.datos().nombre);
  telefonoCliente = computed(() => this.datos().telefono);

  categoriasActivas = computed(() => this.fb.categorias());

  constructor() {
    // Inicializar tab con la primera categoría al cargar
    effect(() => {
      const cats = this.categoriasActivas();
      if (cats.length > 0 && !this.tabActivo()) this.setTab(cats[0].slug);
    });
  }

  ngOnInit() {
    this.fb.incrementVisit();
    this.offline.forceSync();
  }

  onLogoLoad()  { this.logoLoaded = true; }
  onLogoError() { this.logoError = true; this.logoLoaded = true; }

  setTab(slug: string) {
    this.tabActivo.set(slug);
    this.selectedPrecio.set(null);
    this.selectedCarne.set(null);
    this.cantidad.set(1);
    this.combinado.set(false);
    this.datos.update(d => ({ ...d, notas: '' }));
    this.reiniciarIngredientes();
  }

  /** Ingredientes que ofrece la categoría activa (y el precio elegido, si lo hay). */
  private disponibles(precio: PrecioProducto | null = this.selectedPrecio()) {
    const tab = this.tabActivo();
    return this.fb.ingredientes().filter(i => {
      if (!Array.isArray(i.categorias) || !i.categorias.includes(tab)) return false;
      if (i.precios && i.precios.length > 0 && precio) return i.precios.includes(precio.id);
      return true;
    });
  }

  private reiniciarIngredientes(precio: PrecioProducto | null = this.selectedPrecio()) {
    this.selectedIngredientes.set(seleccionInicial(this.reglas(), this.disponibles(precio).map(i => i.id)));
  }

  categoriaActiva = computed(() =>
    this.categoriasActivas().find(c => c.slug === this.tabActivo()) ?? null
  );

  reglas = computed(() => resolverReglas(this.tabActivo(), this.categoriaActiva()?.reglas));
  limite = computed(() => limiteIngredientes(this.reglas(), this.combinado()));

  preciosDeTab = computed(() =>
    this.fb.precios().filter(p => p.categoria === this.tabActivo())
  );

  carnesDeTab = computed(() => {
    const precio = this.selectedPrecio();
    return this.fb.carnes().filter(c => {
      if (!c.categorias?.includes(this.tabActivo())) return false;
      // Si la carne tiene precios definidos, solo mostrarla si aplica al precio seleccionado
      if (c.precios && c.precios.length > 0 && precio) {
        return c.precios.includes(precio.id);
      }
      return true;
    });
  });

  ingredientesDeTab = computed(() => {
    const precio = this.selectedPrecio();
    return this.fb.ingredientes().filter(i => {
      if (!Array.isArray(i.categorias) || i.categorias.length === 0) return false;
      if (!i.categorias.includes(this.tabActivo())) return false;
      // Si el ingrediente tiene precios definidos, filtrar por precio seleccionado
      if (i.precios && i.precios.length > 0 && precio) {
        return i.precios.includes(precio.id);
      }
      return true;
    });
  });

  puedeAgregar = computed(() => {
    if (!this.selectedPrecio()) return false;
    if (this.reglas().requiereBase && !this.selectedCarne()) return false;
    return true;
  });

  selectPrecio(p: PrecioProducto) {
    this.selectedPrecio.set(p);
    // Limpiar carne si ya no aplica al nuevo precio
    const carneActual = this.selectedCarne();
    if (carneActual) {
      const sigueDisponible = !carneActual.precios || carneActual.precios.length === 0 || carneActual.precios.includes(p.id);
      if (!sigueDisponible) this.selectedCarne.set(null);
    }
    this.reiniciarIngredientes(p);
  }
  selectCarne(c: TipoCarne)       { this.selectedCarne.set(c); }

  toggleIngrediente(id: string) {
    this.selectedIngredientes.update(ids =>
      alternarIngrediente(ids, id, this.reglas(), this.combinado())
    );
  }

  toggleCombinado() {
    this.combinado.update(v => !v);
    this.selectedIngredientes.update(ids => recortarSeleccion(ids, this.reglas(), this.combinado()));
  }

  isIngredienteSelected(id: string) {
    return this.selectedIngredientes().includes(id);
  }

  agregarItem() {
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
      tipoCarne:        carne?.id        ?? '',
      tipoCarneName:    carne?.name      ?? '',
      precioId:         precio.id,
      precio:           precio.precio,
      precioLabel:      precio.label,
      ingredientes:     [...ingIds],
      ingredienteNames: ingNombres,
      cantidad:         this.cantidad(),
      notas:            this.datos().notas.trim(),
    };

    this.order.addItem(item);

    this.selectedPrecio.set(null);
    this.selectedCarne.set(null);
    this.cantidad.set(1);
    this.combinado.set(false);
    this.datos.update(d => ({ ...d, notas: '' }));
    this.reiniciarIngredientes();
  }

  agregarPopular(pop: ProductoPopular) {
    const precio = this.fb.precios().find(p => p.id === pop.precioId);
    if (!precio) return;

    const cat = this.fb.categorias().find(c => c.slug === pop.categoria);

    const item: ItemPedido = {
      id:               crypto.randomUUID(),
      categoria:        pop.categoria,
      categoriaLabel:   cat?.nombre ?? pop.categoria,
      categoriaEmoji:   cat?.emoji,
      tipoCarne:        '',
      tipoCarneName:    '',
      precioId:         precio.id,
      precio:           precio.precio,
      precioLabel:      precio.label,
      ingredientes:     [],
      ingredienteNames: [],
      cantidad:         1,
      notas:            pop.nombre,
    };

    this.order.addItem(item);
  }

  emojiDeCategoria(slug: string): string {
    return this.fb.categorias().find(c => c.slug === slug)?.emoji ?? '🍽️';
  }

  get pedidoListo(): boolean {
    return (
      this.order.items().length > 0 &&
      this.order.items().every(i => i.precio > 0) &&
      this.nombreCliente().trim().length > 0
    );
  }

  updateCantidadItem(id: string, delta: number) {
    const item = this.order.items().find(i => i.id === id);
    if (!item) return;
    const nueva = Math.max(1, item.cantidad + delta);
    this.order.updateItem({ ...item, cantidad: nueva });
  }

  async enviarPedido() {
    if (!this.pedidoListo || this.isSending) return;
    this.isSending = true;
    try {
      const nombre  = this.nombreCliente().trim();
      const tel     = this.telefonoCliente().trim();
      const items   = this.order.items();
      const mensaje = this.whatsapp.buildMessage(nombre, tel, items);

      // IMPORTANTE: abrir WhatsApp de forma SÍNCRONA, dentro del mismo
      // gesto de clic del usuario. En iOS Safari, si hay un `await` antes
      // (p.ej. la escritura a Firestore), el navegador deja de considerarlo
      // una acción iniciada por el usuario y bloquea la apertura en silencio.
      this.whatsapp.send(nombre, tel, items);

      // El guardado en Firestore ya no bloquea la apertura de WhatsApp.
      // Si falla, no debe impedir que el pedido ya enviado se limpie de la UI.
      this.offline.checkout({
        nombreCliente:   nombre,
        telefonoCliente: tel,
        items,
        totalItems:      this.order.totalItems(),
        totalPrecio:     this.order.totalPrecio(),
        timestamp:       new Date(),
        mensaje,
        status:          'pendiente',
        tipo:            'whatsapp',
      }).catch(err => console.error('Error guardando pedido en Firestore:', err));

      this.order.reset();
      this.datos.update(d => ({ ...d, nombre: '', telefono: '' }));
    } finally {
      this.isSending = false;
    }
  }
}
