# /cerrar-bloque — el ritual de cierre

> **Comando de The Raw Method.** Se corre cuando un **bloque** se terminó: un objetivo cumplido, una unidad
> de trabajo lista para declararse hecha. Sirve como slash-command de Claude Code o como checklist que tú
> mismo recorres paso a paso.
>
> Un bloque **no se cierra porque el código anda**. Se cierra cuando pasó las tres auditorías, la ficha de
> cobertura quedó resuelta, los documentos quedaron al día y **el dueño dio el OK**. Este comando recorre eso
> en orden, sin saltarse pasos.

**La regla que gobierna todo el ritual:** nada aquí lo declara "cerrado" la IA sola. El comando prepara el
cierre completo y lo deja listo; **el que cierra es el dueño.** (Ver el último paso.)

---

## Antes de arrancar: ¿el objetivo del bloque quedó claro?

Las tres auditorías miden el resultado contra algo. Ese "algo" es el **objetivo del bloque** — el *para qué*,
no la lista de tareas. Antes de auditar nada, revisa:

- ¿Se escribió el objetivo del bloque **en diseño**, antes de construir? Búscalo en la spec del bloque.
- Si **no quedó claro** → 🔴 **pregúntalo AHORA, antes de correr la auditoría.** No se puede medir si llegaste
  a un blanco que nunca se definió.
- 🔴 **Cuidado con el sesgo de retro-ajuste:** fija el objetivo **mirando qué se buscaba, NO qué salió.**
  Si defines la meta después de ver el resultado, la moldeas para que calce y la auditoría se auto-aprueba.
  Primero qué se quería; después qué se logró; nunca al revés.
- Apunta a la **altura correcta**: el objetivo del bloque, no una tarea suelta de adentro ni la meta del
  proyecto entero.

Pregunta de control (en el idioma del dueño, por el RESULTADO, no por lo técnico): **"¿Qué tenía que quedar
funcionando al terminar este bloque, y para qué le sirve eso al negocio?"**

---

## Paso 1 — Las tres auditorías

Son **tres preguntas distintas**, no una. Una puede pasar y las otras fallar. Se corren las tres, cada una
solo sobre **los pilares que el router prendió** para este bloque (no los 16 siempre — eso es teatro).

> Recordatorio de router: tocaste dinero → Seguridad · Concurrencia · Rastro. Tocaste pantallas →
> Experiencia · Errores. Tocaste una tabla que crece → Aguante. Migración → Ciclo de Vida del Dato · Rastro.
> Y los dos transversales, **siempre**: Tests + Documentar.

### 🔴 Red Team — ¿está roto?

El adversario puro. Asume que **algo está mal** y trata de romperlo. Corre sobre los pilares técnicos que
prendió el router.

- **Postura:** al cazar, asume que está roto y busca el agujero; al confirmar un hallazgo, asúmelo **falso**
  hasta que el código pruebe que es real.
- **Filtro de cada hallazgo — las 3 lentes (3 jueces independientes):** sobrevive solo lo que **2 de 3** no
  logran refutar → (1) ¿ya existe una defensa/candado que lo frena? (2) ¿hay un test que lo cubra? (3) ¿puede
  pasar de verdad, no solo en teoría?
- **Quién lo corre:** 👁 un **agente fresco, distinto del que construyó** — quien escribió el código arrastra
  los mismos supuestos y se auto-aprueba.
- **Si el bloque toca dinero o seguridad:** súbelo a **flota adversaria** (varios agentes atacando en paralelo,
  solo lectura, hasta que dos rondas seguidas no encuentren nada nuevo).

**Preguntas clave:** ¿Se pisan dos operaciones a la vez? ¿Una entrada mala rompe algo? ¿Hay un secreto en el
código? ¿El saldo se puede descuadrar? ¿Anular devuelve todo lo que movió?

### ⚪ White Team — ¿logramos el OBJETIVO?

La otra mitad, la que el Red Team **no caza**. Un Red Team en verde solo dice *"nada está roto"* — puede estar
todo bien construido y ser **lo que no era**. Un montón de procesos correctos que no llegan a la meta es una
falla, y la auditoría de correctitud la deja pasar.

- **Qué juzga:** el **resultado contra la intención** del bloque (el objetivo que fijaste arriba). ¿Esto
  resuelve el *para qué*, o resolvió otra cosa parecida?
- **El árbitro:** en los ejercicios de seguridad reales, el White Team es quien define el objetivo y juzga si
  se cumplió — por eso el nombre calza aquí.
- 🔴 **Vigila el retro-ajuste otra vez:** juzga contra el objetivo que se escribió **antes**, no contra una
  meta que acabas de inventar para que el resultado calce.

**Preguntas clave:** ¿El dueño pidió esto o algo parecido? ¿Lo entregado sirve para lo que se buscaba?
¿Quedó a la altura correcta (resuelve el problema del negocio, no solo un pedazo técnico)? ¿Qué parte del
objetivo quedó **corta** aunque el código funcione?

### 🔵 Blue Team — ¿lo estamos vigilando en producción?

Construir bien no basta si nadie se entera cuando se rompe en vivo. Este equipo mira el pilar de
**monitoreo y operación** (observabilidad/operabilidad): que algo **AVISE** cuando falla, en vez de esperar a
que lo reporte un cliente.

- **Cuándo aplica:** cuando el bloque **sale a producción** o toca algo que ya está en vivo. Si el bloque no
  llega a producción todavía, se marca **N/A** con esa nota (N/A es una respuesta, no un salto).
- **Qué revisa:** ¿hay una alerta si esto se cae o se degrada? ¿los errores dejan rastro con identificador
  (y sin datos personales)? ¿sabríamos que pasó **antes** que el cliente?

**Preguntas clave:** Si esto falla a las 3am, ¿algo nos avisa? ¿Dónde miramos para saber que anda bien?
¿Un error queda registrado de forma que se pueda diagnosticar después?

> **De cada hallazgo, una regla — no solo un parche.** Todo lo que confirmen las tres auditorías se destila a
> un principio que mata la **clase entera** del problema, y cuando se puede a un **candado 🤖**. Un 📖 (regla
> solo escrita) que ya causó un problema **sube de nivel en este mismo cierre**: no basta arreglar el caso,
> hay que agregar el candado.

---

## Paso 2 — Resolver la ficha de cobertura

Abre la ficha de cobertura del bloque (`plantillas/ficha-cobertura.md`) y **resuelve cada clave, sin saltarte
ninguna**:

- Cada clave se marca `[x]` **con una nota de CÓMO se cumplió**, o `[x] N/A — <por qué no aplica>`.
- Una clave en `[ ]`, o marcada pero **muda** (sin nota), **no cuenta como cerrada**.
- **N/A es una respuesta que se escribe**, no una clave que se salta. Un bloque de pura pantalla puede marcar
  `N/A` en concurrencia — pero lo dice y explica por qué.

🤖 La lista de claves la impone la **plantilla**, no quien programó — así no se puede "olvidar" un ángulo.
El ideal es un test que **haga fallar el cierre** si el bloque no tiene su ficha o deja una clave muda.

---

## Paso 3 — Actualizar los documentos vivos (en el MISMO cambio)

Los documentos se actualizan **junto con el código del bloque**, no "después". Un documento que miente sobre
el estado del proyecto **es un bug**. En el mismo cambio que cierra el bloque, deja al día:

- **La ley** — las reglas nuevas que nacieron de las auditorías, cada una **con su capa de enforcement**
  (🤖 candado / 👁 revisión / 📖 memoria).
- **El backlog / pendientes** — lo hecho marcado, lo nuevo agregado con fecha.
- **La bitácora** — qué se hizo **y por qué** (las decisiones, no solo el qué).
- **Las decisiones autónomas** — si en el bloque decidiste algún tema de FORMA por tu cuenta, anótalo para
  contrastarlo después.
- **Cualquier doc que el cambio dejó desfasado** — spec, arquitectura, diccionario, runbook. Si el bloque lo
  volvió mentira, se corrige aquí.

---

## Paso 4 — El reporte honesto

El entregable del cierre. No es un "quedó lindo" — es la foto real, fortalezas **y** debilidades, sin que el
dueño tenga que preguntar. Regla del 50/50: la mitad es lo que se entregó; la otra mitad es lo que falta, lo
débil o lo mejorable.

Tres bloques obligatorios (un reporte sin alguno se considera **incompleto**, no cerrado):

1. **Qué se logró** — el objetivo cumplido, los ángulos que se atacaron de verdad, lo que sobrevivió.
2. **Qué quedó corto o débil** — dónde el resultado no llega del todo al objetivo, qué está frágil.
3. **Qué NO se alcanzó a probar** — 🔴 **lo más importante.** La ausencia de hallazgos **no** es prueba de que
   no haya bugs. Di dónde quedaste ciego: rondas capadas antes de secar, áreas sin sondeo en vivo, tipos de
   prueba que faltaron (carga real, resistencia, accesibilidad de punta a punta), residuos para un humano.

> Este reporte es lo mismo que exige la honestidad proactiva del método: **Fortalezas / Debilidades / Qué
> falta o puede mejorar.** Callar un hueco hasta que el dueño lo descubra es un bug — podría construir encima
> creyendo que estaba cubierto.

---

## Paso 4b — La lista de "qué revisar" (el OK informado)

El reporte honesto es el agente juzgándose **a sí mismo**. Falta el otro lado: darle al dueño **qué mirar** para dar el OK sin firmar a ciegas. El agente entrega una lista **corta, priorizada y en el idioma del dueño** de lo que ÉL puede verificar por su cuenta (mirar una pantalla, probar un flujo, confirmar un número), lo más importante primero.

🤖 **En una ficha v3 es una sección obligatoria** (*"Qué revisar — para el dueño"*): `raw-gate`/`raw-check` rechazan el cierre si falta o queda vacía. Convierte el OK del Paso 5 de un **sello** en una **decisión**.

---

## Paso 5 — El OK del dueño (sin esto no hay cierre)

Todo lo de arriba **prepara** el cierre. No lo declara.

- El agente presenta: las tres auditorías corridas, la ficha resuelta, los documentos al día y el reporte
  honesto.
- 🔴 **El cierre lo declara el dueño**, no la IA. Recién con su OK explícito el bloque queda cerrado.
- Esto no es trámite: es el **freno de mano** del método. Lo irreversible o de fondo —cerrar, publicar,
  mover a producción— **siempre** frena y espera al dueño.

---

### Resumen de una línea

Tres auditorías (🔴 ¿roto? · ⚪ ¿logramos el objetivo? · 🔵 ¿lo vigilamos?) → ficha de cobertura resuelta →
documentos al día → reporte honesto → **OK del dueño.** Nada se cierra sin lo último.

*The Raw Method · Raw Logic · No fluff. No licenses. No surprises.*
