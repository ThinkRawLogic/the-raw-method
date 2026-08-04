# gobernanza/ — el candado del PROCESO (Niveles 1, 2 y 3)

> **Parte de The Raw Method.** Los `candados/` cierran clases de bug en el código. Esto cierra
> el hueco de más arriba: **que la IA (o vos, un viernes cansado) simplemente no corra el método.**

Nace de una pregunta honesta: *"se supone que las reglas son candados; la IA no debería poder
obviarlas."* La respuesta (ver `referencias/candados-y-capas.md §5`) es que **no toda regla puede
ser candado** — el juicio no se automatiza. Pero **sí** se pueden encerrar cosas que antes vivían
en prosa 👁, y eso es lo que hace este kit, en dos niveles.

---

## Nivel 1 — que la IA no pueda saltarse el método (hooks del harness)

| Pieza | Evento | Qué hace |
|---|---|---|
| `raw-session.js` | **SessionStart** | Si el proyecto usa The Raw Method, muestra un **banner visible** al usuario (`systemMessage`) e inyecta el **reflejo del método** en el contexto de la IA (`additionalContext`) en cada sesión, para que la IA no pueda "olvidar" que opera bajo él. Fuera de un proyecto Raw Method, calla. |
| `raw-gate.js` | **PreToolUse** (Bash/PowerShell) | Intercepta `git commit` y lo **RECHAZA** (exit 2) si una ficha de cobertura marcada como *cerrada* deja una clave sin resolver. También frena un commit que declara `[cierre]` sin ninguna ficha cerrada. |

Lo corre el **harness**, no la IA → la IA no puede decidir no correrlo. **No se evade con
`--no-verify`** (interceptamos el comando *antes* de git). No necesita vitest ni Node-en-el-proyecto:
usa el Node de tu máquina. Corre en tu Windows hoy, sobre un proyecto FoxPro/Supabase sin Node.

---

## Nivel 2 — que muerda sí o sí, aun sin la IA (CLI + CI)

El hook solo ve los commits que hace la IA vía Claude Code. El Nivel 2 cubre el resto:

| Pieza | Qué hace |
|---|---|
| `raw-check.js` | El **mismo** chequeo de cobertura, como **comando**: `node gobernanza/raw-check.js [dir]`. exit 1 si una ficha cerrada quedó sin resolver. Lo corre el CI y lo podés correr vos a mano. |
| `raw-links.js` | **Frescura documental**: `node gobernanza/raw-links.js [dir]`. Cobra la promesa que el método ya se hizo (*"un documento que dice algo que ya no es cierto es un bug"*, `referencias/documentos-vivos.md`) para las dos mentiras COMPROBABLES: **(1)** un doc que declara `§1–§N` sobre la ley cuando el máximo real es otro — el caso que se comió **17 reglas invisibles** en un proyecto real y recurrió en dos; **(2)** enlaces markdown relativos a archivos que se movieron. **Sólo avisa** (no bloquea) sobre prosa CONGELADA: `_archivo/`, `plantillas/`, `<details>` históricos y, para el rango, cualquier doc que no sea puntero vivo — una bitácora fechada dice §1–§69 porque *era cierto entonces*. No verifica "¿este párrafo dice la verdad?": eso es juicio, y disfrazar juicio de candado es lo que el método prohíbe. |
| `.github/workflows/raw-method.yml` | El candado a nivel **servidor**. Corre `raw-check` en cada **push y PR**, así cubre el **commit humano**, la **edición por la web de GitHub** y el **`git commit --no-verify`** (imposibles de frenar en local — el CI corre después, sobre lo ya guardado). |

**Para que el CI sea un candado de verdad** (no solo un aviso), activá *branch protection* en
`main` exigiendo el check **"The Raw Method — candado de cobertura"** como obligatorio: así un PR
con una ficha cerrada sin resolver **no se puede mergear**. (Ajustes → Branches → Add rule →
Require status checks to pass.)

> ⚠️ **Si no podés activarla, no es que lo hiciste mal.** En repos **privados de una organización
> con plan free**, GitHub no ofrece branch protection: la API contesta `403 — Upgrade to GitHub Pro
> or make this repository public`. Pasó en la propia flota de Raw Logic. Ojo con el consejo suelto
> de "comprá Pro": **Pro es un plan de cuenta personal y no habilita nada en los repos de una
> organización** — lo que aplica ahí es **Team**. Mientras tanto, el fallback es local y gratis: el
> **guard de rama** de `candados/pre-commit.sample` (ver *convivencia*, abajo). No son
> equivalentes y conviene saber por qué: el guard avisa **antes** de escribir el commit, funciona
> sin internet y se puede saltar (`--no-verify`); branch protection **no se puede saltar**, pero
> recién actúa al pushear. Son complementarios — declararlo es más honesto que fingir que uno
> reemplaza al otro.

---

## Convivencia — que dos personas (o dos proyectos) no se pisen

Los tres niveles de arriba responden *"¿se está siguiendo el método?"*. Esta capa responde otra
pregunta, que el método no cubría: **¿pueden dos personas —o dos proyectos en la misma máquina—
convivir sin romperse el trabajo?** Sale de hallazgos reales de la flota, no de teoría.

| Pieza | Dónde vive | Qué cierra |
|---|---|---|
| **Guard de rama** | `candados/pre-commit.sample` (opt-in: `touch .raw-rama-obligatoria`) | Con dos personas, la rama compartida es el punto de choque: el primero sube y el segundo rebota. En rama propia no pasa. Duerme si trabajás solo — una regla que estorba se arranca, y arrancada no protege a nadie. |
| **Respaldo con diagnóstico** | `candados/post-commit.sample` | Guardar y respaldar son **un solo acto**: cada commit se sube al instante. Y cuando no puede, dice **por qué**. |
| **Un puerto y una base por proyecto** | candado propio de cada proyecto (📖→🤖) | Dos instancias del mismo producto en una máquina peleando el puerto no fallan ruidosamente: la segunda toma otro y mirás el proyecto equivocado, que se ve idéntico. |

**El principio que vale aunque no copies un solo hook:**

> **Un aviso que nombra la causa equivocada es peor que no avisar.**

El respaldo decía *"(¿sin internet?)"* ante **cualquier** push fallido. Con una persona era casi
siempre cierto; con dos es falso —el remoto rechaza por divergencia, no por red— y manda a revisar
el wifi mientras el respaldo **no ocurre**. Aplica a todo mensaje de error, toda alarma y todo
candado que escribas: si el diagnóstico miente, el usuario resuelve el problema equivocado **con
confianza** y el real sigue abierto. Es el pilar de honestidad aplicado a las herramientas, no sólo
al producto. Corolario práctico: **la causa se averigua preguntándole al sistema, no leyendo el
texto del error** — ese texto cambia con el idioma y la versión, y leerlo es medir por la forma en
vez de por el contenido.

Lo reparte `raw-adopcion` (`convivencia-guard-rama`, `convivencia-respaldo`). Las dos son
`auto:false` a propósito —tocan el hook propio del proyecto y su comportamiento de push— y las dos
**sólo se reportan si el repo tiene 2+ committers**, medido en el historial: por realidad, no por
una bandera que alguien tiene que acordarse de poner.

> `raw-cobertura.js` es la lógica compartida por el hook y el CLI — una sola verdad del parser de
> fichas. Derivar, no duplicar (el propio pilar de datos del método).

---

## Nivel 3 — la sustancia: honestidad y auditor independiente

La cobertura verifica que se **revisaron** los ángulos. El Nivel 3 va por lo que la cobertura no ve.

**3.1 — Honestidad 50/50.** `SKILL.md` (L99) prometía un candado para el renglón **Fortalezas ·
Debilidades · Qué NO se alcanzó a probar** que no existía. Ahora la ficha lo trae obligatorio y
`raw-gate`/`raw-check` rechazan el cierre si falta o si las secciones quedaron vacías / de relleno.

**3.2 — Independencia del auditor.** El `(auditoría)` ya no lo firma el que construyó: la ficha exige
los campos **Construyó** y **Auditó** llenos y **distintos** (auto-auditarse no cierra el bloque), y si
declarás un **Rastro de auditoría** que sea un archivo, tiene que existir y no estar vacío.

> **Endurecido por un red-team adversario** del propio candado (le aplicamos la disciplina del método):
> se cazaron y corrigieron 15 bypasses / falsos-positivos — notas borradas que pasaban, secciones honestas
> con encabezado-con-sufijo que no se enforzaban, independencia burlada con un punto, `git -c … commit`
> que esquivaba el hook, y rotura retroactiva (ahora las fichas *legacy* sin campos v2 se grandfatherean).
>
> Techo honesto (§5): sigue siendo **forma reforzada**, no sustancia total. Exigimos que la debilidad esté
> *escrita* y que el auditor sea *nominalmente distinto* — no podemos probar que sea *la* debilidad real ni
> que el auditor sea *de verdad* independiente. La señal fuerte (que el harness escriba quién auditó) es
> out-of-band; ese es el piso irreducible del método.

---

## Instalar

Necesitás `node` en el PATH (Claude Code ya lo trae). Dos modos para los hooks:

**A) Global** — copiá esta carpeta a `~/.claude/raw-method/gobernanza/` y mergeá el bloque `hooks`
de `hooks.json` en `~/.claude/settings.json`, reemplazando `__GOBERNANZA__` por esa ruta absoluta.

**B) Por proyecto** — copiá esta carpeta dentro del proyecto y mergeá `hooks.json` en
`<proyecto>/.claude/settings.json`. Para el CI, copiá `.github/workflows/raw-method.yml` a la raíz
del proyecto (ajustando la ruta a `raw-check.js` si moviste la carpeta).

En ambos casos, marcá el proyecto como Raw Method con **cualquiera** de estos (basta uno): un
archivo `.the-raw-method` en la raíz, una carpeta `docs/_cobertura/`, un `INVARIABLES.md`, o el
`candados/conformance.test.ts`. Sin marcador, ni los hooks ni el CI se meten.

> Los hooks se leen al **arrancar** la sesión. Después de instalar, iniciá una sesión nueva
> (o `/resume`) para que el reflejo cargue.

---

## Probar que muerde

```bash
node gobernanza/test-gobernanza.js
```

Arma proyectos de mentira y verifica el veredicto del hook Y del CLI. Si sale en verde, el candado
del proceso funciona. Es la misma disciplina del método: **enforcement sin su prueba es prosa.**

---

## Lo que esto NO cierra (el techo honesto)

Fiel a `§5` del método, no fingimos que esto encierra todo:

- **Encierra la FORMA, no la SUSTANCIA.** El candado verifica que la ficha esté *resuelta*, no que
  la auditoría detrás de cada clave *haya ocurrido de verdad*. La IA sigue llenando su propia ficha;
  exigimos que no la deje muda, pero no le leemos la mente. Subir eso de "la IA dijo que auditó" a
  "hay un pase independiente en el expediente" es lo que FALTA del **Nivel 3**: registrar la corrida
  de un agente auditor **independiente**, para que el (auditoría) deje de ser autodeclarado. Sigue siendo 👁, con mejor rastro.
- **El CI cubre el servidor; el hook cubre a la IA; el `pre-commit` de `candados/` cubre tu commit
  local.** Los tres se complementan — ninguno solo alcanza. El CI es la red que atrapa lo que se
  escapó de las otras dos (incluido `--no-verify` local).
- **Node debe existir donde corre.** En tu máquina y en los runners de GitHub, sí. Si faltara, el
  hook falla-abierto (deja pasar) para no brickear commits — límite declarado, no candado silencioso.

*The Raw Method · Raw Logic · No fluff. No licenses. No surprises.*
