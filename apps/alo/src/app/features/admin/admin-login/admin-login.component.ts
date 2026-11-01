import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { email as emailValido, form, FormField, required } from '@angular/forms/signals';
import { AuthService } from '../../../core/services/auth.service';
import { FirebaseService } from '../../../core/services/firebase.service';
import { BrandService } from '../../../core/services/brand.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-login.component.html'
})
export class AdminLoginComponent {
  brand = inject(BrandService);
  auth = inject(AuthService);
  fb = inject(FirebaseService);
  loading = signal(false);

  model = signal({ email: '', password: '' });
  f = form(this.model, p => {
    required(p.email);
    emailValido(p.email);
    required(p.password);
  });

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.f().invalid()) return;
    this.loading.set(true);
    try {
      const { email, password } = this.model();
      await this.auth.login(email.trim(), password);
    } finally {
      this.loading.set(false);
    }
  }
}
