#!/usr/bin/env node
/**
 * raw-cobertura.js — lógica compartida de los candados (cobertura + honestidad + auditoría).
 * =========================================================================================
 * The Raw Method · la usan el hook (raw-gate.js) y el CLI/CI (raw-check.js). Una sola verdad
 * del parser de fichas — derivar, no duplicar. No hace I/O de proceso (ni exit ni print).
 *
 * Endurecido tras un red-team adversario del propio candado (buscar bypasses y falsos
 * positivos): notas borradas, encabezados de sección con sufijo, independencia burlada con
 * puntuación, rutas con underscore, .md que no son fichas, y rotura retroactiva de repos viejos.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const CLAVES_CANONICAS = [
  'spec-leída', 'orden', 'seguridad', 'experiencia', 'concurrencia', 'errores',
  'rastro', 'config', 'aguante', 'stack', 'dato', 'tests', 'auditoría', 'docs', 'OK',
];

// Claves que suma la v5 (el protocolo de corrección). DELIBERADAMENTE fuera de CLAVES_CANONICAS,
// por dos razones que romperían repos ajenos si se mezclaran:
//   · toda ficha v1–v4 YA CERRADA pasaría a "le falta una clave" (rotura retroactiva);
//   · esFicha() usa CLAVES_CANONICAS para decidir qué .md es una ficha — y hay proyectos con su
//     propio juego de claves que YA usan (ecosistema); entrarían por la puerta de atrás y se les
//     exigirían las 15 canónicas que nunca tuvieron.
const CLAVES_V5 = ['ecosistema'];

const MARCADORES = ['.the-raw-method', 'docs/_cobertura', '_cobertura', 'candados/conformance.test.ts', 'INVARIABLES.md'];

/** Sube por los padres buscando la raíz del proyecto-método (como git encuentra su raíz). */
function metodoRoot(dir) {
  let d = path.resolve(dir || '.');
  for (let i = 0; i < 40; i++) {
    for (const m of MARCADORES) {
      try { if (fs.existsSync(path.join(d, m))) return d; } catch (_) {}
    }
    const padre = path.dirname(d);
    if (padre === d) break;
    d = padre;
  }
  return null;
}
function isMethodProject(dir) { return metodoRoot(dir) !== null; }

// Una ficha "v2" queda sujeta a los candados de honestidad (3.1) y auditoría (3.2). Las viejas
// (solo 15 claves) se auditan solo por cobertura — así adoptar el cambio no brickea repos
// existentes. Basta que la ficha traiga CUALQUIER parte v2 para exigir que estén todas.
// ponytail: soft-gate deliberado. Una ficha sin NINGUNA parte v2 es una ficha "legacy" visible
// (sin rastro de auditor), no un bypass silencioso; la plantilla y el reflejo empujan a la v2.
function esV2(texto) {
  return /#{1,6}\s*Reporte honesto/i.test(texto) ||
         /\*\*Construyó[^:]*:\*\*/i.test(texto) ||
         /\*\*Auditó/i.test(texto);
}

// El marcador `raw-ficha: vN` (lo estampa la plantilla) es MONOTÓNICO: v4 ⊇ v3 ⊇ … Cada versión
// activa un candado más, y una versión mayor hereda los de las menores (por eso esV3 acepta v3+).
// Así adoptar el cambio no brickea fichas ya cerradas (soft-gate deliberado, como esV2).
function versionFicha(texto) {
  const m = (texto || '').match(/raw-ficha:\s*v(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}
// v3: CANDADO DEL OK INFORMADO (3.3) — la lista "Qué revisar".
function esV3(texto) { return versionFicha(texto) >= 3; }
// v4: CANDADO DE DISPOSICIÓN DE DEBILIDADES (3.4) — ninguna debilidad del 50/50 queda colgando:
// cada una lleva su disposición. Lo objetivo se resuelve; lo subjetivo es del dueño (no se autocorrige).
function esV4(texto) { return versionFicha(texto) >= 4; }
// v5: CANDADO DEL PROTOCOLO DE CORRECCIÓN (3.5) — la clave (ecosistema): al IMPLEMENTAR un arreglo,
// las tres obligaciones respondidas por escrito (ver referencias/correccion.md).
function esV5(texto) { return versionFicha(texto) >= 5; }

// C26: una ficha CERRADA en o después de esta fecha NO puede degradarse al formato "legacy"
// (sin honestidad ni auditor) para esquivar esos candados. Antes de la fecha el grandfathering
// sigue vigente → no brickea fichas viejas (B1–B15). Cierra el bypass: cerrar un bloque NUEVO
// con el formato pre-v2 y colarse solo con cobertura.
const ADOPCION_V2 = '2026-07-25';
function fechaFuerzaV2(f) {
  const m = (f.fecha || '').match(/^\d{4}-\d{2}-\d{2}/);
  if (!m) return true; // fecha NO-ISO en una ficha cerrada → no se puede probar que es vieja → forzar v2 (C26)
  return m[0] >= ADOPCION_V2;
}

/** Parsea una ficha: si está cerrada, y por clave si está marcada y si su NOTA quedó muda. */
function parseFicha(texto, archivo) {
  // CRLF → LF EN LA PUERTA (una sola vez, para todos los chequeos que leen f.texto).
  // En JS el `.` NO matchea los terminadores de línea, y `\r` es uno: con finales CRLF el
  // `(.*)$` de la regex de claves no llega al final y NINGUNA clave parsea → esFicha() da
  // false → la ficha entera queda INVISIBLE para el gate. El candado no falla: DESAPARECE
  // en silencio, que es peor. (medido: 2026-08-18 — misma ficha, LF: 15 claves / CRLF: 0.)
  // Un `.md` escrito en Windows llega así de fábrica, así que no era un caso raro.
  texto = (texto || '').replace(/\r\n/g, '\n');
  // [ \t]* (no \s*) para no cruzar el salto de línea y capturar la línea siguiente como "fecha".
  const mFecha = texto.match(/Fecha de cierre:\**[ \t]*([^\n]*)/i);
  const valorFecha = (mFecha && mFecha[1] ? mFecha[1] : '').replace(/[_*\s]/g, '');
  const cerrada = valorFecha.length > 0;

  const claves = new Map();       // clave -> marcada (bool)
  const notaFaltante = new Set(); // claves cuya NOTA quedó vacía
  const notas = new Map();        // clave -> texto de la nota (para el router C3: ¿es N/A?)
  // Acepta marcadores de lista -, * o +. Captura el resto de la línea (la nota) en m[3].
  const re = /^\s*[-*+]\s*\[( |x|X)\]\s*\*\*\(([^)]+)\)\*\*(.*)$/;
  for (const linea of texto.split('\n')) {
    const m = re.exec(linea);
    if (!m) continue;
    const clave = m[2].trim();
    claves.set(clave, m[1].toLowerCase() === 'x');
    // La NOTA es lo que sigue a la flecha (→ o ->); si no hay flecha, todo el resto.
    // Muda si, tras quitar relleno (_ * espacios), queda vacía. Así se caza tanto el "___"
    // sin llenar COMO la nota borrada del todo, sin falso-positivo por un "___" dentro de
    // texto real (una URL, p.ej.), porque ahí quedan caracteres reales.
    let notaRaw = m[3] || '';
    const am = notaRaw.match(/(?:→|->)\s*([\s\S]*)$/);
    if (am) notaRaw = am[1];
    notas.set(clave, notaRaw.trim());
    const nota = notaRaw.replace(/[_*\s]/g, '');
    if (nota.length === 0) notaFaltante.add(clave);
  }
  return { archivo, cerrada, fecha: valorFecha, claves, notas, notaFaltante, texto };
}

/** ¿Este .md es de verdad una ficha? (tiene al menos una clave canónica). Evita tratar un README como ficha. */
function esFicha(f) { return CLAVES_CANONICAS.some((c) => f.claves.has(c)); }

function problemasDeFicha(f) {
  const out = [];
  for (const clave of CLAVES_CANONICAS) {
    if (!f.claves.has(clave)) out.push(`falta la clave (${clave})`);
    else if (f.claves.get(clave) === false) out.push(`(${clave}) quedó en [ ] pero el bloque se declaró cerrado`);
    else if (f.notaFaltante.has(clave)) out.push(`(${clave}) está marcada [x] pero su nota quedó vacía (escribí el CÓMO, o "N/A — por qué")`);
  }
  return out;
}

// --- Honestidad (3.1) -------------------------------------------------------
// El [^\n]* al final consume TODO el encabezado (incluido un sufijo como "Debilidades / qué
// quedó corto"), para que el cuerpo arranque recién en la línea siguiente. Sin esto, el texto
// del propio título se filtraba al cuerpo y las secciones con sufijo nunca se marcaban vacías.
const SECCIONES_HONESTIDAD = [
  { nombre: 'Fortalezas', re: /(^|\n)\s*#{1,6}\s*Fortalezas[^\n]*/i },
  { nombre: 'Debilidades', re: /(^|\n)\s*#{1,6}\s*Debilidades[^\n]*/i },
  { nombre: 'Qué NO se probó', re: /(^|\n)\s*#{1,6}\s*Qu[eé]\s+NO\s+se\b[^\n]*/i },
];
// ponytail: piso heurístico anti-relleno. No prueba honestidad (es semántico) — solo corta el
// bypass de 1 carácter. La honestidad real la juzga el auditor. Umbral tuneable.
const MIN_CUERPO_HONESTO = 3;

function problemasDeHonestidad(texto) {
  const out = [];
  const t = texto || '';
  for (const s of SECCIONES_HONESTIDAD) {
    const m = t.match(s.re);
    if (!m) { out.push(`falta la sección honesta "${s.nombre}" (Fortalezas / Debilidades / Qué NO se probó son obligatorias al cerrar)`); continue; }
    const rest = t.slice(m.index + m[0].length);
    const corte = rest.search(/\n\s*(?:#{1,6}\s|---|\*\*(?:Construy|Audit|Fecha de cierre|Rastro))/i); // corta en encabezado, --- o CAMPO conocido (no cualquier **negrita**, que puede ser contenido real)
    const cuerpo = (corte === -1 ? rest : rest.slice(0, corte)).replace(/[^\p{L}\p{N}]/gu, '');
    if (cuerpo.length < MIN_CUERPO_HONESTO) out.push(`la sección honesta "${s.nombre}" está vacía o es de relleno (reemplazá el "___" con algo real)`);
  }
  return out;
}

// --- OK informado (3.3): la lista de "qué revisar" para el dueño ------------
// Solo se exige en fichas v3 (marcador `raw-ficha: v3`). Presencia + anti-relleno, igual
// que honestidad: el candado garantiza que la lista EXISTE y no está vacía; su CALIDAD la
// juzga el dueño (es su lista de verificación antes del OK). No hay forma de automatizar
// "¿es una buena lista?" — eso queda 👁; acá se corta el bypass de cerrar sin lista.
const SECCION_REVISION = { nombre: 'Qué revisar', re: /(^|\n)\s*#{1,6}\s*Qu[eé]\s+revisar[^\n]*/i };
function problemasDeRevision(texto) {
  const out = [];
  const t = texto || '';
  const m = t.match(SECCION_REVISION.re);
  if (!m) { out.push('falta la sección "Qué revisar — para el dueño" (obligatoria al cerrar una ficha v3: la lista corta de lo que el dueño verifica antes de dar el OK)'); return out; }
  const rest = t.slice(m.index + m[0].length);
  const corte = rest.search(/\n\s*(?:#{1,6}\s|---|\*\*(?:Construy|Audit|Fecha de cierre|Rastro))/i); // corta en encabezado, --- o CAMPO conocido (no cualquier **negrita**, que puede ser contenido real)
  const cuerpo = (corte === -1 ? rest : rest.slice(0, corte)).replace(/[^\p{L}\p{N}]/gu, '');
  if (cuerpo.length < MIN_CUERPO_HONESTO) out.push('la sección "Qué revisar — para el dueño" está vacía o es de relleno (escribí la lista real de qué revisa el dueño antes del OK)');
  return out;
}

// --- Disposición de debilidades (3.4, fichas v4): ninguna debilidad queda colgando -----------
// La máquina revisa SÓLO el PROCESO y la FRONTERA de quién decide, NUNCA el gusto ("¿esto es una
// debilidad?" / "¿vale la pena?" es juicio, y disfrazar juicio de candado está prohibido):
//   · cada debilidad del 50/50 lleva su disposición (ninguna colgando);
//   · lo OBJETIVO (hay un hecho) se resuelve → `objetiva-arreglada` exige referencia al fix;
//   · lo SUBJETIVO (juicio de valor) es del DUEÑO → se TAGEA `subjetiva-dueño`, NO se autocorrige;
//     su aceptación es el OK del bloque (la clave `(OK)`, que ya se exige al cerrar).
// Residuo declarado: la máquina no detecta si el agente ETIQUETÓ MAL (subjetivo disfrazado de
// objetivo para justificar tocarlo). Sube el piso; el OK del dueño es la red final.
const DISPOSICIONES = ['objetiva-arreglada', 'objetiva-irreducible', 'subjetiva-dueño', 'diferida-dueño'];
// Ángulos OBJETIVOS-POR-DOMINIO (mismo criterio mecánico que el router C3: hay un hecho, no gusto).
// Si una debilidad en estos ángulos se etiqueta subjetiva/diferida-dueño, es el hueco donde un BUG se
// disfraza de "juicio del dueño" para no arreglarlo (Red Team 2026-08-04: bug de plata pasaba tageado
// subjetivo). No JUZGAMOS el gusto: exigimos un acuse explícito "(dominio-ok: …)" para que la decisión
// sea CONSCIENTE y auditable por el dueño, no un dodge silencioso.
const OBJETIVO_POR_DOMINIO = /\b(dinero|plata|pago|cobro|saldo|monto|importe|precio|factura|stock|inventario|concurren|at[oó]mic|idempot|race|deadlock|lock|seguridad|permiso|aislam|secreto|inyec|inject|xss|csrf|rls|\bauth)\b/i;

// ¿La descripción de una 'objetiva-arreglada' trae un PUNTERO concreto al fix (no un verbo suelto)?
// Un verbo NO alcanza: la prosa española lleva 'test' dentro de "protesta"/"testimonio" y 'arregl'
// dentro de "arreglarlo" (futuro) — aceptarlos dejaba pasar debilidades SIN resolver. Se exige
// evidencia señalable: hash git (hex con ≥1 letra, para no confundir con un decimal), commit/PR/#N,
// ticket ABC-123, o una URL de commit/pull.
function refFix(desc) {
  // La referencia va en un SLOT designado (tras "fix:" o "→"/"->", como modela la plantilla). Escanear
  // TODA la descripción por un "puntero" era intrínsecamente fugoso: "SHA-256 mal calculado, sin resolver"
  // pasaba (el token técnico matcheaba una rama laxa). Acotado al slot: la prosa de la descripción ya no
  // dispara. Y dentro del slot los hashes exigen letra Y dígito (no "acabada"), y los tickets/PR su
  // keyword (no "UTF-8"/"ISO-8601"). (Red Team 2026-08-04: A1 tokens técnicos + palabras all-hex.)
  const m = (desc || '').match(/(?:→|->|\bfix\s*:)\s*(.+)$/i);
  if (!m) return false;
  const ref = m[1];
  return /\bcommit\b[\s:#]*[0-9a-f]{6,}\b/i.test(ref)                   // "commit 8246947"
      || /\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,}\b/i.test(ref) // hash git: 7+ hex CON letra Y dígito
      || /\b(?:pr|issue|ticket|pull)\b[\s#:]*\d+/i.test(ref)           // PR 12 / issue #34 / ticket 5
      || /#\d{2,}/.test(ref)                                           // #123 (2+ dígitos, no una enumeración "#3")
      || /\/(commit|pull|pulls|issues)\//i.test(ref)                   // URL de github
      || /[\w./-]+\.(test|spec)\.[a-z]+/i.test(ref);                   // ruta a un archivo de test/spec
}

function problemasDeDisposicion(texto) {
  const out = [];
  const m = (texto || '').match(/(^|\n)\s*#{1,6}\s*Debilidades[^\n]*/i);
  if (!m) return out; // la ausencia de la sección la caza el candado de honestidad (3.1), no éste
  const rest = (texto || '').slice(m.index + m[0].length);
  const corte = rest.search(/\n\s*(?:#{1,6}\s|---|\*\*(?:Construy|Audit|Fecha de cierre|Rastro))/i);
  const cuerpoRaw = corte === -1 ? rest : rest.slice(0, corte);
  // Fuera la GUÍA (blockquote `>`) y el relleno `___`: es boilerplate de la plantilla, no del autor.
  // Sin esto la propia guía —que contiene "(ninguna)"— anulaba el candado POR DEFECTO (Red Team 2026-08-04).
  const lineas = cuerpoRaw.split('\n')
    .filter((l) => !/^\s*>/.test(l))
    .map((l) => l.replace(/_{2,}/g, ''))
    .filter((l) => l.trim().length > 0);
  const cuerpo = lineas.join('\n').trim();
  if (!cuerpo) { out.push('la sección "Debilidades" quedó sin llenar (sólo la guía): listá cada debilidad con su disposición, o declará "(ninguna)"'); return out; }
  // Declaración EXPLÍCITA de ausencia: el cuerpo despojado ES el centinela (anclado ^…$, NO un substring
  // suelto — antes "no hay debilidades de X pero sí Y" contaba como "(ninguna)" y colgaba la de Y).
  if (/^\(?\s*(ninguna|sin debilidades|no hay debilidades|n\/a|nada que declarar)\s*\)?[.\s]*$/i.test(cuerpo)) return out;
  const esItem = (l) => /^[-*+]\s+\S/.test(l) || /^\d+[.)]\s+\S/.test(l); // bullet o lista numerada a COLUMNA 0
  const items = lineas.filter(esItem);
  if (items.length === 0) {
    out.push('las Debilidades van como LISTA: cada una un bullet con su disposición ([objetiva-arreglada]/[objetiva-irreducible]/[subjetiva-dueño]/[diferida-dueño]) — o declará "(ninguna)"');
    return out;
  }
  // Prosa suelta a COLUMNA 0 (no indentada, no ítem): una debilidad escrita fuera del formato → colgaría.
  // Una línea INDENTADA es continuación/sub-bullet de una debilidad ya dispuesta y NO se marca (evita el
  // falso positivo del desglose en sub-viñetas).
  const prosa = lineas.filter((l) => /^\S/.test(l) && !esItem(l));
  if (prosa.length) out.push(`hay texto suelto en Debilidades, fuera del formato — cada debilidad va como bullet con su [disposición]: "${prosa[0].slice(0, 60)}"`);
  for (const it of items) {
    const cuerpoB = it.replace(/^[-*+]\s*/, '').replace(/^\d+[.)]\s*/, '');
    const mt = cuerpoB.match(/^[`*_\s]*\[\s*([^\]]+?)\s*\]\s*(.*)$/); // tolera backticks/énfasis (la plantilla los modela)
    if (!mt) { out.push(`debilidad sin disposición: "${cuerpoB.slice(0, 60)}" (poné [objetiva-arreglada]/[objetiva-irreducible]/[subjetiva-dueño]/[diferida-dueño] al inicio)`); continue; }
    const disp = mt[1].toLowerCase();
    const desc = (mt[2] || '').replace(/`/g, '').trim();
    if (!DISPOSICIONES.includes(disp)) { out.push(`disposición inválida "[${mt[1]}]" (usá objetiva-arreglada / objetiva-irreducible / subjetiva-dueño / diferida-dueño)`); continue; }
    if (desc.replace(/[_*\s]/g, '').length < MIN_CUERPO_HONESTO) { out.push(`la debilidad "[${disp}]" no describe nada (escribí qué es)`); continue; }
    if (disp === 'objetiva-arreglada' && !refFix(desc)) {
      out.push(`"[objetiva-arreglada]" necesita una REFERENCIA concreta al fix (commit/PR/#N/ticket/URL — no un verbo suelto): "${desc.slice(0, 50)}"`);
    }
    if ((disp === 'subjetiva-dueño' || disp === 'diferida-dueño') && OBJETIVO_POR_DOMINIO.test(desc) && !/dominio-ok/i.test(desc)) {
      out.push(`la debilidad "[${disp}]" cae en un ángulo OBJETIVO-POR-DOMINIO (dinero/seguridad/concurrencia) pero se marca como juicio del dueño — el hueco donde un bug se disfraza de "gusto". Si de verdad es preferencia y no un defecto, confirmalo con "(dominio-ok: <por qué>)". Si es un bug, arreglalo y usá [objetiva-arreglada].`);
    }
  }
  return out;
}

// --- Protocolo de corrección (3.5, fichas v5): la clave (ecosistema) --------
// La auditoría termina en el HALLAZGO; el método no decía nada de cómo se implementa el arreglo.
// Esta clave lo hace exigible en el commit: las tres obligaciones respondidas POR ESCRITO
// (qué dependía y cómo lo busqué · cómo probé que lo sano sigue sano · por qué nació el hueco),
// más el control positivo y quién corrigió. Detalle: referencias/correccion.md.
// Lo que la máquina revisa es que la respuesta EXISTA y que no se declare N/A un bloque que sí
// corrigió; que la respuesta sea VERDADERA es juicio y queda declarado como 👁 (nunca disfrazado).

// esNA vive en el router (una sola forma de reconocer un "N/A" en español). Lazy + tolerante:
// si el router no estuviera, se saltea SÓLO el sub-chequeo del falso N/A, no todo el candado.
function esNAdeNota(nota) {
  try { return require('./raw-router').esNA(nota); } catch (_) { return false; }
}

// ¿El 50/50 declara al menos una debilidad ARREGLADA? Entonces el bloque SÍ corrigió algo, y
// (ecosistema) no puede ser N/A. Se lee sólo el cuerpo de "Debilidades" y SIN la guía en
// blockquote de la plantilla — que nombra las disposiciones como ejemplo y dispararía siempre.
function declaraArreglo(texto) {
  const m = (texto || '').match(/(^|\n)\s*#{1,6}\s*Debilidades[^\n]*/i);
  if (!m) return false;
  const rest = (texto || '').slice(m.index + m[0].length);
  const corte = rest.search(/\n\s*(?:#{1,6}\s|---|\*\*(?:Construy|Audit|Fecha de cierre|Rastro))/i);
  const cuerpo = (corte === -1 ? rest : rest.slice(0, corte)).split('\n').filter((l) => !/^\s*>/.test(l)).join('\n');
  return /\[\s*objetiva-arreglada\s*\]/i.test(cuerpo);
}

function problemasDeEcosistema(f) {
  const out = [];
  for (const clave of CLAVES_V5) {
    if (!f.claves.has(clave)) {
      out.push(`falta la clave (${clave}) — el protocolo de corrección: las tres obligaciones respondidas por escrito (la exige toda ficha v5)`);
    } else if (f.claves.get(clave) === false) {
      out.push(`(${clave}) quedó en [ ] pero el bloque se declaró cerrado`);
    } else if (f.notaFaltante.has(clave)) {
      out.push(`(${clave}) está marcada [x] pero su nota quedó vacía — escribí las tres obligaciones (qué dependía y CÓMO lo busqué · cómo PROBASTE que lo sano sigue sano · por qué NACIÓ el hueco) + el control positivo + quién corrigió, o "N/A — <por qué>"`);
    } else if (esNAdeNota(f.notas.get(clave)) && declaraArreglo(f.texto)) {
      out.push(`(${clave}) quedó marcada N/A, pero el 50/50 de esta misma ficha declara una debilidad "[objetiva-arreglada]" — si hubo un arreglo, hubo corrección: respondé las tres obligaciones`);
    }
  }
  return out;
}

// --- Auditoría (3.2): independencia del auditor -----------------------------
function valorCampo(texto, etiquetaRe) {
  const m = (texto || '').match(etiquetaRe);
  return m ? (m[1] || '').trim() : null; // valor crudo — NO quitamos underscores (pueden ser legítimos, p.ej. rutas)
}
function esPlaceholder(v) { return v === null || /^[_*\s]*$/.test(v); }
// NFKD + minúsculas + fuera puntuación/símbolos/invisibles: "Claude." == "claude", para que un
// punto o un paréntesis no cuenten como "auditor distinto".
// ponytail: sigue siendo fuzzy — el texto AUTODECLARADO nunca PRUEBA independencia (dos actores
// podrían normalizar igual, o el mismo escaparse escribiéndose muy distinto). La señal fuerte es
// out-of-band: que el "Auditó" lo escriba el harness/CI con la identidad real del agente auditor,
// no el que cierra. Ese es el techo §5 del método; acá solo cortamos el gaming trivial.
function normalizar(s) {
  return (s || '').normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function problemasDeAuditoria(texto, dir) {
  const out = [];
  // [^:]* / [^\n]*? toleran un cualificador antes del ':' ("Construyó (build):", "Auditó (ronda 2: adv):").
  const constructor = valorCampo(texto, /\*\*Construyó[^:\n]*:\*\*[ \t]*([^*\n]*)/i);
  const auditor = valorCampo(texto, /\*\*Auditó[^\n]*?:\*\*[ \t]*([^*\n]*)/i);

  if (constructor === null || auditor === null) {
    out.push('faltan los campos "Construyó" y "Auditó (agente fresco)" — la independencia del auditor es obligatoria al cerrar');
    return out;
  }
  if (esPlaceholder(constructor)) out.push('el campo "Construyó" está vacío (registrá quién construyó)');
  if (esPlaceholder(auditor)) out.push('el campo "Auditó (agente fresco)" está vacío (registrá el agente independiente que auditó)');
  if (!esPlaceholder(constructor) && !esPlaceholder(auditor) && normalizar(constructor) === normalizar(auditor)) {
    out.push('el auditor es el mismo que construyó — la auditoría adversaria exige un agente FRESCO, distinto (auto-auditarse no cuenta)');
  }

  // Rastro (opcional pero verificado): si se declara un archivo .md, tiene que existir y no estar vacío.
  const rastro = valorCampo(texto, /\*\*(?:Rastro de auditoría|Auditoría \(rastro\))[^:\n]*:\*\*[ \t]*([^*\n]*)/i);
  if (rastro && !esPlaceholder(rastro) && /\.md\b/i.test(rastro)) {
    const r = rastro.replace(/^[.\\/]+/, '');
    const candidatos = path.isAbsolute(rastro)
      ? [rastro]
      : [path.join(dir, r), path.join(dir, 'docs', '_cobertura', r), path.join(dir, '_cobertura', r)];
    let ok = false;
    for (const p of candidatos) {
      try { if (fs.existsSync(p) && fs.statSync(p).size > 0) { ok = true; break; } } catch (_) {}
    }
    if (!ok) out.push(`el rastro de auditoría "${rastro}" no apunta a un archivo existente y con contenido`);
  }
  return out;
}

/**
 * Recorre la(s) carpeta(s) de cobertura y separa los .md en dos: los que SON fichas y los
 * que no. Los segundos existen por dos motivos MUY distintos y hay que poder distinguirlos:
 * un README/índice legítimo (que no debe tratarse como ficha), o una ficha REAL con el
 * nombre de una casilla mal escrito — que queda invisible para el gate. Sin este dato, el
 * candado dice "OK, 0 fichas" con la misma cara en los dos casos, y en el segundo está ciego.
 */
function recorrerCobertura(dir) {
  const dirs = [path.join(dir, 'docs', '_cobertura'), path.join(dir, '_cobertura')];
  const fichas = [], noFichas = [];
  for (const d of dirs) {
    let entradas = [];
    try { entradas = fs.readdirSync(d); } catch (_) { continue; }
    for (const f of entradas) {
      if (!f.endsWith('.md')) continue;
      try {
        const ficha = parseFicha(fs.readFileSync(path.join(d, f), 'utf8'), f);
        // un README/índice con "Fecha de cierre:" no es una ficha
        if (esFicha(ficha)) fichas.push(ficha); else noFichas.push(f);
      } catch (_) {}
    }
  }
  return { fichas, noFichas };
}

/** Junta las fichas REALES del proyecto (ignora .md que no son fichas). */
function leerFichas(dir) { return recorrerCobertura(dir).fichas; }

/** Los NOMBRES de los .md que viven en _cobertura/ y que esFicha() NO reconoció. */
function noFichas(dir) { return recorrerCobertura(dir).noFichas; }

/**
 * Revisa la cobertura + honestidad + auditoría. Devuelve { esMetodo, root, fichas, cerradas, problemas }.
 * Cobertura se exige a toda ficha cerrada; honestidad y auditoría, solo a las fichas v2;
 * "Qué revisar" desde la v3, disposición de debilidades desde la v4, (ecosistema) desde la v5.
 */
function revisarCobertura(dir, leerFichasFn) {
  const root = metodoRoot(dir);
  // `root` viaja en el resultado para que quien reporte no tenga que re-deducir la raíz
  // (la necesita, p.ej., para preguntar por los .md que NO se reconocieron como ficha).
  if (!root) return { esMetodo: false, root: null, fichas: [], cerradas: [], problemas: [] };
  const fichas = (leerFichasFn || leerFichas)(root); // inyectable: el gate le pasa un lector del ÍNDICE de git
  const cerradas = fichas.filter((f) => f.cerrada);
  const problemas = [];
  for (const f of cerradas) {
    for (const p of problemasDeFicha(f)) problemas.push(`${f.archivo}: ${p}`);
    if (esV2(f.texto) || fechaFuerzaV2(f)) {
      for (const p of problemasDeHonestidad(f.texto)) problemas.push(`${f.archivo}: ${p}`);
      for (const p of problemasDeAuditoria(f.texto, root)) problemas.push(`${f.archivo}: ${p}`);
    }
    if (esV3(f.texto) || fechaFuerzaV2(f)) { // "Qué revisar" obligatoria post-adopción, no solo opt-in por marcador borrable
      for (const p of problemasDeRevision(f.texto)) problemas.push(`${f.archivo}: ${p}`);
    }
    if (esV4(f.texto)) { // disposición de debilidades: SÓLO fichas v4 (forward-only por marcador; no brickea repos que no adoptaron aún)
      for (const p of problemasDeDisposicion(f.texto)) problemas.push(`${f.archivo}: ${p}`);
    }
    if (esV5(f.texto)) { // protocolo de corrección: SÓLO fichas v5 (mismo forward-only que la v4)
      for (const p of problemasDeEcosistema(f)) problemas.push(`${f.archivo}: ${p}`);
    }
  }
  return { esMetodo: true, root, fichas, cerradas, problemas };
}

module.exports = {
  CLAVES_CANONICAS, CLAVES_V5, MARCADORES, metodoRoot, isMethodProject, esV2, esV3, esV4, esV5, versionFicha, parseFicha, esFicha,
  problemasDeFicha, problemasDeHonestidad, problemasDeRevision, problemasDeDisposicion, problemasDeEcosistema,
  declaraArreglo, problemasDeAuditoria, leerFichas, noFichas, revisarCobertura,
};
