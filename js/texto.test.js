// SPDX-License-Identifier: MIT
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { t, registrar, usarIdioma, configurar, reiniciar, sanear } from './texto.js';

beforeEach(() => {
  reiniciar();
  registrar('es', {
    'x.hola': 'Hola, {nombre}',
    'x.y': '{n, plural, one {# error} other {# errores}}',
    'x.cero': '{n, plural, =0 {Sin errores} one {# error} other {# errores}}',
    'x.mixto': 'Hay {n, plural, one {# archivo} other {# archivos}} en {carpeta}',
    'x.html': 'Lee <b>esto</b> y <a href="https://example.org/a?x=1&y=2">aquí</a>',
    'x.peligro': 'Mira <script>alert(1)</script> <a href="javascript:alert(1)">clic</a> <img src=x onerror=alert(1)>',
    'x.solo_es': 'Solo en español',
  });
});

test('variables: sustituye y escapa el valor', () => {
  assert.equal(t('x.hola', { nombre: 'Ana' }), 'Hola, Ana');
  assert.equal(t('x.hola', { nombre: '<b>Ana</b> & "yo"' }), 'Hola, &lt;b&gt;Ana&lt;/b&gt; &amp; &quot;yo&quot;');
});

test('variable ausente: deja el marcador visible', () => {
  assert.equal(t('x.hola'), 'Hola, {nombre}');
});

test('plurales en es: 0, 1, 2 y 21', () => {
  assert.equal(t('x.y', { n: 0 }), '0 errores');
  assert.equal(t('x.y', { n: 1 }), '1 error');
  assert.equal(t('x.y', { n: 2 }), '2 errores');
  assert.equal(t('x.y', { n: 21 }), '21 errores');
});

test('plural: formato de miles y selector exacto =0', () => {
  assert.equal(t('x.y', { n: 1234 }), '1234 errores'.replace('1234', new Intl.NumberFormat('es').format(1234)));
  assert.equal(t('x.cero', { n: 0 }), 'Sin errores');
  assert.equal(t('x.cero', { n: 1 }), '1 error');
});

test('plural dentro de una frase con otra variable', () => {
  assert.equal(t('x.mixto', { n: 1, carpeta: 'src' }), 'Hay 1 archivo en src');
  assert.equal(t('x.mixto', { n: 3, carpeta: 'src' }), 'Hay 3 archivos en src');
});

test('saneo: conserva b, i, code y enlaces seguros', () => {
  assert.equal(t('x.html'), 'Lee <b>esto</b> y <a href="https://example.org/a?x=1&amp;y=2">aquí</a>');
  assert.equal(sanear('<i>a</i> <code>b</code>'), '<i>a</i> <code>b</code>');
});

test('saneo: neutraliza script, javascript: y atributos de eventos', () => {
  const s = t('x.peligro');
  assert.ok(!/<script/i.test(s));
  assert.ok(!/<img/i.test(s));
  assert.ok(!/href="javascript/i.test(s));
  assert.ok(s.includes('&lt;script&gt;'));
});

test('saneo: un < suelto no rompe el HTML', () => {
  assert.equal(sanear('a < b'), 'a &lt; b');
});

test('caída a es cuando falta la clave en otro idioma', () => {
  registrar('en', { 'x.hola': 'Hello, {nombre}' });
  usarIdioma('en');
  assert.equal(t('x.hola', { nombre: 'Ana' }), 'Hello, Ana');
  assert.equal(t('x.solo_es'), 'Solo en español');
});

test('clave inexistente: devuelve la clave sin lanzar; avisa solo en desarrollo', () => {
  const avisos = [];
  configurar({ avisar: (m) => avisos.push(m) });
  assert.equal(t('no.existe'), 'no.existe');
  assert.equal(avisos.length, 0);
  configurar({ desarrollo: true });
  assert.equal(t('no.existe'), 'no.existe');
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /no\.existe/);
});

test('acepta el JSON de dist (con la propiedad textos)', () => {
  registrar('es', { version: '1', textos: { 'a.b': 'Valor' } });
  assert.equal(t('a.b'), 'Valor');
});

test('plural mal formado: no lanza y deja el texto original', () => {
  registrar('es', { 'm.malo': '{n, plural, algo}' });
  assert.equal(t('m.malo', { n: 2 }), '{n, plural, algo}');
});
