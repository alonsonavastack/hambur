import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { BrandService } from './brand.service';

describe('BrandService', () => {
  const brand = () => TestBed.inject(BrandService);

  it('expone nombre, emoji y etiquetas del negocio', () => {
    expect(brand().nombre.length).toBeGreaterThan(0);
    expect(brand().nombreUpper).toBe(brand().nombre.toUpperCase());
    expect(brand().labels.basePlural.length).toBeGreaterThan(0);
  });

  it('el host de compartir no lleva protocolo ni barra final', () => {
    expect(brand().shareHost).not.toMatch(/^https?:\/\//);
    expect(brand().shareHost).not.toMatch(/\/$/);
  });

  it('el QR apunta al sitio público del negocio', () => {
    const url = brand().qrUrl(150);
    expect(url).toContain('size=150x150');
    expect(url).toContain(`data=${brand().shareUrl}`);
  });

  it('el QR con color agrega los colores del tema', () => {
    expect(brand().qrUrl(180, true)).toMatch(/color=[0-9a-fA-F]{6}&bgcolor=/);
    expect(brand().qrUrl(180)).not.toContain('bgcolor');
  });
});
