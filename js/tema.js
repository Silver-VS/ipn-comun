// SPDX-License-Identifier: MIT
// Tema claro / oscuro / auto con el atributo data-tema en <html> (el CSS está en dist/tokens.css).
// «auto» quita el atributo y sigue prefers-color-scheme. La elección dura solo la visita (sessionStorage,
// clave registrada en datos/almacen.json); nada sensible se guarda.

export const MODOS = ['claro', 'oscuro', 'auto'];
export const CLAVE_ALMACEN = 'ipn.tema';

function leer(almacen) {
  try { return almacen?.getItem(CLAVE_ALMACEN); } catch { return null; }
}

function escribir(almacen, valor) {
  try {
    if (valor === 'auto') almacen?.removeItem(CLAVE_ALMACEN);
    else almacen?.setItem(CLAVE_ALMACEN, valor);
  } catch { /* almacenamiento no disponible: el tema solo dura mientras la página está abierta */ }
}

/** Aplica el modo a la raíz (por omisión <html>). Devuelve el modo aplicado. */
export function aplicarTema(modo, { raiz = globalThis.document?.documentElement, almacen = globalThis.sessionStorage } = {}) {
  const m = MODOS.includes(modo) ? modo : 'auto';
  if (raiz) {
    if (m === 'auto') raiz.removeAttribute('data-tema');
    else raiz.setAttribute('data-tema', m);
  }
  escribir(almacen, m);
  return m;
}

/** Modo guardado para esta visita ('auto' si no hay). */
export function leerTema({ almacen = globalThis.sessionStorage } = {}) {
  const v = leer(almacen);
  return MODOS.includes(v) ? v : 'auto';
}

/** Aplica el modo guardado al cargar la página. */
export function iniciarTema(opciones = {}) {
  return aplicarTema(leerTema(opciones), opciones);
}

/** ¿Se está viendo oscuro ahora? Considera la elección manual y, si no hay, la preferencia del sistema. */
export function esOscuro({ raiz = globalThis.document?.documentElement, sistema = globalThis.matchMedia } = {}) {
  const forzado = raiz?.getAttribute('data-tema');
  if (forzado) return forzado === 'oscuro';
  return !!sistema?.('(prefers-color-scheme: dark)')?.matches;
}
