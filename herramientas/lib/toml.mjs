// SPDX-License-Identifier: MIT
// Lector mínimo de TOML (sin dependencias). Soporta: comentarios, [tablas] con puntos, claves con puntos,
// cadenas básicas "…" (con escapes), cadenas literales '…', enteros, booleanos y arreglos de cadenas
// (en una o varias líneas). Es suficiente para contenido/ y no pretende cubrir todo TOML 1.0.

function error(linea, mensaje) {
  return new Error(`TOML línea ${linea}: ${mensaje}`);
}

function cadenaBasica(texto, i, linea) {
  // texto[i] === '"'; devuelve [valor, índice siguiente]
  let salida = '';
  i++;
  while (i < texto.length) {
    const c = texto[i];
    if (c === '"') return [salida, i + 1];
    if (c === '\\') {
      const n = texto[i + 1];
      const mapa = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', b: '\b', f: '\f' };
      if (n in mapa) { salida += mapa[n]; i += 2; continue; }
      if (n === 'u' || n === 'U') {
        const largo = n === 'u' ? 4 : 8;
        const hex = texto.slice(i + 2, i + 2 + largo);
        if (!new RegExp(`^[0-9a-fA-F]{${largo}}$`).test(hex)) throw error(linea, 'escape Unicode inválido');
        salida += String.fromCodePoint(parseInt(hex, 16));
        i += 2 + largo;
        continue;
      }
      throw error(linea, `escape desconocido \\${n}`);
    }
    salida += c;
    i++;
  }
  throw error(linea, 'cadena sin cerrar');
}

function valor(texto, i, linea) {
  while (texto[i] === ' ' || texto[i] === '\t') i++;
  const c = texto[i];
  if (c === '"') return cadenaBasica(texto, i, linea);
  if (c === "'") {
    const fin = texto.indexOf("'", i + 1);
    if (fin < 0) throw error(linea, 'cadena literal sin cerrar');
    return [texto.slice(i + 1, fin), fin + 1];
  }
  if (c === '[') {
    const lista = [];
    i++;
    for (;;) {
      while (/[\s,]/.test(texto[i] ?? '')) i++;
      if (texto[i] === '#') { while (i < texto.length && texto[i] !== '\n') i++; continue; }
      if (texto[i] === ']') return [lista, i + 1];
      if (i >= texto.length) throw error(linea, 'arreglo sin cerrar');
      const [v, sig] = valor(texto, i, linea);
      lista.push(v);
      i = sig;
    }
  }
  const m = /^(true|false|-?\d+)(?=[\s,\]#]|$)/.exec(texto.slice(i));
  if (!m) throw error(linea, 'valor no soportado');
  const v = m[1] === 'true' ? true : m[1] === 'false' ? false : Number(m[1]);
  return [v, i + m[1].length];
}

function asignar(obj, ruta, v, linea) {
  let actual = obj;
  for (let k = 0; k < ruta.length - 1; k++) {
    const p = ruta[k];
    if (actual[p] === undefined) actual[p] = {};
    else if (typeof actual[p] !== 'object' || Array.isArray(actual[p])) throw error(linea, `«${p}» ya es un valor`);
    actual = actual[p];
  }
  const ultima = ruta[ruta.length - 1];
  if (ultima in actual) throw error(linea, `clave repetida «${ruta.join('.')}»`);
  actual[ultima] = v;
}

const CLAVE = /^[A-Za-z0-9_-]+$/;

function partirRuta(texto, linea) {
  const partes = texto.split('.').map((p) => p.trim());
  for (const p of partes) if (!CLAVE.test(p)) throw error(linea, `clave inválida «${texto}»`);
  return partes;
}

export function leerToml(fuente) {
  const texto = fuente.replace(/\r\n?/g, '\n');
  const raiz = {};
  let tabla = raiz;
  let n = 0;
  let i = 0;
  const lineas = texto.length;
  while (i < lineas) {
    // lee una línea lógica (los arreglos pueden ocupar varias)
    let fin = texto.indexOf('\n', i);
    if (fin < 0) fin = lineas;
    const cruda = texto.slice(i, fin);
    n++;
    const t = cruda.trim();
    if (t === '' || t.startsWith('#')) { i = fin + 1; continue; }
    if (t.startsWith('[')) {
      const m = /^\[([^\]]+)\]\s*(#.*)?$/.exec(t);
      if (!m) throw error(n, 'encabezado de tabla inválido');
      const ruta = partirRuta(m[1], n);
      tabla = raiz;
      for (const p of ruta) {
        if (tabla[p] === undefined) tabla[p] = {};
        else if (typeof tabla[p] !== 'object' || Array.isArray(tabla[p])) throw error(n, `«${p}» ya es un valor`);
        tabla = tabla[p];
      }
      i = fin + 1;
      continue;
    }
    const eq = cruda.indexOf('=');
    if (eq < 0) throw error(n, 'se esperaba clave = valor');
    const ruta = partirRuta(cruda.slice(0, eq), n);
    const inicio = i + eq + 1;
    const [v, sig] = valor(texto, inicio, n);
    // el resto de la línea donde termina el valor solo puede ser un comentario
    let finLinea = texto.indexOf('\n', sig);
    if (finLinea < 0) finLinea = lineas;
    const resto = texto.slice(sig, finLinea).trim();
    if (resto !== '' && !resto.startsWith('#')) throw error(n, 'texto después del valor');
    n += (texto.slice(i, sig).match(/\n/g) || []).length;
    asignar(tabla, ruta, v, n);
    i = finLinea + 1;
  }
  return raiz;
}

/** Aplana {a:{b:"x"}} a {"a.b":"x"}; deja intactos los arreglos. */
export function aplanar(obj, prefijo = '', salida = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const ruta = prefijo ? `${prefijo}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) aplanar(v, ruta, salida);
    else salida[ruta] = v;
  }
  return salida;
}
