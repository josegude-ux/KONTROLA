# Prueba de impresión real con datos ficticios (17/11/2026)

Rama: lab/visura215-prueba-impresion-ficticia-20261117 (sobre la unión reparto único + PR #99).

Método: Chrome headless (Playwright) abre `control-cargas-prueba3.html` con un `visura_scope` ficticio y 6 cargas inventadas
(`LPFICT001`–`006`) en localStorage. Toda petición que no sea a 127.0.0.1 se aborta (no hubo ninguna). Se pulsa
`#printDelivery` / `#printPlates` y luego `#printReport`, que llama a `printPrepared`. Se intercepta `print()` del iframe
`dedicatedPrintFrame` y ese mismo documento se imprime a PDF con el motor de impresión de Chrome (`@page` incluido).

Resultado:
- Hoja de reparto: 2 repartidores (ANA con frío, mayor peso 1500 kg sobre 800 kg; CARLOS sin frío), 1 incidencia
  (ELENA, peso sin acreditar), CRALM excluido, Ferrol omitido. A4 vertical, 1 página por fecha (1 y 2 páginas).
- Matrículas por peso: 5 cargas ordenadas por peso, total 5800 kg. A4 vertical, 1 página por fecha.
- Las cargas en localStorage quedan idénticas tras imprimir. Sin diálogos ni errores de consola.

Límite: no se prueba un diálogo de impresora física ni Safari/iPhone; sí el documento exacto que se envía a imprimir.
