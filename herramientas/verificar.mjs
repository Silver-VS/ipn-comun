// SPDX-License-Identifier: MIT
// Verifica el repositorio: esquemas, claves y plantillas de textos, voz, contraste AA, datos personales,
// encabezados SPDX y que dist/ esté al día. Uso: node herramientas/verificar.mjs [raiz]
// Sale con código 1 si hay errores. `verificar(raiz)` devuelve { errores, avisos } para las pruebas.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, extname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerToml, aplanar } from './lib/toml.mjs';
import { validar } from './lib/esquema.mjs';
import { cargarTokens } from './lib/tokens.mjs';
import { evaluar } from './lib/contraste.mjs';
import { construir, RAIZ } from './generar.mjs';

const leer = (ruta) => readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '');
const normal = (s) => s.replace(/\r\n?/g, '\n');
const sinSlash = (p) => p.split('\\').join('/');

function listar(dir, filtro = () => true, salida = []) {
  if (!existsSync(dir)) return salida;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) listar(p, filtro, salida);
    else if (filtro(p)) salida.push(p);
  }
  return salida;
}

// --- Plantillas de texto -----------------------------------------------------------------------

const NOMBRE_VAR = /^[a-z][a-z0-9_]*$/;
const CATEGORIAS = /^(=\d+|zero|one|two|few|many|other)$/;

function cierre(s, inicio) {
  let n = 0;
  for (let i = inicio; i < s.length; i++) {
    if (s[i] === '{') n++;
    else if (s[i] === '}' && --n === 0) return i;
  }
  return -1;
}

/** Devuelve { problemas, variables } de una plantilla. */
export function revisarPlantilla(s, enPlural = false) {
  const problemas = [];
  const variables = new Set();
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '}') { problemas.push('llave } sin abrir'); i++; continue; }
    if (c !== '{') { i++; continue; }
    const fin = cierre(s, i);
    if (fin < 0) { problemas.push('llave { sin cerrar'); break; }
    const interior = s.slice(i + 1, fin);
    const simple = /^([^,{}]*)$/.exec(interior);
    const plural = /^\s*([^,{}]*?)\s*,\s*plural\s*,([\s\S]*)$/.exec(interior);
    if (simple) {
      const nombre = simple[1].trim();
      if (!NOMBRE_VAR.test(nombre)) problemas.push(`variable «{${simple[1]}}» mal formada (usa un nombre descriptivo en minúsculas, no posicional)`);
      else variables.add(nombre);
    } else if (plural) {
      const nombre = plural[1];
      if (!NOMBRE_VAR.test(nombre)) problemas.push(`plural con variable «${nombre}» mal formada`);
      else variables.add(nombre);
      let resto = plural[2];
      const opciones = new Set();
      for (;;) {
        resto = resto.replace(/^\s+/, '');
        if (!resto) break;
        const m = /^([^\s{]+)\s*\{/.exec(resto);
        if (!m || !CATEGORIAS.test(m[1])) { problemas.push(`plural «${nombre}»: opción inválida cerca de «${resto.slice(0, 20)}»`); break; }
        const abre = m[0].length - 1;
        const cierra = cierre(resto, abre);
        if (cierra < 0) { problemas.push(`plural «${nombre}»: llave sin cerrar en «${m[1]}»`); break; }
        opciones.add(m[1]);
        const sub = revisarPlantilla(resto.slice(abre + 1, cierra), true);
        problemas.push(...sub.problemas);
        sub.variables.forEach((v) => variables.add(v));
        resto = resto.slice(cierra + 1);
      }
      if (!opciones.has('other')) problemas.push(`plural «${nombre}»: falta la opción other`);
    } else {
      problemas.push(`expresión «{${interior.slice(0, 30)}}» no es una variable ni un plural válido`);
    }
    i = fin + 1;
  }
  return { problemas, variables };
}

const quitarExpresiones = (s) => {
  let salida = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '{') {
      const f = cierre(s, i);
      if (f < 0) break;
      i = f + 1;
    } else salida += s[i++];
  }
  return salida;
};

// --- Comprobaciones -----------------------------------------------------------------------------

function comprobarEsquemas(raiz, err) {
  const dir = join(raiz, 'datos');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const esquemaRuta = join(dir, 'esquemas', f.replace(/\.json$/, '.schema.json'));
    if (!existsSync(esquemaRuta)) { err('esquema', `datos/${f}: no tiene esquema en datos/esquemas/`); continue; }
    let datos;
    let esquema;
    try { datos = JSON.parse(leer(join(dir, f))); } catch (e) { err('esquema', `datos/${f}: JSON inválido (${e.message})`); continue; }
    try { esquema = JSON.parse(leer(esquemaRuta)); } catch (e) { err('esquema', `esquema de ${f}: JSON inválido (${e.message})`); continue; }
    for (const m of validar(datos, esquema)) err('esquema', `datos/${f}: ${m}`);
  }
}

function comprobarTextos(raiz, err) {
  const dir = join(raiz, 'contenido', 'textos');
  if (!existsSync(dir)) return;
  let vetadas = [];
  try { vetadas = leerToml(leer(join(raiz, 'contenido', 'glosario.toml'))).vetadas ?? []; } catch (e) { err('voz', `contenido/glosario.toml: ${e.message}`); }
  const archivos = readdirSync(dir).filter((f) => f.endsWith('.toml')).sort();
  const cargados = new Map();
  for (const f of archivos) {
    const nombre = `contenido/textos/${f}`;
    let plano;
    try { plano = aplanar(leerToml(leer(join(dir, f)))); } catch (e) { err('clave', `${nombre}: ${e.message}`); continue; }
    cargados.set(f, plano);
    if (typeof plano.version !== 'string' || !/^\d{4}\.\d{2}\.\d+$/.test(plano.version)) err('clave', `${nombre}: falta version = "AAAA.MM.n"`);
    for (const [clave, valor] of Object.entries(plano)) {
      if (clave === 'version') continue;
      if (!/^[a-z0-9_]+(\.[a-z0-9_]+)*$/.test(clave)) err('clave', `${nombre}: clave «${clave}» mal formada (solo a-z, 0-9, _ y puntos)`);
      if (typeof valor !== 'string') { err('clave', `${nombre}: «${clave}» debe ser texto`); continue; }
      const { problemas } = revisarPlantilla(valor);
      for (const p of problemas) err('plantilla', `${nombre}: «${clave}»: ${p}`);
      for (const v of vetadas) {
        const re = new RegExp(`(?<![\\p{L}\\p{N}])${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu');
        if (re.test(valor)) err('voz', `${nombre}: «${clave}» usa «${v}», palabra vetada por la voz editorial`);
      }
      const visible = quitarExpresiones(valor);
      const mayus = visible.match(/\p{Lu}{2,}/gu) ?? [];
      if (mayus.length >= 2 && !/\p{Ll}/u.test(visible)) err('voz', `${nombre}: «${clave}» está TODO EN MAYÚSCULAS`);
      if (clave.endsWith('.boton') && visible.trim().split(/\s+/).length > 5) err('voz', `${nombre}: «${clave}» es un botón de más de 5 palabras`);
    }
  }
  // Otros idiomas: no definen claves nuevas ni cambian las variables respecto de es.
  for (const [f, plano] of cargados) {
    const m = /^(.+)\.([a-z]{2,3})\.toml$/.exec(f);
    if (!m || m[2] === 'es') continue;
    const base = cargados.get(`${m[1]}.es.toml`);
    if (!base) continue;
    for (const [clave, valor] of Object.entries(plano)) {
      if (clave === 'version' || typeof valor !== 'string') continue;
      if (typeof base[clave] !== 'string') { err('clave', `contenido/textos/${f}: «${clave}» no existe en es`); continue; }
      const a = [...revisarPlantilla(valor).variables].sort().join(',');
      const b = [...revisarPlantilla(base[clave]).variables].sort().join(',');
      if (a !== b) err('plantilla', `contenido/textos/${f}: «${clave}» usa variables distintas de es (${a} frente a ${b})`);
    }
  }
}

function comprobarContraste(raiz, err) {
  let tokens;
  try { tokens = cargarTokens(raiz); } catch (e) { err('contraste', `tokens: ${e.message}`); return; }
  for (const t of tokens.semanticos.filter((x) => x.tipo === 'color')) {
    for (const v of [t.claro, t.oscuro]) if (!/^#[0-9a-f]{6}$/i.test(v)) err('contraste', `${t.nombre}: «${v}» no es un color #rrggbb`);
  }
  for (const r of evaluar(tokens.semanticos)) {
    if (r.falta) err('contraste', `${r.tema}: falta un token para el par ${r.a} / ${r.b}`);
    else if (!r.ok) err('contraste', `${r.tema}: ${r.desc} ${r.razon.toFixed(2)}:1 (mínimo ${r.minimo}) ${r.colores}`);
  }
}

const CAMPOS_PERSONALES = /^(alumno|boleta|curp|correo|email|e_mail|telefono|celular|nombre_completo|apellidos?|contacto)$/i;
const CORREO = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/;
const BOLETA = /(?<![\d])(?:(?:19|20)\d{8}|(?:PE|PP|pe|pp)\d{8})(?![\d])/;
const CURP = /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/;

function claves(obj, salida = []) {
  if (Array.isArray(obj)) obj.forEach((x) => claves(x, salida));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) { salida.push(k); claves(v, salida); }
  return salida;
}

function comprobarPersonales(raiz, err) {
  const archivos = ['contenido', 'datos', 'tokens'].flatMap((d) => listar(join(raiz, d), (p) => /\.(json|toml|md|html|txt|css|js|mjs)$/.test(p)));
  for (const p of archivos) {
    const rel = sinSlash(relative(raiz, p));
    const texto = leer(p);
    let m;
    if ((m = CORREO.exec(texto))) err('personales', `${rel}: contiene un correo (${m[0].replace(/^(.{2}).*(@.*)$/, '$1…$2')})`);
    if (BOLETA.test(texto)) err('personales', `${rel}: contiene algo parecido a una boleta`);
    if (CURP.test(texto)) err('personales', `${rel}: contiene algo parecido a una CURP`);
    if (p.endsWith('.json')) {
      try {
        for (const k of claves(JSON.parse(texto))) if (CAMPOS_PERSONALES.test(k)) err('personales', `${rel}: campo «${k}» sugiere datos personales`);
      } catch { /* los JSON inválidos los reporta comprobarEsquemas o la lectura de tokens */ }
    }
  }
}

function comprobarSpdx(raiz, err) {
  const reglas = [
    ['MIT', ['js', 'herramientas', 'componentes', 'catalogo'], /\.(js|mjs|html|css)$/],
    ['CC0-1.0', ['tokens', 'contenido', 'datos'], /\.(json|toml|md)$/],
  ];
  for (const [licencia, dirs, filtro] of reglas) {
    for (const d of dirs) {
      for (const p of listar(join(raiz, d), (x) => filtro.test(x) && !x.includes('.tmp'))) {
        if (!leer(p).slice(0, 2000).includes(`SPDX-License-Identifier: ${licencia}`)) err('spdx', `${sinSlash(relative(raiz, p))}: falta SPDX-License-Identifier: ${licencia}`);
      }
    }
  }
}

function comprobarDist(raiz, err) {
  let esperado;
  try { esperado = construir(raiz); } catch (e) { err('dist', `no se pudo generar: ${e.message}`); return; }
  for (const [ruta, contenido] of esperado) {
    const p = join(raiz, ruta);
    if (!existsSync(p)) { err('dist', `${ruta}: no existe; corre npm run generar`); continue; }
    if (normal(leer(p)) !== normal(contenido)) err('dist', `${ruta}: no está al día; corre npm run generar`);
    const primera = normal(leer(p)).split('\n').slice(0, 2).join('\n');
    if (!/GENERADO/.test(primera)) err('dist', `${ruta}: falta la marca GENERADO en la primera línea`);
  }
}

export function verificar(raiz = RAIZ) {
  const errores = [];
  const err = (codigo, mensaje) => errores.push({ codigo, mensaje });
  const pasos = [comprobarEsquemas, comprobarTextos, comprobarContraste, comprobarPersonales, comprobarSpdx, comprobarDist];
  for (const paso of pasos) {
    try { paso(raiz, err); } catch (e) { err(paso.name.replace('comprobar', '').toLowerCase(), `fallo inesperado: ${e.message}`); }
  }
  return { errores };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raiz = process.argv[2] ? resolve(process.argv[2]) : RAIZ;
  const { errores } = verificar(raiz);
  if (errores.length) {
    for (const e of errores) console.error(`[${e.codigo}] ${e.mensaje}`);
    console.error(`verificar: ${errores.length} error(es)`);
    process.exit(1);
  }
  console.log('verificar: todo en orden (esquemas, textos, voz, contraste, datos personales, SPDX y dist)');
}
