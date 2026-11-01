/**
 * FRESAS COMO CATEGORÍA DE HAMBURGUESAS ALO
 * ─────────────────────────────────────────
 * Lleva el catálogo de Fresas con Crema (proyecto logueo-8511e, solo se LEE) al proyecto
 * de Hamburguesas ALO (hamburguesas-8aba2) como una categoría más, "Fresas con crema":
 *
 *   toppings   → ingredientes   (categoría "fresas")
 *   cubiertas  → carnes         (la "base" del pedido; etiqueta "Cubierta")
 *   precios    → precios        (categoría "fresas")
 *   populares  → populares      (categoría "fresas", con su precio más barato disponible)
 *   + categoría "fresas": se eligen toppings (máx. 1, o 2 si es combinado)
 *
 * Mismos ids que en Fresas; con merge, así que se puede repetir sin duplicar.
 * No toca ni borra nada del proyecto de Fresas ni lo que ya existe en Hamburguesas.
 * Contacto y horario NO se copian: es el mismo negocio y ya están en Hamburguesas.
 *
 * Uso (desde apps/alo):
 *   node scripts/agregar-fresas.mjs                       # dry-run: solo lee y muestra
 *   DESTINO_ADMIN_EMAIL=... DESTINO_ADMIN_PASSWORD=... \
 *     node scripts/agregar-fresas.mjs --apply
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const APPLY = process.argv.includes('--apply');
const SLUG = 'fresas';
const here = dirname(fileURLToPath(import.meta.url));

// Origen: config web del proyecto de Fresas (no es secreta). Destino: Hamburguesas ALO (proyecto nuevo).
const origenConfig = JSON.parse(readFileSync(resolve(here, 'firebase-fresas-origen.json'), 'utf8'));
const destinoConfig = JSON.parse(readFileSync(resolve(here, 'firebase-hamburguesas-nuevo.json'), 'utf8'));
if (origenConfig.projectId === destinoConfig.projectId) throw new Error('Origen y destino son el mismo proyecto.');

const appO = initializeApp(origenConfig, 'fresas');
const appD = initializeApp(destinoConfig, 'hamburguesas');
const dbO = getFirestore(appO);
const dbD = getFirestore(appD);

const num = v => (typeof v === 'number' ? v : Number(v) || 0);
const leer = async (db, nombre) => (await getDocs(collection(db, nombre))).docs.map(d => ({ id: d.id, ...d.data() }));

const reglasFresas = {
  requiereBase: true,
  modoIngredientes: 'elegir',
  maxIngredientes: 1,
  permiteCombinado: true,
  maxIngredientesCombinado: 2,
  baseLabel: 'Cubierta',
  ingredienteLabel: 'Toppings',
};

await (async () => {
  console.log(`Origen : ${origenConfig.projectId} (solo lectura)`);
  console.log(`Destino: ${destinoConfig.projectId}`);
  console.log(`Modo   : ${APPLY ? 'APLICAR (escribe en el destino)' : 'dry-run (no escribe)'}\n`);

  if (APPLY) {
    const email = process.env.DESTINO_ADMIN_EMAIL;
    const password = process.env.DESTINO_ADMIN_PASSWORD;
    if (!email || !password) throw new Error('Para --apply define DESTINO_ADMIN_EMAIL y DESTINO_ADMIN_PASSWORD.');
    await signInWithEmailAndPassword(getAuth(appD), email, password);
  }

  const [toppings, cubiertas, precios, populares, categoriasDestino] = await Promise.all([
    leer(dbO, 'toppings'), leer(dbO, 'cubiertas'), leer(dbO, 'precios'), leer(dbO, 'populares'),
    leer(dbD, 'categorias'),
  ]);

  const ops = [];
  const plan = (ruta, datos) => ops.push({ ruta, datos });

  // La categoría nueva va al final de las que ya existen.
  const orden = Math.max(0, ...categoriasDestino.filter(c => c.slug !== SLUG).map(c => num(c.orden))) + 1;
  plan(`categorias/${SLUG}`, { nombre: 'Fresas con crema', emoji: '🍓', slug: SLUG, orden, activa: true, reglas: reglasFresas });

  for (const t of toppings) {
    plan(`ingredientes/${t.id}`, {
      name: (t.name ?? '').trim(), emoji: '✨', imageUrl: t.imageUrl ?? '',
      available: !!t.available, order: num(t.order), categorias: [SLUG],
    });
  }
  for (const c of cubiertas) {
    plan(`carnes/${c.id}`, { name: (c.name ?? '').trim(), emoji: '🍫', available: !!c.available, categorias: [SLUG] });
  }
  for (const p of precios) {
    plan(`precios/${p.id}`, { label: p.label ?? '', precio: num(p.precio), available: !!p.available, categoria: SLUG });
  }

  // El modelo guarda un solo precio por popular: se usa el más barato entre los disponibles.
  const porId = new Map(precios.map(p => [p.id, p]));
  for (const pop of populares) {
    const candidatos = (pop.preciosIds ?? []).map(id => porId.get(id)).filter(Boolean);
    const vivos = candidatos.filter(p => p.available);
    const elegido = [...(vivos.length ? vivos : candidatos)].sort((a, b) => num(a.precio) - num(b.precio))[0];
    plan(`populares/${pop.id}`, {
      nombre: pop.nombre ?? '', descripcion: pop.descripcion ?? '', imageUrl: pop.imageUrl ?? '',
      categoria: SLUG, precioId: elegido?.id ?? '', visible: !!pop.visible, orden: num(pop.orden),
      ingredientesIds: [], tipoCarne: '',
    });
  }

  const resumen = {};
  for (const op of ops) resumen[op.ruta.split('/')[0]] = (resumen[op.ruta.split('/')[0]] ?? 0) + 1;
  for (const op of ops) {
    const nombre = op.datos.nombre ?? op.datos.name ?? op.datos.label ?? '';
    const extra = op.ruta.startsWith('precios') ? ` $${op.datos.precio}` : '';
    console.log(`  ${APPLY ? 'ESCRIBE' : 'escribiría'} ${op.ruta}  ${nombre}${extra}`);
  }
  console.log('\nResumen:', resumen);
  console.log(`Categorías ya en el destino: ${categoriasDestino.map(c => c.nombre).join(', ') || '(ninguna)'}`);

  if (!APPLY) {
    console.log('\nNo se escribió nada. Revisa y ejecuta con --apply para agregar Fresas.');
    process.exit(0);
  }
  for (const op of ops) await setDoc(doc(dbD, ...op.ruta.split('/')), op.datos, { merge: true });
  console.log(`\nListo: ${ops.length} documentos escritos en ${destinoConfig.projectId}.`);
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
