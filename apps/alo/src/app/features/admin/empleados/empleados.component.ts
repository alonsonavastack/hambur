import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { email as emailValido, form, FormField, minLength, required } from '@angular/forms/signals';
import { BrandService } from '../../../core/services/brand.service';
import { AuthService } from '../../../core/services/auth.service';
import { FirebaseCoreService } from '../../../core/services/firebase-core.service';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Role, Usuario } from '../../../core/models/product.model';

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empleados.component.html'
})
export class EmpleadosComponent {
  auth = inject(AuthService);
  fbCore = inject(FirebaseCoreService);
  brand = inject(BrandService);

  empleados = signal<Usuario[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');

  modalOpen = signal(false);
  saving = signal(false);

  model = signal({ nombre: '', email: '', password: '' });
  f = form(this.model, p => {
    required(p.nombre);
    required(p.email);
    emailValido(p.email);
    required(p.password);
    minLength(p.password, 6);
  });

  constructor() {
    this.loadEmpleados();
  }

  async loadEmpleados() {
    this.loading.set(true);
    try {
      const q = query(collection(this.fbCore.db, 'usuarios'));
      const querySnapshot = await getDocs(q);
      const list: Usuario[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data['role'] !== 'admin') { // No mostrar otros admins
          list.push({
            id: docSnap.id,
            nombre: data['nombre'],
            email: data['email'],
            role: data['role'] as Role
          });
        }
      });
      this.empleados.set(list);
    } catch (e) {
      console.error('Error cargando empleados:', e);
      this.error.set('No se pudieron cargar los empleados');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.model.set({ nombre: '', email: '', password: '' });
    this.modalOpen.set(true);
    this.error.set('');
  }

  closeModal() {
    this.modalOpen.set(false);
  }

  async save() {
    if (this.f().invalid()) return;
    this.saving.set(true);
    this.error.set('');

    const { email, password, nombre } = this.model();
    try {
      await this.auth.createEmployee(email, password, nombre);
      await this.loadEmpleados();
      this.closeModal();
    } catch (e: any) {
      console.error('Error creando empleado:', e);
      if (e.code === 'auth/email-already-in-use') {
        this.error.set('Este correo ya está registrado.');
      } else {
        this.error.set('Ocurrió un error al crear el empleado.');
      }
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActivo(empleado: Usuario) {
    if (!confirm(`¿Estás seguro de que deseas ${empleado.role === 'inactivo' ? 'activar' : 'desactivar'} a ${empleado.nombre}?`)) return;

    const nuevoRol = empleado.role === 'inactivo' ? 'empleado' : 'inactivo';
    try {
      const docRef = doc(this.fbCore.db, 'usuarios', empleado.id);
      await updateDoc(docRef, { role: nuevoRol });

      // Actualizar localmente
      this.empleados.update(list => list.map(e => e.id === empleado.id ? { ...e, role: nuevoRol } : e));
    } catch (e) {
      console.error('Error actualizando rol:', e);
      alert('Error al actualizar el estado del empleado.');
    }
  }
}
