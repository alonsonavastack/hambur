import { describe, expect, it } from 'vitest';
import {
  alternarIngrediente, limiteIngredientes, recortarSeleccion, resolverReglas, seleccionInicial,
} from './categoria-reglas';

const fresas = resolverReglas('fresas', {
  requiereBase: true, modoIngredientes: 'elegir', maxIngredientes: 1,
  permiteCombinado: true, maxIngredientesCombinado: 2,
});

describe('resolverReglas', () => {
  it('sin reglas: pide base, ingredientes marcados y sin límite', () => {
    const r = resolverReglas('hamburguesas');
    expect(r).toMatchObject({ requiereBase: true, modoIngredientes: 'quitar', maxIngredientes: 0, permiteCombinado: false });
  });

  it('reconoce los hot-dogs antiguos (sin reglas) como categoría sin base', () => {
    for (const slug of ['hotdog', 'hot-dogs', 'Hot_Dog', 'hotdogs']) {
      expect(resolverReglas(slug).requiereBase).toBe(false);
    }
  });

  it('las reglas explícitas ganan sobre la detección de hot-dog', () => {
    expect(resolverReglas('hotdog', { requiereBase: true }).requiereBase).toBe(true);
    expect(resolverReglas('tacos', { requiereBase: false }).requiereBase).toBe(false);
  });
});

describe('seleccionInicial', () => {
  it("en modo 'quitar' parte con todo marcado", () => {
    expect(seleccionInicial(resolverReglas('hamburguesas'), ['a', 'b'])).toEqual(['a', 'b']);
  });

  it("en modo 'elegir' parte vacío", () => {
    expect(seleccionInicial(fresas, ['a', 'b'])).toEqual([]);
  });

  it('no comparte el arreglo de origen', () => {
    const origen = ['a'];
    expect(seleccionInicial(resolverReglas('x'), origen)).not.toBe(origen);
  });
});

describe('limiteIngredientes', () => {
  it('usa el máximo normal o el de combinado', () => {
    expect(limiteIngredientes(fresas, false)).toBe(1);
    expect(limiteIngredientes(fresas, true)).toBe(2);
  });

  it('ignora combinado si la categoría no lo permite', () => {
    const r = resolverReglas('x', { modoIngredientes: 'elegir', maxIngredientes: 3, permiteCombinado: false });
    expect(limiteIngredientes(r, true)).toBe(3);
  });
});

describe('alternarIngrediente', () => {
  it("en modo 'quitar' marca y desmarca sin límite", () => {
    const r = resolverReglas('hamburguesas');
    expect(alternarIngrediente(['a', 'b'], 'a', r, false)).toEqual(['b']);
    expect(alternarIngrediente(['b'], 'a', r, false)).toEqual(['b', 'a']);
  });

  it("en modo 'elegir' respeta el máximo y no agrega de más", () => {
    expect(alternarIngrediente([], 'a', fresas, false)).toEqual(['a']);
    expect(alternarIngrediente(['a'], 'b', fresas, false)).toEqual(['a']);
  });

  it('con combinado permite hasta el máximo de combinado', () => {
    expect(alternarIngrediente(['a'], 'b', fresas, true)).toEqual(['a', 'b']);
    expect(alternarIngrediente(['a', 'b'], 'c', fresas, true)).toEqual(['a', 'b']);
  });

  it('siempre permite desmarcar aunque se esté en el límite', () => {
    expect(alternarIngrediente(['a'], 'a', fresas, false)).toEqual([]);
  });

  it("con máximo 0 en modo 'elegir' no hay límite", () => {
    const r = resolverReglas('x', { modoIngredientes: 'elegir', maxIngredientes: 0 });
    expect(alternarIngrediente(['a', 'b', 'c'], 'd', r, false)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('recortarSeleccion', () => {
  it('al quitar combinado deja solo lo que cabe', () => {
    expect(recortarSeleccion(['a', 'b'], fresas, false)).toEqual(['a']);
  });

  it('no recorta si ya cabe o si no hay límite', () => {
    expect(recortarSeleccion(['a', 'b'], fresas, true)).toEqual(['a', 'b']);
    expect(recortarSeleccion(['a', 'b', 'c'], resolverReglas('x'), false)).toEqual(['a', 'b', 'c']);
  });
});
