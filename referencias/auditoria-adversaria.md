# Auditoría adversaria (el Red Team)

Esta es la pata de **verificar** del método. Aquí se explica **cómo se corre**: con qué postura, cómo se confirma un hallazgo sin inflar la lista, cómo se organiza la flota de agentes, dónde se puede probar en vivo y sin riesgo, y cómo se entrega el reporte. Sirve para cualquier proyecto — no depende de ninguna regla numerada de un proyecto en particular.

---

## 0. RED FLAGS — las excusas para dejar de auditar (leelas ANTES de decir "todo bien")

El peor enemigo de una auditoría es el auditor convenciéndose de que ya está. Estas frases, si te las
escuchás pensando, son señal de que **NO atacaste de verdad** — no de que el código esté bien:

| La excusa (bandera roja) | Lo que hay que hacer |
|---|---|
| "Ya encontré varios, con eso alcanza" | Seguí. El que te saltás puede ser el crítico. Corré TODOS los ángulos del router |
| "Se ve prolijo, seguro está bien" | La prolijidad no es calidad — la de una IA engaña más. Revisalo MÁS, no menos |
| "Esto seguro ya está cubierto" | No asumas: verificalo (¿hay guard? ¿hay test? ¿es alcanzable? — las 3 lentes) |
| "El bloque es chico, no hace falta tanto" | El tamaño no manda; el downside sí. Chico y toca plata = a fondo igual |
| "No encontré nada" | Cero hallazgos casi siempre = no atacaste, no que sea perfecto. Escarbá otra clase, o declará dónde quedaste ciego (§7) |

Convierte la regla de oro ("cero hallazgos = no atacaste") de un cartel 📖 en un checklist que se recorre.
Para los patrones concretos a buscar, ver `referencias/fichas-de-ataque.md`.

---

## 1. La postura: atacar, no felicitar

Auditar **no es buscar lo que se hizo bien**. Es lo contrario. Tú entras asumiendo que **algo está mal o se diseñó mal**, y tu trabajo es **encontrarlo antes de que lo encuentre un usuario o un atacante**.

El auditor piensa como quien quiere **romper** el sistema, no como quien lo revisa para aprobarlo. La diferencia es enorme: si entras a confirmar que todo está bien, tu cabeza busca evidencia de que sí — y la encuentra, porque casi siempre el camino feliz funciona. Si entras a romper, buscas el agujero: el caso raro, el dato malicioso, las dos operaciones que chocan, el error que se traga en silencio.

**Regla de oro:** un pase de auditoría que termina con "todo perfecto, cero hallazgos" casi siempre significa que **no atacaste de verdad** — no que el código sea perfecto.

Una consecuencia importante cuando lo que se audita es código escrito por IA: el output de una IA **se ve plausible y prolijo**, aunque esté mal. Por eso al código de IA se lo revisa **más**, no menos — la prolijidad es justamente lo que baja la guardia.

---

## 2. La segunda cara: refutar por defecto

Si atacas con ganas, vas a levantar muchas sospechas. Si las anotas todas como bugs reales, tu reporte se infla con falsas alarmas y pierde valor — nadie confía en una lista donde la mitad no es cierto.

La solución es una segunda postura que convive con la primera:

- **Al cazar** → asume que está **roto**. Busca el agujero activamente. No pierdas tiempo confirmando lo bueno.
- **Al confirmar un hallazgo** → asúmelo **falso** hasta que el código pruebe que es real.

Es decir: **agresivo para buscar, escéptico para creer.** Encuentras como pesimista y confirmas como fiscal. Esta doble cara — atacar duro pero exigir prueba antes de acusar — es el corazón de la auditoría adversaria. Se llama **refutar por defecto**: cada hallazgo es mentira hasta que se demuestre lo contrario.

### La tercera postura: la cadena de una afirmación (rige también FUERA de la auditoría)

Atacar y refutar disparan cuando se audita. Pero la mayoría de las afirmaciones que un dueño escucha no nacen en una auditoría: nacen en medio del flujo — *"encontré que esto infla los números"*, *"este bug cuesta $1.754"*, *"la causa es el descuento"*. Ahí no hay Red Team que las frene, y una afirmación equivocada dicha con confianza hace el mismo daño que un bug: el dueño decide sobre ella.

La regla:

> **Toda afirmación de plata, causa o impacto recorre su cadena ANTES de entregarse: existencia → dirección → magnitud. En ese orden, y el eslabón más barato primero. Si un eslabón quedó sin verificar, la afirmación se entrega como HIPÓTESIS, no como dato.**

- **Existencia** — ¿el efecto es real? ¿Alguien consume ese número? ¿El fenómeno está en los datos, o solo en mi razonamiento? *(El eslabón más barato — un grep, un GROUP BY — y el que más afirmaciones mata.)*
- **Dirección** — ¿va hacia donde digo? ¿Infla o desinfla? ¿La causa precede al efecto?
- **Magnitud** — recién ahora: ¿cuánto?

**La trampa que esta regla mata: medir la magnitud primero.** Es la tentación natural — el número grande es el titular — y *se siente* como verificación, porque son queries y cifras. Pero la magnitud no prueba ni que el efecto exista ni hacia dónde va. Se puede medir con tres decimales un efecto que no existe.

**El caso que parió la regla** (2026-08-02/03, dashboard en producción — cuatro caídas en una noche, todas con la misma pata):

1. *"Esa cifra está inflada en pantalla"* — tres queries midiendo el TAMAÑO del error, sin el grep de 5 segundos que habría mostrado que **nadie consumía el número**. Movía $0.
2. Quedó escrito **en la ley del proyecto**, como hecho, que una métrica "iba a inflar los ingresos a escala" — la flota adversaria lo refutó horas después: 0 casos en 28.716 pedidos, y el signo era el INVERSO (subestimaba).
3. *"Las 112 están verificadas"* — la prueba dura confirmaba 3.
4. Casi se "arreglan" 16 sitios por $1.754 "inflados" — un GROUP BY por mes mostró que los 593 pedidos eran todos de dos meses: **el inicio de la serie, no un bug**. Frenó el dueño, no el método.

Y la moraleja es de método, no del caso: la regla **ya existía** como memoria 📖 de la IA — y no disparó bajo el entusiasmo del hallazgo. **📖 que ya mordió sube de capa en el mismo arreglo.** Por eso la cadena vive en el reflejo de sesión (`gobernanza/raw-session.js`, se inyecta en cada arranque) y las afirmaciones medibles que entran a un documento exigen **estampa de medición** (`documentos-vivos.md`, regla 4). La estampa caza a la que nunca se midió; la cadena, a la que se midió por el eslabón equivocado.

---

## 3. Las tres lentes (y la regla del 2 de 3)

Para confirmar un hallazgo no basta con que "se vea mal". Se mira desde **tres lentes independientes**. Independientes quiere decir que **cada una pregunta algo distinto** — no son tres formas de ver lo mismo, son tres ángulos que no se solapan (el término técnico es **ortogonales**: como los tres ejes de una caja, cada uno apunta hacia donde los otros no).

Las tres preguntas:

- **Lente 1 — ¿existe ya la defensa?** ¿Hay en el código un candado, una validación o un guard que ya frena esto? Si lo hay, el hallazgo probablemente es falso.
- **Lente 2 — ¿hay una prueba que lo cubra?** ¿Existe un test que ya ejercita este caso? Si un test verde lo cubre, el escenario que denuncias ya está atendido.
- **Lente 3 — ¿puede pasar de verdad?** ¿El escenario es **alcanzable** en la práctica, o solo existe en la teoría? Un bug que necesita condiciones imposibles no es un bug que importe.

**La regla:** un hallazgo solo sobrevive si **2 de las 3 lentes no logran refutarlo.** Si dos de tres jueces, mirando desde ángulos distintos, no consiguen tumbarlo, entonces es real y entra al reporte. Si dos lo tumban, se descarta.

Repartir el trabajo entre lentes tiene una ventaja extra: cada juez mira una sola cosa y la mira bien. El que busca el guard no se distrae buscando el test.

### La independencia no es solo cosa de la flota

Cuidado con un malentendido: las tres lentes **no** son un lujo que solo se paga cuando montas la flota grande. Se exigen **también en el pase regular**, el de todos los días. La forma correcta de aplicarlas es con **contexto fresco por lente** —un juez distinto para cada pregunta, sin arrastrar lo que "creyó" el anterior— o, como mínimo, **separando la caza de la confirmación**: quien cazó el hallazgo no es quien decide si es real.

¿Por qué tanto? Porque el valor de las tres lentes está en que **no comparten puntos ciegos**. Un mismo agente aplicando las tres lentes a **su propio** hallazgo es el **modo débil**: arrastra los mismos supuestos con los que lo encontró, así que las tres preguntas terminan mirando desde el mismo ángulo y se auto-confirma. Ese modo débil solo vale para lo de **bajo riesgo**, donde un falso positivo cuesta poco. Para dinero, seguridad o cualquier cosa sensible, la independencia entre lentes no es opcional.

---

## 4. La criba: muchas preguntas chicas antes de una respuesta grande

Las tres lentes sirven para **confirmar** un hallazgo. Pero hay una clase de defecto que primero cuesta **detectar**: el que necesita **juicio**, no un candado. *"¿Esta abstracción sobra?" "¿Esta pantalla confunde?" "¿Este código se va a volver imposible de mantener?"* Ningún test los caza —requieren entender la intención— y el dueño no-programador no puede juzgarlos, porque son de código. Acá el juez **tiene que ser la IA**. El problema: una sola opinión de IA sobre algo tan blando es poco confiable — puede errar hacia cualquier lado.

La criba lo vuelve **estadístico**. En vez de una sola pregunta grande (*"¿esto es sobre-ingeniería?"*), la IA se hace **muchas preguntas chicas, ortogonales e independientes**, cada una un indicio débil:

- ¿Tiene un solo usuario, o de verdad la usan varios lados distintos? *(consumidor)*
- ¿La spec la pidió, o apareció sola "por si acaso"? *(origen)*
- ¿Qué se pierde de real si la quito? *(valor)*
- ¿Cuánto cuesta entenderla y mantenerla viva? *(costo)*
- ¿A qué le agrega riesgo si resulta que sobra y alguien la toca? *(radio de impacto)*
- ¿Un dev nuevo entendería por qué existe, sin preguntar? *(claridad)*

Ojo con esto último: las preguntas tienen que apuntar a **ejes distintos** (consumidor, origen, valor, costo, riesgo, claridad). Dos preguntas que miden el mismo olor con otras palabras —"¿un solo usuario?" y "¿una sola implementación?"— **fabrican una mayoría falsa**: es el mismo indicio contado dos veces. La criba solo vale si sus señales son de verdad independientes (la misma ortogonalidad que las tres lentes exigen).

Ninguna respuesta sola decide nada. Pero se **cuentan**: si **la mayoría** apunta al mismo lado, el conjunto cruza un **umbral de confianza** y la IA **ya no puede pasarla por alto** dentro de la auditoría — se prende la bandera. (El umbral es ilustrativo, no un número sagrado: la idea es que muchos indicios débiles concordando pesan más que una corazonada única.)

Al prenderse la bandera, la IA **no actúa a ciegas**: va **a fondo** sobre ese caso —lee el contexto completo, la intención, el historial— y **determina**: confirma el defecto (lo pasa por las tres lentes y, si se puede, lo destila a candado) o lo descarta con una razón. Y **se lo cuenta al dueño en lenguaje llano** —*"encontré una abstracción que parece sobrar, por esto y esto; ¿la simplifico?"*—, nunca un veredicto pelado sobre código que el dueño no puede evaluar.

**Por qué importa:** convierte el juicio blando —lo que de otro modo es "un cartel en la pared que se puede ignorar"— en un **protocolo con señal de confianza**. No lo vuelve perfecto (sigue siendo juicio, capa 👁, no candado 🤖), pero lo vuelve **más sistemático y menos arbitrario** que una corazonada única. Es la misma familia que las tres lentes —consenso de ángulos independientes— pero aplicada a **detectar** lo blando, no solo a confirmar lo ya encontrado.

En el método, la criba es **cómo se fuerza el cómo** de los pilares cuyo cómo es **juicio, no candado**: la sobre-ingeniería (pilar 1), *¿esta pantalla confunde?* (pilar 3), *¿le resulta familiar al usuario, o genera fricción sin una mejora clara?* (pilar 10). Sin la criba, el cómo de esos pilares sería un cartel que cada quien juzga a ojo; con ella, es un chequeo con señal de confianza que **dentro de la auditoría no se descarta sin fundamento**. Ojo: sigue siendo 👁 —depende de que la auditoría se corra—; solo un 🤖 es de verdad no-ignorable.

> **La división de trabajo que esto habilita:** la IA **juzga el código** (vía la criba); el dueño **decide sobre el hallazgo** (en lenguaje llano). Al usuario nunca se le pide que sepa qué es "de código" y qué no — para eso está el criterio de la IA.

---

## 5. La flota de agentes (el modo más exigente)

Lo delicado — **dinero y seguridad** sobre todo — se audita en el modo más fuerte que hay: una **flota de agentes de IA** atacando el mismo código **en paralelo**, cada uno usando el modelo más capaz disponible.

Cómo se arma la flota:

- **Un agente por dimensión.** No pones un solo agente a "buscar bugs" en general. Pones uno a cazar problemas de concurrencia, otro de aislamiento de datos, otro de manejo de dinero, otro de seguridad, y así. Cada uno es un especialista con un solo blanco (el término para estos cazadores especializados es **finders por dimensión**). Un cazador enfocado encuentra lo que un generalista pasa por alto.
- **Solo lectura. Siempre.** 🤖 La flota **lee y razona, jamás escribe ni ejecuta cambios** sobre el código ni sobre datos reales. Un auditor que puede modificar lo que audita ya no es un auditor: es un riesgo. Esta es una barrera dura, no una recomendación.
- **Modelo más capaz.** Para atacar dinero o seguridad se usa el modelo más fuerte, en el rol de **la flota adversaria** (el consultor eminente corriendo en modo Ultracode). Aquí no se ahorra: el costo de un bug de dinero que se escapa es mucho mayor que el de un pase de auditoría caro. (El mapeo de cada rol a su modelo concreto vive en `modelos-ia.md`.)

### El loop hasta secar

La flota no corre una vez y ya. Corre **en rondas**, y sigue mientras siga encontrando cosas nuevas. La condición de parada es clara:

> **Se detiene cuando pasan DOS rondas seguidas sin encontrar nada nuevo.**

Una sola ronda vacía no basta — pudo ser suerte. Dos seguidas dan confianza de que el pozo se secó (de ahí el nombre, **loop hasta secar** / *loop-until-dry*). Ojo: si el presupuesto de rondas se agota **antes** de llegar a dos rondas secas, eso **se declara en el reporte** (ver sección 7) — significa que la cobertura quedó incompleta.

### Agrupar y deduplicar ANTES de verificar

Muchos agentes atacando en paralelo van a reportar **lo mismo con otras palabras**, o muchas variantes del mismo problema de fondo. Antes de pasar cada hallazgo por las tres lentes:

1. **Agrupa** los hallazgos que son la misma clase de problema (el término es **clustering**: juntar en racimos lo que pertenece junto).
2. **Deduplica**: colapsa los repetidos en uno solo.

Recién entonces verificas. Verificar primero y agrupar después es desperdiciar esfuerzo confirmando diez veces el mismo bug — y encima infla el reporte, justo lo que refutar-por-defecto quiere evitar.

---

## 6. El sondeo en vivo: solo en base local, con vuelta atrás

Leer el código encuentra mucho, pero a veces hay que **probar de verdad**: correr una operación, meter dos transacciones a la vez, ver qué pasa con un dato límite. A eso lo llamamos **sondeo dinámico** (probar el sistema funcionando, no solo leerlo).

La regla es tajante:

> **El sondeo dinámico se hace SOLO contra una base de datos LOCAL, con capacidad de deshacer todo (rollback), NUNCA contra producción.** 🤖

Producción tiene datos de clientes reales. Un experimento adversario — que **por diseño** intenta romper cosas — no se corre jamás donde puede dañar a un usuario. La base local es desechable: pruebas, observas, y **reviertes** para dejarla como estaba. Si el sondeo necesita un entorno que no se puede revertir, no se hace hasta tenerlo.

---

## 7. El reporte: qué se probó, qué sobrevivió, y qué NO se alcanzó

El reporte es el entregable. Su forma:

- **Por categoría / lente.** Los hallazgos se organizan por dimensión (concurrencia, seguridad, dinero, aislamiento…), no en una lista suelta. Así el dueño ve de un vistazo dónde está la debilidad.
- **En racimos (clusters).** Los hallazgos relacionados van juntos, no repartidos. Un problema de fondo con cinco síntomas se cuenta como un problema con cinco síntomas, no como cinco problemas.
- **Una nota por ángulo.** Cada dimensión auditada lleva su calificación, para que el dueño mida el estado sin leer cada detalle.

Y la parte más importante, la que separa un reporte honesto de uno que da falsa tranquilidad:

> **Declara con toda honestidad QUÉ NO SE ALCANZÓ A PROBAR.** 📖

La ausencia de hallazgos **no es prueba de ausencia de bugs.** Que la auditoría no encontró algo puede querer decir dos cosas muy distintas: que no está, o que **no se llegó a mirar ahí**. Un reporte que no distingue las dos miente por omisión.

Entonces el reporte dice, explícitamente:

- Qué **clases de problema se barrieron** de verdad (y para esas, la lista es exhaustiva).
- Qué quedó **fuera del alcance** o a medio cubrir: las rondas que se caparon antes de secar, las áreas que no se sondearon en vivo, los tipos de prueba que faltan (carga real, pruebas de resistencia, verificación automatizada de accesibilidad de punta a punta, etc.).
- Qué residuos quedan pendientes de un humano o de otra herramienta.

Decir "esto no lo probé" no es debilidad del reporte: **es su mayor virtud.** Un dueño que sabe dónde está ciego puede decidir; uno al que le vendieron "todo perfecto" no.

---

## 8. Después del reporte: de cada hallazgo, una regla

La auditoría no termina cuando se arreglan los bugs encontrados. Cada hallazgo confirmado se **destila a una regla** que mata la **clase entera** de ese escenario — no solo el caso puntual — y, siempre que se pueda, a un **candado 🤖** que lo impida solo en el futuro.

Ese es el motor que hace que la auditoría encuentre **cada vez menos**: lo que ya se convirtió en candado no vuelve a aparecer. Un hallazgo que solo se parcha vuelve con otras variables; un hallazgo que se vuelve regla + candado se cierra para siempre. (El detalle de cómo se construye un candado vive en `candados-y-capas.md`.)

---

*The Raw Method · Raw Logic · No fluff. No licenses. No surprises.*
