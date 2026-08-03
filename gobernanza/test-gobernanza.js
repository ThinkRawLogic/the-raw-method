#!/usr/bin/env node
/**
 * test-gobernanza.js — la prueba de que el candado del proceso MUERDE de verdad.
 * ============================================================================
 * Cubre Niveles 1 (hook), 2 (CLI/CI), 3.1 (honestidad), 3.2 (auditoría) y las
 * REGRESIONES del red-team adversario (bypasses y falsos positivos cazados).
 * Sin frameworks. `node test-gobernanza.js` → sale != 0 si algo falla.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HERE = __dirname;
const GATE = path.join(HERE, 'raw-gate.js');
const SESSION = path.join(HERE, 'raw-session.js');
const CHECK = path.join(HERE, 'raw-check.js');
const SECRETS = path.join(HERE, 'raw-secrets.js');
const DEPS = path.join(HERE, 'raw-deps.js');
const DEUDA = path.join(HERE, 'raw-deuda.js');
const SILENCIADO = path.join(HERE, 'raw-silenciado.js');

let fallos = 0;
function check(nombre, cond) {
  process.stdout.write(`${cond ? '✓' : '✗ FALLA:'} ${nombre}\n`);
  if (!cond) fallos++;
}

function tmpProyecto(sufijo) { return fs.mkdtempSync(path.join(os.tmpdir(), `raw-test-${sufijo}-`)); }
function ponerFicha(dir, nombre, texto) {
  const d = path.join(dir, 'docs', '_cobertura');
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, nombre), texto);
}
function marcarMetodo(dir) { fs.writeFileSync(path.join(dir, '.the-raw-method'), 'v1\n'); }

const CLAVES = ['spec-leída','orden','seguridad','experiencia','concurrencia','errores',
  'rastro','config','aguante','stack','dato','tests','auditoría','docs','OK'];
const KEYS_OK = () => CLAVES.map((c) => `- [x] **(${c})** algo. → hecho tal cosa`);

const HONESTO = '\n\n## Reporte honesto (50/50)\n\n### Fortalezas\nquedó sólido el flujo X.\n' +
  '\n### Debilidades / qué quedó corto o frágil\nfalta pulir Y.\n\n### Qué NO se alcanzó a probar (lo más importante)\ncarga real.\n';
// Encabezados CON sufijo (como la plantilla real) y cuerpos vacíos → deben marcarse vacíos.
const HONESTO_VACIO = '\n\n## Reporte honesto (50/50)\n\n### Fortalezas\n___\n' +
  '\n### Debilidades / qué quedó corto o frágil\n___\n\n### Qué NO se alcanzó a probar (lo más importante)\n___\n';

function base(cerrada, lineas, opts) {
  opts = opts || {};
  const fecha = cerrada ? '2026-07-20' : '___________';
  const constructor = opts.constructor !== undefined ? opts.constructor : 'agente-constructor';
  const auditor = opts.auditor !== undefined ? opts.auditor : 'agente-auditor';
  const rastro = opts.rastro ? `**Rastro de auditoría:** ${opts.rastro}\n` : '';
  return `# Ficha\n\n**Bloque:** demo  **Fecha de cierre:** ${fecha}\n\n` +
    `**Construyó:** ${constructor}  **Auditó (agente fresco):** ${auditor}\n${rastro}\n` +
    `## Claves\n\n${lineas.join('\n')}\n`;
}
function fichaResuelta(cerrada) { return base(cerrada, KEYS_OK()) + HONESTO; }
function fichaConClaveMuda(cerrada) {
  const l = CLAVES.map((c, i) => i === 2 ? `- [ ] **(${c})** algo. → ___` : `- [x] **(${c})** algo. → hecho tal cosa`);
  return base(cerrada, l) + HONESTO;
}
function fichaSinHonestidad(cerrada) { return base(cerrada, KEYS_OK()); }
function fichaHonestidadVacia(cerrada) { return base(cerrada, KEYS_OK()) + HONESTO_VACIO; }
function fichaAutoAuditada(cerrada) { return base(cerrada, KEYS_OK(), { constructor: 'mismo agente', auditor: 'Mismo   Agente' }) + HONESTO; }
function fichaSinAuditor(cerrada) { return base(cerrada, KEYS_OK(), { auditor: '' }) + HONESTO; }
function fichaRastroRoto(cerrada) { return base(cerrada, KEYS_OK(), { rastro: 'docs/_auditorias/no-existe.md' }) + HONESTO; }
// Regresiones del red-team:
function fichaClaveSinNota(cerrada) { // clave [x] SIN nota (nota borrada) → debe ser muda
  const l = CLAVES.map((c, i) => i === 2 ? `- [x] **(${c})** desc → ___` : `- [x] **(${c})** algo. → hecho tal cosa`);
  return base(cerrada, l) + HONESTO;
}
function fichaNotaConGuionBajo(cerrada) { // nota real que CONTIENE ___ → NO debe ser muda
  const l = CLAVES.map((c, i) => i === 2 ? `- [x] **(${c})** ok. → validado contra doc_x___y interno` : `- [x] **(${c})** algo. → hecho`);
  return base(cerrada, l) + HONESTO;
}
function fichaAuditorConPunto(cerrada) { return base(cerrada, KEYS_OK(), { constructor: 'Claude', auditor: 'Claude.' }) + HONESTO; }
function fichaLegacy(cerrada) { // sin campos de auditor ni honestidad → solo cobertura (grandfather)
  const fecha = cerrada ? '2026-07-20' : '___________';
  return `# Ficha vieja\n\n**Fecha de cierre:** ${fecha}\n\n## Claves\n\n${KEYS_OK().join('\n')}\n`;
}
// v3 — OK informado: la lista "qué revisar" para el dueño (solo se exige con el marcador).
const REVISION_OK = '\n\n## Qué revisar — para el dueño\n\nmirá la pantalla de pagos y confirmá que el total da bien.\n';
const REVISION_VACIA = '\n\n## Qué revisar — para el dueño\n\n___\n';
function fichaV3(cerrada, revision) { // revision: 'ok' | 'vacia' | undefined (falta)
  const rev = revision === 'ok' ? REVISION_OK : revision === 'vacia' ? REVISION_VACIA : '';
  return '<!-- raw-ficha: v3 -->\n' + base(cerrada, KEYS_OK()) + HONESTO + rev;
}

function correrGate(command, dir) {
  const r = spawnSync('node', [GATE], { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd: dir }), encoding: 'utf8' });
  return { code: r.status, err: r.stderr || '' };
}
function correrSession(dir) { return spawnSync('node', [SESSION], { input: JSON.stringify({ cwd: dir }), encoding: 'utf8' }).stdout || ''; }
function correrCheck(dir) { const r = spawnSync('node', [CHECK, dir], { encoding: 'utf8' }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }; }

const con = (sufijo, ficha) => { const d = tmpProyecto(sufijo); marcarMetodo(d); if (ficha) ponerFicha(d, 'b.md', ficha); return d; };
// Helpers de git para el router (C3): repo real + staging.
function gitInit(dir) { spawnSync('git', ['init', '-q'], { cwd: dir }); }
function gitStage(dir, file, content) { const p = path.join(dir, file); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); spawnSync('git', ['add', file], { cwd: dir }); }
function fichaConNA(claveNA) { const l = CLAVES.map((c) => c === claveNA ? `- [x] **(${c})** N/A — no aplica.` : `- [x] **(${c})** algo. → hecho tal cosa`); return base(true, l) + HONESTO; }
function gitCommit(dir, msg) { spawnSync('git', ['-c', 'user.email=a@b.c', '-c', 'user.name=t', 'commit', '-m', msg], { cwd: dir }); }

// ============================ Nivel 1 — raw-gate (hook) ======================
{ const d = con('muda', fichaConClaveMuda(true)); const r = correrGate('git commit -m "x"', d);
  check('gate: ficha cerrada con clave [ ] → BLOQUEADO (exit 2)', r.code === 2);
  check('gate:   · nombra la clave', /seguridad/.test(r.err)); }
{ check('gate: ficha resuelta completa → PERMITIDO (exit 0)', correrGate('git commit -m "x"', con('ok', fichaResuelta(true))).code === 0); }
{ check('gate: ficha abierta con clave muda → PERMITIDO', correrGate('git commit -m "wip"', con('abierta', fichaConClaveMuda(false))).code === 0); }
{ check('gate: comando que no es commit (git status) → PERMITIDO', correrGate('git status', con('nocommit', fichaConClaveMuda(true))).code === 0); }
{ check('gate: proyecto sin The Raw Method → PERMITIDO', correrGate('git commit -m "x"', tmpProyecto('nometodo')).code === 0); }
{ check('gate: [cierre] sin ficha cerrada → BLOQUEADO', correrGate('git commit -m "[cierre] b3"', con('cierre-sin-ficha')).code === 2); }
{ check('gate: --no-verify NO evade (exit 2)', correrGate('git commit --no-verify -m "x"', con('nv', fichaConClaveMuda(true))).code === 2); }
{ const d = con('ses'); check('session: inyecta el reflejo en proyecto Raw Method', /THE RAW METHOD/.test(correrSession(d)));
  check('session: calla fuera del método', correrSession(tmpProyecto('ses2')).trim() === ''); }
{ // El reflejo no es solo el banner: es la subida de capa de reglas que ya mordieron por vivir
  // en 📖. Si un refactor borra una de estas del template, la regla revierte a memoria EN
  // SILENCIO con la suite en verde — exactamente la falla que la subida de capa vino a cerrar.
  // (Hallazgo del Red Team del propio bloque que metió la cadena, 2026-08-03: el commit decía
  // "deja de depender de la memoria" y ningún test lo fijaba.)
  const d = con('ses3'); const out = correrSession(d);
  check('session: el reflejo trae LA CADENA DE UNA AFIRMACIÓN (existencia→dirección→magnitud)',
    /CADENA DE UNA AFIRMACI/.test(out) && /existencia\s*→\s*direcci/i.test(out));
  check('session: el reflejo trae la estampa de medición (medido: <resultado>, <fecha>)',
    /medido:\s*<resultado>,\s*<fecha>/.test(out)); }
{ const d = con('bom', fichaConClaveMuda(true));
  const payload = "\uFEFF" + JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' }, cwd: d });
  check('gate: payload con BOM (Windows) → BLOQUEA', spawnSync('node', [GATE], { input: payload, encoding: 'utf8' }).status === 2); }

// ======================= Nivel 2 — raw-check (CLI / CI) ======================
{ const r = correrCheck(con('cm', fichaConClaveMuda(true)));
  check('check: clave [ ] → FALLA (exit 1)', r.code === 1); check('check:   · nombra la clave', /seguridad/.test(r.out)); }
{ check('check: ficha resuelta → OK (exit 0)', correrCheck(con('cok', fichaResuelta(true))).code === 0); }
{ check('check: proyecto no-método → OK (exit 0)', correrCheck(tmpProyecto('cnm')).code === 0); }

// =================== Nivel 3.1 — honestidad 50/50 ===========================
{ const r = correrGate('git commit -m x', con('sh', fichaSinHonestidad(true)));
  check('gate: ficha cerrada SIN reporte honesto → BLOQUEADO', r.code === 2); check('gate:   · pide las secciones', /honesta|Fortalezas/.test(r.err)); }
{ check('gate: reporte honesto con secciones VACÍAS (encabezado con sufijo) → BLOQUEADO', correrGate('git commit -m x', con('hv', fichaHonestidadVacia(true))).code === 2); }
{ check('gate: ficha abierta sin honesto → PERMITIDO (solo al cerrar)', correrGate('git commit -m wip', con('ash', fichaSinHonestidad(false))).code === 0); }

// ================= Nivel 3.2 — independencia del auditor =====================
{ const r = correrGate('git commit -m x', con('aa', fichaAutoAuditada(true)));
  check('gate: auditor == constructor → BLOQUEADO', r.code === 2); check('gate:   · exige agente fresco', /fresco|distinto|mismo que construyó/i.test(r.err)); }
{ check('gate: sin auditor → BLOQUEADO', correrGate('git commit -m x', con('sa', fichaSinAuditor(true))).code === 2); }
{ const r = correrGate('git commit -m x', con('rr', fichaRastroRoto(true)));
  check('gate: rastro inexistente → BLOQUEADO', r.code === 2); check('gate:   · nombra el rastro', /rastro/i.test(r.err)); }
{ const d = con('rok'); fs.mkdirSync(path.join(d, 'docs', '_auditorias'), { recursive: true });
  fs.writeFileSync(path.join(d, 'docs', '_auditorias', 'a.md'), 'reporte del auditor con contenido');
  ponerFicha(d, 'b.md', base(true, KEYS_OK(), { rastro: 'docs/_auditorias/a.md' }) + HONESTO);
  check('gate: rastro que existe y no vacío → PERMITIDO', correrGate('git commit -m x', d).code === 0); }
{ check('check: auto-auditada → FALLA (exit 1)', correrCheck(con('caa', fichaAutoAuditada(true))).code === 1); }

// =================== Nivel 3.3 — OK informado (lista "qué revisar", v3) ======
{ const r = correrGate('git commit -m x', con('v3sinrev', fichaV3(true)));
  check('gate: ficha v3 cerrada SIN "qué revisar" → BLOQUEADO', r.code === 2);
  check('gate:   · pide la sección de revisión', /revisar/i.test(r.err)); }
{ check('gate: ficha v3 con lista de revisión real → PERMITIDO', correrGate('git commit -m x', con('v3ok', fichaV3(true, 'ok'))).code === 0); }
{ check('gate: ficha v3 con "qué revisar" VACÍA → BLOQUEADO', correrGate('git commit -m x', con('v3vac', fichaV3(true, 'vacia'))).code === 2); }
{ check('gate: ficha SIN marcador v3 y sin "qué revisar" → PERMITIDO (no rompe v1/v2)', correrGate('git commit -m x', con('nov3', fichaResuelta(true))).code === 0); }
{ check('gate: ficha v3 ABIERTA sin revisión → PERMITIDO (solo al cerrar)', correrGate('git commit -m wip', con('v3open', fichaV3(false))).code === 0); }

// ============== Nivel 4 — REGRESIONES del red-team adversario ================

// R1: clave [x] con la NOTA borrada (o placeholder tras →) → muda → BLOQUEA
{ const r = correrGate('git commit -m x', con('sinnota', fichaClaveSinNota(true)));
  check('R1 gate: clave [x] con nota borrada/placeholder → BLOQUEADO', r.code === 2); check('R1   · nombra la clave', /seguridad/.test(r.err)); }
// R1b: nota LEGÍTIMA que contiene "___" → NO debe bloquear (falso positivo cazado)
{ check('R1b gate: nota real que contiene "___" → PERMITIDO (no es falso positivo)', correrGate('git commit -m x', con('notaub', fichaNotaConGuionBajo(true))).code === 0); }

// R2: variantes de git que antes esquivaban el hook → ahora BLOQUEAN
{ const d = con('gv', fichaConClaveMuda(true));
  check('R2 gate: `git -c k=v commit` → BLOQUEADO', correrGate('git -c user.email=a@b.c commit -m x', d).code === 2);
  check('R2 gate: `git --no-pager commit` → BLOQUEADO', correrGate('git --no-pager commit -m x', d).code === 2);
  check('R2 gate: `git merge --no-ff x` → BLOQUEADO', correrGate('git merge --no-ff rama', d).code === 2);
  check('R2 gate: `git revert HEAD` → BLOQUEADO', correrGate('git revert --no-edit HEAD', d).code === 2);
  check('R2 gate: `git log --grep=commit` → PERMITIDO (no persiste)', correrGate('git log --grep=commit', d).code === 0); }

// R3: independencia burlada con puntuación ("Claude" vs "Claude.") → BLOQUEA
{ check('R3 gate: auditor "Claude." vs constructor "Claude" → BLOQUEADO', correrGate('git commit -m x', con('punto', fichaAuditorConPunto(true))).code === 2); }

// R4: un .md que NO es ficha (README con "Fecha de cierre:") → NO se trata como ficha
{ const d = con('readme'); ponerFicha(d, 'INDICE.md', '# Índice\n\nUltima Fecha de cierre: 2026-07-20 (informativo)\n\nsin claves.\n');
  check('R4 gate: README con "Fecha de cierre:" pero sin claves → PERMITIDO', correrGate('git commit -m x', d).code === 0); }

// R5: ficha LEGACY (15 claves, sin honestidad ni auditor) → grandfathered (solo cobertura)
{ check('R5 gate: ficha legacy resuelta (sin campos v2) → PERMITIDO (no brickea repos viejos)', correrGate('git commit -m x', con('legacy', fichaLegacy(true))).code === 0); }
// C26: la MISMA ficha legacy pero cerrada en/después de la fecha de adopción → ya NO se grandfathera.
{ const texto = `# Ficha nueva\n\n**Fecha de cierre:** 2026-07-25\n\n## Claves\n\n${KEYS_OK().join('\n')}\n`;
  check('C26 gate: ficha legacy con fecha >= adopción → BLOQUEADO (exige v2, no grandfathering)', correrGate('git commit -m x', con('c26', texto)).code === 2); }

// R6: fichas con marcador de lista `*` (Markdown válido) → se parsean las claves
{ const l = CLAVES.map((c) => `* [x] **(${c})** algo. → hecho`); const d = con('star', base(true, l) + HONESTO);
  check('R6 gate: claves con marcador `*` → PERMITIDO (parseadas OK)', correrGate('git commit -m x', d).code === 0); }

// ============== Herramientas de pilar (secrets / deps / deuda) ===============
function correr(script, dir) { const r = spawnSync('node', [script, dir], { encoding: 'utf8' }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }; }

{ const d = tmpProyecto('sec-clean'); fs.writeFileSync(path.join(d, 'app.js'), 'const x = 1;\n');
  check('secrets: repo limpio → OK (exit 0)', correr(SECRETS, d).code === 0); }
{ const d = tmpProyecto('sec-leak'); fs.writeFileSync(path.join(d, 'app.js'), 'const k = "' + ('AKIA' + '1234567890ABCDEF') + '";\n');
  const r = correr(SECRETS, d);
  check('secrets: AWS key filtrada → BLOQUEA (exit 1)', r.code === 1); check('secrets:   · nombra el hallazgo', /AWS/.test(r.out)); }
{ const d = tmpProyecto('sec-ph'); fs.writeFileSync(path.join(d, 'app.js'), 'const api_key = "your_placeholder_value_here";\n');
  check('secrets: placeholder (your_...) → OK (allowlist, no falso positivo)', correr(SECRETS, d).code === 0); }
{ const d = tmpProyecto('deps'); fs.writeFileSync(path.join(d, 'package.json'), '{}');
  const r = correr(DEPS, d); check('deps: package.json sin lockfile → BLOQUEA (exit 1, C43)', r.code === 1 && /package\.json/.test(r.out)); }
{ const d = tmpProyecto('deps-optout'); fs.writeFileSync(path.join(d, 'package.json'), '{}'); fs.writeFileSync(path.join(d, '.raw-deps-advisory'), '');
  check('deps: sin lock + opt-out (.raw-deps-advisory) → OK (exit 0, C43)', correr(DEPS, d).code === 0); }
{ const d = tmpProyecto('deuda'); fs.writeFileSync(path.join(d, 'x.js'), '// raw-deuda: cablear el candado de X antes de prod\n');
  const r = correr(DEUDA, d); check('deuda: cosecha el marcador raw-deuda: (exit 0)', r.code === 0 && /cablear el candado/.test(r.out)); }
{ const d = tmpProyecto('deuda-venc'); fs.writeFileSync(path.join(d, 'x.js'), '// raw-deuda: cablear candado X antes: 2020-01-01\n');
  const r = correr(DEUDA, d); check('deuda: `antes:` VENCIDA → BLOQUEA (exit 1, C38)', r.code === 1 && /VENCIDA/.test(r.out)); }
{ const d = tmpProyecto('deuda-fut'); fs.writeFileSync(path.join(d, 'x.js'), '// raw-deuda: cablear candado X antes: 2099-12-31\n');
  const r = correr(DEUDA, d); check('deuda: `antes:` futura → OK (exit 0, advisory)', r.code === 0 && /2099-12-31/.test(r.out)); }

// C10 — el gate escanea secretos AL COMMIT (shift-left), no solo en CI:
{ const d = con('c10-leak'); fs.writeFileSync(path.join(d, 'leak.js'), 'const k = "' + ('AKIA' + '1234567890ABCDEF') + '";\n');
  const r = correrGate('git commit -m x', d);
  check('C10 gate: commit con secreto (AWS key) → BLOQUEADO (shift-left)', r.code === 2);
  check('C10   · nombra el secreto', /SECRETO|AWS/i.test(r.err)); }
{ check('C10 gate: commit sin secreto (ficha resuelta) → PERMITIDO', correrGate('git commit -m x', con('c10-clean', fichaResuelta(true))).code === 0); }

// C39 — un candado del método no se apaga en silencio (test .skip sin registro):
{ const d = tmpProyecto('sil-clean'); fs.writeFileSync(path.join(d, 'a.test.js'), 'it("works", () => {});\n');
  check('C39 silenciado: sin skips → OK (exit 0)', correr(SILENCIADO, d).code === 0); }
{ const d = tmpProyecto('sil-bad'); fs.writeFileSync(path.join(d, 'a.test.js'), 'it.skip("later", () => {});\n');
  check('C39 silenciado: it.skip sin registro → BLOQUEA (exit 1)', correr(SILENCIADO, d).code === 1); }
{ const d = tmpProyecto('sil-ok'); fs.writeFileSync(path.join(d, 'a.test.js'), 'it.skip("later", () => {}); // raw-ok: flaky conocido, ver #123\n');
  check('C39 silenciado: it.skip con raw-ok → OK (exit 0)', correr(SILENCIADO, d).code === 0); }

// C3 — router core (puro + integración con git staged):
{ const { clavesRequeridas } = require('./raw-router');
  check('C3 router: *_cents → concurrencia', clavesRequeridas(['src/pago_cents.ts'], '').has('concurrencia'));
  check('C3 router: package.json → stack', clavesRequeridas(['package.json'], '').has('stack'));
  check('C3 router: fetch( → errores', clavesRequeridas([], 'await fetch("http://x")').has('errores'));
  check('C3 router: migración .sql → dato', clavesRequeridas(['prisma/migrations/001_x/migration.sql'], '').has('dato'));
  check('C3 router: diff neutro → nada', clavesRequeridas(['README.md'], 'texto normal').size === 0); }
{ const d = con('router-na', fichaConNA('concurrencia')); gitInit(d); gitStage(d, 'pago_cents.js', 'const amount_cents = 1;\n');
  check('C3 router: diff toca dinero pero (concurrencia)=N/A → BLOQUEADO', correrGate('git commit -m "[cierre] b"', d).code === 2); }
{ const d = con('router-ok', fichaResuelta(true)); gitInit(d); gitStage(d, 'pago_cents.js', 'const amount_cents = 1;\n'); gitStage(d, 'BITACORA.md', '# b\ncerrado\n');
  check('C3 router: diff toca dinero y clave resuelta (no N/A) → PERMITIDO', correrGate('git commit -m "[cierre] b"', d).code === 0); }

// C13 — cerrar un bloque exige tocar bitácora/pendientes en el MISMO commit:
{ const d = con('c13-nodoc', fichaResuelta(true)); gitInit(d); gitStage(d, 'app.js', 'const x = 1;\n');
  check('C13 gate: [cierre] sin tocar bitácora/pendientes → BLOQUEADO', correrGate('git commit -m "[cierre] b"', d).code === 2); }
{ const d = con('c13-doc', fichaResuelta(true)); gitInit(d); gitStage(d, 'app.js', 'const x = 1;\n'); gitStage(d, 'BITACORA.md', '# bitacora\nbloque cerrado\n');
  check('C13 gate: [cierre] con BITACORA.md tocada → PERMITIDO', correrGate('git commit -m "[cierre] b"', d).code === 0); }

// C4 — freno de mano (opt-in .raw-fondo-on; whitelist .raw-fondo-allow; bypass RAW_FONDO_OK=1):
{ const d = con('c4-off'); check('C4: sin flag → rm -rf PERMITIDO (dormant, no cambia el entorno)', correrGate('rm -rf build', d).code === 0); }
{ const d = con('c4-on'); fs.writeFileSync(path.join(d, '.raw-fondo-on'), '');
  check('C4: flag on → vercel deploy → BLOQUEADO', correrGate('vercel deploy --prod', d).code === 2);
  check('C4: flag on → rm -rf → BLOQUEADO', correrGate('rm -rf build', d).code === 2);
  check('C4: flag on → git push --force → BLOQUEADO', correrGate('git push --force origin main', d).code === 2);
  check('C4: flag on → comando normal (ls) → PERMITIDO', correrGate('ls -la', d).code === 0); }
{ const d = con('c4-bypass'); fs.writeFileSync(path.join(d, '.raw-fondo-on'), '');
  check('C4: flag on + RAW_FONDO_OK=1 → PERMITIDO (OK del dueño)', correrGate('RAW_FONDO_OK=1 vercel deploy --prod', d).code === 0); }
{ const d = con('c4-allow'); fs.writeFileSync(path.join(d, '.raw-fondo-on'), ''); fs.writeFileSync(path.join(d, '.raw-fondo-allow'), '# confianza\nvercel deploy\n');
  check('C4: flag on + patrón en .raw-fondo-allow → PERMITIDO', correrGate('vercel deploy --prod', d).code === 0); }

// ============== REGRESIONES DE LA AUDITORÍA ADVERSARIA (bypasses cazados) ============
// C10 — secretos reales que pasaban:
{ const d = tmpProyecto('sec-github'); fs.mkdirSync(path.join(d, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(d, '.github', 'workflows', 'deploy.yml'), 'aws: ' + ('AKIA' + 'IOSFODNN7ABCDEFG') + '\n');
  check('C10 regr: secreto en .github/ → BLOQUEA (dot-dir commiteable ya se escanea)', correr(SECRETS, d).code === 1); }
{ const d = tmpProyecto('sec-seed'); fs.mkdirSync(path.join(d, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(d, 'scripts', 'seed-demo.ts'), 'const k = "' + ('AKIA' + 'IOSFODNN7ABCDEFG') + '";\n');
  check('C10 regr: secreto critical en seed-demo → BLOQUEA (critical no se degrada)', correr(SECRETS, d).code === 1); }
{ const d = tmpProyecto('sec-interp'); fs.writeFileSync(path.join(d, 'conn.ts'), 'const u = `postgres://user:' + 'realpass123@db.host:5432/prod?x=${y}`;\n');
  check('C10 regr: connection string con ${} → BLOQUEA (sin allowlist de interpolación)', correr(SECRETS, d).code === 1); }
// C10 — exenciones legítimas del Portal (localhost, defaults débiles) NO bloquean; prod SÍ:
{ const d = tmpProyecto('sec-localhost'); fs.writeFileSync(path.join(d, '.env.example'), 'DATABASE_URL="postgresql://app:' + 'secret123@localhost:5432/db"\n');
  check('C10 regr: conexión a localhost → NO bloquea (dev/CI/example)', correr(SECRETS, d).code === 0); }
{ const d = tmpProyecto('sec-weakpw'); fs.writeFileSync(path.join(d, 'pg.mjs'), 'const SUPER_PASSWORD = "postgres";\n');
  check('C10 regr: password default débil ("postgres") → NO bloquea', correr(SECRETS, d).code === 0); }
{ const d = tmpProyecto('sec-prod'); fs.writeFileSync(path.join(d, 'conn.ts'), 'const u = "postgres://app:' + 'Xk9realProdPass@db.prod.aws.com:5432/main";\n');
  check('C10 regr: conexión a host de PROD (no localhost) → SÍ bloquea', correr(SECRETS, d).code === 1); }
// C39 — silenciamientos que pasaban:
{ const d = tmpProyecto('sil-fit'); fs.writeFileSync(path.join(d, 'a.test.js'), 'fdescribe("x", () => { fit("y", () => {}); });\n');
  check('C39 regr: fit()/fdescribe() (focus, apaga la suite) → BLOQUEA', correr(SILENCIADO, d).code === 1); }
{ const d = tmpProyecto('sil-skipif'); fs.writeFileSync(path.join(d, 'a_test.py'), '@pytest.mark.skipif(True)\ndef test_x(): pass\n');
  check('C39 regr: @pytest.mark.skipif → BLOQUEA', correr(SILENCIADO, d).code === 1); }
// C38 — deudas vencidas que pasaban:
{ const d = tmpProyecto('deuda-mjs'); fs.writeFileSync(path.join(d, 'migrate.mjs'), '// raw-deuda: cablear X antes: 2020-01-01\n');
  check('C38 regr: deuda vencida en .mjs → BLOQUEA (mjs ahora se escanea)', correr(DEUDA, d).code === 1); }
{ const d = tmpProyecto('deuda-nopad'); fs.writeFileSync(path.join(d, 'x.js'), '// raw-deuda: cablear X antes: 2020-1-1\n');
  check('C38 regr: fecha vencida NO zero-padded (2020-1-1) → BLOQUEA', correr(DEUDA, d).code === 1); }
// C43 — lockfile vacío que pasaba:
{ const d = tmpProyecto('deps-empty'); fs.writeFileSync(path.join(d, 'package.json'), '{}'); fs.writeFileSync(path.join(d, 'package-lock.json'), '');
  check('C43 regr: lockfile VACÍO (0 bytes) → BLOQUEA (no cuenta como lock)', correr(DEPS, d).code === 1); }
// C26 — fichas nuevas que esquivaban honestidad/revisión:
{ const texto = `# Ficha\n\n**Fecha de cierre:** 01/08/2026\n\n## Claves\n\n${KEYS_OK().join('\n')}\n`;
  check('C26 regr: ficha legacy con fecha NO-ISO (01/08/2026) → BLOQUEA', correrGate('git commit -m x', con('c26-slash', texto)).code === 2); }
{ const nueva = (base(true, KEYS_OK()) + HONESTO).replace('2026-07-20', '2026-08-01');
  check('C26 regr: ficha cerrada >= adopción sin "Qué revisar" → BLOQUEA (obligatoria post-adopción)', correrGate('git commit -m x', con('c26-rev', nueva)).code === 2); }
// C3 — esNA en español:
{ const { esNA } = require('./raw-router');
  check('C3 regr: esNA("No aplica") → true', esNA('No aplica — no hay concurrencia') === true);
  check('C3 regr: esNA("No corresponde") → true', esNA('No corresponde') === true);
  check('C3 regr: esNA("no aplicamos redondeo, usamos enteros") → false (nota real, no N/A)', esNA('no aplicamos redondeo, usamos enteros') === false); }
// C4 — Windows rm + falso positivo del mensaje citado:
{ const d = con('c4-ps'); fs.writeFileSync(path.join(d, '.raw-fondo-on'), '');
  check('C4 regr: Remove-Item -Recurse -Force → BLOQUEA (rm -rf de Windows)', correrGate('Remove-Item -Recurse -Force build', d).code === 2); }
{ const d = con('c4-msg'); fs.writeFileSync(path.join(d, '.raw-fondo-on'), '');
  check('C4 regr: git commit -m "truncate table logic" → PERMITIDO (no bloquea por mensaje citado)', correrGate('git commit -m "truncate table logic"', d).code === 0); }
// C13 — señuelo de nombre:
{ const d = con('c13-decoy', fichaResuelta(true)); gitInit(d); gitStage(d, 'src/changelog.ts', 'export const x = 1;\n');
  check('C13 regr: señuelo src/changelog.ts (no .md) → BLOQUEADO (no engaña)', correrGate('git commit -m "[cierre] b"', d).code === 2); }

// ============== FIXES DE LAS DEBILIDADES (lo que tenía solución, cerrado) ============
// gate-cwd: escanear el repo REAL del comando (git -C / cd), no el cwd de la sesión:
{ const target = con('cwd-target', fichaConClaveMuda(true)); const otro = tmpProyecto('cwd-otro');
  check('gate-cwd: git -C <repo con clave muda> desde otro cwd → BLOQUEADO (escanea el repo real)',
    correrGate('git -C "' + target + '" commit -m x', otro).code === 2); }
// C4 — más herramientas de deploy/borrado:
{ const d = con('c4-tools'); fs.writeFileSync(path.join(d, '.raw-fondo-on'), '');
  check('C4 regr: fly deploy → BLOQUEA', correrGate('fly deploy', d).code === 2);
  check('C4 regr: wrangler deploy → BLOQUEA', correrGate('wrangler deploy', d).code === 2);
  check('C4 regr: kubectl delete → BLOQUEA', correrGate('kubectl delete pod x', d).code === 2);
  check('C4 regr: aws s3 rm --recursive → BLOQUEA', correrGate('aws s3 rm s3://b --recursive', d).code === 2); }
// C13/desync: ficha CERRADA en el índice, ABIERTA en el worktree → se evalúa el índice:
{ const d = con('c13-desync'); gitInit(d);
  ponerFicha(d, 'b.md', fichaConClaveMuda(true)); spawnSync('git', ['add', 'docs/_cobertura/b.md'], { cwd: d }); // stage CERRADA (clave muda)
  ponerFicha(d, 'b.md', fichaConClaveMuda(false)); // worktree ahora ABIERTA (fecha en blanco)
  check('C13/desync: cerrada en índice + abierta en worktree → BLOQUEADO (se lee el índice)', correrGate('git commit -m x', d).code === 2); }
// C3-CI: raw-check corre el router sobre el último commit (backstop fuera del hook):
{ const d = con('cicheck'); gitInit(d);
  fs.writeFileSync(path.join(d, 'a.txt'), '1\n'); spawnSync('git', ['add', '-A'], { cwd: d }); gitCommit(d, 'base');
  ponerFicha(d, 'b.md', fichaConNA('concurrencia'));
  fs.writeFileSync(path.join(d, 'pago_cents.js'), 'const amount_cents = 1;\n'); spawnSync('git', ['add', '-A'], { cwd: d }); gitCommit(d, 'cierre b: dinero + ficha');
  check('C3-CI: raw-check corre el router sobre el commit de cierre (dinero + N/A) → FALLA (exit 1)', correrCheck(d).code === 1); }

// AUTO-ACTUALIZACIÓN del método en los proyectos (versión + adopción automática):
{ const { revisar, adoptar } = require('./raw-adopcion');
  const mk = (suf) => { const d = tmpProyecto(suf); fs.mkdirSync(path.join(d, 'docs', '_cobertura'), { recursive: true }); fs.writeFileSync(path.join(d, 'docs', '_cobertura', '_PLANTILLA.md'), '# Ficha\n\n- [ ] (dinero) algo\n'); return d; };
  const d1 = mk('adopt-need');
  check('adopción: plantilla sin "Qué revisar" → detecta pendiente', revisar(d1).pendientes.some((p) => p.id === 'ficha-que-revisar'));
  const d2 = mk('adopt-apply'); adoptar(d2);
  check('adopción: --aplicar agrega la sección sola y queda al día', revisar(d2).pendientes.length === 0 && /Qué revisar/.test(fs.readFileSync(path.join(d2, 'docs', '_cobertura', '_PLANTILLA.md'), 'utf8')));
  check('adopción: registra la versión adoptada (.raw-method-version)', fs.existsSync(path.join(d2, '.raw-method-version')));
  const d3 = tmpProyecto('adopt-none');
  check('adopción: proyecto que no usa fichas → sin pendientes (no molesta)', revisar(d3).pendientes.length === 0); }

// ===== REGRESIONES RONDA 2 (lo que la re-auditoría rompió, ahora cerrado) =====
{ const d = tmpProyecto('sec-ex-comment'); fs.writeFileSync(path.join(d, 'f.js'), 'const DB = "postgres://admin:' + 'R3alPr0dP4ss@prod-db.company.io:5432/main"; // example usage\n');
  check('C10 r2: secreto real + comentario "example" → BLOQUEA (allowlist mira el match, no la línea)', correr(SECRETS, d).code === 1); }
{ const d = tmpProyecto('sec-decoy'); fs.writeFileSync(path.join(d, 'f.js'), 'password = "postgres"; const apiSecret = "' + 'aB3xR3alPr0dS3cr3tV4lue99";\n');
  check('C10 r2: default-débil decoy NO tapa el secreto de al lado → BLOQUEA', correr(SECRETS, d).code === 1); }
{ const d = tmpProyecto('sec-template'); fs.writeFileSync(path.join(d, 'creds.template.json'), '{"type":"service' + '_account","private_key":"REDACTED"}\n');
  check('C10 r2: .template con creds REDACTED → NO bloquea', correr(SECRETS, d).code === 0); }
{ const d = tmpProyecto('sil-chain'); fs.writeFileSync(path.join(d, 'a.test.js'), 'it.concurrent.skip("x", () => {});\n');
  check('C39 r2: it.concurrent.skip → BLOQUEA', correr(SILENCIADO, d).code === 1); }
{ const d = tmpProyecto('sil-todo'); fs.writeFileSync(path.join(d, 'a.test.js'), 'describe.todo("x");\n');
  check('C39 r2: describe.todo → BLOQUEA', correr(SILENCIADO, d).code === 1); }
{ const d = tmpProyecto('deps-ws'); fs.writeFileSync(path.join(d, 'package.json'), '{}'); fs.writeFileSync(path.join(d, 'package-lock.json'), '   \n  \n');
  check('C43 r2: lockfile de solo-espacios → BLOQUEA', correr(DEPS, d).code === 1); }
{ const d = tmpProyecto('deuda-slash'); fs.writeFileSync(path.join(d, 'x.js'), '// raw-deuda: X antes: 2020/01/01\n');
  check('C38 r2: fecha vencida con barras (2020/01/01) → BLOQUEA', correr(DEUDA, d).code === 1); }
{ const { esNA } = require('./raw-router');
  check('C3 r2: esNA("No procede") → true', esNA('No procede') === true);
  check('C3 r2: esNA("Irrelevante") → true', esNA('Irrelevante') === true); }
{ const d = con('c4-quote'); fs.writeFileSync(path.join(d, '.raw-fondo-on'), '');
  check('C4 r2: irreversible citado (bash -c "vercel deploy") → BLOQUEA (no evade por comillas)', correrGate('bash -c "vercel deploy --prod"', d).code === 2);
  check('C4 r2: aws s3 rb --force → BLOQUEA', correrGate('aws s3 rb s3://bucket --force', d).code === 2);
  check('C4 r2: git push a rama que termina en -f → PERMITIDO (no falso positivo)', correrGate('git push origin feature-f', d).code === 0); }

// ===== REGRESIONES RONDA 3 =====
{ const d = tmpProyecto('sec-localhostdb'); fs.writeFileSync(path.join(d, 'm.js'), 'const u = "mongodb://root:' + 'S3cr3tPw9x@localhostdb.rds.amazonaws.com:27017/prod";\n');
  check('C10 r3: host que EMPIEZA con localhost (localhostdb.rds) → BLOQUEA', correr(SECRETS, d).code === 1); }
{ const d = tmpProyecto('sec-seed-precise'); fs.mkdirSync(path.join(d, 'seed'), { recursive: true }); fs.writeFileSync(path.join(d, 'seed', 'data.js'), 'export const key = "' + 'AIzaSyD3aBcDeFgH1jKl' + 'MnOpQrStUvWxYz012345";\n');
  check('C10 r3: GCP key precisa en seed/ → BLOQUEA (preciso no se degrada)', correr(SECRETS, d).code === 1); }
{ const d = tmpProyecto('sec-path'); fs.writeFileSync(path.join(d, 'docker-compose.yml'), 'PRIVATE_KEY=/etc/ssl/private/app.key\n');
  check('C10 r3: env var = RUTA de archivo → NO bloquea (no es secreto)', correr(SECRETS, d).code === 0); }
{ const d = tmpProyecto('sil-fixme'); fs.writeFileSync(path.join(d, 'a.test.js'), 'test.fixme("x", () => {});\n');
  check('C39 r3: test.fixme → BLOQUEA', correr(SILENCIADO, d).code === 1); }
{ const d = tmpProyecto('sil-unittest'); fs.writeFileSync(path.join(d, 'a_test.py'), '@unittest.skip("x")\ndef test_y(): pass\n');
  check('C39 r3: @unittest.skip → BLOQUEA', correr(SILENCIADO, d).code === 1); }
{ const d = tmpProyecto('deuda-rust'); fs.writeFileSync(path.join(d, 'lib.rs'), '// raw-deuda: X antes: 2020-01-01\n');
  check('C38 r3: deuda vencida en .rs → BLOQUEA', correr(DEUDA, d).code === 1); }
{ const { esNA, clavesRequeridas } = require('./raw-router');
  check('C3 r3: esNA("N/C") → true', esNA('N/C') === true);
  check('C3 r3: nota real que menciona "no aplica" a mitad → false', esNA('Se registra todo; no aplica el borrado físico') === false);
  check('C3 r3: archivo importe.ts → requiere concurrencia', clavesRequeridas(['src/importe.ts'], '').has('concurrencia')); }
{ const d = con('c4-am'); fs.writeFileSync(path.join(d, '.raw-fondo-on'), '');
  check('C4 r3: git commit -am "...vercel deploy..." → PERMITIDO (mensaje de -am no bloquea)', correrGate('git commit -am "add vercel deploy config"', d).code === 0);
  check('C4 r3: git push +refspec (force por +) → BLOQUEA', correrGate('git push origin +main', d).code === 2); }

// ===== REGRESIONES RONDA 4 =====
{ const d = tmpProyecto('sec-docker'); fs.writeFileSync(path.join(d, 'docker-compose.yml'), 'DATABASE_URL: postgres://postgres:' + 'postgres@db:5432/app\n');
  check('C10 r4: postgres:postgres@db (docker dev) → NO bloquea', correr(SECRETS, d).code === 0); }
{ const d = tmpProyecto('sec-prod-xxx'); fs.writeFileSync(path.join(d, 'f.env2'), 'DATABASE_URL=postgres://appuser:' + 'Kd8sPw02Zq@customer-xxx.abc.us-east-1.rds.amazonaws.com:5432/prod\n');
  check('C10 r4: prod host que contiene "xxx" + creds reales → BLOQUEA', correr(SECRETS, d).code === 1); }
{ const d = tmpProyecto('sec-longline'); fs.writeFileSync(path.join(d, 'x.js'), '// ' + 'x'.repeat(2500) + ' AKIA' + '1234567890ABCDEF\n');
  check('C10 r4: secreto en línea >2000 chars → BLOQUEA (MAX_LINE subido)', correr(SECRETS, d).code === 1); }
{ const d = tmpProyecto('sil-ws'); fs.writeFileSync(path.join(d, 'a.test.js'), 'it .skip("x", () => {});\n');
  check('C39 r4: it .skip (espacio alrededor del punto) → BLOQUEA', correr(SILENCIADO, d).code === 1); }
{ const d = tmpProyecto('sil-failing'); fs.writeFileSync(path.join(d, 'a.test.js'), 'test.failing("roto", () => {});\n');
  check('C39 r4: test.failing → BLOQUEA', correr(SILENCIADO, d).code === 1); }
{ const d = tmpProyecto('deuda-baddate'); fs.writeFileSync(path.join(d, 'x.js'), '// raw-deuda: X antes: 01-01-2025\n');
  check('C38 r4: antes: en formato no-ISO → BLOQUEA (no se ignora en silencio)', correr(DEUDA, d).code === 1); }
{ const { esNA, clavesRequeridas } = require('./raw-router');
  check('C3 r4: esNA("No afecta el saldo") → true', esNA('No afecta el saldo') === true);
  check('C3 r4: archivo reembolso.ts → requiere concurrencia', clavesRequeridas(['src/reembolso.ts'], '').has('concurrencia')); }
{ const d = con('c4-r4'); fs.writeFileSync(path.join(d, '.raw-fondo-on'), '');
  check('C4 r4: rm -i -rf (flags separados) → BLOQUEA', correrGate('rm -i -rf build', d).code === 2);
  check('C4 r4: npm publish --dry-run → PERMITIDO (simulación)', correrGate('npm publish --dry-run', d).code === 0); }
{ const d = con('c13-empty', fichaResuelta(true)); gitInit(d); gitStage(d, 'app.js', 'const x = 1;\n'); gitStage(d, 'CHANGELOG.md', '');
  check('C13 r4: doc señuelo VACÍO (CHANGELOG.md) → BLOQUEADO (exige contenido)', correrGate('git commit -m "[cierre] b"', d).code === 2); }

// ===== raw-ficha-firma (frescura de la ficha — nace con casos que DEBEN MORDER) =====
{ const { verificar, firmar, hashArchivo } = require('./raw-ficha-firma');
  const mkProy = (suf) => { const d = tmpProyecto(suf); fs.mkdirSync(path.join(d, 'docs', '_cobertura'), { recursive: true }); fs.mkdirSync(path.join(d, 'src'), { recursive: true }); return d; };
  const ficha = (bloque, fecha, archivo, hash, ajuste) => `# Ficha ${bloque}\n\n**Fecha de cierre:** ${fecha}\n\n## Cobertura firmada\n- ${archivo}: ${hash}\n\n## Ajustes posteriores\n${ajuste || '(ninguno)'}\n`;
  const w = (d, rel, c) => fs.writeFileSync(path.join(d, rel), c);

  { const d = mkProy('firma-ok'); w(d, 'src/a.tsx', 'const BORNE = 34;\n');
    w(d, 'docs/_cobertura/B25.md', ficha('B25', '2026-07-20', 'src/a.tsx', hashArchivo(d, 'src/a.tsx')));
    w(d, 'docs/_cobertura/B26.md', ficha('B26', '2026-07-25', 'src/b.tsx', 'deadbeef1234'));
    check('ficha-firma: sin cambios post-cierre → sin drift', verificar(d).length === 0); }

  { const d = mkProy('firma-drift'); w(d, 'src/a.tsx', 'const BORNE = 34;\n');
    w(d, 'docs/_cobertura/B25.md', ficha('B25', '2026-07-20', 'src/a.tsx', hashArchivo(d, 'src/a.tsx')));
    w(d, 'docs/_cobertura/B26.md', ficha('B26', '2026-07-25', 'src/b.tsx', 'deadbeef1234'));
    w(d, 'src/a.tsx', 'const BORNE = 27;\n'); // ¡PULIDO POSTERIOR! (el caso real de B26)
    check('ficha-firma: archivo cubierto cambió post-cierre SIN acuse → DRIFT (MUERDE)', verificar(d).length === 1); }

  { const d = mkProy('firma-acuse'); w(d, 'src/a.tsx', 'const BORNE = 34;\n');
    w(d, 'docs/_cobertura/B25.md', ficha('B25', '2026-07-20', 'src/a.tsx', hashArchivo(d, 'src/a.tsx'), '- 2026-07-31: BORNE 34->27 (src/a.tsx), pulido post-cierre decidido por C.'));
    w(d, 'docs/_cobertura/B26.md', ficha('B26', '2026-07-25', 'src/b.tsx', 'deadbeef1234'));
    w(d, 'src/a.tsx', 'const BORNE = 27;\n');
    check('ficha-firma: drift ACUSADO en "Ajustes posteriores" → limpio', verificar(d).length === 0); }

  { const d = mkProy('firma-58a'); w(d, 'src/a.tsx', 'x\n'); w(d, 'src/b.tsx', 'const X = 1;\n');
    w(d, 'docs/_cobertura/B25.md', ficha('B25', '2026-07-20', 'src/a.tsx', 'cafe12345678')); // B25 viejo, a.tsx no matchea → drift
    w(d, 'docs/_cobertura/B26.md', ficha('B26', '2026-07-25', 'src/b.tsx', hashArchivo(d, 'src/b.tsx')));
    w(d, 'src/b.tsx', 'const X = 2;\n'); // B26 (más reciente) cambió → EXIMIDO por §58a
    const dr = verificar(d);
    check('ficha-firma §58a: exime el bloque más reciente; el viejo SÍ cuenta', dr.length === 1 && dr[0].ficha === 'B25.md'); }

  { const d = mkProy('firma-sellar'); w(d, 'src/a.tsx', 'const BORNE = 34;\n');
    w(d, 'docs/_cobertura/B25.md', `# B25\n\n**Fecha de cierre:** 2026-07-20\n\n## Cobertura firmada\n- src/a.tsx\n\n## Ajustes posteriores\n(ninguno)\n`);
    w(d, 'docs/_cobertura/B26.md', ficha('B26', '2026-07-25', 'src/b.tsx', 'deadbeef1234'));
    firmar(d, 'docs/_cobertura/B25.md');
    check('ficha-firma: firmar() sella los hashes → verificar limpio', verificar(d).length === 0 && /src\/a\.tsx:\s*[a-f0-9]{6,}/.test(fs.readFileSync(path.join(d, 'docs/_cobertura/B25.md'), 'utf8'))); }
}

// ── C40 · raw-links: frescura documental (enlaces rotos + rango de ley declarado) ────────────────
// El método declara que "un documento que dice algo que ya no es cierto es un BUG" y deja la frescura
// en 📖 (deuda). Estos casos son la prueba de que ahora muerde — y, sobre todo, de que NO muerde donde
// no debe: la prosa histórica cita lo viejo A PROPÓSITO y acusarla enseñaría a apagar el candado.
const LINKS = path.join(HERE, 'raw-links.js');
function proyDoc(sufijo, archivos) {
  const d = tmpProyecto(sufijo);
  marcarMetodo(d);
  for (const [rel, txt] of Object.entries(archivos)) {
    const abs = path.join(d, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, txt);
  }
  return d;
}
// Ley con el §188 en el MEDIO y el §171 al FINAL: reproduce el engaño real (la última sección del
// archivo NO es la de número más alto). Un chequeo que lea "la última" pasa en verde y no sirve.
const LEY = '# Ley\n\n### §188\n188. **algo tardío.**\n\n### §171\n171. **algo con número menor.**\n';

{ const d = proyDoc('links-rango-mal', { 'docs/INVARIABLES.md': LEY, 'CLAUDE.md': 'La ley vive en `docs/INVARIABLES.md` (§1–§171).\n' });
  check('C40: CLAUDE.md declara §1–§171 con la ley en §188 → BLOQUEA (toma el MÁXIMO, no el último)', correr(LINKS, d).code === 1); }
{ const d = proyDoc('links-rango-ok', { 'docs/INVARIABLES.md': LEY, 'CLAUDE.md': 'La ley vive en `docs/INVARIABLES.md` (§1–§188).\n' });
  check('C40: rango declarado correcto → PASA', correr(LINKS, d).code === 0); }
{ const d = proyDoc('links-rango-historico', { 'docs/INVARIABLES.md': LEY,
    'docs/BITACORA.md': '## 2026-05-01 — bloque viejo\n\nEn ese momento la ley era `INVARIABLES.md` (§1–§171).\n' });
  check('C40 falso-positivo: rango viejo en una BITÁCORA fechada → NO bloquea (era cierto entonces)', correr(LINKS, d).code === 0); }
{ const d = proyDoc('links-roto', { 'docs/INVARIABLES.md': LEY, 'CLAUDE.md': 'Ver [la ficha](docs/_cobertura/B99.md).\n' });
  check('C40: enlace relativo a un archivo que no existe → BLOQUEA', correr(LINKS, d).code === 1); }
{ const d = proyDoc('links-roto-bitacora', { 'docs/INVARIABLES.md': LEY,
    'docs/BITACORA.md': '## 2026-05-01\n\nDetalle en [la ficha](_cobertura/B99.md).\n' });
  check('C40: un enlace roto SÍ importa en la bitácora (se clickea hoy, no en su fecha)', correr(LINKS, d).code === 1); }
{ const d = proyDoc('links-fence', { 'docs/INVARIABLES.md': LEY,
    'CLAUDE.md': 'Ejemplo de sintaxis:\n\n```md\n[así se enlaza](docs/NO-EXISTE.md)\n```\n' });
  check('C40 falso-positivo: enlace dentro de un bloque de código → NO bloquea (es un ejemplo)', correr(LINKS, d).code === 0); }
{ const d = proyDoc('links-details', { 'docs/INVARIABLES.md': LEY,
    'docs/PROMPT-PROXIMA-SESION.md': '<details><summary>Histórico</summary>\n\nVer [esto](VIEJO.md) y la ley (§1–§171).\n\n</details>\n' });
  check('C40 falso-positivo: prosa dentro de <details> histórico → NO bloquea', correr(LINKS, d).code === 0); }
{ const d = proyDoc('links-archivo', { 'docs/INVARIABLES.md': LEY, 'docs/_archivo/VIEJO.md': 'Ver [esto](OTRO.md).\n' });
  check('C40 falso-positivo: docs/_archivo/ → NO bloquea (prosa congelada)', correr(LINKS, d).code === 0); }
{ const d = tmpProyecto('links-no-metodo'); fs.writeFileSync(path.join(d, 'x.md'), 'Ver [roto](NO.md).\n');
  check('C40: fuera de un proyecto Raw Method → calla y pasa', correr(LINKS, d).code === 0); }


process.stdout.write(`\n${fallos === 0 ? '✅ TODO EN VERDE' : `❌ ${fallos} fallo(s)`}\n`);
process.exit(fallos === 0 ? 0 : 1);
