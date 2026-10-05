// SPDX-License-Identifier: MIT
// Genera dist/ desde tokens/ y contenido/. Sin dependencias. Uso: node herramientas/generar.mjs [raiz]
// `construir(raiz)` devuelve Map(ruta relativa -> contenido) sin escribir nada; verificar.mjs lo usa para
// comprobar que dist/ está al día.
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarTokens, aliasDe } from './lib/tokens.mjs';
import { leerToml, aplanar } from './lib/toml.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ = resolve(AQUI, '..');

const marca = (fuente) => `GENERADO desde ${fuente}; no editar`;
const json = (obj) => JSON.stringify(obj, null, 2) + '\n';

function bloque(selector, tokens, clave, extra = '') {
  const lineas = tokens.map((t) => `  ${t.nombre}: ${t[clave]};`);
  if (extra) lineas.unshift(`  ${extra}`);
  return `${selector} {\n${lineas.join('\n')}\n}`;
}

function cssTokens({ semanticos }) {
  const conOscuro = semanticos.filter((t) => t.tieneOscuro);
  const partes = [
    `/* ${marca('tokens/*.tokens.json')} */`,
    `/* SPDX-License-Identifier: CC0-1.0 */`,
    bloque(':root', semanticos, 'claro', 'color-scheme: light;'),
    `@media (prefers-color-scheme: dark) {\n${bloque(':root:not([data-tema="claro"])', conOscuro, 'oscuro', 'color-scheme: dark;').replace(/^/gm, '  ')}\n}`,
    bloque(':root[data-tema="oscuro"]', conOscuro, 'oscuro', 'color-scheme: dark;'),
    bloque(':root[data-tema="claro"]', [], 'claro', 'color-scheme: light;'),
  ];
  return partes.join('\n\n') + '\n';
}

function cssAlias(nombre, mapa, tokens) {
  const existentes = new Set(tokens.semanticos.map((t) => t.nombre));
  const lineas = Object.entries(mapa).map(([viejo, nuevo]) => {
    const destino = `--ipn-${nuevo}`;
    if (!existentes.has(destino)) throw new Error(`alias ${viejo}: no existe el token ${destino}`);
    return `  ${viejo}: var(${destino});`;
  });
  return [
    `/* ${marca('tokens/alias.json')} */`,
    `/* SPDX-License-Identifier: CC0-1.0 */`,
    `/* Alias temporal ${nombre}: migrar el código a --ipn-* y borrar este archivo. */`,
    `:root {\n${lineas.join('\n')}\n}`,
  ].join('\n') + '\n';
}

const ESTILOS = { regular: ['400', 'normal'], italic: ['400', 'italic'], bold: ['700', 'normal'], bolditalic: ['700', 'italic'] };

function cssFuentes(raiz) {
  const dir = join(raiz, 'fuentes');
  const archivos = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.woff2')).sort() : [];
  const familias = [['Noto Sans', 'NotoSans'], ['Noto Sans Mono', 'NotoSansMono']];
  const reglas = [];
  for (const [familia, prefijo] of familias) {
    for (const [estilo, [peso, tipo]] of Object.entries(ESTILOS)) {
      const archivo = archivos.find((f) => f.toLowerCase() === `${prefijo}-${estilo}.woff2`.toLowerCase());
      if (!archivo && !(estilo === 'regular' || estilo === 'bold')) continue;
      const local = `local("${familia}")`;
      const fuente = archivo ? `${local}, url("../fuentes/${archivo}") format("woff2")` : local;
      reglas.push(`@font-face {\n  font-family: "${familia}";\n  font-style: ${tipo};\n  font-weight: ${peso};\n  font-display: swap;\n  src: ${fuente};\n}`);
    }
  }
  return [
    `/* ${marca('fuentes/*.woff2')} */`,
    `/* SPDX-License-Identifier: CC0-1.0. Las fuentes Noto (OFL-1.1) van en fuentes/ con su OFL.txt; sin archivo, se usa la instalada. */`,
    ...reglas,
  ].join('\n') + '\n';
}

function textos(raiz, salida) {
  const dir = join(raiz, 'contenido', 'textos');
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.toml')).sort()) {
    const base = f.replace(/\.toml$/, '');
    const plano = aplanar(leerToml(readFileSync(join(dir, f), 'utf8')));
    const { version, ...claves } = plano;
    const origen = `contenido/textos/${f}`;
    salida.set(`dist/textos/${base}.json`, json({ _generado: marca(origen), version, textos: claves }));
    salida.set(
      `dist/textos/${base}.js`,
      `/* ${marca(origen)} */\n/* SPDX-License-Identifier: CC0-1.0. Versión para abrir sin servidor (file://). */\n` +
        `globalThis.IPN_TEXTOS = globalThis.IPN_TEXTOS || {};\nglobalThis.IPN_TEXTOS[${JSON.stringify(base)}] = ${JSON.stringify({ version, textos: claves }, null, 2)};\n`,
    );
  }
}

export function construir(raiz = RAIZ) {
  const tokens = cargarTokens(raiz);
  const alias = aliasDe(raiz);
  const salida = new Map();
  salida.set('dist/tokens.css', cssTokens(tokens));
  salida.set(
    'dist/tokens.json',
    json({
      _generado: marca('tokens/*.tokens.json'),
      semanticos: tokens.semanticos.map(({ nombre, ruta, tipo, claro, oscuro, tieneOscuro, descripcion }) => ({ nombre, ruta, tipo, claro, oscuro: tieneOscuro ? oscuro : null, descripcion })),
      primitivos: tokens.primitivos,
    }),
  );
  salida.set('dist/alias-herramientas.css', cssAlias('de IPN-tools', alias.herramientas, tokens));
  salida.set('dist/alias-folio.css', cssAlias('de IPN Folio', alias.folio, tokens));
  salida.set('dist/fuentes.css', cssFuentes(raiz));
  textos(raiz, salida);
  return salida;
}

export function escribir(salida, raiz = RAIZ) {
  for (const [ruta, contenido] of salida) {
    const destino = join(raiz, ruta);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, contenido, 'utf8');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raiz = process.argv[2] ? resolve(process.argv[2]) : RAIZ;
  const salida = construir(raiz);
  escribir(salida, raiz);
  console.log(`generar: ${salida.size} archivos escritos en dist/`);
}
