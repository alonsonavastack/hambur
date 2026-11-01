import type { BusinessConfig } from '@alo/core';

export const environment = {
  production: true,
  firebase: {
    apiKey: 'AIzaSyDrEoK-22tWF6t0hJKP_FnTjIAXB2dr7oo',
    authDomain: 'hamburguesas-8aba2.firebaseapp.com',
    projectId: 'hamburguesas-8aba2',
    storageBucket: 'hamburguesas-8aba2.firebasestorage.app',
    messagingSenderId: '116303418708',
    appId: '1:116303418708:web:d351abbc6cdcf6448924c1'
  },
  business: <BusinessConfig>{
    id: 'hamburguesas',
    nombre: 'Hamburguesas ALO',
    slogan: 'Hamburguesas',
    emoji: '🍔',
    themeColor: '#f59e0b',
    shareUrl: 'https://hamburguesasalo.netlify.app/',
    cloudinaryPreset: 'fresas_alo',
    horariosExtra: [
      '🔥 Al Carbón: Jueves, Viernes y Sábado — 7pm a 10pm',
      '🍖 A la Parrilla: Lunes y Martes — 1pm a 10pm',
    ],
    labels: { item: 'Hamburguesa', itemPlural: 'Hamburguesas', base: 'Carne', basePlural: 'Tipos de carne', ingrediente: 'Ingrediente', ingredientePlural: 'Ingredientes' },
  },
  whatsappNumber: '527181043376',
  /** Correo del dueño: entra como administrador aunque aún no tenga documento en /usuarios. */
  adminEmail: 'hamburguesasalo@gmail.com'
};
