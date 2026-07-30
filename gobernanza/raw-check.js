#!/usr/bin/env node
/**
 * raw-check.js — el candado de cobertura como COMANDO (The Raw Method · Nivel 2)
 * =============================================================================
 * Corre el MISMO chequeo que raw-gate, pero como CLI, para cubrir lo que el hook
 * NO ve:
 *   - el commit que hacés vos a mano en tu terminal,
 *   - la edición/commit por la web de GitHub,
 *   - el `git commit --no-verify` (que en local no se puede impedir, pero en el
 *     servidor/CI sí: acá corre después, sobre el estado ya guardado).
 *
 * Uso:
 *   node gobernanza/raw-check.js [directorio]     (default: el directorio actual)
 *   exit 0 = OK  ·  exit 1 = una ficha CERRADA quedó sin resolver
 *
 * Lo corren el workflow de CI (.github/workflows/raw-method.yml) y una persona.
 */
'use strict';
const { revisarCobertura } = require('./raw-cobertura');

const dir = process.argv[2] || process.cwd();
const { esMetodo, cerradas, problemas } = revisarCobertura(dir);

if (!esMetodo) {
  console.log('raw-check: no es un proyecto Raw Method (no hay marcador ni fichas) — nada que revisar.');
  process.exit(0);
}

if (problemas.length) {
  console.error('⛔ raw-check — cobertura incompleta en bloque(s) cerrado(s):');
  for (const p of problemas) console.error('  · ' + p);
  console.error('\nUna ficha cerrada resuelve TODAS sus claves ([x] con nota, o [x] N/A — <por qué>).');
  console.error('Resolvé las de arriba antes de mergear. (The Raw Method · candado de cobertura)');
  process.exit(1);
}

// C3 backstop en CI: el router también corre acá (sobre el diff del último commit), para cubrir
// commits hechos FUERA del hook local (web de GitHub, --no-verify en una terminal sin el hook, alias).
try {
  const { spawnSync } = require('child_process');
  const { clavesRequeridas, problemasDeRouter } = require('./raw-router');
  const g = (args) => { try { return spawnSync('git', args, { cwd: dir, encoding: 'utf8' }).stdout || ''; } catch (_) { return ''; } };
  const files = g(['diff', '--name-only', 'HEAD~1', 'HEAD']).split('\n').map((s) => s.trim()).filter(Boolean);
  const req = clavesRequeridas(files, g(['diff', 'HEAD~1', 'HEAD']));
  // Solo las fichas TOCADAS por este commit (no todas las cerradas) — una N/A vieja y correcta
  // no debe chocar con un diff nuevo (falso positivo del backstop).
  const tocadas = cerradas.filter((f) => files.some((sf) => sf.replace(/\\/g, '/').endsWith(f.archivo)));
  if (req.size && tocadas.length) {
    const probs = [];
    for (const f of tocadas) for (const p of problemasDeRouter(f, req)) probs.push(`${f.archivo}: ${p}`);
    if (probs.length) {
      console.error('⛔ raw-check — router: pilar TOCADO por el último commit pero marcado N/A (falso N/A):');
      for (const p of probs) console.error('  · ' + p);
      process.exit(1);
    }
  }
} catch (_) { /* sin git o error: no bloqueamos por el propio candado */ }

console.log(`✓ raw-check OK — ${cerradas.length} ficha(s) cerrada(s), todas resueltas.`);
process.exit(0);
