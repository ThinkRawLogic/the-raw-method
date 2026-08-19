# Arrancar aquí — The Raw Method en el día 1

> **La puerta de entrada.** Si nunca usaste The Raw Method, empieza acá. No leas los 16 pilares todavía, no leas todas las referencias. Este documento es el mínimo para arrancar bien hoy, en minutos. El resto lo aprendes construyendo.

El método completo es grande porque cubre todo lo que un software serio necesita. Pero **adoptarlo no es grande**: se arranca con tres cosas y un arnés que se instala en tres pasos. Todo lo demás crece solo, a medida que tu proyecto aprende de sus propios errores.

Esta es la versión mínima viable. Léela entera —son pocos minutos— y ya puedes empezar tu primer bloque.

---

## Primero: la unidad de trabajo es el BLOQUE

Antes que nada, una idea que hace click con todo lo demás: no trabajas por "tareas sueltas", trabajas por **bloques**. Un bloque es un pedazo de trabajo con un objetivo claro (una pantalla, un flujo, una función del negocio). **Cerrar un bloque = cumpliste su objetivo**, y ese cierre es lo que dispara la ceremonia de calidad (la ficha, la auditoría).

Si estás yendo suelto —"quiero esto, y después esto otro"—, **pídele a la IA que te lo organice en bloques**. El método asume trabajo por bloques, y la IA sabe agruparlo en pedazos auditables del tamaño correcto. Ella propone, tú confirmas.

---

## Las 3 cosas NO-NEGOCIABLES para arrancar

Todo lo demás del método es mejora. Estas tres son el piso. Si haces solo esto, ya estás usando The Raw Method de verdad.

### 1. Al cerrar cada bloque, llena la ficha
Cuando terminas un bloque, copias la **ficha de cobertura** (`plantillas/ficha-cobertura.md`) y resuelves cada clave: la marcas cumplida con una nota de *cómo*, o la marcas `N/A` con el *por qué*. Una clave en blanco **no cuenta como cerrado**. La ficha es lo que impide "olvidar" un ángulo — la lista la impone la plantilla, no tu memoria.

### 2. Audita de forma adversaria lo que toca dinero o el objetivo
Sobre lo que mueve plata, o sobre el objetivo del bloque, corres la **auditoría adversaria** con sus tres equipos (nombre en llano + jerga de seguridad real):

- 🔴 **Red Team — ¿está roto?** Un agente *distinto del que construyó* ataca el código asumiendo que algo está mal (correctitud, seguridad, lógica de dinero).
- ⚪ **White Team — ¿logramos el objetivo?** Juzga el resultado contra lo que se buscaba. Ojo: un Red Team en verde **no** prueba que llegaste a la meta, solo que nada está roto. Puede estar todo bien construido y ser lo que no era.
- 🔵 **Blue Team — ¿lo estamos vigilando?** ¿Algo avisa cuando se rompe en producción, o te enteras porque se queja un cliente? (Este recién pesa cuando ya estás en producción; el día 1 puedes anotarlo como pendiente.)

Regla dura: **el auditor tiene que ser otro** — otro agente, con ojos frescos. El que construyó arrastra los mismos supuestos con los que construyó, y si se audita a sí mismo se auto-aprueba.

Y una regla hermana que se olvida siempre: **el que corrige también tiene que ser otro.** La auditoría termina en un *hallazgo*; implementar el arreglo es un trabajo aparte, con sus propias reglas — mirar todo lo que depende de lo que vas a tocar, **probar** que lo que ya funcionaba sigue funcionando, y preguntarse **por qué nació** el hueco. Eso es **el protocolo de corrección** (`referencias/correccion.md`), y al cerrar se responde por escrito en la clave `(ecosistema)` de la ficha.

### 3. Mantén la ley honesta
La "ley" es el documento donde viven tus reglas. La regla acá es simple: **un documento que miente sobre el estado del proyecto es un bug.** Si arreglaste algo, si una regla cambió, si algo quedó a medias — el documento lo dice, en el mismo cierre. Un doc desactualizado es peor que no tenerlo, porque construyes encima confiando en algo falso.

---

## Instalar el arnés en 3 pasos

El "arnés" es lo que hace que seguir el método **deje de ser un acto de memoria**: candados (reglas escritas como código) que corren solos y **no dejan guardar** si algo las rompe. Se instala una vez:

1. **Copia `plantillas/`** a tu proyecto — trae la ficha de cobertura, la ley, la bitácora, el backlog y las demás plantillas vacías. Un proyecto nuevo empieza vacío y las va llenando solo.
2. **Copia `candados/`** a tu proyecto — trae el kit de arnés reusable: `conformance.test.ts` (dos candados genéricos listos: cobertura y arranque), `candado-plantilla.ts` (el molde para escribir los tuyos) y `pre-commit.sample` (el hook de git). El proyecto necesita su corredor de tests instalado (en el stack de referencia, TypeScript, es `vitest`).
3. **Cablea el pre-commit** — copia `pre-commit.sample` al hook de git (las instrucciones exactas están dentro del archivo). Desde ahí, cada vez que guardas (`git commit`), los candados corren solos; si uno falla, **no guarda**.

Ese paso 3 es el momento en que el método deja de depender de tu disciplina. Ya no tienes que acordarte de correr nada: la puerta se cierra sola.

> Si algo de esto suena a chino, es la parte donde tu socio técnico (o la propia IA) te ayuda una vez. Después queda puesto para siempre.

---

## La secuencia del día 1 (el huevo y la gallina)

Hay una trampa al empezar: el método teje tu ley propia *a partir de* lo que la auditoría encuentra. Pero el día 1 **la ley arranca vacía** — no hay nada tejido todavía. Se resuelve en orden:

1. **Copia las plantillas** (paso de arriba).
2. **Escribe, desde la spec del bloque 1, tres cosas antes de la primera línea de código:**
   - la **arquitectura** (cómo se organizan las piezas),
   - el **diccionario** (qué significa cada término del negocio — hablar el idioma del cliente),
   - el **OBJETIVO del bloque** (el *para qué*, en tu idioma, apuntado al resultado que buscas).
   > Lo del objetivo importa más de lo que parece: la IA sigue órdenes a ciegas bien, pero construye **mucho mejor** cuando entiende la intención. Y hay una trampa a evitar: fija el objetivo *independiente* de lo que salga, primero qué buscabas y después qué salió. Si lo escribes después, lo moldeas para que calce con el resultado y la auditoría se auto-aprueba.
3. **Usa los 16 pilares —vía la ficha de cobertura— como LEY PROVISIONAL.** Mientras tu ley propia esté vacía, los 16 pilares son tu piso: la vara mínima que reemplaza a las reglas que todavía no existen. No los estudias; los usas a través de la ficha, que te los pregunta uno por uno.
4. **Construye con el briefing** de los pilares que aplican a ese bloque (la IA sabe cuáles prende cada cambio — no son los 16 siempre).
5. **Recién ahí corre el motor** auditoría → reglas: los primeros hallazgos empiezan a tejer **tu** ley propia, que de a poco reemplaza al piso provisional con reglas hechas a tu medida.

En pocas semanas tu proyecto tiene su propia ley, hecha a su medida, sin que nadie la haya tenido que recordar. No heredas las reglas de otro proyecto — heredas **la máquina que las genera**.

---

## Dónde NO gastar rigor (anti-sobre-ingeniería)

Esta es la otra mitad de la honestidad, y la que más se olvida: **el rigor es proporcional a lo que está en juego.** Bloque chico = ceremonia chica. Blindar con vara de banco una pantalla que usan tres personas no es calidad, es desperdicio — y encima entierra el proyecto en fricción.

Guía práctica:

- **El esfuerzo va con el downside** (lo que pasa si sale mal). Lo que toca dinero o seguridad se cierra con el modelo más capaz y la flota adversaria. Una pantalla interna de solo lectura no necesita nada de eso.
- **La ficha ya trae el `N/A`.** Si un bloque no toca concurrencia, marcas esa clave `N/A — no hay operaciones simultáneas` y sigues. No inventas un candado para un problema que no tienes.
- **Un cambio de una línea no necesita un bloque con ceremonia completa.** Si la IA te propone envolver una corrección trivial en todo el ritual, frénala — el bloque tiene que ser del tamaño correcto.
- **No subas una regla a candado 🤖 hasta que un problema real lo justifique.** El motor del método es *de cada problema, una regla* — la clave es "de cada problema". No se blindan clases de bug que nunca te pasaron; se blindan las que ya te mordieron.

Sobre-ingeniería y bajo-ingeniería son las dos caras del mismo error: no medir el rigor contra lo que está en juego. El método pide las dos honestidades — no dejar un hueco callado, y no gastar una fortuna blindando lo que no lo necesita.

---

## Y ahora sí

Con esto ya puedes arrancar tu bloque 1. Cuando quieras profundizar —los 16 pilares en detalle, cómo se corre la flota adversaria, qué modelo de IA para qué tarea— eso vive en `SKILL.md` y en `referencias/`. Se cargan cuando hacen falta, no todas de golpe.

Empieza chico. Cierra el bloque con su ficha. Deja que el motor teja tu primera regla. Eso es The Raw Method.

---

*The Raw Method · Raw Logic · Pensamos primero. Construimos después. La IA hace lo demás.*
