#!/usr/bin/env node
/**
 * raw-adopcion.js — el auto-actualizador del método en los proyectos (The Raw Method).
 * ===================================================================================
 * "Hoy es un proyecto, mañana el siguiente. No puedo conciliar a mano." (norma del dueño, 2026-07-25).
 * El método lleva una VERSIÓN; cada proyecto anota cuál adoptó (`.raw-method-version`). Este
 * script compara y cierra la brecha SOLO:
 *   - las mejoras ADITIVAS (auto) se aplican solas,
 *   - las que chocarían con algo del proyecto se REPORTAN con su instrucción para el OK del dueño.
 * Así un proyecto "se entera solo" de que quedó atrás — no depende de que nadie se acuerde.
 *
 *   node gobernanza/raw-adopcion.js [--check|--aplicar] [dir]
 *     --check   (default): solo reporta qué falta.  --aplicar: aplica lo auto + reporta lo manual.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { ADOPCIONES } = require('./adopciones');

const VERSION = (() => { try { return fs.readFileSync(path.join(__dirname, 'VERSION'), 'utf8').trim(); } catch (_) { return '0'; } })();
function versionProyecto(dir) { try { return fs.readFileSync(path.join(dir, '.raw-method-version'), 'utf8').trim(); } catch (_) { return '0'; } }
function necesita(a, dir) { try { return !!a.detectar(dir); } catch (_) { return false; } }

/** Solo mira: qué adopciones necesita el proyecto (sin tocar nada). */
function revisar(dir) {
  const pendientes = ADOPCIONES.filter((a) => necesita(a, dir))
    .map((a) => ({ id: a.id, titulo: a.titulo, auto: !!a.auto, instruccion: a.instruccion }));
  return { version: VERSION, versionProyecto: versionProyecto(dir), pendientes };
}

/** Aplica las AUTO pendientes; reporta las manuales y las FALLIDAS; registra la versión adoptada. */
function adoptar(dir) {
  const aplicadas = [], manuales = [], fallidas = [];
  for (const a of ADOPCIONES) {
    if (!necesita(a, dir)) continue;
    if (a.auto) {
      let ok = false;
      try { ok = !!a.aplicar(dir); } catch (_) { ok = false; }
      // Un aplicar() que devuelve false o lanza (p.ej. copyFileSync sobre una .cjs de solo lectura) NO
      // se traga: cae en `fallidas`. Tragárselo hacía que --aplicar reportara "al día" sobre un fallo
      // — la mentira exacta que la propagación existe para evitar (hallazgo del Red Team, 2026-08-04).
      (ok ? aplicadas : fallidas).push(a.id);
    } else manuales.push({ id: a.id, titulo: a.titulo, instruccion: a.instruccion });
  }
  try { fs.writeFileSync(path.join(dir, '.raw-method-version'), VERSION + '\n'); } catch (_) {}
  return { aplicadas, manuales, fallidas };
}

module.exports = { revisar, adoptar, VERSION };

if (require.main === module) {
  const args = process.argv.slice(2);
  const modo = args.find((a) => a.startsWith('--')) || '--check';
  const dir = args.find((a) => !a.startsWith('--')) || process.cwd();

  if (modo === '--aplicar') {
    const r = adoptar(dir);
    if (r.aplicadas.length) console.log('✓ raw-adopcion — auto-adoptado: ' + r.aplicadas.join(', '));
    if (r.manuales.length) {
      console.error(`⚠ ${r.manuales.length} mejora(s) requieren tu OK (chocan con algo del proyecto):`);
      for (const m of r.manuales) console.error('  · ' + m.titulo + '\n      → ' + m.instruccion);
    }
    if (r.fallidas.length) {
      console.error(`⛔ raw-adopcion — ${r.fallidas.length} mejora(s) auto NO se pudieron aplicar (¿solo lectura? ¿permisos? ¿disco?): ${r.fallidas.join(', ')}`);
      console.error('   NO quedaron adoptadas — resolvé el bloqueo y reintentá. (No se reporta "al día" en falso.)');
      process.exit(1);
    }
    if (!r.aplicadas.length && !r.manuales.length) console.log('✓ raw-adopcion — proyecto al día con el método ' + VERSION + '.');
    process.exit(0);
  }

  const { pendientes } = revisar(dir);
  if (!pendientes.length) { console.log('✓ raw-adopcion — proyecto al día con el método ' + VERSION + '.'); process.exit(0); }
  console.log(`⚠ raw-adopcion — el método avanzó a ${VERSION}; ${pendientes.length} mejora(s) sin adoptar:`);
  for (const p of pendientes) console.log(`  · [${p.auto ? 'auto' : 'OK dueño'}] ${p.titulo}`);
  console.log('\nAdoptalas:  node gobernanza/raw-adopcion.js --aplicar');
  process.exit(0);
}
