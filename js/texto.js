// SPDX-License-Identifier: MIT
// Formateador de textos: t(clave, vars) con variables {nombre}, plurales ICU mínimos
// {n, plural, one {# error} other {# errores}} resueltos con Intl.PluralRules, saneo de HTML
// (solo <b> <i> <code> <a href>) y caída al idioma «es» si falta una clave.
// Los valores de las variables se escapan siempre; solo el texto de la plantilla puede traer HTML permitido.

const IDIOMA_BASE = 'es';
const catalogos = new Map(); // idioma -> { clave: plantilla }
let idiomaActivo = IDIOMA_BASE;
let desarrollo = false;
let avisar = (m) => globalThis.console?.warn?.(m);

/** Registra el mapa plano de claves de un idioma. Acepta también el JSON de dist: { textos: {...} }. */
export function registrar(idioma, mapa) {
  catalogos.set(idioma, mapa && typeof mapa.textos === 'object' && !Array.isArray(mapa.textos) ? mapa.textos : mapa);
}

export function usarIdioma(idioma) {
  idiomaActivo = idioma;
}

/** En desarrollo, una clave faltante deja un aviso en consola. Fuera de desarrollo es silencioso. */
export function configurar({ desarrollo: d, avisar: a } = {}) {
  if (d !== undefined) desarrollo = !!d;
  if (a) avisar = a;
}

export function reiniciar() {
  catalogos.clear();
  idiomaActivo = IDIOMA_BASE;
  desarrollo = false;
}

export function escapar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const ENLACE_SEGURO = /^(https?:\/\/|mailto:|\/|\.\/|\.\.\/|#)/i;

/** Deja solo <b>, <i>, <code> y <a href="…">; lo demás se muestra como texto. */
export function sanear(html) {
  const etiqueta = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*)?)>/g;
  let salida = '';
  let ultimo = 0;
  let m;
  while ((m = etiqueta.exec(html)) !== null) {
    salida += html.slice(ultimo, m.index).replace(/</g, '&lt;');
    ultimo = m.index + m[0].length;
    const [crudo, cierre, nombreCrudo, atributos] = m;
    const nombre = nombreCrudo.toLowerCase();
    if (nombre === 'b' || nombre === 'i' || nombre === 'code') {
      salida += cierre ? `</${nombre}>` : `<${nombre}>`;
    } else if (nombre === 'a') {
      if (cierre) {
        salida += '</a>';
      } else {
        const h = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(atributos);
        const destino = h ? (h[1] ?? h[2]).replace(/&amp;/g, '&').trim() : '';
        salida += ENLACE_SEGURO.test(destino) ? `<a href="${escapar(destino)}">` : '&lt;a&gt;';
      }
    } else {
      salida += crudo.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }
  salida += html.slice(ultimo).replace(/</g, '&lt;');
  return salida;
}

// --- Formateo de plantillas ---------------------------------------------------------------------

/** Devuelve el índice de la llave que cierra la de `inicio`, o -1. */
function cierreLlave(s, inicio) {
  let nivel = 0;
  for (let i = inicio; i < s.length; i++) {
    if (s[i] === '{') nivel++;
    else if (s[i] === '}' && --nivel === 0) return i;
  }
  return -1;
}

/** Interpreta «zero {…} one {…} =0 {…} other {…}» y devuelve Map(selector -> texto), o null si está mal formado. */
function opcionesPlural(s) {
  const mapa = new Map();
  let i = 0;
  for (;;) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    const m = /^(=\d+|zero|one|two|few|many|other)\s*\{/.exec(s.slice(i));
    if (!m) return null;
    const abre = i + m[0].length - 1;
    const cierra = cierreLlave(s, abre);
    if (cierra < 0) return null;
    mapa.set(m[1], s.slice(abre + 1, cierra));
    i = cierra + 1;
  }
  return mapa.has('other') ? mapa : null;
}

function formatear(plantilla, vars, idioma, n = null) {
  let salida = '';
  let i = 0;
  while (i < plantilla.length) {
    const c = plantilla[i];
    if (c === '#' && n !== null) {
      salida += new Intl.NumberFormat(idioma).format(n);
      i++;
    } else if (c === '{') {
      const fin = cierreLlave(plantilla, i);
      if (fin < 0) { salida += plantilla.slice(i); break; }
      const interior = plantilla.slice(i + 1, fin);
      const cabecera = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:,\s*(plural)\s*,([\s\S]*))?$/.exec(interior);
      if (!cabecera) {
        salida += plantilla.slice(i, fin + 1);
      } else if (!cabecera[2]) {
        const nombre = cabecera[1];
        salida += nombre in vars ? escapar(vars[nombre]) : `{${nombre}}`;
      } else {
        const valor = Number(vars[cabecera[1]]);
        const opciones = opcionesPlural(cabecera[3]);
        if (!opciones || Number.isNaN(valor)) {
          salida += plantilla.slice(i, fin + 1);
        } else {
          const categoria = new Intl.PluralRules(idioma).select(valor);
          const elegido = opciones.get(`=${valor}`) ?? opciones.get(categoria) ?? opciones.get('other');
          salida += formatear(elegido, vars, idioma, valor);
        }
      }
      i = fin + 1;
    } else {
      salida += c;
      i++;
    }
  }
  return salida;
}

/** t('pie.licencia', { licencia: 'MIT' }). Clave faltante: devuelve la clave (y avisa solo en desarrollo). */
export function t(clave, vars = {}) {
  let plantilla = catalogos.get(idiomaActivo)?.[clave];
  if (typeof plantilla !== 'string') plantilla = catalogos.get(IDIOMA_BASE)?.[clave];
  if (typeof plantilla !== 'string') {
    if (desarrollo) avisar(`texto: falta la clave «${clave}»`);
    return clave;
  }
  return sanear(formatear(plantilla, vars ?? {}, idiomaActivo));
}
