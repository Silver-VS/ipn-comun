// SPDX-License-Identifier: MIT
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { construir, escribir } from './generar.mjs';
import { verificar, revisarPlantilla } from './verificar.mjs';
import { leerToml } from './lib/toml.mjs';
import { razon } from './lib/contraste.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERIFICAR = join(RAIZ, 'herramientas', 'verificar.mjs');

function copia() {
  const dir = mkdtempSync(join(tmpdir(), 'ipn-comun-'));
  for (const d of ['tokens', 'contenido', 'datos', 'dist', 'js', 'herramientas', 'fuentes']) {
    if (existsSync(join(RAIZ, d))) cpSync(join(RAIZ, d), join(dir, d), { recursive: true });
  }
  return dir;
}

function editar(dir, ruta, fn) {
  const p = join(dir, ruta);
  writeFileSync(p, fn(readFileSync(p, 'utf8')), 'utf8');
}

function codigos(dir) {
  return new Set(verificar(dir).errores.map((e) => e.codigo));
}

test('generador: salida determinista (dos construcciones idénticas)', () => {
  const a = construir(RAIZ);
  const b = construir(RAIZ);
  assert.deepEqual([...a], [...b]);
  for (const ruta of ['dist/tokens.css', 'dist/tokens.json', 'dist/alias-herramientas.css', 'dist/alias-folio.css', 'dist/textos/comun.es.json']) {
    assert.ok(a.has(ruta), `falta ${ruta}`);
  }
});

test('generador: escribir dos veces no cambia los archivos', () => {
  const dir = copia();
  try {
    escribir(construir(dir), dir);
    const antes = readFileSync(join(dir, 'dist/tokens.css'), 'utf8');
    escribir(construir(dir), dir);
    assert.equal(readFileSync(join(dir, 'dist/tokens.css'), 'utf8'), antes);
    assert.equal(antes, readFileSync(join(RAIZ, 'dist/tokens.css'), 'utf8'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('generador: tokens.css trae modo oscuro por preferencia y por data-tema', () => {
  const css = construir(RAIZ).get('dist/tokens.css');
  assert.match(css, /^\/\* GENERADO desde /);
  assert.match(css, /prefers-color-scheme: dark/);
  assert.match(css, /:root\[data-tema="oscuro"\]/);
  assert.match(css, /:root\[data-tema="claro"\]/);
  assert.match(css, /--ipn-acento: #7A1F45;/);
});

test('el repositorio pasa verificar', () => {
  assert.deepEqual(verificar(RAIZ).errores, []);
});

test('verificar falla: clave mal formada', () => {
  const dir = copia();
  try {
    editar(dir, 'contenido/textos/comun.es.toml', (s) => s.replace('codigo_fuente', 'CodigoFuente'));
    assert.ok(codigos(dir).has('clave'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('verificar falla: variable mal formada y plural sin other', () => {
  const dir = copia();
  try {
    editar(dir, 'contenido/textos/comun.es.toml', (s) => s.replace('Licencia {licencia}', 'Licencia {0}').replace('one {# error} other {# errores}', 'one {# error}'));
    const e = verificar(dir).errores.filter((x) => x.codigo === 'plantilla');
    assert.ok(e.some((x) => /mal formada/.test(x.mensaje)));
    assert.ok(e.some((x) => /other/.test(x.mensaje)));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('verificar falla: palabra vetada y texto en mayúsculas', () => {
  const dir = copia();
  try {
    editar(dir, 'contenido/textos/comun.es.toml', (s) => s.replace('Cerrar aviso', 'ALGO SALIÓ MAL').replace('Código fuente', 'Tu token'));
    const e = verificar(dir).errores.filter((x) => x.codigo === 'voz');
    assert.ok(e.some((x) => /vetada/.test(x.mensaje)));
    assert.ok(e.some((x) => /MAYÚSCULAS/.test(x.mensaje)));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('verificar falla: contraste insuficiente', () => {
  const dir = copia();
  try {
    // texto gris muy claro sobre fondo claro
    editar(dir, 'tokens/semanticos.tokens.json', (s) => s.replace('"texto":       { "$value": "{gris.800}"', '"texto":       { "$value": "{gris.300}"'));
    escribir(construir(dir), dir); // dist al día: el único problema debe ser el contraste
    const c = codigos(dir);
    assert.ok(c.has('contraste'));
    assert.ok(!c.has('dist'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('verificar falla: correo en un dato', () => {
  const dir = copia();
  try {
    editar(dir, 'datos/unidades.json', (s) => s.replace('"version": "2026.10.1"', '"version": "2026.10.1", "_origen2": "escribe a persona.ejemplo@alumno.example.org"'));
    assert.ok(codigos(dir).has('personales'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('verificar falla: dato fuera del esquema y dist desactualizado', () => {
  const dir = copia();
  try {
    editar(dir, 'datos/unidades.json', (s) => s.replace('"modelo": "niveles"', '"modelo": "trimestral"'));
    editar(dir, 'tokens/primitivos.tokens.json', (s) => s.replace('#7A1F45', '#7B1F45'));
    const c = codigos(dir);
    assert.ok(c.has('esquema'));
    assert.ok(c.has('dist'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('verificar por línea de comandos: sale con 0 si todo está bien y con 1 si falla', () => {
  const bien = spawnSync(process.execPath, [VERIFICAR, RAIZ], { encoding: 'utf8' });
  assert.equal(bien.status, 0, bien.stderr);
  const dir = copia();
  try {
    editar(dir, 'contenido/textos/comun.es.toml', (s) => s.replace('codigo_fuente', 'Codigo-Fuente'));
    const mal = spawnSync(process.execPath, [VERIFICAR, dir], { encoding: 'utf8' });
    assert.equal(mal.status, 1);
    assert.match(mal.stderr, /\[clave\]/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('revisarPlantilla: variables y plurales anidados', () => {
  const ok = revisarPlantilla('Hay {n, plural, one {# archivo en {carpeta}} other {# archivos en {carpeta}}}');
  assert.deepEqual(ok.problemas, []);
  assert.deepEqual([...ok.variables].sort(), ['carpeta', 'n']);
  assert.ok(revisarPlantilla('Hola {').problemas.length > 0);
  assert.ok(revisarPlantilla('Hola }').problemas.length > 0);
});

test('toml: tablas, claves con puntos, arreglos y errores', () => {
  const t = leerToml('a = "x" # nota\n[b]\nc.d = "y\\n\\u00e9"\nl = [\n "p", # uno\n "q",\n]\n');
  assert.equal(t.a, 'x');
  assert.equal(t.b.c.d, 'y\né');
  assert.deepEqual(t.b.l, ['p', 'q']);
  assert.throws(() => leerToml('a = "x"\na = "y"'), /repetida/);
  assert.throws(() => leerToml('a = "sin cerrar'), /sin cerrar/);
});

test('contraste: blanco sobre negro es 21:1', () => {
  assert.ok(Math.abs(razon('#ffffff', '#000000') - 21) < 1e-9);
});
