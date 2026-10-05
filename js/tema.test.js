// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarTema, leerTema, esOscuro } from './tema.js';

function raizFalsa() {
  const attrs = new Map();
  return {
    setAttribute: (k, v) => attrs.set(k, v),
    removeAttribute: (k) => attrs.delete(k),
    getAttribute: (k) => attrs.get(k) ?? null,
  };
}

function almacenFalso() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
}

test('oscuro y claro fijan data-tema; auto lo quita', () => {
  const raiz = raizFalsa();
  const almacen = almacenFalso();
  assert.equal(aplicarTema('oscuro', { raiz, almacen }), 'oscuro');
  assert.equal(raiz.getAttribute('data-tema'), 'oscuro');
  assert.equal(leerTema({ almacen }), 'oscuro');
  aplicarTema('claro', { raiz, almacen });
  assert.equal(raiz.getAttribute('data-tema'), 'claro');
  aplicarTema('auto', { raiz, almacen });
  assert.equal(raiz.getAttribute('data-tema'), null);
  assert.equal(leerTema({ almacen }), 'auto');
});

test('un modo desconocido cae a auto y un almacén que falla no lanza', () => {
  const raiz = raizFalsa();
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } };
  assert.equal(aplicarTema('violeta', { raiz, almacen: roto }), 'auto');
  assert.equal(leerTema({ almacen: roto }), 'auto');
});

test('esOscuro respeta la elección manual y, si no hay, el sistema', () => {
  const raiz = raizFalsa();
  const sistemaOscuro = () => ({ matches: true });
  assert.equal(esOscuro({ raiz, sistema: sistemaOscuro }), true);
  raiz.setAttribute('data-tema', 'claro');
  assert.equal(esOscuro({ raiz, sistema: sistemaOscuro }), false);
});
