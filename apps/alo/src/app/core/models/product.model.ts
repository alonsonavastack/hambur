import type { ReglasCategoria } from '@alo/core';

// ✅ CategoriaProducto ahora es dinámico (string slug desde Firestore)
export type CategoriaProducto = string;

// ✅ Categoria dinámica (para el CRUD de categorías)
export interface Categoria {
  id: string;
  nombre: string;
  emoji: string;
  slug: string;
  orden: number;
  activa: boolean;
  reglas?: ReglasCategoria;
}

export interface Ingrediente {
  id: string;
  name: string;
  emoji: string;
  imageUrl: string;
  available: boolean;
  order: number;
  categorias: CategoriaProducto[];
  precios?: string[]; // IDs de PrecioProducto — si vacío, aparece en todos
}

export interface TipoCarne {
  id: string;
  name: string;
  emoji: string;
  available: boolean;
  categorias: CategoriaProducto[];
  precios?: string[]; // IDs de PrecioProducto disponibles para esta carne
}

export interface PrecioProducto {
  id: string;
  label: string;
  precio: number;
  categoria: CategoriaProducto;
  available: boolean;
}

export interface ProductoPopular {
  id: string;
  nombre: string;
  descripcion: string;
  imageUrl: string;
  categoria: CategoriaProducto;
  precioId: string;
  visible: boolean;
  orden: number;
}

export interface ItemPedido {
  id: string;
  categoria: CategoriaProducto;
  categoriaLabel: string;
  tipoCarne?: string;
  tipoCarneName?: string;
  precioId: string;
  precio: number;
  precioLabel: string;
  ingredientes: string[];
  ingredienteNames: string[];
  cantidad: number;
  notas: string;
  /** Emoji de la categoría al momento del pedido (para mensajes y reportes). */
  categoriaEmoji?: string;
  /** Emoji de la base elegida; solo se guarda en categorías con etiqueta propia (p. ej. cubierta). */
  baseEmoji?: string;
  /** Pedido combinado (solo categorías con `permiteCombinado`). */
  combinado?: boolean;
}

export type PedidoStatus =
  | 'pendiente'
  | 'recibido'
  | 'en_preparacion'
  | 'listo'
  | 'entregado'
  | 'cancelado';

export interface Pedido {
  id: string;
  localId?: string;        // presente cuando fue sincronizado desde offline
  nombreCliente: string;
  telefonoCliente: string;
  items: ItemPedido[];
  totalItems: number;
  totalPrecio: number;
  timestamp: Date;
  mensaje: string;
  status?: PedidoStatus;
  tipo: 'whatsapp' | 'mostrador';
}

export type { CategoriaGasto, Gasto, Visita, Role, Usuario } from '@alo/core';

// ✅ ConfigBranding — usado por firebase.service y configuraciones
export interface ConfigBranding {
  logoUrl?:      string;
  telefono?:     string;
  direccion?:    string;
  horario?:      string;
  dias?:         string;
  tacosActivos?: boolean;
  instagramUrl?: string;
}

// Alias para compatibilidad con el order-page
export type ContactInfo = ConfigBranding;
