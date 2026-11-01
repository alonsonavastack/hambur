/**
 * COPIA Hamburguesas ALO: proyecto actual (menu-5d081) → proyecto nuevo (hamburguesas-8aba2)
 * ────────────────────────────────────────────────────────────────────────────────────────
 * Copia documentos con el MISMO id (las referencias entre colecciones siguen válidas) y
 * con merge, así que se puede repetir sin duplicar. NO modifica ni borra el proyecto origen.
 *
 * Siempre se copian (lectura pública en el origen):
 *   categorias, ingredientes, carnes, precios, populares, config/*
 * Opcionales (requieren sesión de admin en el ORIGEN):
 *   --pedidos   pedidos y gastos
 *   --visitas   visits (contador de visitas; pueden ser muchos documentos)
 * No se copian los usuarios (`usuarios`): están ligados a las cuentas de Auth, que no se migran.
 *
 * Uso (desde apps/alo):
 *   node scripts/copiar-hamburguesas.mjs                       # dry-run: solo lee y muestra
 *   DESTINO_ADMIN_EMAIL=... DESTINO_ADMIN_PASSWORD=... \
 *     node scripts/copiar-hamburguesas.mjs --apply
 *   (con --pedidos o --visitas también: ORIGEN_ADMIN_EMAIL y ORIGEN_ADMIN_PASSWORD)
 *
 * Las credenciales NO van en el archivo: se leen del entorno.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, getDocs, setDoc, doc, query, limit,
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const APPLY = process.argv.includes('--apply');
const PEDIDOS = process.argv.includes('--pedidos');
const VISITAS = process.argv.includes('--visitas');

const here = dirname(fileURLToPath(import.meta.url));

// ── Origen: config web del proyecto anterior (no es secreta; el environment ya apunta al nuevo) ──
const origenConfig = JSON.parse(readFileSync(resolve(here, 'firebase-hamburguesas-origen.json'), 'utf8'));
// ── Destino: archivo con la config web del proyecto nuevo (no es secreta) ────
const destinoConfig = JSON.parse(readFileSync(resolve(here, 'firebase-hamburguesas-nuevo.json'), 'utf8'));

if (!origenConfig.projectId || !destinoConfig.projectId) throw new Error('Falta la config de origen o destino.');
if (origenConfig.projectId === destinoConfig.projectId) throw new Error('Origen y destino son el mismo proyecto.');

const appO = initializeApp(origenConfig, 'origen');
const appD = initializeApp(destinoConfig, 'destino');
const dbO = getFirestore(appO);
const dbD = getFirestore(appD);

const ABIERTAS = ['categorias', 'ingredientes', 'carnes', 'precios', 'populares', 'config'];
const COLECCIONES = [
  ...ABIERTAS,
  ...(PEDIDOS ? ['pedidos', 'gastos'] : []),
  ...(VISITAS ? ['visits'] : []),
];

async function entrar(app, email, password, nombre) {
  if (!email || !password) throw new Error(`Define ${nombre}_ADMIN_EMAIL y ${nombre}_ADMIN_PASSWORD.`);
  await signInWithEmailAndPassword(getAuth(app), email, password);
}

await (async () => {
  console.log(`Origen : ${origenConfig.projectId}`);
  console.log(`Destino: ${destinoConfig.projectId}`);
  console.log(`Modo   : ${APPLY ? 'APLICAR (escribe en el destino)' : 'dry-run (no escribe)'}\n`);

  if (PEDIDOS || VISITAS) {
    await entrar(appO, process.env.ORIGEN_ADMIN_EMAIL, process.env.ORIGEN_ADMIN_PASSWORD, 'ORIGEN');
  }
  if (APPLY) {
    await entrar(appD, process.env.DESTINO_ADMIN_EMAIL, process.env.DESTINO_ADMIN_PASSWORD, 'DESTINO');
  }

  const plan = []; // { col, id, data }
  for (const col of COLECCIONES) {
    const snap = await getDocs(collection(dbO, col));
    for (const d of snap.docs) plan.push({ col, id: d.id, data: d.data() });
  }

  const resumen = {};
  for (const p of plan) resumen[p.col] = (resumen[p.col] ?? 0) + 1;
  for (const col of COLECCIONES) resumen[col] ??= 0;

  for (const p of plan.filter(x => ABIERTAS.includes(x.col) || plan.length < 40)) {
    const nombre = p.data.nombre ?? p.data.name ?? p.data.label ?? '';
    console.log(`  ${APPLY ? 'COPIA' : 'copiaría'} ${p.col}/${p.id}  ${nombre}`);
  }
  console.log('\nResumen:', resumen);

  if (!APPLY) {
    const existentes = await getDocs(query(collection(dbD, 'categorias'), limit(1))).then(s => s.size).catch(() => null);
    if (existentes === null) console.log('\n(Aviso) No se pudo leer el destino sin sesión: es normal si sus reglas aún no son públicas.');
    console.log('\nNo se escribió nada. Revisa y ejecuta con --apply para copiar.');
    process.exit(0);
  }

  for (const p of plan) {
    await setDoc(doc(dbD, p.col, p.id), p.data, { merge: true });
  }
  console.log(`\nListo: ${plan.length} documentos copiados a ${destinoConfig.projectId}.`);
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
