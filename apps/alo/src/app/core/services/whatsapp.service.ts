import { Injectable, inject } from '@angular/core';
import { BrandService } from './brand.service';
import { ItemPedido, CategoriaProducto } from '../models/product.model';
import { environment } from '../../../environments/environment';

const EMOJI: Record<CategoriaProducto, string> = {
  hotdog: '🌭', hamburguesa: '🍔', taco: '🌮',
};

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private brand = inject(BrandService);
  private phone = environment.whatsappNumber;

  buildMessage(nombreCliente: string, telefonoCliente: string, items: ItemPedido[]): string {
    const now   = new Date();
    const fecha = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora  = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    let msg = `${this.brand.emoji} *${this.brand.nombreUpper}*\n`;
    msg += `──────────────────\n`;
    msg += `👤 *Cliente:* ${nombreCliente}\n`;
    if (telefonoCliente) msg += `📱 *Tel:* ${telefonoCliente}\n`;
    msg += `\n`;

    for (const item of items) {
      const cat   = item.categoria as CategoriaProducto;
      const emoji = item.categoriaEmoji ?? EMOJI[cat] ?? '🍽️';
      msg += `${emoji} *${item.categoriaLabel} x${item.cantidad}* — ${item.precio * item.cantidad}\n`;
      if (item.combinado)              msg += `   🔀 Combinado\n`;
      if (item.tipoCarneName)          msg += `   ${item.baseEmoji ?? '🥩'} ${item.tipoCarneName}\n`;
      if (item.ingredienteNames.length) msg += `   ✅ ${item.ingredienteNames.join(', ')}\n`;
      if (item.notas)                   msg += `   📝 ${item.notas}\n`;
      msg += `\n`;
    }

    const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
    msg += `──────────────────\n`;
    msg += `💰 *TOTAL: ${total}*\n`;
    msg += `⏰ ${fecha} ${hora}`;
    return msg;
  }

  send(nombreCliente: string, telefonoCliente: string, items?: ItemPedido[]): void {
    const mensaje = items
      ? this.buildMessage(nombreCliente, telefonoCliente, items)
      : '';
    const encoded = encodeURIComponent(mensaje);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    // wa.me funciona como universal link en iOS y Android; el esquema
    // whatsapp:// es poco confiable en Safari/iOS.
    const url = `https://wa.me/${this.phone}?text=${encoded}`;

    if (isIOS) {
      // En iOS, window.open puede ser bloqueado silenciosamente; location.href
      // es la forma confiable de navegar a un universal link.
      window.location.href = url;
    } else {
      window.open(url, '_blank');
    }
  }
}
