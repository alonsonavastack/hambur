/**
 * Reglas de pedido configurables por categoría.
 * Todo es opcional: una categoría sin `reglas` se comporta como antes
 * (base obligatoria, ingredientes preseleccionados que se pueden quitar).
 */
export interface ReglasCategoria {
  /** El cliente debe elegir una base (carne en hamburguesas, cubierta en fresas). */
  requiereBase?: boolean;
  /** 'quitar': todo viene marcado y se desmarca. 'elegir': se parte de cero y se marca. */
  modoIngredientes?: 'quitar' | 'elegir';
  /** Máximo de ingredientes en modo 'elegir'. 0 = sin límite. */
  maxIngredientes?: number;
  /** Muestra la opción "combinado", que sube el máximo de ingredientes. */
  permiteCombinado?: boolean;
  /** Máximo de ingredientes cuando el pedido es combinado. */
  maxIngredientesCombinado?: number;
  /** Etiquetas propias de la categoría (si no, se usan las del negocio). */
  baseLabel?: string;
  ingredienteLabel?: string;
}

export type ReglasResueltas = Required<Omit<ReglasCategoria, 'baseLabel' | 'ingredienteLabel'>> &
  Pick<ReglasCategoria, 'baseLabel' | 'ingredienteLabel'>;

/** Hot-dogs no llevan base. Se mantiene para categorías creadas antes de existir `reglas`. */
const esHotdogLegacy = (slug: string): boolean =>
  slug.toLowerCase().replace(/[^a-z]/g, '').startsWith('hotdog');

export function resolverReglas(slug: string, reglas?: ReglasCategoria): ReglasResueltas {
  return {
    requiereBase: reglas?.requiereBase ?? !esHotdogLegacy(slug),
    modoIngredientes: reglas?.modoIngredientes ?? 'quitar',
    maxIngredientes: reglas?.maxIngredientes ?? 0,
    permiteCombinado: reglas?.permiteCombinado ?? false,
    maxIngredientesCombinado: reglas?.maxIngredientesCombinado ?? 0,
    baseLabel: reglas?.baseLabel,
    ingredienteLabel: reglas?.ingredienteLabel,
  };
}

/** Máximo efectivo de ingredientes seleccionables (0 = sin límite). */
export function limiteIngredientes(r: ReglasResueltas, combinado: boolean): number {
  return combinado && r.permiteCombinado ? r.maxIngredientesCombinado : r.maxIngredientes;
}

/** Selección inicial al abrir una categoría o cambiar de precio. */
export function seleccionInicial(r: ReglasResueltas, disponibles: string[]): string[] {
  return r.modoIngredientes === 'quitar' ? [...disponibles] : [];
}

/** Marca o desmarca un ingrediente respetando el límite de la categoría. */
export function alternarIngrediente(
  seleccion: string[],
  id: string,
  r: ReglasResueltas,
  combinado: boolean,
): string[] {
  if (seleccion.includes(id)) return seleccion.filter(x => x !== id);
  const limite = r.modoIngredientes === 'elegir' ? limiteIngredientes(r, combinado) : 0;
  if (limite > 0 && seleccion.length >= limite) return seleccion;
  return [...seleccion, id];
}

/** Al desactivar "combinado", recorta la selección al nuevo máximo. */
export function recortarSeleccion(seleccion: string[], r: ReglasResueltas, combinado: boolean): string[] {
  const limite = r.modoIngredientes === 'elegir' ? limiteIngredientes(r, combinado) : 0;
  return limite > 0 ? seleccion.slice(0, limite) : seleccion;
}
