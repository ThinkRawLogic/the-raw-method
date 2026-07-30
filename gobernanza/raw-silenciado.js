#!/usr/bin/env node
/**
 * raw-silenciado.js — candado C39: un candado del método no se apaga en silencio.
 * ============================================================================
 * Un test/candado SILENCIADO (.skip/.only/xit/xdescribe/@pytest.mark.skip) es como
 * desenchufar la alarma porque suena: parece protegido, no lo está. Este barre esos
 * marcadores y FALLA si alguno no trae una justificación registrada en la misma línea
 * o en la anterior: `raw-ok: <por qué>` (o `raw-silenciado: <por qué>`). Así silenciar
 * un candado exige dejar por qué — no se muere a escondidas.
 *
 * Alcance deliberadamente ANGOSTO (bajo falso-positivo): solo patrones de test apagado,
 * no `eslint-disable` genérico (demasiado común y legítimo → sería ruido que se apaga solo).
 *
 *   node gobernanza/raw-silenciado.js [dir]
 *   exit 0 = sin silencios sin registrar · exit 1 = hay al menos uno
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage', 'vendor', '__pycache__', '.venv']);
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py']);
// Marcadores de "test/candado apagado". Específicos, para bajo falso-positivo.
const PATRONES = [
  /\b(?:it|describe|test|context)\s*(?:\.\s*\w+\s*)*\.\s*(?:skip|only|skipIf|todo|fixme|failing)\b/, // + failing; tolera espacios alrededor del punto y cadenas intermedias
  /\bf(?:it|describe|context)\s*\(\s*[`'"]/,                                                         // fit/fdescribe/fcontext con string
  /\bx(?:it|describe|test)\s*\(/,                                                                    // xit/xdescribe/xtest
  /@(?:pytest\.mark\.(?:skip|xfail)|unittest\.skip)/i,                                               // pytest.mark.skip/skipif/xfail + unittest.skip/skipIf/skipUnless
  /\bpending\s*\(/,                                                                                  // pending() (Jasmine)
];
const JUSTIF = /raw-(?:ok|silenciado)\s*:/i;

function walk(dir, out) {
  let ent; try { ent = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
  for (const e of ent) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(path.join(dir, e.name), out); }
    else if (e.isFile() && EXT.has(path.extname(e.name))) out.push(path.join(dir, e.name));
  }
}

function silencios(dir) {
  const root = path.resolve(dir);
  const files = []; walk(root, files);
  const out = [];
  for (const f of files) {
    let txt; try { txt = fs.readFileSync(f, 'utf8'); } catch (_) { continue; }
    const L = txt.split('\n');
    for (let i = 0; i < L.length; i++) {
      if (!PATRONES.some((rx) => rx.test(L[i]))) continue;
      const justif = JUSTIF.test(L[i]) || (i > 0 && JUSTIF.test(L[i - 1]));
      if (!justif) out.push({ file: path.relative(root, f), line: i + 1, code: L[i].trim().slice(0, 100) });
    }
  }
  return out;
}

module.exports = { silencios };

if (require.main === module) {
  const dir = process.argv[2] || process.cwd();
  const s = silencios(dir);
  if (!s.length) { console.log('✓ raw-silenciado OK — ningún test/candado silenciado sin registrar.'); process.exit(0); }
  console.error(`⛔ raw-silenciado — ${s.length} test/candado silenciado(s) sin justificación:`);
  for (const x of s) console.error(`  · ${x.file}:${x.line}  ${x.code}`);
  console.error('\nUn candado silenciado sin registro es peor que ninguno (creés que protege y no).');
  console.error('Agregá `raw-ok: <por qué>` en la misma línea o la anterior, o quitá el .skip/.only.');
  process.exit(1);
}
