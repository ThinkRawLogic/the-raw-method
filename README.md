# The Raw Method

**El método de calidad de Raw Logic** para construir, auditar y mantener software con rigor —
especialmente cuando lo construye una IA dirigida por alguien que no es ingeniero.

> raw / logic — A Thinking Venture. *Pensamos primero. Construimos después. La IA hace lo demás.*

---

## Qué hay acá

- **`SKILL.md`** — la columna del método. Qué es, las tres patas (construir · auditar · documentar), la
  postura adversaria al auditar, la regla de autonomía (el freno de mano), el router de modelos de IA y la
  definición de "terminado". **Empieza por acá.**
- **`SOBRE-THE-RAW-METHOD.html`** — la explicación **en lenguaje llano** para no-ingenieros (la misma que se
  puede compartir como página). Qué hace, cómo, cuándo y para qué.
- **`referencias/`** — el detalle, que se carga cuando hace falta:
  - `pilares.md` — los 16 ángulos que revisa, con briefing de construcción y lentes de auditoría adversaria.
  - `auditoria-adversaria.md` — cómo se corre el Red Team (postura, 3 lentes, la criba, flota, formato de reporte) + **la cadena de una afirmación**, la postura que rige fuera de la auditoría.
  - `correccion.md` — **el protocolo de corrección**: qué se hace DESPUÉS del hallazgo (las tres obligaciones al implementar un arreglo, quién corrige, y el control positivo).
  - `modelos-ia.md` — qué modelo de IA para qué tarea.
  - `documentos-vivos.md` — el ecosistema de documentos y para qué sirve cada uno.
  - `candados-y-capas.md` — las 3 capas de enforcement y cómo se construye un candado.
- **`plantillas/`** — plantillas **vacías** para arrancar un proyecto nuevo (la ley, la ficha de cobertura, el
  arranque de sesión, el backlog, la bitácora, las decisiones autónomas).

---

## La idea de fondo

No heredas las reglas específicas de otro proyecto — heredas **la máquina que las genera**. Un proyecto nuevo
arranca con las plantillas vacías y las va llenando solo: cada vez que la auditoría encuentra algo, esa
lección se vuelve una regla con su candado. En pocas semanas el proyecto tiene su propia ley, hecha a su
medida, sin que nadie la haya tenido que recordar.

Por eso este paquete es **genérico y casi vacío en la capa de reglas**. La versión "llena" de Raw Logic vive
en proyectos reales: son el mismo método apuntado a un proyecto concreto.

---

*Borrador v1 · pendiente de validación. No fluff. No licenses. No surprises.*
