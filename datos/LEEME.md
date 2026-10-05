<!-- SPDX-License-Identifier: CC0-1.0 -->
# datos/

- Qué contiene: catálogos compartidos de IPN-tools e IPN Folio (`unidades.json`, `categorias.json`, `almacen.json`) y sus esquemas JSON en `esquemas/`.
- Quién la edita: el dueño o cualquier agente en una rama; cada cambio sube `version` y se anota en `contenido/CAMBIOS.md`.
- Cómo se valida: `npm run verificar` (esquemas, y que no haya correos, boletas, CURP ni campos de datos personales).
- Reglas: ningún dato personal, ningún logotipo; las listas por producto se derivan de aquí (por ejemplo, `productos.electivas.disponible`).
- Licencia: CC0-1.0 (`LICENSE-CONTENIDO`). `categorias.json` se copió de `ipn-tools/data/categorias.json`; mientras IPN-tools no consuma esta copia, el original manda y hay que sincronizar a mano.
