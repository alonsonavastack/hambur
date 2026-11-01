import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
  Unsubscribe,
  increment,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FirebaseCoreService } from './firebase-core.service';
import {
  Categoria,
  Ingrediente,
  TipoCarne,
  PrecioProducto,
  ProductoPopular,
  Pedido,
  PedidoStatus,
  Gasto,
  Visita,
  ConfigBranding,
} from '../models/product.model';

export interface ContactInfo {
  direccion?: string;
  telefono?:  string;
  horario?:   string;
  dias?:      string;
}

@Injectable({ providedIn: 'root' })
export class FirebaseService implements OnDestroy {
  private core = inject(FirebaseCoreService);
  private db   = this.core.db;

  // ── Categorías dinámicas ──────────────────────────────────────────
  allCategorias   = signal<Categoria[]>([]);
  categorias      = signal<Categoria[]>([]);   // solo activas

  // ── Catálogos públicos ────────────────────────────────────────────
  allIngredientes  = signal<Ingrediente[]>([]);
  allCarnes        = signal<TipoCarne[]>([]);
  allPrecios       = signal<PrecioProducto[]>([]);
  allPopulares     = signal<ProductoPopular[]>([]);

  // Filtrados (solo disponibles)
  ingredientes     = signal<Ingrediente[]>([]);
  carnes           = signal<TipoCarne[]>([]);
  precios          = signal<PrecioProducto[]>([]);
  populares        = signal<ProductoPopular[]>([]);

  // ── Datos protegidos (requieren auth) ─────────────────────────────
  allPedidos   = signal<Pedido[]>([]);
  allGastos    = signal<Gasto[]>([]);
  allVisitas   = signal<Visita[]>([]);

  // ── Config / branding ─────────────────────────────────────────────
  logoUrl      = signal<string>('');
  contactInfo  = signal<ContactInfo>({});
  statsVisits  = signal<number>(0);
  tacosActivos = signal<boolean>(false);

  private unsubs: Unsubscribe[] = [];

  constructor() {
    // ── Categorías dinámicas ────────────────────────────────────────
    this.unsubs.push(
      onSnapshot(collection(this.db, 'categorias'), snap => {
        const all = snap.docs
          .map(d => ({ id: d.id, ...d.data() }) as Categoria)
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        this.allCategorias.set(all);
        this.categorias.set(all.filter(c => c.activa));
      }),
    );

    // ── Catálogos públicos ──────────────────────────────────────────
    this.unsubs.push(
      onSnapshot(collection(this.db, 'ingredientes'), snap => {
        const all = snap.docs
          .map(d => ({ id: d.id, ...d.data() }) as Ingrediente)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        this.allIngredientes.set(all);
        this.ingredientes.set(all.filter(i => i.available));
      }),

      onSnapshot(collection(this.db, 'carnes'), snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }) as TipoCarne);
        this.allCarnes.set(all);
        this.carnes.set(all.filter(c => c.available));
      }),

      onSnapshot(collection(this.db, 'precios'), snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }) as PrecioProducto);
        this.allPrecios.set(all);
        this.precios.set(all.filter(p => p.available));
      }),

      onSnapshot(collection(this.db, 'populares'), snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }) as ProductoPopular);
        this.allPopulares.set(all);
        this.populares.set(
          all.filter(p => p.visible).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        );
      }),

      onSnapshot(doc(this.db, 'config', 'branding'), snap => {
        const data = snap.data();
        this.logoUrl.set((data?.['logoUrl'] as string) ?? '');
        this.tacosActivos.set((data?.['tacosActivos'] as boolean) ?? false);
        this.contactInfo.set({
          direccion: data?.['direccion'] ?? '',
          telefono:  data?.['telefono']  ?? '',
          horario:   data?.['horario']   ?? '',
          dias:      data?.['dias']      ?? '',
        });
      }),

      onSnapshot(doc(this.db, 'config', 'stats'), snap => {
        const data = snap.data();
        this.statsVisits.set(data?.['visits'] ?? 0);
      })
    );

    // ── Datos protegidos (solo cuando hay sesión) ───────────────────
    let authUnsubs: Unsubscribe[] = [];

    onAuthStateChanged(this.core.auth, user => {
      if (user) {
        authUnsubs.push(
          onSnapshot(collection(this.db, 'pedidos'), snap => {
            const pedidos = snap.docs
              .map(d => {
                const data = d.data();
                return {
                  id: d.id,
                  ...data,
                  timestamp: (data['timestamp'] as Timestamp)?.toDate?.() ?? new Date(),
                  status:    data['status'] ?? 'pendiente',
                } as Pedido;
              })
              .sort((a, b) => {
                const ta = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
                const tb = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
                return tb - ta;
              });
            this.allPedidos.set(pedidos);
          }, err => console.error('Error pedidos:', err)),

          onSnapshot(collection(this.db, 'gastos'), snap => {
            const gastos = snap.docs
              .map(d => {
                const data = d.data();
                return {
                  id: d.id,
                  ...data,
                  timestamp: (data['timestamp'] as Timestamp)?.toDate?.() ?? new Date(),
                } as Gasto;
              })
              .sort((a, b) => {
                const ta = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
                const tb = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
                return tb - ta;
              });
            this.allGastos.set(gastos);
          }, err => console.error('Error gastos:', err)),

          onSnapshot(collection(this.db, 'visits'), snap => {
            const visitas = snap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                timestamp: (data['timestamp'] as Timestamp)?.toDate?.() ?? new Date(),
              } as Visita;
            });
            this.allVisitas.set(visitas);
          }, err => console.error('Error visits:', err))
        );
      } else {
        authUnsubs.forEach(u => u());
        authUnsubs = [];
        this.allPedidos.set([]);
        this.allGastos.set([]);
        this.allVisitas.set([]);
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubs.forEach(u => u());
  }

  // ── Visitas ──────────────────────────────────────────────────────
  async incrementVisit(): Promise<void> {
    try {
      await setDoc(
        doc(this.db, 'config', 'stats'),
        { visits: increment(1) },
        { merge: true }
      );
      await addDoc(collection(this.db, 'visits'), { timestamp: new Date() });
    } catch { /* no crítico */ }
  }

  // ── Pedidos ──────────────────────────────────────────────────────
  async savePedido(data: Omit<Pedido, 'id'>, localId?: string): Promise<void> {
    await addDoc(collection(this.db, 'pedidos'), {
      ...data,
      status:    'pendiente',
      timestamp: Timestamp.fromDate(data.timestamp),
      ...(localId ? { localId } : {}),
    });
  }

  async updatePedidoStatus(id: string, status: PedidoStatus): Promise<void> {
    await updateDoc(doc(this.db, 'pedidos', id), { status });
  }

  async deletePedido(id: string): Promise<void> {
    await deleteDoc(doc(this.db, 'pedidos', id));
  }

  // ── Branding / Config ────────────────────────────────────────────
  async saveLogo(url: string): Promise<void> {
    await setDoc(doc(this.db, 'config', 'branding'), { logoUrl: url }, { merge: true });
  }

  async saveContactInfo(info: Partial<ConfigBranding>): Promise<void> {
    await setDoc(doc(this.db, 'config', 'branding'), info, { merge: true });
  }

  async toggleTacos(activo: boolean): Promise<void> {
    await setDoc(doc(this.db, 'config', 'branding'), { tacosActivos: activo }, { merge: true });
  }

  // ── Gastos ───────────────────────────────────────────────────────
  async saveGasto(data: Omit<Gasto, 'id'>): Promise<void> {
    await addDoc(collection(this.db, 'gastos'), {
      ...data,
      timestamp: Timestamp.fromDate(data.timestamp),
    });
  }

  async deleteGasto(id: string): Promise<void> {
    await deleteDoc(doc(this.db, 'gastos', id));
  }

  // ── CRUD genérico (admin) ────────────────────────────────────────
  async add(colName: string, data: object): Promise<void> {
    await addDoc(collection(this.db, colName), data);
  }

  async update(colName: string, id: string, data: object): Promise<void> {
    await updateDoc(doc(this.db, colName, id), data);
  }

  async delete(colName: string, id: string): Promise<void> {
    await deleteDoc(doc(this.db, colName, id));
  }
}
