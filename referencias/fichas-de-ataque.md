# Fichas de ataque (grep-ready)

> **Referencia de The Raw Method.** Los pilares (`pilares.md`) explican *cómo atacar* cada ángulo en prosa.
> Esto lo baja a **patrones concretos que se pueden grepear**: para cada clase de bug, el patrón a buscar,
> un ejemplo **Vulnerable** y su versión **Segura**. Así la auditoría deja de ser "mirá con ojo crítico" y
> pasa a "corré estos greps y revisá cada hit". Es el formato que hace determinista lo que antes era juicio.
>
> Inspirado en las fichas de cyber-neo (regex + Vulnerable + Secure + mapeo). Cada ficha dice a qué **pilar**
> pertenece. Algunas ya tienen candado ejecutable en `gobernanza/` (marcado 🤖).

Uso rápido: `grep -rnE "<patrón>" src/` (o el buscador de tu editor). Un hit **no es** automáticamente un bug —
es un lugar a mirar con las 3 lentes. La ausencia de hits en una clase = esa clase la barriste de verdad.

---

## Seguridad (pilar 2)

### F-01 · Secreto hardcodeado 🤖
- **Pilar:** Seguridad · **Candado:** `gobernanza/raw-secrets.js`
- **Patrón:** `(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{8,}['"]` · llaves con prefijo (`AKIA`, `ghp_`, `sk-`, `sk-ant-`), connection strings `://user:pass@`
- **Vulnerable:** `const apiKey = "sk-" + "ant-abc123..."` · `DATABASE_URL=postgres://user:changeme@host/db`
- **Seguro:** `const apiKey = process.env.ANTHROPIC_API_KEY` (y el `.env` en `.gitignore`, y el valor rotado si se filtró)

### F-02 · Identidad que viene del cliente (suplantación)
- **Pilar:** Seguridad
- **Patrón:** `req\.(body|query|params)\.(userId|user_id|tenant|role|isAdmin)` usado para autorizar
- **Vulnerable:** `const userId = req.body.userId; cargarDatosDe(userId)`
- **Seguro:** `const userId = req.session.user.id` — la identidad sale del servidor, nunca del navegador

### F-03 · Monto/total que se confía al cliente
- **Pilar:** Seguridad · Dinero
- **Patrón:** `(total|amount|price|monto|precio)\s*=\s*(req|body|params|input)\.` · cobrar usando un número que mandó el front
- **Vulnerable:** `cobrar(req.body.total)`
- **Seguro:** `const total = recalcularEnServidor(carrito); cobrar(total)`

### F-04 · Falta aislamiento por cliente (multi-tenant)
- **Pilar:** Seguridad · **Candado:** patrón Tipo B en `candados/` (auto-enumera tablas con columna de cliente)
- **Patrón:** un `SELECT`/`find` sobre una tabla con datos de cliente **sin** filtro `tenant_id`/`cliente_id` (o sin RLS)
- **Vulnerable:** `SELECT * FROM facturas WHERE id = $1` (cualquiera ve la factura de cualquiera)
- **Seguro:** RLS en la base que rechaza el dato ajeno **por regla**, aunque el query se olvide del filtro

### F-05 · XSS — inyección de salida
- **Pilar:** Seguridad
- **Patrón:** `dangerouslySetInnerHTML` · `\.innerHTML\s*=` · `v-html` · `{!! ... !!}` (Blade) con dato de usuario
- **Vulnerable:** `el.innerHTML = producto.nombre` (si el nombre trae `<script>`, se ejecuta)
- **Seguro:** `el.textContent = producto.nombre` — se pinta como texto, nunca como código

### F-06 · SQL/NoSQL injection — inyección de entrada
- **Pilar:** Seguridad
- **Patrón:** query armada por concatenación: `"SELECT ... " + input` · `` `... ${input}` `` dentro de SQL · `.query("... "+`
- **Vulnerable:** `db.query("SELECT * FROM u WHERE mail='" + email + "'")`
- **Seguro:** `db.query("SELECT * FROM u WHERE mail = $1", [email])` — parametrizado

---

## Dinero y concurrencia (pilares 2, 4)

### F-07 · Comparación de dinero con float
- **Pilar:** Concurrencia · Ciclo de Vida del Dato
- **Patrón:** `0\.1|parseFloat\(.*(precio|monto|total)` · comparar/sumar dinero como `number` decimal
- **Vulnerable:** `if (saldo === 0.30)` (0.1+0.2 !== 0.3 en float)
- **Seguro:** trabajar en **centavos enteros** (`3000`), o un tipo decimal exacto

### F-08 · Operación de dinero sin traba/idempotencia (doble-tap)
- **Pilar:** Concurrencia
- **Patrón:** endpoint de pago/cobro sin `SELECT ... FOR UPDATE`, sin lock, sin huella de idempotencia
- **Vulnerable:** `saldo = saldo - monto; save()` (dos clics rápidos lo aplican dos veces)
- **Seguro:** traba la fila (`FOR UPDATE`) + una **huella de idempotencia** (misma request no se aplica dos veces)

---

## Errores y observabilidad (pilar 5)

### F-09 · Catch silencioso (cero en silencio)
- **Pilar:** Errores & Observabilidad
- **Patrón:** `catch\s*\([^)]*\)\s*\{\s*\}` · `except.*:\s*pass` · `.catch(() => {})`
- **Vulnerable:** `try { cobrar() } catch (e) {}` (el fallo se traga, nadie se entera)
- **Seguro:** logueá con identificador (sin datos personales) y propagá/manejá; nada de tragar en silencio

### F-10 · Secreto o dato personal en el log
- **Pilar:** Errores · Privacidad
- **Patrón:** `console\.log\(.*(password|token|secret|card|dni|email)` · `logger.*\.(body|user)\b`
- **Vulnerable:** `console.log("login", req.body)` (loguea la contraseña)
- **Seguro:** logueá un id de correlación y campos no sensibles; nunca el secreto ni el PII crudo

---

## Aguante (pilar 8)

### F-11 · N+1 (consulta dentro del loop)
- **Pilar:** Aguante & Operabilidad
- **Patrón:** un `await`/query **dentro** de un `for`/`map` sobre filas
- **Vulnerable:** `for (const p of pedidos) { p.cliente = await getCliente(p.clienteId) }`
- **Seguro:** una sola query con `IN (...)`/`join`, o un `dataloader` que batch-ea

### F-12 · Consulta a tabla que crece sin índice
- **Pilar:** Aguante
- **Patrón:** `WHERE <col> =` sobre una columna sin índice en una tabla que crece; `ORDER BY` sin índice
- **Vulnerable:** `SELECT * FROM movimientos WHERE cuenta_id = $1` (sin índice en `cuenta_id`)
- **Seguro:** índice en la columna del `WHERE`/`ORDER BY`; probado proyectado a mucho volumen

---

> **De cada hit confirmado, una regla — no solo un parche** (el motor del método). Cuando una de estas clases
> te muerde, destilala a un candado 🤖 en `gobernanza/`/`candados/` para que no vuelva a llegar a la auditoría.
> Agregá tus propias fichas acá con el mismo formato: patrón + Vulnerable + Seguro + pilar.

*The Raw Method · Raw Logic · No fluff. No licenses. No surprises.*
