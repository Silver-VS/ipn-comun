# ipn-comun

Biblioteca compartida de **IPN-tools** e **IPN Folio**: tokens de diseño, textos comunes, catálogos de datos y un
formateador de textos. Sin dependencias en tiempo de ejecución, sin servidor. Versión actual: `0.1.0` (semilla).

## Qué incluye

| Carpeta | Contenido | Licencia |
|---|---|---|
| `tokens/` | Colores, tipografía, espaciado, radios, duraciones y puntos de quiebre (formato DTCG) | CC0-1.0 |
| `contenido/` | Textos comunes en TOML, voz editorial, glosario de palabras vetadas | CC0-1.0 |
| `datos/` | `unidades.json`, `categorias.json`, `almacen.json` y sus esquemas JSON | CC0-1.0 |
| `js/` | `texto.js` (`t()`, plurales, saneo), `tema.js` (claro/oscuro/auto) | MIT |
| `herramientas/` | `generar.mjs`, `verificar.mjs` | MIT |
| `catalogo/` | `index.html`, documentación viva (se abre con doble clic) | MIT |
| `dist/` | Salida generada y versionada en git: `tokens.css`, `tokens.json`, `alias-*.css`, `fuentes.css`, `textos/*` | CC0-1.0 |

No incluye logotipos ni imagen institucional del IPN, ni datos personales.

## Cómo consumirlo

Siempre por **etiqueta fija**, nunca cargando archivos desde otro sitio en tiempo de ejecución.

- Folio (npm): dependencia git fijada a etiqueta, por ejemplo `"@ipn/comun": "github:Silver-VS/ipn-comun#v0.1.0"`;
  se importan `dist/tokens.css` y `js/texto.js`.
- IPN-tools: copiar `dist/` y `js/` de la etiqueta a `vendor/ipn-comun/` con un archivo `VERSION`.
- Un solo `:root` sirve para los dos temas: `<html data-tema="oscuro">` fuerza oscuro, `claro` fuerza claro y sin
  atributo se sigue al sistema.

```js
import { registrar, t } from './js/texto.js';
registrar('es', await (await fetch('dist/textos/comun.es.json')).json());
t('aviso.errores.titulo', { n: 2 }); // «2 errores»
```

## Cómo regenerar y comprobar

Requiere Node 20 o superior (en este equipo: `D:\Tools\nodejs`).

```
npm run generar     # tokens/ y contenido/ -> dist/
npm run verificar   # esquemas, claves, plurales, voz, contraste AA, datos personales, SPDX, dist al día
npm test            # pruebas (node --test)
npm run catalogo    # abre catalogo/index.html
```

`dist/` se versiona; si cambias `tokens/` o `contenido/`, corre `npm run generar` y confirma también `dist/`.

## Cómo cambiar un texto

Busca la clave en `contenido/textos/comun.es.toml`, edita el texto respetando las variables `{…}`, sube `version`,
anótalo en `contenido/CAMBIOS.md` y corre `npm run generar && npm run verificar`. Más en `contenido/LEEME.md`.

## Licencias

Código: MIT (`LICENSE`). Tokens, textos y datos: CC0-1.0 (`LICENSE-CONTENIDO`). Fuentes: OFL-1.1 junto a cada
fuente (pendientes, ver `fuentes/LEEME.md`). Cada archivo lleva su `SPDX-License-Identifier`; los generados, la marca
`GENERADO desde <fuente>; no editar`.
