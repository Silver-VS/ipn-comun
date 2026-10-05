// SPDX-License-Identifier: MIT
// Contraste WCAG 2.2. Lógica portada de ipn-tools/tools/contraste.py.

export function luminancia(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function razon(a, b) {
  const [mayor, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (mayor + 0.05) / (menor + 0.05);
}

// [texto, fondo, mínimo, descripción]. 4,5 texto normal; 3 componentes y bordes de control (WCAG 1.4.11).
export const PARES = [
  ['texto', 'fondo', 4.5, 'texto / fondo'],
  ['texto', 'superficie', 4.5, 'texto / superficie'],
  ['texto', 'hundido', 4.5, 'texto / bloque hundido'],
  ['tenue', 'fondo', 4.5, 'texto tenue / fondo'],
  ['tenue', 'superficie', 4.5, 'texto tenue / superficie'],
  ['tenue', 'hundido', 4.5, 'texto tenue / bloque hundido'],
  ['acento', 'fondo', 4.5, 'enlace o acento / fondo'],
  ['acento', 'superficie', 4.5, 'enlace o acento / superficie'],
  ['acento', 'hundido', 4.5, 'enlace o acento / bloque hundido'],
  ['acento', 'acento-suave', 4.5, 'acento / fondo suave'],
  ['acento-fuerte', 'superficie', 4.5, 'acento fuerte / superficie'],
  ['acento-fuerte', 'acento-suave', 4.5, 'acento fuerte / fondo suave'],
  ['sobre-acento', 'acento', 4.5, 'texto sobre botón principal'],
  ['ok', 'superficie', 4.5, 'correcto / superficie'],
  ['ok', 'ok-suave', 4.5, 'correcto / fondo suave'],
  ['aviso', 'superficie', 4.5, 'aviso / superficie'],
  ['aviso', 'aviso-suave', 4.5, 'aviso / fondo suave'],
  ['error', 'superficie', 4.5, 'error / superficie'],
  ['error', 'error-suave', 4.5, 'error / fondo suave'],
  ['info', 'superficie', 4.5, 'información / superficie'],
  ['info', 'info-suave', 4.5, 'información / fondo suave'],
  ['borde-control', 'superficie', 3, 'borde de control / superficie'],
  ['borde-control', 'fondo', 3, 'borde de control / fondo'],
  ['acento', 'superficie', 3, 'anillo de foco / superficie'],
];

/** Devuelve la lista de pares evaluados { tema, par, razon, minimo, ok }. */
export function evaluar(semanticos) {
  const por = new Map(semanticos.map((t) => [t.nombre.replace(/^--ipn-/, ''), t]));
  const res = [];
  for (const tema of ['claro', 'oscuro']) {
    for (const [a, b, minimo, desc] of PARES) {
      const ta = por.get(a);
      const tb = por.get(b);
      if (!ta || !tb) {
        res.push({ tema, desc, a, b, minimo, razon: NaN, ok: false, falta: true });
        continue;
      }
      const r = razon(ta[tema], tb[tema]);
      res.push({ tema, desc, a, b, minimo, razon: r, ok: r >= minimo, colores: `${ta[tema]} sobre ${tb[tema]}` });
    }
  }
  return res;
}
