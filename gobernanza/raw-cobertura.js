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

// Una ficha "v3" trae el marcador `raw-ficha: v3` (lo estampa la plantilla nueva) y queda
// sujeta AL CANDADO DEL OK INFORMADO (3.3). Las v1/v2 no lo traen → no se les exige, así
// adoptar el cambio no brickea fichas ya cerradas (mismo soft-gate deliberado que esV2).
function esV3(texto) {
  return /raw-ficha:\s*v3/i.test(texto || '');
}

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

/** Junta las fichas REALES del proyecto (ignora .md que no son fichas). */
function leerFichas(dir) {
  const dirs = [path.join(dir, 'docs', '_cobertura'), path.join(dir, '_cobertura')];
  const fichas = [];
  for (const d of dirs) {
    let entradas = [];
    try { entradas = fs.readdirSync(d); } catch (_) { continue; }
    for (const f of entradas) {
      if (!f.endsWith('.md')) continue;
      try {
        const ficha = parseFicha(fs.readFileSync(path.join(d, f), 'utf8'), f);
        if (esFicha(ficha)) fichas.push(ficha); // un README/índice con "Fecha de cierre:" no es una ficha
      } catch (_) {}
    }
  }
  return fichas;
}

/**
 * Revisa la cobertura + honestidad + auditoría. Devuelve { esMetodo, fichas, cerradas, problemas }.
 * Cobertura se exige a toda ficha cerrada; honestidad y auditoría, solo a las fichas v2.
 */
function revisarCobertura(dir, leerFichasFn) {
  const root = metodoRoot(dir);
  if (!root) return { esMetodo: false, fichas: [], cerradas: [], problemas: [] };
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
  }
  return { esMetodo: true, fichas, cerradas, problemas };
}

module.exports = {
  CLAVES_CANONICAS, MARCADORES, metodoRoot, isMethodProject, esV2, esV3, parseFicha, esFicha,
  problemasDeFicha, problemasDeHonestidad, problemasDeRevision, problemasDeAuditoria, leerFichas, revisarCobertura,
};
