# CHECKLIST-MANUAL.md — los candados corridos a mano

> **Parte de The Raw Method.** Esta es la versión **manual** de los dos candados genéricos (cobertura y arranque), para el proyecto que **todavía no puede automatizarlos**. Una persona la corre a mano al cerrar cada bloque.

## Léelo de frente antes de usarlo

Esto es una **red de seguridad mínima, no la solución.** El método distingue dos niveles y este documento vive en el de abajo:

- 🤖 **El candado automático** corre solo en cada commit y **no deja guardar** si la regla se rompe. No depende de que nadie se acuerde. Es el nivel que quieres.
- 👁 **Este checklist** lo corre una **persona, a mano.** Depende de que te acuerdes de abrirlo y de que lo leas honesto. Si te lo saltas un viernes cansado, no pasa nada — y ese "no pasa nada" es exactamente el agujero que el candado automático cierra y este no.

Usa este documento cuando tu proyecto todavía no tiene su corredor de tests montado (ver `conformance.test.ts` para la versión 🤖, y el README para cómo portarla a tu stack). **En el momento en que puedas automatizar, hazlo y jubila este archivo.** Correr esto a mano para siempre es elegir la red con huecos pudiendo tener la puerta con llave.

Una nota de uso: recórrelo **de arriba a abajo, en voz alta o por escrito**. Leer la casilla sin responderla no cuenta — es el mismo optimismo blando que el candado existe para atrapar.

---

## Candado 1 — COBERTURA (a mano)

**Cuándo:** al declarar CERRADO un bloque, antes de decir "listo".

**La regla:** un bloque cerrado **resuelve todas sus claves.** Cada clave de la ficha de cobertura queda `[x]` con una nota de cómo se cumplió, o `[x] N/A — <por qué no aplica>`. Una clave en `[ ]`, o marcada pero con su nota vacía, **no cuenta como cerrada.** N/A es una respuesta que se escribe, no una clave que se saltea.

**Recórrelo así:** abre la ficha del bloque (`plantillas/ficha-cobertura.md`) y confirma que **todas estas claves están presentes y resueltas.** Si falta una clave en la ficha, o una quedó muda, el bloque no está cerrado:

- [ ] **(spec-leída)** — resuelta con nota, o N/A con motivo
- [ ] **(orden)** — resuelta con nota, o N/A con motivo
- [ ] **(seguridad)** — resuelta con nota, o N/A con motivo
- [ ] **(experiencia)** — resuelta con nota, o N/A con motivo
- [ ] **(concurrencia)** — resuelta con nota, o N/A con motivo
- [ ] **(errores)** — resuelta con nota, o N/A con motivo
- [ ] **(rastro)** — resuelta con nota, o N/A con motivo
- [ ] **(config)** — resuelta con nota, o N/A con motivo
- [ ] **(aguante)** — resuelta con nota, o N/A con motivo
- [ ] **(stack)** — resuelta con nota, o N/A con motivo
- [ ] **(dato)** — resuelta con nota, o N/A con motivo
- [ ] **(tests)** — resuelta con nota, o N/A con motivo
- [ ] **(auditoría)** — resuelta con nota, o N/A con motivo
- [ ] **(ecosistema)** *(desde la ficha v5)* — las tres obligaciones del **protocolo de corrección** respondidas por escrito (qué dependía y **cómo lo busqué** · cómo **probé** que lo sano sigue sano · por qué **nació** el hueco), más el control positivo y **quién corrigió**; o N/A si el bloque no corrigió nada
- [ ] **(docs)** — resuelta con nota, o N/A con motivo
- [ ] **(OK)** — resuelta con nota, o N/A con motivo

**Reprueba si:** falta cualquier clave de la lista, o alguna quedó en `[ ]`, o alguna está marcada pero sin nota. Cualquiera de las tres cosas significa que el bloque **no está cerrado todavía**, por más que se sienta terminado. Vuelve y resuélvela.

---

## Candado 2 — ARRANQUE (a mano)

**Cuándo:** al terminar un bloque, cuando actualizas el prompt que retomará el proyecto la próxima sesión.

**La regla:** el prompt de arranque (`plantillas/PROMPT-ARRANQUE.md` en tu proyecto) **se deriva de los documentos base y tiene que mencionarlos**, para que la sesión nueva arranque parada sobre todo el contexto y no sobre la memoria de la anterior. Olvidar referenciar el contexto completo es un error que se repite.

**Recórrelo así:** lee tu prompt de arranque y confirma que **nombra los cinco documentos base**:

- [ ] menciona **la ley** (los invariantes / lo invariable)
- [ ] menciona **la arquitectura**
- [ ] menciona **el backlog** (los pendientes)
- [ ] menciona **el diccionario de datos**
- [ ] menciona **la bitácora**

**Reprueba si:** el prompt no nombra alguno de los cinco. Una sesión nueva que no los lee arranca sobre la memoria, no sobre el contexto — que es justo lo que este candado evita.

---

## Cuando ya puedas, sube esto a 🤖

El día que tu proyecto tenga un corredor de tests montado, estos dos chequeos dejan de correrse a mano: los hace `conformance.test.ts` solo, en cada commit, sin que nadie se acuerde. Ese es el destino de todo lo que vive en este archivo. Mientras tanto, esta red — con sus huecos honestos — es mejor que nada.

*The Raw Method · Raw Logic · No fluff. No licenses. No surprises.*
