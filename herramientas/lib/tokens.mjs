// SPDX-License-Identifier: MIT
// Lee tokens/*.tokens.json (formato DTCG), resuelve referencias {a.b} y devuelve una lista plana.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PREFIJO = 'ipn';
// grupo DTCG -> segmento del nombre CSS ('' = se omite). Un token en la raíz usa su propio nombre (--ipn-radio).
const GRUPOS = { color: '', espaciado: 'esp' };

function esToken(n) {
  return n && typeof n === 'object' && '$value' in n;
}

function recorrer(nodo, ruta, tipoHeredado, salida) {
  const tipo = nodo.$type ?? tipoHeredado;
  if (esToken(nodo)) {
    salida.push({ ruta, tipo, valor: nodo.$value, oscuro: nodo.$extensions?.['ipn.oscuro'], descripcion: nodo.$description ?? '' });
    return;
  }
  for (const [k, v] of Object.entries(nodo)) {
    if (k.startsWith('$')) continue;
    recorrer(v, [...ruta, k], tipo, salida);
  }
}

export function leerArbol(dir, archivos) {
  const salida = [];
  for (const a of archivos) {
    const json = JSON.parse(readFileSync(join(dir, 'tokens', a), 'utf8').replace(/^﻿/, ''));
    recorrer(json, [], undefined, salida);
  }
  return salida;
}

function resolver(valor, indice, pila = []) {
  if (typeof valor !== 'string') return valor;
  const m = /^\{([^}]+)\}$/.exec(valor);
  if (!m) return valor;
  const destino = m[1];
  if (pila.includes(destino)) throw new Error(`Referencia circular en tokens: ${[...pila, destino].join(' -> ')}`);
  const t = indice.get(destino);
  if (!t) throw new Error(`Referencia a token inexistente: {${destino}}`);
  return resolver(t.valor, indice, [...pila, destino]);
}

export function nombreCss(ruta) {
  const [grupo, ...resto] = ruta;
  const seg = grupo in GRUPOS ? [GRUPOS[grupo], ...resto] : ruta;
  return `--${PREFIJO}-${seg.filter(Boolean).join('-')}`;
}

/**
 * Devuelve { primitivos: [...], semanticos: [...] } con cada token resuelto:
 * { nombre, ruta, tipo, claro, oscuro, descripcion }. Los semánticos son los que llevan CSS.
 */
export function cargarTokens(dir) {
  const prim = leerArbol(dir, ['primitivos.tokens.json']);
  const sem = leerArbol(dir, ['semanticos.tokens.json', 'tipografia.tokens.json']);
  const indice = new Map(prim.map((t) => [t.ruta.join('.'), t]));
  const semanticos = sem.map((t) => {
    const claro = resolver(t.valor, indice);
    const oscuro = t.oscuro !== undefined ? resolver(t.oscuro, indice) : claro;
    return { nombre: nombreCss(t.ruta), ruta: t.ruta.join('.'), tipo: t.tipo, claro, oscuro, descripcion: t.descripcion, tieneOscuro: t.oscuro !== undefined };
  });
  const primitivos = prim.map((t) => ({ ruta: t.ruta.join('.'), tipo: t.tipo, valor: resolver(t.valor, indice), descripcion: t.descripcion }));
  return { primitivos, semanticos };
}

export function aliasDe(dir) {
  return JSON.parse(readFileSync(join(dir, 'tokens', 'alias.json'), 'utf8'));
}
