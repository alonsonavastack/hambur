import { Injectable, inject, signal, computed } from '@angular/core';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  getAuth,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Router } from '@angular/router';
import { FirebaseCoreService } from './firebase-core.service';
import { environment } from '../../../environments/environment';
import { Role } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private fireAuth = inject(FirebaseCoreService).auth;
  private firestore = inject(FirebaseCoreService).db;
  private router   = inject(Router);

  private _user = signal<User | null | undefined>(undefined);
  currentUser  = this._user.asReadonly();
  isLoggedIn   = computed(() => !!this._user());
  isReady      = computed(() => this._user() !== undefined);

  userRole = signal<Role | undefined>(undefined);
  error = signal<string>('');

  private roleResolver: ((role: Role | undefined) => void) | null = null;
  private rolePromise: Promise<Role | undefined> | null = null;

  constructor() {
    onAuthStateChanged(this.fireAuth, async user => {
      if (user) {
        const role = await this.resolveRole(user);
        this.userRole.set(role);
        if (this.roleResolver) this.roleResolver(role);
      } else {
        this.userRole.set(undefined);
        if (this.roleResolver) this.roleResolver(undefined);
      }
      this._user.set(user);
    });
  }

  /**
   * Rol del usuario según su documento en /usuarios. Sin documento solo el correo del dueño
   * (environment.adminEmail) entra como administrador; cualquier otro queda 'inactivo'.
   * Si no se puede leer el rol, el acceso se niega (nunca se asume administrador).
   */
  private async resolveRole(user: User): Promise<Role> {
    const esDueno = !!user.email && user.email === environment.adminEmail;
    try {
      const ref = doc(this.firestore, 'usuarios', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) return (snap.data()['role'] as Role) || 'inactivo';
      if (!esDueno) return 'inactivo';
      await setDoc(ref, { nombre: user.displayName || 'Administrador', email: user.email, role: 'admin' });
      return 'admin';
    } catch (e) {
      console.error('No se pudo cargar el rol del usuario:', e);
      return esDueno ? 'admin' : 'inactivo';
    }
  }

  async login(email: string, password: string): Promise<void> {
    this.error.set('');
    try {
      this.resetRolePromise();
      await signInWithEmailAndPassword(this.fireAuth, email, password);
      const role = await this.waitForRole();
      if (role === 'inactivo') {
        this.error.set('Tu cuenta está desactivada.');
        await this.logout();
        return;
      }
      // Navegar a dashboard o pedidos dependiendo del rol se hace en el guard o aquí
      if (role === 'empleado') {
        await this.router.navigate(['/admin/pedidos']);
      } else {
        await this.router.navigate(['/admin/dashboard']);
      }
    } catch {
      this.error.set('Correo o contraseña incorrectos');
    }
  }

  async logout(): Promise<void> {
    this.resetRolePromise();
    await signOut(this.fireAuth);
    await this.router.navigate(['/admin/login']);
  }

  waitForAuth(): Promise<User | null> {
    if (this._user() !== undefined) {
      return Promise.resolve(this._user() || null);
    }
    return new Promise(resolve => {
      const unsub = onAuthStateChanged(this.fireAuth, user => {
        unsub();
        resolve(user);
      });
    });
  }

  waitForRole(): Promise<Role | undefined> {
    if (this.userRole() !== undefined) {
      return Promise.resolve(this.userRole());
    }
    if (!this.rolePromise) {
      this.resetRolePromise();
    }
    return this.rolePromise!;
  }

  private resetRolePromise() {
    this.rolePromise = new Promise(resolve => {
      this.roleResolver = resolve;
    });
  }

  async createEmployee(email: string, password: string, nombre: string): Promise<void> {
    if (this.userRole() !== 'admin') throw new Error('Solo el administrador puede crear empleados.');
    
    // Usar una instancia secundaria para no cerrar la sesión actual
    const secondaryApp = initializeApp(environment.firebase, 'SecondaryApp' + Date.now());
    const secondaryAuth = getAuth(secondaryApp);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = userCredential.user.uid;
      
      // Guardar el documento en la base de datos principal
      await setDoc(doc(this.firestore, 'usuarios', uid), {
        nombre,
        email,
        role: 'empleado'
      });
      
      // Cerramos sesión en la app secundaria y la limpiamos (no es estrictamente necesario, pero es buena práctica)
      await signOut(secondaryAuth);
    } catch (error) {
      console.error('Error creando empleado', error);
      throw error;
    }
  }
}
