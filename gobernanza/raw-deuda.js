#!/usr/bin/env node
/**
 * raw-deuda.js — cosecha la deuda declarada en el código (análogo a ponytail-debt).
 * ===============================================================================
 * The Raw Method admite que un candado que "espera en 👁" por falta de tooling es
 * deuda que se pudre si nadie la relee. Este harvester la hace visible: grep de
 * marcadores `raw-deuda:` en el código → un ledger. Informativo (exit 0).
 *
 * Convención del marcador:  // raw-deuda: <qué falta> — <techo/upgrade> [antes: <fecha>]
 *
 *   node gobernanza/raw-deuda.js [dir]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SKIP = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'nuxt', 'vendor', 'coverage', 'target']);
const EXT = /\.(js|mjs|cjs|ts|tsx|jsx|py|go|rb|php|sql|sh|prg|md|yml|yaml)$/i;
// Exige un prefijo de comentario, para no matchear el marcador dentro de un string o regex.
const RE = /(?:\/\/|#|--|;|\*|<!--)\s*raw-deuda:\s*(.+?)\s*$/i;

function walk(dir, out) {
  let es;
  try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
  for (const e of es) {
    if (e.isDirectory()) { if (SKIP.has(e.name)) continue; walk(path.join(dir, e.name), out); } // NO saltear dot-dirs: .github/ se commitea
    else if (e.isFile() && EXT.test(e.name) && e.name !== 'raw-deuda.js') out.push(path.join(dir, e.name)); // el propio harvester nombra el marcador en su doc
  }
}

function cosechar(dir) {
  const root = path.resolve(dir);
  const archivos = [];
  walk(root, archivos);
  const items = [];
  for (const f of archivos) {
    let t;
    try { t = fs.readFileSync(f, 'utf8'); } catch (_) { continue; }
    t.split('\n').forEach((l, i) => {
      const m = l.match(RE);
      if (!m) return;
      const md = m[1].match(/antes:\s*(\d{4})-(\d{1,2})-(\d{1,2})/i); // fecha tope opcional (tolera no zero-padded: 2020-1-1)
      const venceEl = md ? `${md[1]}-${md[2].padStart(2, '0')}-${md[3].padStart(2, '0')}` : null;
      items.push({ file: path.relative(root, f), line: i + 1, nota: m[1], venceEl });
    });
  }
  return items;
}

// C38 — deuda con dientes: una deuda diferida con `antes: <fecha>` YA pasada está VENCIDA.
// Comparación lexicográfica de ISO (YYYY-MM-DD) == comparación cronológica. `hoy` inyectable (tests).
function vencidas(items, hoy) {
  const h = hoy || new Date().toISOString().slice(0, 10);
  return items.filter((x) => x.venceEl && x.venceEl < h);
}

module.exports = { cosechar, vencidas };

if (require.main === module) {
  const items = cosechar(process.argv[2] || process.cwd());
  if (!items.length) { console.log('✓ raw-deuda — sin marcadores `raw-deuda:` pendientes.'); process.exit(0); }
  console.log(`📋 raw-deuda — ${items.length} deuda(s) declarada(s) en el código:`);
  for (const x of items) console.log(`  · ${x.file}:${x.line} — ${x.nota}${x.venceEl ? '  (antes: ' + x.venceEl + ')' : ''}`);
  const vlist = vencidas(items);
  if (vlist.length) {
    console.error(`\n⛔ ${vlist.length} deuda(s) VENCIDA(S) — pasó su "antes:" y siguen abiertas:`);
    for (const x of vlist) console.error(`  · ${x.file}:${x.line} — vencía ${x.venceEl} — ${x.nota}`);
    console.error('Una deuda diferida con fecha pasada NO se ignora: cablear el candado o escalar al dueño (FONDO). (C38)');
    process.exit(1);
  }
  console.log('\nCada una es un candado/atajo diferido. Llevalas a PENDIENTES.md con dueño y fecha tope.');
  process.exit(0);
}
