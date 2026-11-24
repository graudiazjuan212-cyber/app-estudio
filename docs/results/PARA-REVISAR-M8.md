# PARA-REVISAR M8 — autoauditoría

a) **¿Qué queda a medias?** La prueba de Juan en su móvil con `docs/PRUEBA_MOVIL.md`; hasta que la haga, el README no se ha seguido por una persona real. Tampoco se ha probado la instalación desde la dirección pública (aún no hay publicación).

b) **¿Qué pasa con una entrada inválida o ausente?** El README cubre el archivo de paquete que falla (mensaje con pregunta y campo; no se importa nada a medias) y la copia que no sirve (se guarda el estado actual antes de restaurar; «Deshacer última restauración»). Si Juan no tiene archivo de paquete, el README no dice qué hacer más allá de pedirlo al proyecto de la asignatura.

c) **¿Qué podría romperse en otra parte?** El README cita los nombres exactos de los botones. Si se cambia un texto de la interfaz, el README queda desfasado sin que ningún test lo detecte (la comprobación es una búsqueda manual). Conviene repetirla en cada cambio de textos.

d) **La dirección** `https://graudiazjuan212-cyber.github.io/app-estudio/` es la prevista; no existe hasta que Juan autorice el `git push` y active Pages.
