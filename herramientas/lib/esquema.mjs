// SPDX-License-Identifier: MIT
// Validador mínimo de JSON Schema (subconjunto): type, enum, const, pattern, minLength, minItems, minimum,
// required, properties, additionalProperties (booleano o esquema), items, uniqueItems, $ref local (#/$defs/…)
// y format "uri-absoluta". Suficiente para datos/ sin añadir dependencias.

function tipoDe(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}

function coincideTipo(v, t) {
  const real = tipoDe(v);
  return real === t || (t === 'number' && real === 'integer');
}

function resolverRef(raiz, ref) {
  if (!ref.startsWith('#/')) throw new Error(`$ref no soportado: ${ref}`);
  return ref.slice(2).split('/').reduce((n, p) => n?.[p], raiz);
}

export function validar(valor, esquema, raiz = esquema, ruta = '$', errores = []) {
  if (esquema.$ref) {
    const destino = resolverRef(raiz, esquema.$ref);
    if (!destino) throw new Error(`$ref sin destino: ${esquema.$ref}`);
    return validar(valor, destino, raiz, ruta, errores);
  }
  if (esquema.type) {
    const tipos = Array.isArray(esquema.type) ? esquema.type : [esquema.type];
    if (!tipos.some((t) => coincideTipo(valor, t))) {
      errores.push(`${ruta}: se esperaba ${tipos.join(' o ')} y es ${tipoDe(valor)}`);
      return errores;
    }
  }
  if ('const' in esquema && valor !== esquema.const) errores.push(`${ruta}: debe valer ${JSON.stringify(esquema.const)}`);
  if (esquema.enum && !esquema.enum.includes(valor)) errores.push(`${ruta}: «${valor}» no está entre ${esquema.enum.join(', ')}`);
  if (typeof valor === 'string') {
    if (esquema.pattern && !new RegExp(esquema.pattern, 'u').test(valor)) errores.push(`${ruta}: «${valor}» no cumple ${esquema.pattern}`);
    if (esquema.minLength !== undefined && valor.length < esquema.minLength) errores.push(`${ruta}: demasiado corto`);
    if (esquema.format === 'uri-absoluta') {
      try { new URL(valor); } catch { errores.push(`${ruta}: «${valor}» no es una URL absoluta`); }
    }
  }
  if (typeof valor === 'number' && esquema.minimum !== undefined && valor < esquema.minimum) errores.push(`${ruta}: menor que ${esquema.minimum}`);
  if (Array.isArray(valor)) {
    if (esquema.minItems !== undefined && valor.length < esquema.minItems) errores.push(`${ruta}: faltan elementos (mínimo ${esquema.minItems})`);
    if (esquema.uniqueItems && new Set(valor.map((x) => JSON.stringify(x))).size !== valor.length) errores.push(`${ruta}: elementos repetidos`);
    if (esquema.items) valor.forEach((x, i) => validar(x, esquema.items, raiz, `${ruta}[${i}]`, errores));
  }
  if (tipoDe(valor) === 'object') {
    for (const r of esquema.required ?? []) if (!(r in valor)) errores.push(`${ruta}: falta «${r}»`);
    const props = esquema.properties ?? {};
    for (const [k, v] of Object.entries(valor)) {
      if (k in props) validar(v, props[k], raiz, `${ruta}.${k}`, errores);
      else if (esquema.additionalProperties === false) errores.push(`${ruta}: propiedad no permitida «${k}»`);
      else if (esquema.additionalProperties && typeof esquema.additionalProperties === 'object') validar(v, esquema.additionalProperties, raiz, `${ruta}.${k}`, errores);
    }
  }
  return errores;
}
