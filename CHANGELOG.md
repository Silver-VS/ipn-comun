# Cambios

Versionado semántico: un cambio de clave de texto o de token semántico es una versión mayor.

## 0.1.0 (2026-10-05) — semilla

- Tokens en tres capas (DTCG): primitivos, semánticos claro/oscuro y tipografía/espaciado; `dist/tokens.css`
  con `--ipn-*`, modo oscuro por `prefers-color-scheme` y `data-tema`.
- Capas de alias temporales para IPN-tools (`--bg`, `--accent`…) y Folio (`--bg`, `--ac`…).
- `js/texto.js`: `t()` con variables, plurales ICU mínimos, saneo de HTML y caída a `es`; `js/tema.js`.
- Textos comunes en TOML (`contenido/textos/comun.es.toml`, versión 2026.10.1), voz editorial y glosario.
- Catálogos de datos con esquema: unidades (UPIITA, ESCOM, UPIBI), categorías y registro de prefijos de almacenamiento.
- `herramientas/generar.mjs` y `herramientas/verificar.mjs` (esquemas, claves, plurales, voz, contraste AA,
  datos personales, SPDX y `dist/` al día); catálogo visual en `catalogo/index.html`.
- Pendientes: fuentes Noto (`fuentes/LEEME.md`), Web Components (`componentes/LEEME.md`).
