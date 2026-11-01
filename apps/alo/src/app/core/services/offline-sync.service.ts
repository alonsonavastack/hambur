import { Injectable, signal, NgZone, inject, OnDestroy } from '@angular/core';
import { Pedido } from '../models/product.model';
import { FirebaseService } from './firebase.service';

export interface VentaOffline extends Omit<Pedido, 'id'> {
  localId: string;
  syncStatus: 'pendiente' | 'sincronizando' | 'sincronizado' | 'error';
  intentos: number;
}

const DB_NAME    = 'hamburguesasAlo_offline';
const DB_VERSION = 1;
const STORE_NAME = 'ventas_pendientes';

@Injectable({ providedIn: 'root' })
export class OfflineSyncService implements OnDestroy {
  private fb   = inject(FirebaseService);
  private zone = inject(NgZone);

  isOnline     = signal<boolean>(navigator.onLine);
  pendingCount = signal<number>(0);
  isSyncing    = signal<boolean>(false);
  lastSyncMsg  = signal<string>('');
  pedidosLocales = signal<(VentaOffline & { id: string })[]>([]);

  private db: IDBDatabase | null = null;
  private syncLock = false;
  private onlineHandler  = () => this.zone.run(() => { this.isOnline.set(true);  this.syncAll(); });
  private offlineHandler = () => this.zone.run(() => { this.isOnline.set(false); });

  constructor() {
    window.addEventListener('online',  this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
    this.initDB().then(() => {
      this.refreshPendingCount();
      this.refreshPedidosLocales();
    });
  }

  ngOnDestroy() {
    window.removeEventListener('online',  this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    this.db?.close();
  }

  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
        }
      };
      req.onsuccess = (e) => { this.db = (e.target as IDBOpenDBRequest).result; resolve(); };
      req.onerror   = () => reject(req.error);
    });
  }

  async saveLocal(data: Omit<Pedido, 'id'>): Promise<string> {
    await this.ensureDB();
    const localId = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const venta: VentaOffline = { ...data, localId, syncStatus: 'pendiente', intentos: 0 };
    return new Promise((resolve, reject) => {
      const tx  = this.db!.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).add(venta);
      req.onsuccess = () => {
        this.refreshPendingCount();
        this.refreshPedidosLocales();
        resolve(localId);
      };
      req.onerror   = () => reject(req.error);
    });
  }

  async checkout(data: Omit<Pedido, 'id'>): Promise<{ modo: 'online' | 'offline' }> {
    if (this.isOnline()) {
      try {
        await this.fb.savePedido(data);
        return { modo: 'online' };
      } catch {
        await this.saveLocal(data);
        return { modo: 'offline' };
      }
    } else {
      await this.saveLocal(data);
      return { modo: 'offline' };
    }
  }

  async syncAll(): Promise<void> {
    if (!this.isOnline() || this.syncLock) return;
    this.syncLock = true;
    this.isSyncing.set(true);

    try {
      const pendientes = await this.getPendientes(); // solo status === 'pendiente'
      if (pendientes.length === 0) return;

      let synced = 0;

      for (const venta of pendientes) {
        // 1. Marcar como 'sincronizando' ANTES de subir — previene dobles envíos
        const marcado = await this.marcarSincronizando(venta.localId);
        if (!marcado) continue; // ya fue tomado por otra ejecución

        try {
          const { localId, syncStatus, intentos, ...pedidoData } = venta;
          await this.fb.savePedido(pedidoData, localId);
          await this.deleteLocal(localId);
          synced++;
        } catch (e) {
          // Subida falló — revertir a 'pendiente' para reintentar después
          await this.markError(venta.localId, venta.intentos + 1);
        }
      }

      this.zone.run(() => {
        this.refreshPendingCount();
        if (synced > 0) {
          this.lastSyncMsg.set(`✅ ${synced} pedido${synced > 1 ? 's' : ''} sincronizado${synced > 1 ? 's' : ''}`);
          setTimeout(() => this.zone.run(() => this.lastSyncMsg.set('')), 4000);
        }
      });
    } finally {
      this.syncLock = false;
      this.isSyncing.set(false);
    }
  }

  private getPendientes(): Promise<VentaOffline[]> {
    return new Promise(async (resolve) => {
      await this.ensureDB();
      const tx  = this.db!.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(
        (req.result as VentaOffline[]).filter(v => v.syncStatus === 'pendiente')
      );
      req.onerror   = () => resolve([]);
    });
  }

  // Intenta marcar un registro como 'sincronizando' de forma atómica.
  // Retorna true si lo marcó (nadie más lo tenía), false si ya estaba tomado.
  private marcarSincronizando(localId: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      await this.ensureDB();
      const tx    = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const get   = store.get(localId);
      get.onsuccess = () => {
        const rec = get.result as VentaOffline | undefined;
        if (!rec || rec.syncStatus !== 'pendiente') {
          resolve(false);
          return;
        }
        rec.syncStatus = 'sincronizando';
        const put = store.put(rec);
        put.onsuccess = () => resolve(true);
        put.onerror   = () => resolve(false);
      };
      get.onerror = () => resolve(false);
    });
  }

  private deleteLocal(localId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx  = this.db!.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(localId);
      req.onsuccess = () => {
        this.refreshPedidosLocales();
        resolve();
      };
      req.onerror   = () => reject(req.error);
    });
  }

  private existeLocal(localId: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      await this.ensureDB();
      const tx  = this.db!.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(localId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror   = () => resolve(false);
    });
  }

  private markError(localId: string, intentos: number): Promise<void> {
    return new Promise(async (resolve) => {
      await this.ensureDB();
      const tx    = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const get   = store.get(localId);
      get.onsuccess = () => {
        const rec = get.result as VentaOffline;
        if (rec) {
          rec.intentos   = intentos;
          // Revertir 'sincronizando' → 'pendiente' para reintentar,
          // o marcar 'error' tras demasiados intentos
          rec.syncStatus = intentos >= 5 ? 'error' : 'pendiente';
          store.put(rec);
        }
        resolve();
      };
      get.onerror = () => resolve();
    });
  }

  private refreshPendingCount(): void {
    this.getPendientes().then(p => this.zone.run(() => this.pendingCount.set(p.length)));
  }

  private refreshPedidosLocales(): void {
    this.getPendientes().then(pendientes => {
      this.zone.run(() => {
        const mapped = pendientes.map(v => ({
          ...v,
          id: v.localId,   // id virtual para que la tabla de pedidos pueda usarlo
        }));
        this.pedidosLocales.set(mapped);
      });
    });
  }

  private ensureDB(): Promise<void> {
    if (this.db) return Promise.resolve();
    return this.initDB();
  }

  forceSync(): void { this.syncAll(); }
}
