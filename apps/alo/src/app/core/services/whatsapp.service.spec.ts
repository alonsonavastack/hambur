import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { WhatsappService } from './whatsapp.service';
import { BrandService } from './brand.service';
import { ItemPedido } from '../models/product.model';

const item = (extra: Partial<ItemPedido> = {}): ItemPedido => ({
  id: '1', categoria: 'hamburguesas', categoriaLabel: 'Hamburguesas', precioId: 'p1',
  precio: 125, precioLabel: 'Xtreme', ingredientes: ['i1'], ingredienteNames: ['Queso Oaxaca', 'Jamón'],
  cantidad: 2, notas: '', ...extra,
});

describe('WhatsappService.buildMessage', () => {
  const crear = () => TestBed.inject(WhatsappService);

  it('encabeza con la marca del negocio activo', () => {
    const brand = TestBed.inject(BrandService);
    const msg = crear().buildMessage('Ana', '7180000000', [item()]);
    expect(msg).toContain(brand.nombreUpper);
    expect(msg).toContain(brand.emoji);
  });

  it('incluye cliente, teléfono, ingredientes y total', () => {
    const msg = crear().buildMessage('Ana', '7180000000', [item()]);
    expect(msg).toContain('Ana');
    expect(msg).toContain('7180000000');
    expect(msg).toContain('Queso Oaxaca, Jamón');
    expect(msg).toContain('TOTAL: 250'); // 125 x 2
  });

  it('usa el emoji de la categoría guardado en el artículo', () => {
    const msg = crear().buildMessage('Ana', '', [item({ categoriaEmoji: '🍓' })]);
    expect(msg).toContain('🍓 *Hamburguesas x2*');
  });

  it('marca el pedido combinado y muestra la base elegida', () => {
    const msg = crear().buildMessage('Ana', '', [item({ combinado: true, tipoCarneName: 'Res' })]);
    expect(msg).toContain('Combinado');
    expect(msg).toContain('Res');
  });

  it('suma varios artículos', () => {
    const msg = crear().buildMessage('Ana', '', [item(), item({ id: '2', precio: 60, cantidad: 1 })]);
    expect(msg).toContain('TOTAL: 310');
  });
});
