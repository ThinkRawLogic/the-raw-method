# Ficha de cobertura — bloque [Nº / nombre]
<!-- raw-ficha: v3 -->  <!-- NO borrar: activa el candado del "OK informado" (sección "Qué revisar"). -->


> **Plantilla de The Raw Method.** Al CERRAR un bloque de trabajo, copia esta ficha y **resuelve cada clave**:
> márcala `[x]` y **reemplaza el `___` de esa clave** con tu nota de CÓMO se cumplió (o `N/A — <por qué no aplica>`).
> Una clave en `[ ]`, o con su `___` **sin llenar**, no cuenta como cerrada — y el candado la caza.
>
> **Por qué existe (candado 🤖):** la lista de claves la impone ESTA plantilla, **no quien programa** — así no
> se puede "olvidar" un ángulo. Idealmente, un test hace **fallar el cierre** si un bloque no tiene su ficha
> o deja una clave muda. Es la forma de que la auditoría no dependa de la memoria.
>
> No todas las claves aplican a todo bloque: un bloque de pura pantalla puede marcar `N/A` en concurrencia.
> Pero **N/A es una respuesta que hay que escribir**, no una clave que se saltea.

**Bloque:** ___________  **Fecha de cierre:** ___________

**Construyó:** ___________  **Auditó (agente fresco / distinto del que construyó):** ___________

**Rastro de auditoría (opcional, recomendado):** ___________  *(reporte del agente auditor, PR, o "flota: N rondas hasta secar")*

> **Por qué separadas:** el auditor **tiene que ser otro** — no el mismo que construyó. Refutar por defecto
> necesita ojos frescos: quien escribió el código arrastra los mismos supuestos con los que lo escribió, así
> que si se audita a sí mismo mira desde el mismo ángulo y se auto-aprueba. Si es una sola persona dirigiendo,
> igual: el pase de auditoría lo corre un **agente distinto** del que construyó, sin arrastrar su contexto.
> 🤖 **El candado lo exige:** "Auditó" debe estar lleno y ser **distinto** de "Construyó" — auto-auditarse no cierra el bloque. Si declarás un "Rastro de auditoría" que sea un archivo, tiene que existir.

---

## Claves (no borres ninguna)

- [ ] **(spec-leída)** Leí la referencia del bloque + el checklist ANTES de la primera línea. → ___
- [ ] **(orden)** Código limpio, sin duplicar, sin código muerto tras reemplazos; lo del cliente en config, no en el motor. → ___
- [ ] **(seguridad)** Identidad del servidor, entradas validadas, sin secretos en el código, aislamiento entre clientes. → ___
- [ ] **(experiencia)** Móvil primero, estados cargando/vacío/error, accesibilidad, sin urgencia falsa. → ___
- [ ] **(concurrencia)** Si toca dinero/stock: se traba la fila, huella de idempotencia, reversa segura. (o N/A) → ___
- [ ] **(errores)** Si algo falla, avisa claro y se aísla; nada de cero silencioso; log con identificador y sin secretos. → ___
- [ ] **(rastro)** Toda mutación deja quién/cuándo/qué; nada se borra de verdad; el saldo se deriva, no se guarda. → ___
- [ ] **(config)** Umbrales ajustables y apagables; se hacen cumplir en el motor, no solo en la vista. (o N/A) → ___
- [ ] **(aguante)** Índice junto a la consulta; sin N+1; proyectado a mucho volumen. (o N/A) → ___
- [ ] **(stack)** Usé la versión nueva leyendo su doc, no la API de memoria; el paquete existe y es el oficial. → ___
- [ ] **(dato)** Si toca migraciones/datos: es reversible, hay respaldo probado. (o N/A) → ___
- [ ] **(tests)** Hay un test que reproduce el escenario; si es un bug, su test de regresión. → ___
- [ ] **(auditoría)** La corrió un **revisor independiente** (agente fresco, distinto del que construyó): auditoría adversaria de los ángulos tocados, hallazgos pasados por las 3 lentes, cerrados o anotados. → ___
- [ ] **(docs)** Ley, backlog, bitácora y todo doc desfasado quedaron al día en este mismo cambio. → ___
- [ ] **(OK)** El dueño dio el visto bueno para cerrar. → ___

---

## Reporte honesto (50/50 — obligatorio al cerrar)

> Las tres secciones son obligatorias: sin ellas (con contenido real, no el `___`), el cierre está
> **incompleto**, no cerrado — **y el candado lo caza**. La cobertura de arriba dice *"revisé los ángulos"*;
> esto dice *"y acá está lo que quedó flojo"*. La mitad honesta que la cobertura no cubre.
>
> Regla del 50/50: la mitad es entregar lo pedido; la otra mitad es señalar lo débil y lo que falta.
> La ausencia de hallazgos **NO** es prueba de ausencia de bugs — decí dónde quedaste ciego.

### Fortalezas
___

### Debilidades / qué quedó corto o frágil
___

### Qué NO se alcanzó a probar (lo más importante)
___

---

## Qué revisar — para el dueño (obligatorio al cerrar, v3)

> Lista **corta, priorizada y en el idioma del dueño** de lo que ÉL puede verificar por su cuenta antes de dar el OK: mirar una pantalla, probar un flujo, confirmar un número. **Lo más importante primero.** Convierte el OK de un sello en una decisión.
>
> **El candado la exige** en toda ficha v3 (marcador `raw-ficha: v3` arriba): sin ella —o con la lista vacía— el cierre está **incompleto**, no cerrado. No juzga si la lista es *buena* (eso lo decide el dueño); garantiza que EXISTE.

___
