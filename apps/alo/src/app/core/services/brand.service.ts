import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Datos de marca del negocio activo (vienen del environment de cada build). */
@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly business = environment.business;

  readonly nombre = this.business.nombre;
  readonly nombreUpper = this.business.nombre.toUpperCase();
  readonly emoji = this.business.emoji;
  readonly labels = this.business.labels;
  readonly horariosExtra = this.business.horariosExtra ?? [];
  readonly shareUrl = this.business.shareUrl;
  readonly shareHost = this.business.shareUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  /** URL de una imagen QR que apunta al sitio público del negocio. */
  qrUrl(size: number, colored = false): string {
    const base = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${this.shareUrl}`;
    return colored ? `${base}&color=${this.business.themeColor.slice(1)}&bgcolor=050508` : base;
  }
}
