# candados/ — el arnés reusable

> **Parte de The Raw Method.** Este es el corazón del v2: el kit que hace que **seguir el método deje de ser un acto de memoria**. Se instala en un proyecto y lo hace cumplir solo.

Un método de calidad que vive en la cabeza de la gente **se olvida**. Los candados son la salida: reglas escritas como código que **no dejan guardar** si algo las rompe. Este folder es el paquete que copias a tu proyecto para que empiece con el arnés puesto desde el día uno.

Si no leíste `referencias/candados-y-capas.md`, léelo primero: acá aplicamos en la práctica lo que ese documento explica en teoría.

---

## Qué hay en el kit

| Archivo | Qué es |
|---|---|
| `conformance.test.ts` | La implementación de **referencia**. Trae dos candados genéricos del método listos para correr: **cobertura** y **arranque**. Es donde agregas los candados propios de tu proyecto. |
| `candado-plantilla.ts` | La **plantilla** para escribir un candado nuevo: uno que escanea tu código y hace fallar el commit si **reaparece una clase de bug** que ya arreglaste. |
| `pre-commit.sample` | El **hook de git** de ejemplo que corre los candados en cada commit. Con instrucciones para activarlo sin ser ingeniero. Trae además el **guard de rama** (dormido salvo que crees `.raw-rama-obligatoria`): con dos personas, la rama compartida es el punto de choque. |
| `post-commit.sample` | El candado de **respaldo**: guardar y respaldar son un solo acto — cada commit se sube al instante. Y cuando no puede, **dice por qué** (sin red ≠ la rama divergió), porque un aviso que nombra la causa equivocada es peor que no avisar. |

---

## Las tres capas de enforcement, en la práctica

El método declara tres niveles de cómo se hace cumplir una regla. Este folder es la maquinaria de la capa de arriba, y te ordena las otras dos:

- 🤖 **Automático — el candado.** Es lo que vive en `conformance.test.ts` y corre solo en cada commit. La computadora revisa la regla; si se rompe, **no deja guardar**. No depende de que nadie se acuerde. Es el único nivel perfecto.
- 👁 **Revisión — el ojo a propósito.** Lo que un candado todavía no puede juzgar (los agujeros de lógica sutiles, si una pantalla se siente confusa, si el resultado logró el objetivo) lo revisa un agente fresco o una persona, con postura adversaria y firma. El arnés **no reemplaza** esto.
- 📖 **Memoria — la deuda.** Una regla que solo está escrita en un documento. No es enforcement: es deuda. **La meta permanente del método es vaciar esta capa** subiendo cada regla que se pueda a 🤖, y lo que no, a 👁.

> **La operación central del método es una sola:** mover reglas de 📖 hacia 🤖. Este folder es la herramienta con la que se hace. Cada vez que una regla que vivía en la memoria pasa a un test de este archivo, el proyecto se volvió un poco más difícil de romper — sin que nadie tenga que recordarla.

---

## Cómo se instala en un proyecto

Son dos pasos: **copiar el kit** y **cablear el hook**.

### 1. Copiar el kit al proyecto

Copia este folder `candados/` a la raíz de tu proyecto. Deja `conformance.test.ts` donde tu corredor de tests lo encuentre (con vitest, un archivo `*.test.ts` en el repo alcanza).

El proyecto necesita tener instalado su corredor de tests. En el stack de referencia (TypeScript) eso es **vitest**:

```bash
npm install -D vitest
```

> **Nota de stack.** La implementación de referencia está en TypeScript + vitest porque es el stack de los proyectos de Raw Logic y porque se lee fácil. Pero el TS **no es** el método — es una cáscara. Lee la sección de abajo antes de asumir que necesitas Node.

### 2. Cablear el pre-commit

El candado solo protege si **corre solo**. Copia `pre-commit.sample` al hook de git de tu proyecto (las instrucciones exactas están dentro de ese archivo). A partir de ahí, cada `git commit` corre los candados antes de guardar: si uno falla, **el commit no pasa**.

Ese es el momento en que el método deja de depender de tu disciplina. No tienes que acordarte de correr nada: la puerta se cierra sola.

---

## Verificar el kit por su cuenta (sin atarlo a ningún proyecto)

El kit trae su propio `package.json` y `tsconfig.json` **mínimos**, para un solo fin: que se pueda **verificar solo**, sin pedirle prestado el corredor de tests a ningún proyecto. Una herramienta pensada para muchos proyectos no puede depender de uno.

```bash
cd candados/
npm install         # instala typescript + vitest, solo para verificar el kit
npm run typecheck   # compila los .ts (verificación independiente, sin ningún proyecto)
```

Si `typecheck` sale limpio, el kit **compila sano** — de forma independiente, en cualquier máquina, sin pedirle prestado el toolchain a ningún proyecto.

Un matiz honesto: standalone solo se verifica que **compila**. Los tests (`npm test` → `vitest`) necesitan un proyecto con documentos que revisar (una ficha de cobertura, un prompt de arranque) — sin eso no tienen contra qué correr. O sea: **compilar** se verifica solo; que los candados **frenen de verdad** se ve cuando el kit vive en un proyecto (ver la "prueba de que quedó bien portado" más abajo). **Al copiar `candados/` a TU proyecto**, usas su `tsconfig` y su corredor de tests; estos dos archivos son para el kit en sí y no hace falta llevarlos.

---

## Cómo portar el arnés a otro stack

Esto importa, así que va sin rodeos: **el valor del candado no es el código TypeScript. Es el patrón.** El código de referencia se lee bonito y corre en Node, pero si tu proyecto es Python, Go, Ruby, PHP o lo que sea, **no copies el `.ts`** — copias la idea, que es de una sola línea:

> **Un candado es un test que LEE archivos del repo y FALLA A PROPÓSITO cuando una regla del método se rompe.**

Eso es todo. No hay nada de Node en esa frase. Cualquier lenguaje que sepa leer un archivo de texto y cortar un proceso con un error puede tener candados. Lo único que estás portando es *dónde vive la puerta*, no *de qué está hecha*.

### El mapa: dónde cae cada pieza en tu stack

Los dos candados genéricos (cobertura y arranque) hacen tres cosas: **leer archivos**, **comparar contra la regla** y **frenar el commit si no calza**. Así se traduce cada pieza:

| Pieza del patrón | En TypeScript (referencia) | En Python | En Go | En cualquier CI, sin lenguaje |
|---|---|---|---|---|
| El candado | un `it(...)` en un `*.test.ts` con vitest | una función `test_...` con pytest | un `func TestConformance(t *testing.T)` | un script (`bash`, lo que sea) |
| Leer los archivos del repo | `readFileSync` / `readdirSync` | `open()` / `os.listdir` | `os.ReadFile` / `os.ReadDir` | `cat`, `grep`, `ls` |
| Comparar contra la regla | `expect(...).toEqual(...)` | `assert ...` | `if ... { t.Fatal(...) }` | un `if` que revisa la salida |
| Frenar el guardado | vitest devuelve código ≠ 0 | pytest devuelve código ≠ 0 | `go test` devuelve código ≠ 0 | `exit 1` |
| Correrlo solo en cada commit | `pre-commit.sample` → hook de git | el **mismo** `pre-commit.sample` | el **mismo** `pre-commit.sample` | el **mismo** `pre-commit.sample` |

La última fila es la clave que a veces se pasa por alto: **el hook de git no cambia entre stacks.** Un candado protege solo si corre solo, y lo que lo dispara es el pre-commit — que no es más que un script que llama a tu corredor de tests. Cambias *la línea que corre los tests* (de `npx vitest run` a `pytest` o `go test` o `./candados.sh`) y el resto del hook queda igual. Ver `pre-commit.sample`.

### La regla que no puede fallar al portar

Sea cual sea el lenguaje, un candado **tiene que cortar el proceso con un código de salida distinto de cero cuando la regla se rompe.** Ese es el único detalle no negociable: si el candado "revisa" pero termina en éxito igual, no es una puerta, es un adorno. En TypeScript lo hace vitest por ti; en un script a mano lo haces tú con `exit 1`. Si tu candado no puede reprobar, no es un candado.

### Prueba de que quedó bien portado

Rompe la regla a propósito una vez. Deja una clave del checklist en `[ ]` en una ficha cerrada, o borra la mención de un documento base del prompt de arranque, e intenta guardar. **Si el commit pasa, tu candado está mintiendo** y hay que arreglarlo antes de confiar en él. Si el commit se frena con un mensaje que un no-ingeniero entiende, quedó. Este mismo paso vale para el stack de referencia y para cualquier port.

---

## La honestidad: dónde termina el arnés

Este kit es poderoso, pero **no lo hace todo**, y fingir que sí sería su propia forma de deuda. Dos límites, dichos de frente:

### Algunos candados son específicos de tu proyecto

`conformance.test.ts` trae dos candados **genéricos** (sirven a cualquier proyecto que use el método): cobertura y arranque. Pero los candados más valiosos son los que **nacen de tus propios bugs**: cada vez que la auditoría encuentra una clase de error, la lección se destila a un candado que la mata para siempre.

Esos no vienen en el kit — no pueden, porque son tuyos. Lo que el kit trae es **el patrón para escribirlos**: eso es `candado-plantilla.ts`, y en `conformance.test.ts` hay una sección marcada **"AGREGA TUS CANDADOS DEL PROYECTO ACÁ"**. El arnés arranca con dos candados y crece con cada auditoría. Un proyecto maduro tiene decenas, todos tejidos a su medida.

> Este es el motor del método en acción: **de cada problema, una regla — no solo un parche.** El parche cierra el caso; el candado cierra la clase entera. Por eso la auditoría, con el tiempo, encuentra cada vez menos cosas mecánicas: ya no llegan, el candado las frena antes.

### El arnés NO reemplaza el juicio

Un candado revisa lo que le enseñaste a revisar. **No razona sobre lo que no se le ocurrió a nadie.** Los agujeros de lógica sutiles, si dos reglas correctas se contradicen al combinarse, si el flujo tiene sentido para el negocio, si el resultado logró el objetivo que se buscaba — nada de eso lo caza un test.

Todo eso sigue siendo **revisión adversaria** (capa 👁): un agente fresco o una persona que ataca el código asumiendo que está roto. El arnés se ocupa de lo mecánico para que la revisión pueda gastar su energía en lo difícil de verdad. Los dos se necesitan. Un proyecto con candados pero sin auditoría adversaria está cubierto contra sus errores viejos y ciego frente a los nuevos.

---

*The Raw Method · Raw Logic · No fluff. No licenses. No surprises.*
