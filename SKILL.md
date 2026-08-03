---
name: the-raw-method
description: >-
  The Raw Method — método de calidad de Raw Logic para construir, auditar y
  mantener software (especialmente con asistencia de IA) con rigor. Úsalo al
  arrancar un proyecto o un bloque de trabajo, al cerrar un tramo (auditoría
  adversaria), o cuando haya que decidir el estándar de calidad, qué modelo de
  IA usar, o cómo dejar la documentación. Construir con principios + auditar de
  forma adversaria + documentar vivo, con reglas que se hacen cumplir solas.
---

# The Raw Method

> **raw / logic — A Thinking Venture.** Pensamos primero. Construimos después. La IA hace lo demás.

> **🟩 Al activarte, anúncialo — una vez por sesión.** Lo primero de tu primera respuesta en la sesión es esta línea, sola: es la confirmación **visible para el humano** de que el método está activo (los hooks del harness la inyectan en el contexto de la IA, pero eso el usuario no lo ve — esta línea sí). Si el `CLAUDE.md` del proyecto ya te indica mostrarla, no la repitas:
>
> `━━━ THE RAW METHOD — ACTIVO EN ESTE PROYECTO ━━━ · Raw Logic | A thinking venture`

Una forma de construir software donde la calidad **no se revisa al final y se reza**: se construye desde la primera línea, la auditoría **asume que algo está mal y trata de romperlo**, y el proyecto **aprende a no repetir sus errores**. Está pensado para que lo ejecuten **agentes de IA** dirigidos por un dueño que **no necesita ser ingeniero**.

Este archivo es la columna. El detalle vive en `referencias/` y las plantillas vacías en `plantillas/` — se cargan cuando hacen falta, no todas de golpe.

---

## La leyenda que gobierna todo (léela primero)

Cada regla del método declara **cómo se hace cumplir**. Hay tres niveles, y la diferencia entre ellos es la idea más importante de todo el método:

- **🤖 Automático** — la computadora lo revisa sola: un test o un candado que **no deja guardar** si algo rompe la regla. Es el único nivel perfecto, porque no depende de que nadie se acuerde.
- **👁 Revisión** — alguien, o una IA, lo controla a propósito y lo firma antes de cerrar. Depende de disciplina, pero es explícita.
- **📖 Memoria** — la regla solo está *escrita*. Eso **es deuda**, no enforcement: la memoria falla. Una regla 📖 que ya causó un problema **sube de nivel en el mismo arreglo** (no basta arreglar el caso: hay que agregar el candado).

**La meta permanente es vaciar la capa 📖.** Cuando un método de calidad vive solo en la memoria de la gente, no se aplica — se olvida. Por eso The Raw Method convierte reglas en candados siempre que puede.

**Y una regla sobre las reglas: "📖 se gana, no se asume."** 📖 no es el default ni el camino de menor resistencia — es una conclusión que hay que *ganarse*. Antes de marcar algo como 📖, el agente **debe**: (a) considerar **en voz alta** si puede ser 🤖 —incluido un candado **parcial/proxy** o un **juez-IA en el loop**, no solo un test perfecto— y dejar escrito *por qué no*; y (b) si aun así queda en 📖/👁, **surfacear al dueño la opción de candado y su costo**, nunca decidirlo en silencio. Ocultar que algo *era* automatizable es el mismo bug que ocultar una debilidad: el dueño no puede pedir un candado que no sabe que era posible.

**Dónde viven los candados 🤖 — en dos planos.** En el **código** (`candados/`, el arnés que frena el `git commit`) y en el **proceso** de la propia IA (`gobernanza/`, hooks del harness — el "Nivel 1"). La gobernanza cierra un hueco que el arnés no toca: que la IA simplemente *no corra el método*. El reflejo del método se inyecta en cada sesión, y un cierre con la ficha sin resolver se rechaza a nivel del harness (no lo evade `--no-verify`). Detalle en `gobernanza/README.md`.

**Aclaración clave cuando un candado necesita una herramienta externa.** Algunos candados 🤖 dependen de una herramienta que **cambia según el proyecto**: un verificador de licencias, o un *arnés de contract testing* (un banco de pruebas que avisa si le cambiaste la forma a un dato que otra pieza ya usa). Que un proyecto **todavía no la tenga** no lo deja afuera del método ni le impone nada — pero **tampoco es un pase libre**. La regla no baja a 📖; se sostiene con dientes:

- **Espera en 👁, con firma independiente.** Hasta que la herramienta se conecte al proyecto (se *cablee*), un revisor **distinto de quien hizo el cambio** —un agente fresco o el propio dueño— revisa la regla a mano y **firma**. Auto-firmar tu propio cambio no cuenta: es la misma independencia que el método exige en el Red Team y las 3 lentes.
- **La deuda vive en un artefacto, no en la memoria.** "Anotada como deuda" significa **en el backlog o en la ley** (con su capa marcada), no una nota suelta — porque una nota suelta *es* 📖, la capa más débil. Ahí entra en la re-auditoría periódica: esa es su cadencia.
- **Tiene un forzante, igual que 📖.** Así como una regla 📖 que ya mordió sube de capa en el mismo arreglo, esta deuda tiene un umbral duro: **antes de producción, o antes de venderle el motor a un segundo cliente, el tooling se cablea o se escala al dueño** (es FONDO). No se gradúa "cuando alguien se acuerde".
- **Dinero y seguridad no se degradan a la ligera.** Para lo que toca plata o seguridad, un par de ojos a mano **no es reposo equivalente** al candado (nadie revisa a mano *todo* el historial de un repo, por ejemplo): degradar exige compensación proporcional —la flota adversaria o el modelo más capaz— y un plazo corto. Y si la regla **ya mordió una vez**, la excepción no aplica: el cableado pasa a ser un pendiente priorizado y escalado, no un 👁 abierto.

En una línea: *"no tengo la herramienta"* es un pendiente **con dueño, artefacto y fecha tope**, nunca un permiso para saltarse la regla. Y antes de todo eso, **el router decide si el pilar siquiera aplica**: a un cambio que no toca lo que ese pilar cuida, no se le exige nada. Así el método corre desde el día uno con o sin tooling — **el tooling es la meta, no el peaje de entrada**.

---

## Las tres patas

El trabajo gira sobre tres momentos. Son un ciclo, no una lista.

1. **Construir con principios** *(antes / prevenir).* Antes de escribir, sabes qué reglas y qué ángulos aplican a lo que vas a hacer. Es un *briefing*, no una corrección tardía.
2. **Auditar** *(al cerrar / verificar).* Se revisa desde varios ángulos con **postura adversaria** (ver abajo). Corren solo los ángulos que el cambio tocó, no todos.
3. **Documentar** *(siempre / persistir).* Registros vivos que se mantienen al día en cada cierre. **Un documento que miente sobre el estado del proyecto es un bug.**

Y el motor que los une: **de cada problema encontrado, una regla — no solo un parche.** Cada hallazgo se destila a una regla que mata la *clase* entera de escenario, y (cuando se puede) a un candado 🤖. Así la auditoría encuentra cada vez menos: lo mecánico ya se previene solo.

---

## Auditar: los tres equipos (🔴 Red · ⚪ White · 🔵 Blue)

Auditar no es un solo lente — son **tres preguntas distintas** que no hay que confundir. Un bloque no está cerrado hasta que pasó los tres equipos (los que apliquen, según el router).

### 🔴 Red Team — ¿está roto?
Auditar **no es buscar lo que se hizo bien**. Es lo contrario: se parte del supuesto de que **algo está mal o se diseñó mal**, y se ataca el código para encontrarlo. El auditor piensa como quien quiere *romper* el sistema, no como quien lo felicita.

Pero hay una segunda cara que evita inflar la lista de problemas: **refutar por defecto.**

- **Al cazar** → asume que está roto. Busca activamente el agujero. No confirmes lo bueno.
- **Al confirmar un hallazgo** → asúmelo *falso* hasta que el código pruebe que es real. Se mira con **las 3 lentes (3 jueces independientes, ortogonales)** y **solo sobrevive lo que 2 de 3 no logran refutar**:
  - **Lente 1 — ¿existe la defensa?** ¿Hay ya un candado o validación que frena esto en el código?
  - **Lente 2 — ¿hay una prueba?** ¿Existe un test que cubra este caso?
  - **Lente 3 — ¿puede pasar de verdad?** ¿El escenario es alcanzable en la práctica, no solo en teoría?

**Y para lo que no es candado sino juicio** —¿sobra esta abstracción? ¿esto confunde?—, que el dueño no-técnico no puede evaluar porque es de código: **la criba**. La IA se hace **muchas preguntas chicas y ortogonales**; si la mayoría concuerda, la sospecha cruza un umbral de confianza, y la IA **va a fondo y determina**. Así el juicio blando deja de ser una **corazonada arbitraria** y pasa a ser un protocolo con señal de confianza —aunque **sigue siendo 👁, no candado 🤖**: depende de que la auditoría se corra. **La IA juzga el código; el dueño decide sobre el hallazgo en lenguaje llano.** (Detalle en `referencias/auditoria-adversaria.md`.)

Lo delicado (dinero, seguridad) se audita en el modo más exigente: **la flota adversaria** — varios agentes de IA atacando el mismo código en paralelo, cada uno por una dimensión distinta, **solo lectura**, refutando por defecto, hasta que dos rondas seguidas no encuentren nada nuevo. Detalle en `referencias/auditoria-adversaria.md`.

**Y la tercera postura, que rige TAMBIÉN fuera de la auditoría — la cadena de una afirmación.** Cazar y refutar disparan al cerrar un bloque; pero la mayoría de las afirmaciones que recibe el dueño nacen ANTES, en medio del flujo (*"esto está inflado"*, *"este bug cuesta $X"*, *"la causa es Y"*), y una afirmación equivocada dicha con confianza hace el mismo daño que un bug: el dueño decide sobre ella. Para esas rige la cadena: **existencia → dirección → magnitud, en ese orden, y el eslabón más barato primero.** ¿El efecto existe (alguien consume ese número, el fenómeno está en los datos)? ¿Va hacia donde digo? Recién entonces: ¿cuánto? Medir la magnitud primero es la trampa clásica — *se siente* como verificar, porque son queries y cifras, pero se puede medir con tres decimales un efecto que no existe. Una afirmación con un eslabón sin cerrar se entrega como **hipótesis**, nunca como dato. (El caso que parió la regla — cuatro caídas en una noche, todas con la misma pata — en `referencias/auditoria-adversaria.md` §2.)

### ⚪ White Team — ¿logramos el objetivo?
Un Red Team verde **no basta**: puede estar todo bien construido y ser **lo que no era**. El White Team sostiene la META y juzga el **resultado contra la intención**: ¿esto logró de verdad lo que se buscaba? Si el *para qué* no quedó claro en el diseño, **se pregunta ANTES de auditar** — no se puede medir un blanco que nunca se definió. Ojo con el **sesgo de retro-ajuste**: fija el objetivo *independiente* de lo ya construido, o se moldea para calzar con el resultado y la auditoría se auto-aprueba. (El nombre viene de los ejercicios de seguridad: el White Team es el árbitro que define el objetivo y juzga si se cumplió.)

### 🔵 Blue Team — ¿lo estamos vigilando?
En producción: **monitoreo y alertas** (el pilar de observabilidad/operabilidad). Que algo **avise** cuando se rompe — que un incidente no dependa de que lo reporte un cliente.

---

## La regla de autonomía (el freno de mano)

El método lo ejecutan agentes de IA. La garantía número uno para el dueño es que **la IA no toma sola una decisión que no le toca.** El corte:

- **FORMA** (cómo se hace algo, reversible, con precedente) → el agente **decide y lo anota** en la Bitácora de decisiones autónomas, para contrastar después.
- **FONDO** (qué se hace: producto, plata, algo irreversible o sin precedente) → el agente **avanza todo lo posible hasta el punto de decisión** y ahí **frena y trae la decisión al dueño**. No la resuelve solo.

Ante la duda de si algo es FORMA o FONDO, se trata como FONDO. Lo irreversible (borrar datos, publicar, gastar, mover dinero) **siempre** frena.

---

## La honestidad proactiva (fortalezas Y debilidades, sin que te pregunten)

El agente **no espera** a que el dueño pregunte *"¿qué tan bueno es esto?"*. En cada entrega dice, **sin que se lo pidan**: qué quedó fuerte, qué quedó débil, y **qué NO está cubierto**. Callar un hueco hasta que el dueño lo descubra —o lo pregunte— es un **bug**: el dueño podría construir encima creyendo que estaba cubierto, sobre una confianza falsa.

Pero **no es puro adversario** —eso desmoraliza y tampoco es honesto—: es **balance**. Regla del 50/50: la mitad es entregar lo que se pidió; la otra mitad es señalar lo que falta, lo que es débil o lo que puede mejorar. Fortalezas reales **y** debilidades reales, las dos cosas, siempre.

**Candado:** ninguna entrega ni cierre está completo sin su renglón de **Fortalezas / Debilidades / Qué falta o puede mejorar** — igual que un reporte de auditoría no está completo sin el *"qué NO se alcanzó a probar"*. Un cierre sin eso se considera **incompleto**, no cerrado. (Es el mismo patrón de la ficha de cobertura: un campo obligatorio que no se puede saltear.) **Ya es un candado 🤖 real:** `gobernanza/raw-gate` y `raw-check` rechazan el cierre si una ficha cerrada no trae las tres secciones (Fortalezas · Debilidades · Qué NO se probó) o si quedaron vacías.

**Y la procedencia de lo que el agente afirma del mundo** (👁 — depende de que el agente lo declare; no se automatiza detectar que un hecho del mundo no fue comprobado). Cuando el agente aporta un dato que **no puede verificar** contra el sistema —una ley, una regla fiscal, un hecho externo—, lo marca como **suyo y sin verificar**, no como verdad establecida. *"Esto lo digo yo, no lo comprobé"* pesa distinto que *"esto lo verifiqué"*. Y si ese dato **resulta falso**, la decisión que se construyó encima **se reabre** — no queda firme sobre un supuesto que se cayó. Es la misma humildad que exige la criba a la IA que juzga código: separar lo que sé de lo que creo.

---

## La claridad primero (el principio de Feynman)

Si el agente no lo puede explicar simple, no lo entendió del todo — y el dueño, que no es ingeniero, necesita entender para dirigir y dar el OK. Por eso *cómo* se lo explica es parte del trabajo, no cortesía.

**Regla operativa:** la primera línea es la **recomendación a aprobar** (la conclusión, no el preámbulo); el sustento va debajo, en capas salteables. Llano y con analogías — la jerga vive en los documentos. Y un piso contra el reflejo de comprimir: *"esencial primero"* no es *"esencial y nada más"* — si hay un **tradeoff material** para el OK, entra aunque alargue.

**El doble filo (por eso agiliza el trabajo, no solo la lectura):** explicar simple obliga al agente a verificar *su propio* entendimiento **antes** de construir, no después. La claridad hacia afuera destapa los huecos hacia adentro.

**Capa: 📖 con 👁 de respaldo.** "Claridad" no se mide con un candado (es semántico); el dueño es el detector — si el agente cae en jerga o entierra la conclusión, se nota al instante. (El residuo "¿faltó un tradeoff material?" es candidato a un juez-IA en el cierre; ver `referencias/candados-y-capas.md`.)

---

## El OK informado (qué te toca revisar)

El cierre termina con el **OK del dueño** (el freno de mano) — pero un OK a ciegas no es un OK. La honestidad proactiva de arriba es el agente juzgando *su propio* trabajo; esto es el otro lado: junto al reporte honesto, el agente le entrega al dueño una lista **corta, priorizada y en su idioma** de lo que *él* puede verificar por su cuenta (mirar una pantalla, probar un flujo, confirmar un número), lo más importante primero. Convierte el OK de un **sello** en una **decisión**.

**Capa: candado 🤖.** Es una sección obligatoria de la ficha de cierre (*"Qué revisar — para el dueño"*), gateada por un marcador de versión (`raw-ficha: v3`) para no romper fichas viejas. Un cierre v3 sin ella —o con la lista vacía— se rechaza, igual que sin el reporte 50/50. (`gobernanza/raw-cobertura.js`.)

---

## Cómo operar cada pata

### Construir (briefing antes de la primera línea)

**La unidad de trabajo es el bloque.** Antes de arrancar, **entiende el objetivo** (el *para qué*): la IA sigue órdenes a ciegas bien, pero sus resultados saltan de nivel cuando entiende qué se busca. Si no está claro, pregúntalo **en el idioma del dueño** —por el resultado que quiere, no por el detalle técnico—, y calibrado: en el diseño del proyecto o del bloque, o cuando la ambigüedad es alta, **no** en cada pedido. Y si el trabajo viene disperso (*"quiero esto, y después esto"*), **propón la estructura de bloques**: la IA da orden —propone, no impone— y el dueño confirma. Bloque chico = ceremonia chica.

1. Lee la **referencia del bloque** (qué se espera, qué imitar de lo que ya funciona, qué descartar) — *spec-first*: el desarrollo nace pegado a lo planificado; los cambios en vivo pulen, no descubren lo ya escrito.
2. Identifica **qué pilares toca** el cambio (ver **el router** de abajo — la guía que, según lo que tocaste, decide qué pilares revisar; para un no-ingeniero: NO es la cajita del wifi) y lee su *briefing de construcción* en `referencias/pilares.md`.
3. Busca el **primitivo/pieza que ya existe** antes de reinventar. Lo específico del cliente va a datos/config, nunca al motor.
4. Si el flujo **reemplaza** a otro, planifica borrar el viejo y sus referencias en el mismo cambio.

### Auditar (al cerrar el bloque = al cerrar un objetivo)
Un bloque cerrado es un objetivo cumplido → corre los **tres equipos**, solo sobre los pilares pertinentes:
1. **⚪ Confirma el OBJETIVO del bloque** (White Team) antes de nada. Si no quedó claro en diseño, pregúntalo ahora, sin moldearlo a lo ya hecho.
2. **Solo los ángulos pertinentes** (router): dinero → seguridad + concurrencia + auditabilidad; pantallas → experiencia + errores; librería nueva → stack.
3. **🔴 Red (¿roto?):** corre cada ángulo con postura adversaria (su forma de atacarlo en `referencias/pilares.md`); cada hallazgo pasa por las **3 lentes (2 de 3)** antes de contar; cada confirmado se destila a **principio + candado** (el motor: de cada problema, una regla — ver `referencias/candados-y-capas.md`), no solo se parchea.
4. **⚪ White (¿objetivo?):** el resultado contra la intención. **🔵 Blue (¿vigilado?):** monitoreo/alertas, si va a producción.
5. Deja el **reporte** honesto: qué se logró, qué quedó corto, y **qué NO se alcanzó a probar**.

### Documentar (en el mismo cierre)
Actualiza, en el mismo cambio que el código: la **ley** (reglas nuevas + su capa de enforcement), el **backlog**, la **bitácora** (qué + por qué), y **cualquier doc que el cambio dejó desfasado**. Ecosistema completo en `referencias/documentos-vivos.md`.

---

## El router: qué dispara cada pilar

No se revisan los 16 pilares en cada cambio — sería teatro. El **router** mira **qué tocaste** y prende solo los pilares pertinentes, tanto para el *briefing* al construir como para los ángulos al auditar. Lee la fila de la señal que aplica y suma los pilares que prende. Si varias filas aplican, se suman (sin repetir).

| Señal / tipo de cambio | Pilares que se disparan |
|---|---|
| Toca **dinero** (cobros, pagos, saldos, precios) | Seguridad · Concurrencia · Rastro |
| Toca **stock/inventario** | Concurrencia · Rastro · Aguante |
| **Agrega o cambia una pantalla** | Experiencia de uso · Errores |
| **Agrega una consulta a una tabla que crece** | Aguante |
| Toca una **migración o la estructura de datos** | Ciclo de Vida del Dato · Rastro |
| **Guarda, compara o muestra fechas/horas** o montos formateados | Ciclo de Vida del Dato |
| **Guarda datos personales** (de una persona) | Privacidad |
| El cambio **sale a producción** | Release / Rollback |
| **Agrega una librería o dependencia** | Stack |
| El cambio **llama a un servicio externo** (banco, pasarela, WhatsApp, sync) | Errores / Observabilidad |
| Toca una **API, evento o dato que otra pieza consume** | Compatibilidad de Contratos |
| Toca un **umbral, límite o config** | Configurabilidad |
| El producto **usa una IA** (cara al cliente, o asistiendo procesos internos) | Seguridad de la IA de Producto |
| Toca **arquitectura** (cómo se organizan las piezas) | Orden y claridad |
| **Modela un concepto del negocio** (terminología, un documento del dominio) | Hablar el idioma del negocio |
| **TRANSVERSAL — siempre, en todo cambio** | Tests + Documentar |

Los dos transversales no son opcionales: **todo cambio** deja su prueba y sus documentos al día, prenda o no cualquier otra fila.

---

## Qué modelo de IA usar (resumen)

El más caro no se usa para todo; el más barato no toca lo delicado. **Esfuerzo proporcional al downside (lo que pasa si sale mal).**

| Rol | Tarea |
|---|---|
| **El obrero veloz** | Refactor mecánico · redactar docs/commits |
| **El caballo de batalla** | Construir el día a día · explorar código · barridos de auditoría |
| **El ingeniero estructural** | Arquitectura · concurrencia · "¿aguanta si crece?" |
| **El consultor eminente** (el diagnosticador estrella) | Decisión de producto/lógica de alto impacto · debugging difícil |
| **La flota adversaria** | Auditar dinero o seguridad (Red Team) |

Qué ID de modelo es cada rol → ver `referencias/modelos-ia.md` (se actualiza cuando salen modelos nuevos).

Regla dura: **lo que toca dinero lo cierra el modelo más capaz**, nunca uno más liviano por su cuenta. Tabla completa (incluye quién escribe tests y quién toca migraciones) en `referencias/modelos-ia.md`.

---

## El dial: cuánta ceremonia (proporcional al downside)

El rigor no es fijo — es una **perilla** que girás según lo que está en juego. No es un juicio que la IA
adivina cada vez: lo decidís vos, por bloque.

| Posición | Cuándo | Qué corre |
|---|---|---|
| **liviano** | pantalla interna, cambio de una línea, nada irreversible | ficha + una pasada de auditoría (agente fresco) |
| **normal** *(default)* | el día a día | los 3 equipos sobre los pilares que prende el router |
| **a fondo** | toca dinero, seguridad, o algo irreversible | la **flota adversaria** (varios agentes, solo lectura, loop-hasta-secar) + el modelo más capaz |

Regla dura: **dinero y seguridad no bajan de "a fondo"** por tu cuenta. La escalera de construcción
(YAGNI → reusar → stdlib → una línea) corre SIEMPRE, en cualquier posición: menos ceremonia de auditoría
NO es permiso para sobre-construir.

---

## Definición de Hecho (cuándo algo está TERMINADO)

"Terminado" es la pregunta más ambigua y la que más plata cuesta si se responde flojo. Algo está hecho cuando:

- [ ] Compila, pasa el linter (corrector de estilo automático) y el build (armado final del programa), **en verde** (sin errores).
- [ ] Tiene un **test que reproduce el escenario** (y, si arregla un bug, un test de regresión que lo cazaría de nuevo).
- [ ] Los **candados 🤖 pertinentes** pasan (el arnés vive en `candados/`; el enforce a nivel host, en `gobernanza/`); lo que no se pudo automatizar quedó **revisado 👁 y registrado**.
- [ ] La **auditoría adversaria** de los ángulos tocados corrió, y sus hallazgos están cerrados o anotados.
- [ ] Si es UI: **verificado en el navegador** (hay errores que el compilador no caza).
- [ ] Los **documentos** quedaron al día en el mismo cambio.
- [ ] **El dueño dio el OK** para cerrar (el cierre no se declara solo).

---

## Los ángulos que revisa (pilares)

Cada pilar tiene un nombre en llano + su término técnico, y trae *qué chequea*, *briefing de construcción* y *cómo atacarlo (auditoría adversaria)*. Detalle en **`referencias/pilares.md`**.

1. **Orden y claridad** — Arquitectura & Mantenibilidad
2. **Seguridad** — Ciberseguridad & Secretos
3. **Experiencia de uso** — UX / UI
4. **Que dos cosas a la vez no se pisen** — Idempotencia & Concurrencia
5. **Fallar con aviso claro, no en silencio** — Manejo de Errores & Observabilidad
6. **Todo deja rastro y nada se borra** — Auditabilidad & Trazabilidad
7. **Todo se puede ajustar y apagar** — Configurabilidad
8. **Aguantar cuando crece** — Escalabilidad & Operabilidad
9. **Usar la versión nueva, no la de memoria** — Contemporaneidad del Stack
10. **Hablar el idioma del negocio** — Familiaridad de Dominio
11. **Probar de verdad, no solo el camino feliz** — Testing & Verificación
12. **Fallar con datos, no con datos personales** — Privacidad & Cumplimiento
13. **Publicar sin miedo y poder deshacerlo** — Release, Despliegue & Rollback
14. **Cuidar el dato como si fuera irreversible** — Ciclo de Vida del Dato
15. **Auditar la IA que usa el producto** (al cliente y por dentro) — Seguridad de la IA de Producto
16. **No romperle la forma a quien te consume** — Compatibilidad de Contratos

> Los pilares 11–16 salieron de la auditoría adversaria del propio método: eran huecos de clase. No todos aplican a todo proyecto — el router decide cuáles. El 16 (compatibilidad hacia afuera) es el más reciente: los otros 15 miran la calidad hacia adentro de una pieza; este cuida el borde entre piezas.

---

## Índice: referencias, plantillas y kit operativo

- `referencias/pilares.md` — los 16 ángulos con briefing + cómo atacarlo (auditoría adversaria).
- `referencias/auditoria-adversaria.md` — cómo se corre el Red Team: postura, 3 lentes, **la criba**, flota, loop-hasta-secar, formato de reporte.
- `referencias/modelos-ia.md` — qué modelo para qué tarea, con analogías.
- `referencias/documentos-vivos.md` — el ecosistema de documentos y para qué sirve cada uno.
- `referencias/candados-y-capas.md` — las 3 capas de enforcement y cómo se construye un candado.
- `referencias/fichas-de-ataque.md` — patrones grep-ready por clase de bug (regex + Vulnerable + Seguro), para que la auditoría sea determinista, no solo juicio.
- `plantillas/` — plantillas VACÍAS para arrancar un proyecto nuevo (la ley, la ficha de cobertura, el arranque de sesión, la bitácora, el backlog y las decisiones autónomas). Un proyecto nuevo empieza vacío y las llena solo, a medida que aprende (el motor: de cada problema, una regla — ver `referencias/candados-y-capas.md`).
- `comandos/cerrar-bloque.md` — el ritual de cierre paso a paso (las 3 auditorías → ficha resuelta → documentos al día → reporte honesto → OK del dueño). Sirve como slash-command o como checklist.
- `comandos/auditar.md` — el Red Team **solo lectura** (allowed-tools sin Write/Edit): la flota no puede modificar lo que audita. Invariante técnico, no promesa.
- `candados/` — el arnés reusable que corre en el `git commit`: `conformance.test.ts` (candados genéricos), `candado-plantilla.ts` (el molde) y `pre-commit.sample` (el hook de git).
- `gobernanza/` — el candado del PROCESO (Nivel 1): hooks a nivel del harness que hacen que seguir el método deje de ser opcional para la IA. `raw-session.js` inyecta el reflejo en cada sesión; `raw-gate.js` rechaza `git commit` si una ficha cerrada quedó sin resolver (no lo evade `--no-verify`). Ver `gobernanza/README.md`.

---

## Cómo se usa este método en un proyecto nuevo (para el dueño)

No heredas las reglas específicas de otro proyecto — heredas **la máquina que las genera**. Arrancas con las plantillas vacías y, cada vez que la auditoría encuentra algo, esa lección se vuelve una regla tuya con su candado. En pocas semanas tu proyecto tiene su propia ley, hecha a su medida, sin que nadie la haya tenido que recordar.

### Arranque día 1 (el huevo y la gallina)

Hay una trampa al empezar: el motor teje la ley propia *a partir de* lo que la auditoría encuentra, pero el día 1 **la ley arranca vacía** — no hay nada tejido todavía. Se resuelve así, en orden:

1. **Copia las plantillas** vacías de `plantillas/` al proyecto nuevo (la ley, la ficha de cobertura, el arranque de sesión, la bitácora, el backlog y las decisiones autónomas).
2. **Escribe la arquitectura + el diccionario base** del bloque 1 desde su spec — antes de la primera línea de código, deja por escrito cómo se organizan las piezas y qué significa cada término del negocio.
3. **Usa los 16 pilares (vía la ficha de cobertura) como LEY PROVISIONAL** — mientras tu ley propia esté vacía, los 16 pilares son tu piso: la vara mínima que reemplaza a las reglas que todavía no existen.
4. **Construye con el briefing** de los pilares que prende el router para ese bloque.
5. **Recién ahí corre el motor** (auditar → reglas): los primeros hallazgos empiezan a tejer tu ley propia, que de a poco reemplaza al piso provisional con reglas hechas a tu medida.

*The Raw Method · Raw Logic · No fluff. No licenses. No surprises.*
