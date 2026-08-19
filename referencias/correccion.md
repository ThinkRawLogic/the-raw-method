# El protocolo de corrección (cómo se implementa un arreglo)

> **El nombre, para que no se confunda con otra cosa del método.** Esto se llama **el protocolo de
> corrección** — así, siempre, en todo el método. **No son "pilares":** los pilares son los **16 ángulos**
> que se revisan (`pilares.md`). Aquéllos dicen *qué mirar*; éste dice *cómo se toca el código una vez que
> ya encontraste el problema*. Dos cosas distintas, dos nombres distintos.

La auditoría adversaria termina en un **hallazgo**. Ahí se acaba lo que cubren `auditoria-adversaria.md` y los
16 pilares — y ahí empieza la parte más peligrosa del trabajo: **implementar el arreglo**. Un hallazgo bien
cazado y mal corregido deja el sistema peor que antes, porque además viene con la etiqueta de "revisado".

Este documento es lo que corre **entre el hallazgo y el commit**.

---

## 1. La premisa, en las palabras del dueño

Es una regla dictada, no derivada. Va literal:

> *«Al momento de implementar una solución o una corrección, se miraba todo el ecosistema, para entender cómo
> los cambios que se pretendían hacer afectaban no sólo el proceso específico, sino todas aquellas cosas que
> dependían o se desprendían de ese proceso. De esa manera, al momento de implementar los cambios, se reducía
> la oportunidad de generar daños colaterales. Al mismo tiempo, no sólo se evaluaba lo que no funcionaba, sino
> que se debía asegurar de lo que sí estaba funcionando bien, para asegurar que los cambios no afectaran esos
> procesos. Por último, cada vez que se encontraba un área de mejora, se debía analizar por qué se creó esa
> área (qué se dejó de hacer o qué se hizo mal) para no repetir ese error en el futuro.»*

Y el reparto de papeles, del mismo dueño:

> *«Añadiría que otro agente, no tú, sea quien implemente las correcciones con la premisa anterior.»*

**Que haya hecho falta dictarla es el dato.** En el proyecto donde nació se repitió **tres veces en dos días**,
y la tercera fue después de que un arreglo rompiera la funcionalidad principal de un bloque. Una regla que hay
que repetir tres veces no se sostiene sola: por eso está escrita acá y por eso tiene un candado.

---

## 2. Las tres obligaciones

Las tres van **antes** de escribir el arreglo. No después, no "si da el tiempo".

### Obligación 1 — El ECOSISTEMA, no el proceso

Antes de tocar nada, enumera **qué depende de lo que vas a tocar** y **qué se desprende de ello**. No el
proceso específico: todo lo que cuelga de él.

🔴 **Y cómo se busca importa más que el hecho de buscar.** Se busca **por la FORMA del defecto sobre todo el
código** — no sobre una lista de archivos armada con tu propia hipótesis. Un grep construido desde la hipótesis
esconde justamente lo que hay que encontrar: encuentra lo que ya sabías y confirma que no hay más.

> **Un hallazgo señala UN lugar, no una clase.** El informe rojo te da una dirección; los hermanos del defecto
> casi nunca están en esa dirección. Buscarlos es tu trabajo, no el del informe.

### Obligación 2 — Asegurar lo que SÍ funciona

Arreglar lo roto es la mitad. La otra mitad es **probar que lo sano sigue sano** después del cambio.

🔴 **"Revisé" no es una respuesta.** La respuesta es **cómo lo probaste**: qué test corriste, qué pantalla
abriste, qué consulta comparaste antes y después. Un arreglo sin esta mitad no es un arreglo: es una apuesta
con el sistema de otro.

### Obligación 3 — Por qué NACIÓ el hueco

Cada área de mejora tuvo un origen: **qué se dejó de hacer, o qué se hizo mal**. Sin esta pregunta se arregla
el caso y vuelve la clase.

Y la extensión que la hace útil: **¿esa causa vive en otro lado?** Si el hueco nació porque nadie verificó la
fecha de una fuente, o porque una regla vivía en la pantalla en vez de en el motor, esa misma omisión está
repetida en algún otro sitio. El arreglo completo la busca ahí también.

> Esta obligación es la que conecta con el motor del método —*de cada problema, una regla*— pero apunta al
> otro extremo: el motor mira **hacia adelante** (qué candado impide que vuelva); la obligación 3 mira **hacia
> atrás** (qué faltaba el día que nació).

---

## 3. Las cuatro reglas que las acompañan

| # | La regla | Por qué existe |
|---|---|---|
| **R1** | **Quien corrige NO es quien auditó, y NO es quien construyó el defecto.** | El que construyó arrastra el modelo mental que produjo el defecto: vuelve a mirar donde ya miró. El que auditó está casado con su propio hallazgo y corrige *ese*, no la clase. |
| **R2** | **La premisa viaja ESCRITA en el encargo del agente que corrige** — nunca implícita. | Un candado comprueba que algo *existe*, no que se *cumpla*. Si las tres obligaciones no están en el prompt, no se aplican: el agente no las conoce. |
| **R3** | **El coordinador arma el encargo y verifica; no ejecuta.** | Reparto de papeles explícito, no buena voluntad. El que coordina ya leyó el hallazgo y ya se formó una opinión: si además corrige, corrige su opinión. |
| **R4** | **La clave `(ecosistema)` de la ficha de cobertura**, con las tres obligaciones respondidas por escrito + **control positivo**. | Es el único punto donde esto se hace **exigible en el `git commit`**. Sin ella, todo lo de arriba es 📖 — memoria, la capa más débil. |

### El encargo de corrección (R2 + R3, hecho artefacto)

El coordinador no dice *"arreglá esto"*. Arma un encargo con **cuatro partes fijas** — copiable tal cual:

```
HALLAZGO      — qué está mal, en una frase.
EVIDENCIA     — archivo:línea, el test que falla, la consulta que lo muestra. No una descripción: el puntero.
LA PREMISA    — las tres obligaciones, escritas acá (no "seguí el método"):
                1. Enumerá qué depende de lo que vas a tocar. Buscá por la FORMA sobre TODO el código,
                   no sobre una lista armada con tu hipótesis.
                2. Probá que lo que ya funcionaba sigue funcionando, y decí CÓMO lo probaste.
                3. Decí por qué nació el hueco (qué se dejó de hacer) y si esa causa vive en otro lado.
QUÉ NO SE PUEDE ROMPER — la lista corta de lo que este arreglo NO debe tocar, con su prueba.
```

La cuarta parte es la que casi siempre falta y la que más caro sale: sin ella el agente que corrige **no sabe
qué está protegiendo**, así que la obligación 2 le queda como una pregunta abstracta.

### El control positivo (la mitad de R4 que nadie corre)

Un candado que no se pone **rojo** al reintroducir el defecto no es un candado. Por eso, cada arreglo:

1. se revierte a propósito,
2. se comprueba que su prueba/candado **falla**,
3. se vuelve a aplicar.

🔴 Y se corre **por el camino más probable de falla, no por el cómodo.** Comprobar que el arreglo *existe* —que
el import está, que el archivo se escribió— no es comprobar que *funciona*.

> *`medido: 2026-08-13`* — en una tanda de tres arreglos, **dos estaban mal**, y los seis candados del proyecto
> (tipos · linter · 219 pruebas unitarias · 190 de integración · auditor 7/7 · build) salieron **todos verdes**.
> Verde no es terminado: verde es "lo que el candado mide, pasa".

---

## 4. Qué se automatiza y qué NO (y se declara)

| Qué | Capa | Mecanismo |
|---|---|---|
| Que las tres obligaciones estén **respondidas por escrito** al cerrar | 🤖 | La clave `(ecosistema)` de la ficha. `raw-gate` rechaza el `git commit` si queda muda (fichas `raw-ficha: v5`) |
| Que **no se declare N/A** un bloque que sí corrigió algo | 🤖 | Si el 50/50 de la ficha trae una debilidad `[objetiva-arreglada]`, hubo corrección → `(ecosistema)` no puede ser N/A |
| Que la respuesta sea **verdadera** | 👁 | **No se puede automatizar, y se dice.** El candado comprueba que la respuesta EXISTE, no que sea cierta |
| Que quien corrige sea **otro** (R1) | 👁 | Se declara en la nota de la clave (*"corrigió: …"*). El campo `Auditó` de la ficha ya cubre la independencia del **auditor**; la del **corrector** es declaración |

🔴 **Esa tercera fila no es una excusa: es la regla del método.** *Lo que se pueda automatizar se automatiza; lo
que es juicio se declara — nunca se disfraza de candado.* Fingir que una casilla verifica el criterio de alguien
sería exactamente el defecto que el control positivo persigue.

**Residuo declarado (👁):** la máquina no distingue una respuesta trabajada de una respuesta escrita para pasar
el candado. Ese piso lo sostienen el auditor independiente y el OK del dueño, no el `git commit`.

---

## 5. Los tres casos que parieron cada regla

No son ilustraciones: son las tres veces que el método falló sin este protocolo.

**1. El hallazgo que señaló uno de cuatro** — *`medido: 2026-08-13`*
De **4 sitios** que compartían el mismo defecto, el informe rojo nombró **uno**. Dos aparecieron al grepear el
módulo entero **después** de arreglar, y el cuarto al releer los residuos ya declarados en la propia ficha.
→ **obligación 1**: el ecosistema, buscado por la forma y sobre todo el código.

**2. La clase que se declaró muerta tres veces** — *`medido: 2026-08-13`*
En el mismo bloque, una clase de defecto se declaró cerrada **tres veces** y las tres seguía viva. La pata
común: **corregía el mismo que había construido**, y volvía a mirar desde el ángulo que ya había mirado.
→ **regla R1**: quien corrige no es quien construyó.

**3. Las cuatro conclusiones sobre una fuente vieja** — *`medido: 2026-08-18`*
Cuatro conclusiones de un mapeo se desmintieron porque **la fuente estaba vieja** (~8 meses) y nadie comprobó
su frescura antes de discutirla. El defecto no fue leer mal: fue leer bien algo que ya no corre.
→ **obligación 3**: por qué nació el hueco — no se verificó la fecha de la fuente. La regla que salió de ahí
subió a la cadena de una afirmación como su eslabón cero: **frescura → existencia → dirección → magnitud**
(`auditoria-adversaria.md` §2).

---

## 6. Dónde encaja en el ritual

- **Al auditar** → `auditoria-adversaria.md` produce el hallazgo. Termina ahí, a propósito.
- **Al corregir** → este documento. El coordinador arma el encargo (§3), otro agente lo ejecuta con las tres
  obligaciones escritas, el coordinador verifica.
- **Al cerrar** → la clave `(ecosistema)` de la ficha (`plantillas/ficha-cobertura.md`) recoge las tres
  respuestas + el control positivo + quién corrigió. El paso 2 de `comandos/cerrar-bloque.md` lo exige.

---

*The Raw Method · Raw Logic · No fluff. No licenses. No surprises.*
