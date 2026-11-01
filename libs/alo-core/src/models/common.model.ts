export type CategoriaGasto = 'Insumos' | 'Empaques' | 'Servicios' | 'Sueldos' | 'Otros';

export interface Gasto {
  id: string;
  monto: number;
  concepto: string;
  categoria: CategoriaGasto;
  timestamp: Date;
  notas?: string;
}

export interface Visita {
  id: string;
  timestamp: Date;
}

export type Role = 'admin' | 'empleado' | 'inactivo';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  role: Role;
}
