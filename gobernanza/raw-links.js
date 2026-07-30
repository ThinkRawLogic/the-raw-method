#!/usr/bin/env node
/**
 * raw-links.js — el candado de FRESCURA DOCUMENTAL (The Raw Method · Nivel 2)
 * ==========================================================================
 * El método ya declara que esto es un bug: *"Un documento que dice algo que ya no es cierto no es
 * 'documentación vieja' — es un bug, igual que una línea de código rota"* (`referencias/documentos-vivos.md`).
 * Y también declara que lo que queda en 📖 (memoria) **es deuda**. Este archivo cobra esa promesa para
 * las dos formas de mentira que son COMPROBABLES sin juicio.
 *
 * Por qué vive en el MÉTODO y no en un proyecto: la pudrición es consecuencia ESTRUCTURAL de exigir un
 * ecosistema de ~17 documentos vivos que se citan entre sí. Todo proyecto archiva o reorganiza tarde o
 * temprano. Arreglarlo en un proyecto tapa un pozo; acá los tapa todos.
 *
 * Node suelto, sin dependencias: corre igual sobre un proyecto FoxPro/Supabase sin Node propio, que es
 * justo el que más lo necesita (un test de vitest lo dejaría afuera).
 *
 * ── LOS DOS CHEQUEOS, en orden de valor MEDIDO (no supuesto) ──────────────────────────────────────
 *
 * 1. RANGO DECLARADO vs REAL (§). Un doc dice "la ley vive en INVARIABLES.md (§1–§N)" y N se quedó
 *    corto ⇒ toda sesión que confíe en esa línea se saltea las reglas de arriba, sin enterarse.
 *    **Medido: recurrió en DOS proyectos distintos, de forma independiente.** Es el que más duele y el
 *    que más silenciosamente deriva (basta que alguien agregue un § y nadie toque el puntero).
 *
 *    🔴 SE TOMA EL MÁXIMO, NUNCA EL ÚLTIMO. En el caso real, `### §171` era la última sección **en orden
 *    de archivo** pero no la de número más alto (la ley llegaba a §188). Un chequeo que lea "la última que
 *    aparece" CONFIRMA el número equivocado en vez de cazarlo. Este es el detalle que hace o rompe el
 *    candado, y por eso está acá arriba y no enterrado en el código.
 *
 * 2. ENLACES RELATIVOS ROTOS. Links markdown a archivos que se movieron o se archivaron.
 *    **Medido:** en tres repos en estado normal → CERO. En el commit anterior a una reorganización
 *    masiva → 6 en prosa viva (incluido el puntero desde `CLAUDE.md`, lo primero que lee cada sesión).
 *    O sea: se rompen por un EVENTO (archivar/mover), no por deriva continua. Por eso en el hook conviene
 *    atarlo al cierre de bloque, que es cuando se reorganiza.
 *
 * ── LO QUE NO HACE, a propósito ───────────────────────────────────────────────────────────────────
 * No verifica "¿este párrafo dice la verdad?". Eso es JUICIO, y disfrazar juicio de candado es
 * exactamente lo que el método prohíbe. Queda declarado como 👁 en la revisión de cierre.
 *
 * Uso:
 *   node gobernanza/raw-links.js [directorio]     (default: el directorio actual)
 *   exit 0 = OK  ·  exit 1 = hay una mentira comprobable
 */
'use strict';
const fs = require('fs');
const path = require('path');

const IGNORAR_DIR = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'out', 'coverage', 'generated', '.vercel',
]);

/**
 * 🔴 LOS EXCLUIDOS SON PARTE DE LA SPEC, no un parche posterior.
 *
 * Un candado que acusa a un inocente enseña a desactivarlo — es el anti-patrón que el propio método
 * nombra. Estas cuatro clases de "enlace" NO son enlaces reales y bloquear por ellas quemaría el candado:
 *
 *  · Dentro de un bloque de código: un ejemplo de markdown en un fence es documentación, no un puntero.
 *  · Prosa CONGELADA: `docs/_archivo/` y los `<details><summary>Histórico…` citan rutas viejas A PROPÓSITO
 *    (caso real: un PROMPT con tres declaraciones de rango — una viva y desactualizada, dos históricas
 *    correctas por ser históricas). El criterio NO es sólo la carpeta: es viva vs congelada.
 *  · Plantillas: `plantillas/` está llena de placeholders (`Bxx`, `<nombre>`) que no existen ni deben.
 *  · Placeholders en general.
 */
const RE_PLACEHOLDER = /[<>{}$]|\bxxx\b|\bBxx\b|\bNNN\b|\bejemplo\b/i;
const esRutaCongelada = (rel) => /(^|\/)(_archivo|plantillas|templates|_deprecated)\//i.test(rel);

/** Quita fences y código inline: un ejemplo de markdown adentro no es un enlace del proyecto. */
function sinCodigo(src) {
  return src.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
}

/**
 * Marca los rangos de líneas que están dentro de un `<details>` — prosa histórica congelada. Se hace por
 * LÍNEA (no por regex global) para poder decir de cada hallazgo si es vivo o congelado.
 */
function lineasCongeladas(src) {
  const dentro = new Set();
  let nivel = 0;
  src.split(/\r?\n/).forEach((linea, i) => {
    const abre = (linea.match(/<details/gi) || []).length;
    const cierra = (linea.match(/<\/details>/gi) || []).length;
    if (nivel > 0) dentro.add(i + 1);
    nivel += abre - cierra;
    if (abre > 0) dentro.add(i + 1);
    if (nivel < 0) nivel = 0;
  });
  return dentro;
}

function listarMd(dir, raiz, out = []) {
  let entradas;
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return out; }
  for (const e of entradas) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!IGNORAR_DIR.has(e.name)) listarMd(abs, raiz, out);
    } else if (e.name.toLowerCase().endsWith('.md')) {
      out.push({ abs, rel: path.relative(raiz, abs).replace(/\\/g, '/') });
    }
  }
  return out;
}

const RE_LINK = /\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/** CHEQUEO 2 — enlaces relativos rotos. Devuelve { rotos, avisos }. */
function revisarEnlaces(raiz) {
  const rotos = [];
  const avisos = [];
  for (const { abs, rel } of listarMd(raiz, raiz)) {
    const crudo = fs.readFileSync(abs, 'utf8');
    const limpio = sinCodigo(crudo);
    const congeladas = lineasCongeladas(crudo);
    const lineas = limpio.split(/\r?\n/);
    lineas.forEach((linea, i) => {
      let m;
      RE_LINK.lastIndex = 0;
      while ((m = RE_LINK.exec(linea))) {
        const destino = m[1];
        if (/^(https?:|mailto:|tel:|ftp:|#|data:)/i.test(destino)) continue;
        const sinAncla = destino.split('#')[0];
        if (!sinAncla) continue; // ancla pura dentro del mismo doc
        if (RE_PLACEHOLDER.test(sinAncla)) continue;
        let decodificado = sinAncla;
        try { decodificado = decodeURIComponent(sinAncla); } catch (_) {}
        if (fs.existsSync(path.resolve(path.dirname(abs), decodificado))) continue;
        const hallazgo = `${rel}:${i + 1} → ${destino}`;
        // Congelado (archivo/plantilla o dentro de <details>) = AVISO, nunca bloqueo.
        (esRutaCongelada(rel) || congeladas.has(i + 1) ? avisos : rotos).push(hallazgo);
      }
    });
  }
  return { rotos, avisos };
}

/**
 * CHEQUEO 1 — el RANGO de la ley declarado vs el real.
 *
 * Se busca cualquier `§1–§N` / `§1-§N` en la prosa viva y se contrasta N contra el MÁXIMO § que existe
 * de verdad en el archivo de ley. Sirve tanto el formato `### §N` (encabezado) como `N. **…**` (lista
 * numerada), que son las dos formas que usan los proyectos reales.
 */
function maximoSeccion(textoLey) {
  const nums = [];
  for (const m of textoLey.matchAll(/^\s*#{1,6}\s*§\s*(\d{1,4})/gm)) nums.push(Number(m[1]));
  for (const m of textoLey.matchAll(/^\s*(\d{1,4})\.\s+\*\*/gm)) nums.push(Number(m[1]));
  return nums.length ? Math.max(...nums) : null; // MÁXIMO, no el último: ver el docblock de arriba.
}

function archivoDeLey(raiz) {
  for (const cand of ['docs/INVARIABLES.md', 'INVARIABLES.md']) {
    const abs = path.join(raiz, cand);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

const RE_RANGO = /§\s*1\s*[–\-—]\s*§\s*(\d{1,4})/g;

/**
 * 🔴 DÓNDE BLOQUEA EL CHEQUEO DE RANGO — y por qué es una lista corta y no "todos los .md".
 *
 * Esto lo dictó correr el candado, no pensarlo: la primera versión bloqueaba en cualquier doc y marcó
 * como error `BITACORA.md` (una entrada fechada `## 2026-07-05` que decía §1–§69) y `PROMPT-BE1A.md`
 * (el prompt de un bloque ya cerrado, §1–§127). **Los dos eran CORRECTOS en su fecha.** Acusarlos es
 * pedirle a un registro histórico que se actualice solo, que es lo contrario de un registro.
 *
 * El criterio que sale de ahí, y que vale más que la lista:
 *
 *   · Un **ENLACE** es una promesa que alguien puede clickear HOY. Si está roto, está roto, lo haya
 *     escrito quien lo haya escrito y cuando sea → el chequeo de enlaces SÍ mira la bitácora (de hecho,
 *     en el caso real varios rotos estaban justo ahí).
 *   · Un **NÚMERO dentro de una entrada fechada** es una afirmación sobre el pasado. No se actualiza:
 *     se lee con su fecha → el chequeo de rango NO bloquea ahí.
 *
 * Por eso el rango bloquea sólo en los docs que son PUNTERO VIVO a la ley — los que una sesión lee al
 * arrancar y de los que se fía. Ahí la mentira cuesta reglas invisibles; en el resto es sólo prosa vieja.
 */
const PUNTEROS_VIVOS = [
  /^CLAUDE\.md$/i,
  /^AGENTS\.md$/i,
  /^README\.md$/i,
  /(^|\/)PROMPT-PROXIMA-SESION\.md$/i,
  /(^|\/)ARQUITECTURA-BASE\.md$/i,
  /(^|\/)INVARIABLES\.md$/i,
];
const esPunteroVivo = (rel) => PUNTEROS_VIVOS.some((re) => re.test(rel));

function revisarRango(raiz) {
  const ley = archivoDeLey(raiz);
  if (!ley) return { problemas: [], avisos: [], max: null };
  const max = maximoSeccion(fs.readFileSync(ley, 'utf8'));
  if (max === null) return { problemas: [], avisos: [], max: null };
  const problemas = [];
  const avisos = [];
  for (const { abs, rel } of listarMd(raiz, raiz)) {
    const crudo = fs.readFileSync(abs, 'utf8');
    const congeladas = lineasCongeladas(crudo);
    sinCodigo(crudo).split(/\r?\n/).forEach((linea, i) => {
      RE_RANGO.lastIndex = 0;
      let m;
      while ((m = RE_RANGO.exec(linea))) {
        const declarado = Number(m[1]);
        if (declarado === max) continue;
        const txt = `${rel}:${i + 1} declara §1–§${declarado} y la ley llega a §${max}` +
          (declarado < max ? ` (${max - declarado} regla(s) invisible(s))` : ' (declara de más)');
        const bloquea =
          esPunteroVivo(rel) && !esRutaCongelada(rel) && !congeladas.has(i + 1);
        (bloquea ? problemas : avisos).push(txt);
      }
    });
  }
  return { problemas, avisos, max };
}

function revisarFrescura(raiz) {
  const dir = path.resolve(raiz || '.');
  const rango = revisarRango(dir);
  const enlaces = revisarEnlaces(dir);
  return {
    problemas: [...rango.problemas, ...enlaces.rotos],
    avisos: [...rango.avisos, ...enlaces.avisos],
    max: rango.max,
  };
}

module.exports = {
  revisarFrescura, revisarEnlaces, revisarRango, maximoSeccion, lineasCongeladas, sinCodigo,
};

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  let isMethodProject;
  try { ({ isMethodProject } = require('./raw-cobertura')); } catch (_) { isMethodProject = () => true; }
  const dir = process.argv[2] || process.cwd();
  if (!isMethodProject(dir)) {
    console.log('raw-links: no es un proyecto Raw Method — nada que revisar.');
    process.exit(0);
  }
  const { problemas, avisos } = revisarFrescura(dir);
  if (avisos.length) {
    console.log(`ℹ️  raw-links — ${avisos.length} aviso(s) en prosa CONGELADA (archivo/plantilla/<details>): no bloquean.`);
    for (const a of avisos.slice(0, 20)) console.log(`   · ${a}`);
  }
  if (problemas.length) {
    console.error('\n⛔ raw-links — la documentación dice algo que ya no es cierto:');
    for (const p of problemas) console.error(`   ✗ ${p}`);
    console.error('\n   Un doc que miente sobre el estado es un bug (referencias/documentos-vivos.md).\n');
    process.exit(1);
  }
  console.log('✅ raw-links: sin enlaces rotos ni rangos de ley desactualizados.');
  process.exit(0);
}
