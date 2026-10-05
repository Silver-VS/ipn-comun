# fuentes/

Pendiente (decisión D-b por confirmar): aquí deben ir **Noto Sans** y **Noto Sans Mono** (licencia OFL-1.1) en
formato `.woff2`, junto con su `OFL.txt`, para servirlas desde el propio sitio (sin CDN; funciona sin conexión y no
filtra visitas a terceros).

La sesión 00 no las incluyó porque no se pudo copiar de una fuente verificada sin descargar de un sitio externo.
Cómo completarlo (lo hace el dueño o una sesión con permiso para descargar):

1. Descarga las familias desde el repositorio oficial de Noto Fonts (https://github.com/notofonts) o desde
   https://fonts.google.com/noto y convierte a `.woff2` si hace falta.
2. Guarda `NotoSans-Regular.woff2`, `NotoSans-Bold.woff2`, `NotoSans-Italic.woff2` y `NotoSansMono-Regular.woff2`
   (esos nombres exactos) con `OFL.txt`.
3. `npm run generar`: `dist/fuentes.css` añade solo los `url()` de los archivos que existan.

Mientras tanto, `dist/fuentes.css` declara `@font-face` con `local("Noto Sans")` y la pila de respaldo del sistema
(`--ipn-fuente-texto`) hace el resto. Alternativa si el dueño decide IBM Plex: cambiar los nombres en
`tokens/tipografia.tokens.json` y en `herramientas/generar.mjs`.
