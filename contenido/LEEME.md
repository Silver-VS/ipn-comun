# contenido/

- Qué contiene: textos comunes en TOML (`textos/comun.es.toml`), la voz editorial (`VOZ.md`), la lista de palabras vetadas (`glosario.toml`) y el registro de cambios (`CAMBIOS.md`).
- Quién la edita: quien redacta, sin tocar JavaScript. Los productos tienen sus propios `.toml`; aquí solo va lo que se repite en dos o más.
- Cómo agregar o cambiar un texto: busca la clave en el `.toml`, escribe el texto respetando las variables `{…}`, sube `version`, anótalo en `CAMBIOS.md` y corre `npm run generar && npm run verificar`.
- Cómo se valida: `npm run verificar` revisa formato de claves, versión, variables, plurales, voz y datos personales.
- Licencia: CC0-1.0 (`LICENSE-CONTENIDO`).
