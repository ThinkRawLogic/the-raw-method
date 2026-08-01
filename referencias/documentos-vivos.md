# Documentos vivos — el ecosistema de registros

Un proyecto que se construye con The Raw Method no vive solo en el código. Vive también en un conjunto de documentos que **cuentan la verdad del proyecto**: qué reglas no se violan, cómo está pensado, qué falta, qué se decidió y por qué, qué se probó y qué no.

La palabra clave es **vivos**. No son documentos que se escriben una vez y se olvidan. Se mantienen al día en el mismo momento en que cambia el código. Un documento que dice algo que ya no es cierto no es "documentación vieja" — es un **bug**, igual que una línea de código rota.

Este archivo explica cada documento del ecosistema: **qué es** y **para qué sirve**. Al final están las tres reglas que valen para todos.

---

## Antes de empezar: en un proyecto nuevo, todo esto arranca VACÍO

No heredas los documentos llenos de otro proyecto. Heredas la **lista de qué documentos deben existir** y las **plantillas de arranque** que viven en la carpeta `plantillas/`. Hay una plantilla por cada documento base: la ley, la ficha de cobertura, el prompt de arranque, el backlog, la bitácora, las decisiones autónomas, la arquitectura, la spec de bloque, el diccionario de datos, el reporte de auditoría, la ley de sesión, el glosario, el threat model, el postmortem, el runbook de cliente nuevo, el runbook operativo y el handoff de revisión al dueño.

Un proyecto nuevo copia las plantillas de arranque y las va llenando a medida que aprende: cada regla nace de un problema real, cada decisión se anota cuando se toma, cada auditoría deja su reporte. En pocas semanas el proyecto tiene su propio ecosistema completo, hecho a su medida — sin que nadie lo haya tenido que dictar de arriba.

Por eso, cuando abajo se describe cada doc, hay que leerlo como **"así se va a ver cuando esté lleno"**, no como algo que ya viene resuelto.

---

## La marca de enforcement

Igual que en el resto del método, cada documento carga una marca según **cómo se hace cumplir** que esté al día:

- 🤖 **Candado automático** — la computadora no te deja cerrar/guardar si el doc no está donde debe estar. El único nivel que no depende de que alguien se acuerde.
- 👁 **Revisión** — alguien (persona o IA) lo controla y lo firma antes de cerrar un tramo.
- 📖 **Memoria** — el doc solo depende de que alguien se acuerde de tocarlo. Eso es **deuda**: la meta es subir estos a 👁 o 🤖 con el tiempo.

---

# El backbone (los documentos que ya trae el método)

## 1. La LEY del proyecto — Invariantes de construcción 👁

**Qué es.** El documento de las **reglas que no se violan nunca**: las de dinero, de existencias (stock), de aislamiento entre usuarios, de experiencia de uso y de proceso. Cada regla viene con su marca de enforcement (🤖/👁/📖) escrita al lado.

Piénsalo como la **constitución** del proyecto. No es un manual que se consulta cuando hay dudas; es la primera cosa que se lee al arrancar cada sesión de trabajo, y se **aplica activamente**, no solo se lee de reojo.

**Para qué sirve.** Es la fuente de verdad de las reglas. Que estén escritas en un solo lugar, con su nivel de enforcement, es lo que permite convertirlas en candados en vez de confiar en que alguien las recuerde. Cuando la auditoría encuentra un problema nuevo, la regla que lo mata se agrega aquí.

---

## 2. Arquitectura y spec del bloque — cómo está pensado 👁

**Qué es.** Dos cosas emparentadas: la **arquitectura base** (cómo está pensado el sistema entero) y la **spec de cada bloque** (qué se espera de esta pantalla o de este módulo *antes* de construirlo — qué imitar de lo que ya funciona bien, qué mejorar, qué descartar).

**Para qué sirve.** Es el *briefing* que se lee antes de escribir la primera línea. En The Raw Method el desarrollo **nace pegado al plan** (esto se llama *spec-first*): no se descubre sobre la marcha lo que ya estaba escrito. Los cambios en vivo pulen; no reinventan. Además, los enunciados de la arquitectura son las **lentes con las que después audita** cada pilar: si la spec dice "esto tiene que aguantar mil pedidos", esa frase es lo que el auditor va a intentar romper.

---

## 3. Backlog vivo con sección "NO re-proponer" 📖

**Qué es.** El **único** listado vivo de qué falta hacer, con cada ítem marcado como hecho `[x]` cuando se completa. Su parte más valiosa es un apartado especial: **"NO re-proponer"**, donde viven las decisiones que *parecen* huecos pero se eligieron a propósito.

Ejemplo de lo que va ahí: "un flujo de pedido arranca sin opción preseleccionada a propósito, para forzar una elección consciente y evitar disputas — no es un olvido, no lo 'arregles'."

**Para qué sirve.** Evita el peor desperdicio de tiempo con agentes de IA: que un agente nuevo "descubra" un problema que ya se discutió y decidió, y proponga arreglarlo otra vez. Antes de sugerir una mejora, se consulta este apartado. Si ya está decidido, se respeta.

---

## 4. Diccionario de datos — qué significa cada cosa 👁

**Qué es.** El documento que explica **qué significa cada tabla y cada campo** del sistema, y — clave — **qué se deriva de qué**. Es decir, cuáles datos son originales y cuáles se calculan a partir de otros.

**Para qué sirve.** Antes de agregar un campo nuevo, se consulta si el modelo ya lo dice de otra forma. La analogía: si guardas el "total" de una factura *y también* el "saldo pendiente" como dos números sueltos, tarde o temprano uno de los dos va a mentir (alguien actualiza uno y no el otro). El diccionario evita eso: deja claro qué se guarda de verdad y qué se calcula, para que un dato no contradiga a otro con el tiempo.

---

## 5. Bitácora y log de decisiones autónomas 📖

**Qué es.** El registro cronológico e **inmutable** (no se reescribe hacia atrás) de **qué se hizo, por qué**, y de las decisiones que el agente de IA tomó por su cuenta.

Se conecta directo con la regla de autonomía del método: las decisiones de **FORMA** (reversibles, con precedente) el agente las decide y las **anota aquí** para poder contrastarlas después; las de **FONDO** (producto, dinero, algo irreversible) no las toma solo, las trae al dueño.

**Para qué sirve.** Trazabilidad de las razones. Meses después, cuando alguien pregunta "¿por qué esto se hizo así y no de la otra forma?", la respuesta está escrita. Es lo que en la industria se llama un registro de decisiones (ADR): guarda el *porqué X en vez de Y*, no solo el qué.

---

## 6. Ficha de cobertura por bloque 🤖

**Qué es.** Al cerrar un bloque de trabajo se copia una **plantilla de checklist** y se resuelve **cada casilla**: cómo se cumplió esta convención, o por qué no aplica a este bloque. Lo importante es que **la lista de casillas la impone la plantilla**, no la persona que programa.

**Para qué sirve.** Es un candado documental. Como las casillas vienen dadas de afuera, **no se puede "olvidar" una convención**: si te la salteas, la casilla queda vacía y se nota. Y el candado es real (🤖): un chequeo automático **falla el cierre** si un bloque terminado no tiene su ficha, o si dejó una casilla muda. No depende de la buena memoria de nadie.

---

## 7. Reportes de auditoría 👁

**Qué es.** Cada auditoría (la revisión adversaria que asume que algo está roto) deja su propio documento: las lentes que se usaron por categoría, los hallazgos crudos agrupados en grupos (*clusters*), la verificación de cada hallazgo con jueces independientes, una nota por pilar, y una "lección de proceso" para la próxima vez.

**Para qué sirve.** Deja constancia de qué se atacó y qué sobrevivió. Su parte más honesta — y más importante — es que **declara qué NO se alcanzó a probar**. Una auditoría que dice "revisé todo y está perfecto" miente; una que dice "estas tres áreas quedaron sin cubrir, atención" es la que sirve. El siguiente equipo (o agente) sabe exactamente dónde retomar.

---

## 8. Runbooks operativos 👁

**Qué es.** El **paso a paso "para dummies"** de las operaciones delicadas: cómo respaldar los datos y **probar** que el respaldo se puede restaurar, cómo publicar una nueva versión, cómo actualizar la base de datos sin destruir datos, cómo probar en el celular. Documentan **todas las trampas** conocidas para no volver a pisarlas.

**Para qué sirve.** Que una operación riesgosa no dependa de que "el que sabe" esté disponible. Un runbook bien hecho lo puede seguir cualquiera. Cubren la operabilidad: guardar = respaldar, ensayar el restore antes de necesitarlo de verdad, publicar de forma separada del desarrollo, y frenar cualquier cambio que pueda borrar datos.

---

## 9. Ley de sesión y prompt de arranque 👁

**Qué es.** Dos piezas que preparan cada sesión de trabajo:

- La **ley de sesión** (el documento de onboarding que se carga al empezar): trae al tope el checklist de las reglas de más alto uso — puestas ahí a propósito para que estén frescas (esto se llama *salience*, ponerlas donde se ven sí o sí) — más el ritmo de trabajo y de dónde se retoma.
- El **prompt de arranque de la próxima sesión**: se escribe al cerrar un bloque, y apunta a los documentos base (la ley, el diccionario, la spec, etc.) para que la sesión siguiente arranque igual de completa que la que cerró.

**Para qué sirve.** Que un agente de IA que empieza de cero no arranque a ciegas. Hereda el contexto, las reglas de alta frecuencia bien visibles, y un aviso importante: que el stack (las herramientas y versiones) puede ser **más nuevo que su entrenamiento**, así que no debe construir de memoria.

---

# Los que faltaban (agregados por la auditoría del propio método)

The Raw Method se audita a sí mismo. Al hacerlo encontró cuatro huecos: documentos que el método *da por hecho* pero que no tenían un hogar formal. Se agregan aquí.

## 10. Threat model por bloque 👁

**Qué es.** Antes (no después) de construir un bloque sensible, un documento corto que responde: **¿quién querría atacar esto, y por dónde?** Se listan las amenazas plausibles — quién tiene motivo, qué podría intentar, qué pasaría si lo logra — y qué defensa las frena.

Se le dice *threat model*, "modelo de amenazas": es pensar como el atacante **antes** de que exista el ataque.

**Para qué sirve.** Adelantar la seguridad al principio en vez de dejarla para el final (esto se llama *shift-left*, correr la seguridad "hacia la izquierda", al comienzo del trabajo). Hoy este pensamiento se hacía "de cabeza" y se perdía. Con un hogar propio, queda escrito y auditable: la auditoría después puede verificar que cada amenaza listada tiene su defensa real.

---

## 11. Log de incidentes y postmortem 👁

**Qué es.** El registro de las **fallas de producción**: qué se rompió en la vida real, cuándo, qué impacto tuvo, cómo se resolvió, y — lo esencial — **qué lección deja para que no vuelva a pasar**. Un *postmortem* es exactamente eso: la autopsia de un incidente, escrita en frío después de resolverlo.

Ojo con la diferencia: la Bitácora (doc 5) guarda **decisiones**; este guarda **fallas**. No es lo mismo y no van en el mismo lugar.

**Qué lo dispara.** Lo ideal no es que un cliente te avise que algo se rompió — para cuando el cliente llama, el daño ya pasó. Lo que dispara un postmortem es el **monitoreo**: alertas automáticas que vigilan el sistema en producción (errores que se disparan, una operación que se cae, un número que se sale de rango) y **avisan solas** apenas algo falla. El monitoreo/alertas es la práctica que enciende la luz; el postmortem es lo que escribes cuando la luz se prende. El aviso del cliente es el peor caso — la red que atrapa lo que el monitoreo no vio —, no el disparador que buscas.

**Para qué sirve.** Es el complemento obligado de la observabilidad (el pilar de "fallar con aviso, no en silencio"). Si el sistema se va a molestar en registrar sus errores y en alertarte cuando pasan, tiene que haber un lugar donde viva **la lección del error**, no solo el error suelto. Y esa lección, cuando se puede, sube a una regla nueva en la LEY con su candado — el mismo motor de siempre: de cada problema, una regla.

---

## 12. Runbook "levantar un cliente / tenant nuevo" 👁

**Qué es.** El paso a paso para **instanciar el producto para un cliente nuevo**: qué datos y configuración hay que cargar, qué se cambia y qué no, para poner a andar el mismo sistema para otro negocio.

*Tenant* significa "inquilino": cada cliente es un inquilino del mismo edificio (el mismo software), con su propia puerta y sus propias cosas adentro.

**Para qué sirve.** Es el **entregable natural** de uno de los pilares del método: el motor genérico se separa de la config del cliente, para que el mismo producto se venda a otro negocio cambiando solo datos y configuración, nunca el motor. Pero esa separación no es *operable* — no se puede ejecutar de verdad — si no existe la guía de cómo hacerlo. Sin este runbook, la visión de vender el producto a varios clientes es una idea, no una operación.

---

## 13. Glosario en lenguaje llano para el dueño 📖

**Qué es.** Un diccionario **para el dueño no-ingeniero**: cada término técnico que aparece en el proyecto, explicado en una o dos frases en castellano llano, con analogía cuando ayude. "Migración", "candado", "concurrencia", "rollback", "idempotencia" — todo lo que un agente pueda mencionar, traducido.

**Para qué sirve.** Que el dueño pueda **decidir con criterio** sin depender de que alguien le traduzca en el momento. Todo el método está pensado para que lo dirija alguien que no necesita ser ingeniero; este glosario es la herramienta que hace real esa promesa. Es el único doc cuyo público es *solamente* el dueño.

---

## 14. Para revisar — el handoff al dueño 👁

**Qué es.** Al cerrar un bloque o una sesión, un documento **para el dueño** (no-ingeniero) que dice, en lenguaje llano: **qué se hizo, qué decidió la IA por su cuenta (FORMA), qué necesita la decisión del dueño (FONDO), la evaluación honesta** (fortalezas / debilidades / qué falta), y el estado del entorno. Arranca vacío y se llena de a poco, un cierre a la vez.

**Para qué sirve.** Es el puente entre *"la IA trabajó"* y *"el dueño decide con criterio"*. Junta en un solo lugar dos cosas que el método ya exige por separado: la **regla de autonomía** (las decisiones de FORMA se anotan para contrastar; las de FONDO se traen al dueño) y la **honestidad proactiva** (fortalezas Y debilidades, sin que las pidan). Sin este doc, el dueño se entera de lo que la IA decidió sola solo si lo caza; con él, lo tiene servido y puede vetar. Es *owner-facing*, como el glosario.

**No es una fuente de verdad nueva** —eso sería redundante—: **resume** la bitácora (las decisiones) y el reporte de auditoría (los hallazgos) para el dueño, en el momento de decidir. Si algo choca, mandan ellos; este doc es la **vista**, no el registro. Por eso se escribe al cierre y no se consulta después: cumplida la revisión, la verdad sigue viviendo en la bitácora y el reporte.

---

# Cuándo se toca cada documento

La IA no adivina cuándo usar cada doc — cada uno tiene su **disparador**. Este es el mapa:

| Documento | Cuándo se toca |
|---|---|
| **La ley (invariantes)** | Se **lee** al arrancar cada sesión; se **agrega una regla** cuando la auditoría halla una clase de problema nueva |
| **Arquitectura + spec de bloque** | **Antes** de construir un bloque (se lee o escribe la spec) |
| **Backlog** | Continuo: al terminar un ítem (`[x]`) y al aparecer uno nuevo |
| **Diccionario de datos** | **Antes** de agregar un campo o una tabla |
| **Bitácora + decisiones autónomas** | Cada vez que se hace algo relevante o se toma una decisión de FORMA |
| **Ficha de cobertura** | Al **cerrar** un bloque (candado 🤖: sin ella, el cierre no pasa) |
| **Reporte de auditoría** | Cada auditoría deja el suyo, al cerrar |
| **Runbooks operativos** | **Antes** de una operación delicada (respaldo, publicación, migración) |
| **Ley de sesión + prompt de arranque** | La ley de sesión se **lee** al arrancar; el prompt se **escribe** al cerrar un bloque |
| **Threat model** | **Antes** de construir un bloque sensible (seguridad) |
| **Postmortem** | Cuando algo se rompe en producción (lo dispara el monitoreo, no el cliente) |
| **Runbook cliente nuevo** | Al instanciar el producto para otro cliente/*tenant* |
| **Glosario** | Continuo: cuando aparece un término que el dueño podría no conocer |
| **Para revisar** | Al **cerrar** un bloque o sesión — el handoff al dueño |

Regla de dedo: casi todo se toca en **dos momentos** — al **arrancar** (leer contexto) y al **cerrar** (dejar constancia). Lo que se escribe en el medio es la bitácora, el backlog y el glosario.

---

# Las tres reglas que valen para TODOS los documentos

### 1. Un documento que miente sobre el estado del proyecto es un bug

No "documentación desactualizada". **Bug.** Se trata con la misma seriedad que una función que devuelve un dato equivocado. Si el backlog dice que algo falta y ya está hecho, o la ley describe una regla que ya no se aplica, eso es un defecto que hay que arreglar.

> **Candado para el caso más traicionero — el pulido POSTERIOR al cierre.** La forma más difícil de cazar de esta clase: una ficha se cierra afirmando algo del código ("bornes 34px"), el dueño pide pulir DESPUÉS del cierre (27px), y la ficha queda mintiendo con todos los gates en verde. No se resuelve "acordándose" (§135: un principio que ya falló por memoria sube de capa). El mecanismo (`gobernanza/raw-ficha-firma.js`): la ficha DECLARA los archivos que cubre y se FIRMA (hash) al cerrar; si un archivo cubierto cambia sin acuse en su sección **"Ajustes posteriores"**, el chequeo falla **al cerrar el siguiente bloque** — respetando §58a (el pulido NO exige tocar docs commit a commit) y sin bloquear el push. Es un **proxy mecánico**: no juzga si el párrafo dice la verdad (eso es juicio, y disfrazar juicio de candado está prohibido) — sólo detecta que la FUENTE del claim cambió. **Skill** = el motor + el principio (para todos los proyectos); **`conformance.test.ts` del proyecto** = la ejecución. Residuo declarado: la staleness del ÚLTIMO bloque no se caza hasta que aparece uno nuevo; y los comentarios del código (misma familia, sin ancla) quedan para el Red Team.

### 2. El documento se actualiza en el MISMO cambio que el código

No "después", no "cuando haya tiempo", no en una tarea aparte de "poner al día los docs". El cambio de código y el cambio de doc son **una sola cosa**. Si tocaste una regla, la ley se actualiza en ese mismo movimiento. Si un cambio dejó desfasado cualquier otro doc, ese doc se corrige ahí mismo. Un tramo no está cerrado si dejó un documento mintiendo.

### 3. Hay un orden de lectura al arrancar cada sesión

Los documentos base no se leen a discreción: hay una **secuencia de arranque**. Se empieza por la ley (las reglas), después el diccionario de datos y la spec del bloque que se va a tocar, y se termina con el prompt de arranque que dice de dónde se retoma. Ese orden es lo que hace que cada sesión — y cada agente nuevo — herede el proyecto completo en vez de arrancar a ciegas.

---

*The Raw Method · Raw Logic · No fluff. No licenses. No surprises.*
