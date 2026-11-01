import { ChangeDetectionStrategy, Component, inject, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { FirebaseService } from '../../../core/services/firebase.service';
import { BrandService } from '../../../core/services/brand.service';

@Component({
  selector: 'app-configuraciones',
  standalone: true,
  imports: [CommonModule, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuraciones.component.html'
})
export class ConfiguracionesComponent {
  brand = inject(BrandService);
  public fb = inject(FirebaseService);

  contacto = signal({ direccion: '', telefono: '', horario: '', dias: '' });
  f = form(this.contacto);
  saving      = signal<boolean>(false);
  savingTacos = signal<boolean>(false);
  showSuccess = signal<boolean>(false);

  private dataLoaded = false;

  constructor() {
    effect(() => {
      const current = this.fb.contactInfo();
      untracked(() => {
        if (!this.dataLoaded && (current.direccion || current.telefono || current.horario || current.dias)) {
          this.contacto.set({
            direccion: current.direccion || '',
            telefono:  current.telefono  || '',
            horario:   current.horario   || '',
            dias:      current.dias      || '',
          });
          this.dataLoaded = true;
        }
      });
    });
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      await this.fb.saveContactInfo(this.contacto());
      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 3000);
    } catch (e) {
      console.error('Error guardando configuraciones', e);
      alert('Error al guardar las configuraciones');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleTacos(): Promise<void> {
    this.savingTacos.set(true);
    try {
      await this.fb.toggleTacos(!this.fb.tacosActivos());
    } catch (e) {
      console.error('Error toggling tacos', e);
    } finally {
      this.savingTacos.set(false);
    }
  }
}
