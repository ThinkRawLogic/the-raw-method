#!/usr/bin/env node
/**
 * raw-deps.js — chequeo liviano de lockfiles (pilar Stack, ejecutable).
 * ====================================================================
 * Inspirado en check_lockfiles de cyber-neo. Un manifest sin su lockfile = build
 * NO reproducible (una dependencia puede cambiar sola entre instalaciones).
 * C43: FALTA un lock → exit 1 (BLOQUEA). Opt-out para proyectos chicos:
 *   RAW_DEPS_ADVISORY=1   o un archivo   .raw-deps-advisory   → vuelve a exit 0.
 *
 *   node gobernanza/raw-deps.js [dir]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const PARES = [
  ['package.json', ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'bun.lock']],
  ['Pipfile', ['Pipfile.lock']],
  ['pyproject.toml', ['poetry.lock', 'pdm.lock', 'uv.lock']],
  ['Gemfile', ['Gemfile.lock']],
  ['go.mod', ['go.sum']],
  ['Cargo.toml', ['Cargo.lock']],
  ['composer.json', ['composer.lock']],
];

function faltantes(dir) {
  const out = [];
  for (const [manifest, locks] of PARES) {
    const hayManifest = fs.existsSync(path.join(dir, manifest));
    const hayLock = locks.some((l) => { try { return fs.readFileSync(path.join(dir, l), 'utf8').trim().length > 0; } catch (_) { return false; } }); // lockfile vacío o de solo-espacios no cuenta (C43)
    if (hayManifest && !hayLock) out.push({ manifest, esperados: locks });
  }
  return out;
}

module.exports = { faltantes };

if (require.main === module) {
  const dir = process.argv[2] || process.cwd();
  const f = faltantes(dir);
  if (!f.length) { console.log('✓ raw-deps OK — cada manifest tiene su lockfile (o no hay manifests).'); process.exit(0); }
  console.error(`⛔ raw-deps — ${f.length} manifest(s) sin lockfile (build no reproducible):`);
  for (const x of f) console.error(`  · ${x.manifest} → falta uno de: ${x.esperados.join(', ')}`);
  console.error('\nCommiteá el lockfile para fijar versiones exactas — así una dep no cambia sola.');
  // C43: opt-out explícito para proyectos chicos (no un aviso que nadie lee).
  const advisory = process.env.RAW_DEPS_ADVISORY === '1' || fs.existsSync(path.join(dir, '.raw-deps-advisory'));
  if (advisory) { console.error('(modo advisory: RAW_DEPS_ADVISORY=1 o .raw-deps-advisory presente — no bloquea)'); process.exit(0); }
  process.exit(1); // falta lock → bloquea
}
