# BRIEF — App de estudio tipo Duolingo para el grado de Juan

Versión 1 · 2026-11-23 · Redactado por Claude (proyecto Universidad de claude.ai). Este documento es la fuente de verdad del producto. Si algo no está claro, se decide con el criterio de la sección 10 y se anota en `docs/DECISIONS.md`.

---

## 1. Contexto y objetivo

Juan estudia el Grado en Ingeniería en Organización Industrial (VIU, online) mientras trabaja. Estudia con Claude en proyectos de claude.ai (uno por asignatura), que generan apuntes, planes de estudio y llevan su progreso en archivos .md en Google Drive.

Falta una cosa: **estudiar en ratos muertos desde el móvil** (5-15 min), sin libreta y sin IA detrás. Objetivo de la app:

> Abrir la app → elegir asignatura → la app sabe qué toca (repasos pendientes + bloque actual) → sesión corta de preguntas cerradas e interactivas → el progreso se guarda y se puede exportar para que Claude lo integre.

Uso: **personal, un solo usuario**. Prioridad: que funcione sin fallos, que sea rápida y cómoda en el móvil y que cueste **0 €**.

Asignaturas actuales (1.er cuatrimestre): Matemáticas I, Fundamentos de Física, Introducción a la Organización de Empresas (IOE), Fundamentos Informáticos (Python, BBDD, SQL) y Expresión Gráfica y DAO. Habrá más (2.º cuatrimestre: Química, Matemáticas II, Materiales, Ampliación de Física, Gestión de la Información). **El contenido nunca va en el código**: entra por paquetes JSON.

## 2. Restricciones duras

1. **Sin IA ni APIs de pago en la app.** Todo es lógica local y preguntas cerradas.
2. **Sin escribir a mano.** Juan está en el móvil sin papel: nada de «resuelve y escribe el resultado». Se pregunta qué fórmula usar, cuál es el siguiente paso, qué resultado es correcto entre opciones, qué está mal en una resolución, ordenar pasos, emparejar, completar huecos con opciones.
3. **Coste 0 €** de alojamiento y mantenimiento.
4. **Offline primero.** Debe funcionar sin cobertura una vez instalada.
5. **Los datos de Juan (contenido y progreso) no se publican.** El repositorio solo lleva código y ejemplos inventados.

## 3. Investigación resumida (por qué se diseña así)

- **Duolingo**: lecciones de pocos minutos, progresión incremental de fácil a difícil, objetivo diario elegible (5-20 min), rachas y puntos como motivación, y práctica personalizada a intervalos crecientes. Se toma: sesiones cortas, objetivo diario, racha, progreso visible. **Se descarta**: ligas, competición social, vidas/corazones que bloquean el estudio (castigan y no enseñan).
- **Ciencia del aprendizaje** (skills `teach` de M. Pocock y `teach-me` de citypaul, ambas MIT): práctica de recuperación, espaciado e intercalado; distinguir fluidez momentánea de retención a largo plazo; preguntar la confianza para detectar «puntos ciegos» (fallar estando seguro), que son lo prioritario; feedback inmediato; opciones de test sin pistas (misma longitud, posición variable, distractores basados en errores reales).
- **Algoritmo de repaso**: FSRS (Free Spaced Repetition Scheduler), el estándar abierto actual, usado por Anki y otras apps. Librería `ts-fsrs` (MIT, TypeScript, implementa FSRS-6).
- **PWA en móvil**: viable y gratis. Riesgo conocido en iPhone: Safari puede borrar el almacenamiento de webs no usadas; las apps añadidas a la pantalla de inicio están exentas en la práctica, y `navigator.storage.persist()` pide almacenamiento persistente. Mitigación obligatoria: instalarla en la pantalla de inicio, pedir `persist()`, y **copia de seguridad exportable** con recordatorio semanal.

## 4. Arquitectura recomendada (Claude Code puede mejorarla justificándolo en DECISIONS.md)

| Pieza | Elección | Motivo |
|---|---|---|
| Tipo de app | **PWA** (web instalable) | Un solo código para Android/iPhone, sin tiendas, gratis |
| Front | Vite + React + TypeScript estricto | Estándar, rápido, buen soporte de Codex |
| Estilos | CSS Modules o Tailwind (elegir uno) | Sin librerías de componentes pesadas |
| Datos | IndexedDB con **Dexie** | Base de datos local en el propio móvil, sin servidor |
| Validación | **zod** | Rechazar paquetes mal formados con mensajes claros |
| Repaso | **ts-fsrs** | FSRS-6 probado |
| Matemáticas | **KaTeX** | Fórmulas en enunciados y opciones (`$...$`, `$$...$$`) |
| Código | Resaltado ligero (p. ej. Shiki precompilado o Prism) para Python/SQL | FI |
| Offline/instalación | `vite-plugin-pwa` (Workbox) | Service worker y manifest |
| Tests | Vitest (dominio) + Playwright (E2E, viewport móvil) | |
| Alojamiento | **Sitio estático gratuito** (GitHub Pages o Cloudflare Pages) | Ver sección 9 |

**No hay backend.** El ordenador Linux de 4 GB de RAM de Juan NO es necesario: el móvil guarda todo. (Queda como opción futura para sincronizar si algún día hiciera falta.)

## 5. Funcionalidad (v1)

### 5.1 Pantalla de inicio (menú)
- Lista de asignaturas con: barra de progreso global, repasos pendientes hoy y último día estudiado.
- Racha de días y objetivo diario (5 / 10 / 15 min, elegible).
- Botón principal por asignatura: **«Estudiar»** (sesión automática).
- Ajustes: importar paquete, exportar progreso, copia de seguridad, restaurar, duración de sesión, tema claro/oscuro.

### 5.2 Dentro de una asignatura
- Capítulos con su **barra de progreso** (misma fórmula que las normas de Claude, sección 7).
- Bloques de cada capítulo con estado: pendiente / en curso / dominado / graduado, y bloqueados si dependen de otro no dominado (`requiere`).
- Botones: «Estudiar» (automático), «Repasar capítulo», «Mini examen de capítulo».

### 5.3 Sesión de estudio (el núcleo)
Orden de construcción de una sesión (duración objetivo elegida):
1. **Puntos ciegos** pendientes (fallos con confianza alta).
2. **Repasos vencidos** según FSRS.
3. **Bloque actual**: primero tarjetas informativas si es nuevo, luego preguntas de menor a mayor dificultad.
4. Si sobra tiempo: preguntas de otros bloques ya vistos, **intercaladas** sin indicar de qué capítulo son.

Flujo de cada pregunta: enunciado → Juan elige respuesta → **confianza** en 3 botones (Duda / Bastante seguro / Seguro), preguntada antes de comprobar → feedback inmediato: correcto/incorrecto, explicación, y si la opción elegida tiene `feedback` asociado (error típico) se muestra. Botón «No lo sé» (cuenta como fallo, sin confianza).

Mapeo a FSRS: fallo → Again; acierto con Duda → Hard; acierto con Bastante → Good; acierto con Seguro → Easy. Fallo con «Seguro» = **punto ciego** (marcado aparte).

Fin de sesión: resumen (aciertos, puntos ciegos, % de capítulos que cambian), racha actualizada.

### 5.4 Progreso y dominio (alineado con las normas de Claude)
- Peso de bloque: básico 1 · intermedio 3 · tipo examen 5.
- **Bloque dominado** = en **2 días distintos**, al menos el 80 % de sus preguntas evaluables respondidas bien sin «No lo sé» y sin fallos con confianza alta ese día. Si luego se falla en repaso, vuelve a «en curso».
- **Graduado** = dominado y con 3+ repasos seguidos acertados con confianza «Seguro».
- **% capítulo** = suma de pesos de bloques dominados (o graduados) / suma de pesos de todos los bloques. Es duro a propósito: lo fácil suma poco.
- **Mini examen de capítulo**: 2 del capítulo actual + 1 del anterior + 1 de uno anterior + 1 que relacione (si el paquete marca preguntas `relaciona`); 80 % para darlo por superado. Se registra.

### 5.5 Tipos de pregunta (todos de respuesta cerrada)
| Tipo | Descripción | Ejemplo |
|---|---|---|
| `info` | Tarjeta informativa (no evalúa) | Definición de norma de un vector |
| `flashcard` | Anverso/reverso; Juan se autoevalúa (Otra vez / Difícil / Bien / Fácil) | Concepto de IOE |
| `test` | Una correcta entre 3-5 opciones | ¿Qué fórmula da el ángulo entre vectores? |
| `multi` | Varias correctas | ¿Cuáles son cuádricas con centro? |
| `vf` | Verdadero/falso | |
| `ordenar` | Ordenar pasos arrastrando o tocando | Pasos de la descomposición LU |
| `emparejar` | Unir pares | Cónica ↔ ecuación |
| `huecos` | Texto con huecos; cada hueco con sus opciones | Completar una fórmula o una consulta SQL |
| `error` | Se muestra una resolución con pasos; elegir el paso incorrecto | Resolución con un signo mal |

Todo texto admite Markdown + LaTeX (KaTeX) + bloques de código. Imágenes opcionales (URL relativa dentro del paquete como base64 o, en v2, ZIP).

### 5.6 Importar contenido
- Botón «Importar paquete»: selector de archivo (desde Archivos/Drive del móvil) o pegar JSON.
- Validación con zod; errores en español indicando qué falla y dónde.
- Importar una versión nueva de un capítulo **conserva el progreso** de las preguntas cuyo `id` se mantiene; las nuevas entran como nuevas; las eliminadas se archivan (no se borra su historial).

### 5.7 Exportar progreso (para Claude) y copias de seguridad
- **«Exportar progreso para Claude»**: genera `progreso_<asignatura>_<AAAA-MM-DD>.json` (formato en 6.2) y lo comparte con la hoja de compartir del móvil (Web Share API) o lo descarga. Juan lo sube a Drive y el proyecto de la asignatura lo lee.
- **Copia de seguridad completa** (todo IndexedDB a un JSON) y **restaurar**. Recordatorio si han pasado 7 días sin copia.
- Al primer uso: pedir `navigator.storage.persist()` y mostrar si el almacenamiento es persistente; guía de instalación en la pantalla de inicio (Android e iPhone).

### 5.8 Diseño
- Móvil primero, una mano, objetivos táctiles grandes (≥ 44 px), tipografía legible, alto contraste, modo oscuro.
- Animaciones breves y feedback claro (verde/rojo + icono + texto, nunca solo color).
- Interfaz en español de España. Sin sonidos por defecto.
- Rendimiento: carga inicial < 2 s en un Android medio; sesión fluida con 2.000+ preguntas importadas.

## 6. Formatos de intercambio (contrato con los proyectos de Claude)

### 6.1 Paquete de contenido — `estudio-pack/1`
Un archivo por capítulo. Lo generan los proyectos de asignatura de claude.ai. Claude Code debe publicar la especificación final en `docs/FORMATO_PAQUETE.md` (con JSON Schema exportado desde zod) para que Juan se la pase al proyecto Universidad.

```json
{
  "schema": "estudio-pack/1",
  "asignatura": { "id": "mat1", "nombre": "Matemáticas I" },
  "capitulo": { "id": "mat1-c02", "numero": 2, "titulo": "Geometría analítica: vectores y cónicas" },
  "version": 3,
  "generado": "2026-11-23",
  "bloques": [
    {
      "id": "mat1-c02-b01",
      "titulo": "Norma y producto escalar",
      "peso": 1,
      "requiere": [],
      "items": [
        { "id": "mat1-c02-b01-i01", "tipo": "info", "titulo": "Norma", "cuerpo": "$\\|v\\| = \\sqrt{v_1^2+v_2^2}$" },
        {
          "id": "mat1-c02-b01-i02",
          "tipo": "test",
          "enunciado": "¿Cuál es la norma de $v=(6,8)$?",
          "opciones": [
            { "texto": "$10$", "correcta": true },
            { "texto": "$14$", "correcta": false, "feedback": "Has sumado componentes: la norma es la raíz de la suma de cuadrados." },
            { "texto": "$100$", "correcta": false, "feedback": "Falta la raíz cuadrada." }
          ],
          "explicacion": "$\\sqrt{36+64}=\\sqrt{100}=10$",
          "etiquetas": ["calculo"],
          "fuente": "Clase 23/11"
        }
      ]
    }
  ]
}
```
Reglas: `id` estables y únicos (el progreso se cuelga de ellos); `peso` ∈ {1,3,5}; `requiere` = ids de bloques; opciones barajadas por la app (el paquete no fija la posición); `relaciona: true` opcional en ítems que conectan capítulos.

### 6.2 Exportación de progreso — `estudio-progreso/1`
```json
{
  "schema": "estudio-progreso/1",
  "exportado": "2026-11-30T21:10:00+01:00",
  "asignatura": "mat1",
  "sesiones": [{ "fecha": "2026-11-29", "minutos": 12, "preguntas": 18, "aciertos": 14 }],
  "capitulos": [
    {
      "id": "mat1-c02", "porcentaje": 37,
      "bloques": [
        { "id": "mat1-c02-b01", "estado": "dominado", "dias_dominio": ["2026-11-25", "2026-11-28"], "proximo_repaso": "2026-12-04" }
      ]
    }
  ],
  "puntos_ciegos": [{ "item": "mat1-c02-b03-i05", "enunciado_corto": "Proyección de u sobre v", "fecha": "2026-11-29" }],
  "fallos_recurrentes": [{ "item": "mat1-c02-b02-i03", "fallos": 3 }]
}
```

## 7. Hitos sugeridos (Claude Code los ajusta en PLAN.md)
- **M0** Andamiaje: proyecto, lint, tests, `npm run check`, PWA base, layout móvil, CI local.
- **M1** Esquema `estudio-pack/1` con zod + importación + 2 paquetes de ejemplo inventados (Matemáticas y una asignatura de texto) + `docs/FORMATO_PAQUETE.md`.
- **M2** Almacenamiento Dexie + migraciones + persistencia + copia de seguridad/restauración.
- **M3** Renderizado de todos los tipos de pregunta + KaTeX + código.
- **M4** Dominio: FSRS por ítem, dominio de bloques, % de capítulo, constructor de sesión, confianza y puntos ciegos (lógica pura con tests exhaustivos).
- **M5** Pantallas: inicio, asignatura, sesión, resumen, ajustes. Racha y objetivo diario.
- **M6** Exportación `estudio-progreso/1` + compartir.
- **M7** Offline completo, guía de instalación, aviso de actualización, comprobación de persistencia.
- **M8** Publicación en el alojamiento elegido + README para Juan (cómo instalar, importar, exportar).
- **M9** Pulido: E2E de los flujos principales, accesibilidad, rendimiento, modo oscuro.

## 8. Criterios de aceptación de la v1
- Juan instala la app en su móvil, importa un paquete, hace una sesión de 5 min offline, cierra, vuelve otro día y la app le propone los repasos correctos.
- Reimportar una versión nueva del paquete no pierde progreso.
- La exportación de progreso valida contra el esquema y la entiende un humano.
- Copia de seguridad + restaurar en otro navegador reproduce el mismo estado.
- `npm run check` y los E2E pasan; sin errores en consola.

## 9. Alojamiento y dispositivo (DECIDIDO por Juan, 2026-11-23)
- **Móvil de Juan: Android.** Probar con Chrome Android (viewport móvil en Playwright con perfil Android) e instalación como PWA desde Chrome. iPhone no es objetivo de la v1 (no romperlo, pero no priorizarlo).
- **Alojamiento: GitHub Pages** en la cuenta de GitHub de Juan, con despliegue automático por GitHub Actions. Repo público (no contiene datos personales; Pages en repos privados exige plan de pago). Comprobar con `gh auth status` que la cuenta está conectada; si no, pedir a Juan `gh auth login`.
- Mientras no haya cuenta conectada: desarrollar y probar en local (`npm run dev -- --host` para abrirlo desde el móvil en la misma Wi-Fi) y dejar el despliegue preparado.
- El PC Linux de 4 GB no se usa en v1.

## 10. Criterio para decidir sin preguntar
Por orden: 1) que Juan no pierda datos; 2) que funcione offline en el móvil; 3) simplicidad (menos piezas, menos dependencias); 4) que encaje con las normas de estudio de Claude (secciones 5.3-5.4); 5) estética. Ante la duda, la opción más simple que cumpla la v1, anotada en `docs/DECISIONS.md`.

## Fuentes
- Duolingo, método y diseño: blog.duolingo.com/duolingo-teaching-method; análisis de producto en uxplanet.org y medium.com (product-breakdown).
- Skills de enseñanza: github.com/mattpocock/skills (skills/productivity/teach), github.com/citypaul/dotfiles (teach-me).
- FSRS: github.com/open-spaced-repetition/ts-fsrs.
- Almacenamiento PWA en Safari/iOS: webkit.org (Updates to Storage Policy), bugs.webkit.org.
- Plugin Codex para Claude Code: github.com/openai/codex-plugin-cc.
