---
name: auditar
description: >-
  Corre la auditoría adversaria (Red Team) sobre un bloque cerrado. La flota
  ataca SOLO LECTURA: este comando no puede escribir, ejecutar ni mutar nada.
  Úsalo al cerrar un bloque, o cuando quieras un pase adversario sobre dinero/seguridad.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git log:*)
  - Bash(git diff:*)
  - Bash(git status:*)
  - Bash(node:*raw-secrets.js*)
  - Bash(node:*raw-deps.js*)
---

# /auditar — el Red Team, solo lectura

> **Comando de The Raw Method.** Corre la auditoría adversaria sobre lo que se acaba de cerrar.
> La regla de oro está **cableada en el frontmatter**: `allowed-tools` NO incluye `Write`, `Edit`,
> ni `Bash` que mute. Un auditor que puede modificar lo que audita ya no es un auditor — es un riesgo.
> Acá esa regla no es prosa 🤖 esperanzada: es una **barrera que el harness impone**. (Es el mismo
> principio de la "flota solo lectura" de `auditoria-adversaria.md §5`, ahora como invariante técnico.)

## Qué hace, en orden

1. **Fijá el objetivo del bloque** (White Team) — el *para qué*, escrito ANTES de construir. Si no quedó
   claro, preguntalo ahora; cuidado con el sesgo de retro-ajuste (`referencias/auditoria-adversaria.md`).
2. **Prendé solo los pilares que el router tocó** (dinero → Seguridad · Concurrencia · Rastro; pantalla →
   Experiencia · Errores; etc.). No los 16 siempre — eso es teatro.
3. **🔴 Red Team — ¿está roto?** Atacá cada ángulo con postura adversaria. Usá las **fichas de ataque
   grep-ready** (`referencias/fichas-de-ataque.md`): corré los greps de las clases pertinentes y revisá
   cada hit. Antes de declarar "todo bien", pasá por las **RED FLAGS** (`auditoria-adversaria.md §0`):
   *"ya encontré suficiente" / "se ve prolijo" / "seguro está cubierto"* son señales de que NO atacaste.
   Cada hallazgo pasa por las **3 lentes** (sobrevive si 2 de 3 no lo refutan).
4. **⚪ White — ¿logramos el objetivo?** El resultado contra la intención, no solo "nada roto".
5. **🔵 Blue — ¿lo vigilamos?** Monitoreo/alertas, si va a producción.
6. **Herramientas ejecutables:** `node gobernanza/raw-secrets.js .` (secretos) y `node gobernanza/raw-deps.js .`
   (lockfiles). Son deterministas — corren igual sin importar tu criterio del día.
7. **Dejá el reporte** en `plantillas/REPORTE-AUDITORIA.md`: hallazgos en clusters con su **ID (RM-00N)**,
   el **Risk Score**, y —lo más importante— **qué NO se alcanzó a probar**.

## Qué NO hace

- No arregla nada (es solo lectura). Los arreglos van en **otro pase y con otro agente** — ni el que auditó
  ni el que construyó el defecto — siguiendo **el protocolo de corrección** (`referencias/correccion.md`:
  las tres obligaciones + control positivo). El que audita entrega el hallazgo y la evidencia, no el parche.
- No declara el bloque cerrado: eso lo hace el **dueño** con su OK (`comandos/cerrar-bloque.md` Paso 5).

## Modo flota (dinero/seguridad)

Para lo delicado, subí a **flota adversaria**: varios agentes en paralelo, uno por dimensión (*finders*),
todos con este mismo `allowed-tools` read-only, hasta que **dos rondas seguidas** no encuentren nada nuevo
(loop-hasta-secar). Agrupá y deduplicá ANTES de verificar. Detalle en `referencias/auditoria-adversaria.md`.

*The Raw Method · Raw Logic · No fluff. No licenses. No surprises.*
