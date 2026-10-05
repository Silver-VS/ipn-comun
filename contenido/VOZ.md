<!-- SPDX-License-Identifier: CC0-1.0 -->
# Voz editorial

Copia de la Parte A de `coordinacion/ipn-folio/diseno/copys-v1-codex.md` (2026-10-05). La fuente sigue siendo ese
archivo hasta que el dueño apruebe moverla aquí; la voz aplica a todos los productos (IPN-tools e IPN Folio).

## Reglas de voz

1. **Hablar de tú, con respeto y sin exceso de confianza.** El tuteo permite dar instrucciones directas y naturales
   al alumnado: «Puedes seguir escribiendo», «Revisa el nombre del archivo». No alternar con usted. Evitar bromas,
   diminutivos, entusiasmo forzado y personificar el software («No encuentro esta imagen»). Las casillas pueden usar
   primera persona cuando expresen una elección: «Pedir que me explique…».
2. **Nombrar la acción o el estado con precisión.** Los botones comienzan con un verbo: «Descargar», «Importar»,
   «Copiar». Los estados describen lo que ocurre: «Descargando», «Guardado en este equipo». Mayúscula inicial, sin
   títulos completos en mayúsculas. Un mismo nombre para cada función en todas las pantallas.
3. **Escribir lo necesario para decidir y actuar.** Botones de dos a cinco palabras; ayudas de una o dos oraciones
   breves. Ampliar el texto cuando haga falta explicar un error, una descarga o el destino de los datos. Conservar
   nombres de archivo, unidades, rutas y marcadores.
4. **Explicar los errores sin culpar y con una acción concreta.** Qué ocurrió, qué efecto tiene y cómo corregirlo.
   Evitar «Algo salió mal», «Error inesperado» y mensajes técnicos sin explicación.
5. **Hablar de las descargas antes de iniciarlas.** Qué se descarga, cuánto pesa y para qué sirve. Los tamaños son
   variables del texto (`{megas}`), nunca cifras fijas. Durante la descarga, mostrar el avance y las acciones posibles.
6. **Explicar la IA y el guardado según su funcionamiento real.** «Copiar para IA» copia texto al portapapeles: no lo
   envía ni obtiene respuesta. Evitar promesas generales de privacidad que dependan de decisiones de la persona.
7. **Usar vocabulario cotidiano y términos del IPN.** «Unidad académica», «alumnado», «boleta», «equipo», «guardar»,
   «descargar», «sincronizar». Evitar «kernel», «token», «clave API», «runtime» y «backend» en el recorrido
   principal; reservar los términos técnicos para opciones avanzadas, con su explicación.

## Ejemplos

| Tipo | Ejemplo | Criterio |
|---|---|---|
| Bueno | No se pudo actualizar el PDF. Agrega la imagen a la carpeta imagenes o corrige su nombre en el código. | Explica el efecto y ofrece acciones concretas. |
| Bueno | El compilador se descarga una sola vez y pesa unos {megas} MB. Después puedes compilar sin conexión. | Explica el tamaño (variable) y el beneficio. |
| Malo | ¡Ups! Tu PDF se nos rebeló. | Personifica el software y no indica qué hacer. |
| Malo | Envía todo a nuestra IA: tus datos nunca salen de tu equipo. | Atribuye una función inexistente y promete una privacidad incompatible. |

## Cómo se aplica

`contenido/glosario.toml` guarda la lista de palabras vetadas y `npm run verificar` la comprueba en
`contenido/textos/`. Las heurísticas (botones de hasta cinco palabras, sin TODO EN MAYÚSCULAS) también corren ahí.
