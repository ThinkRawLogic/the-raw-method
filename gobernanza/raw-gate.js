#!/usr/bin/env node
/**
 * raw-gate.js — EL CANDADO DEL PROCESO (The Raw Method · Nivel 1)
 * ================================================================
 * Hook PreToolUse. Se dispara ANTES de que la IA corra un comando (Bash/PowerShell)
 * y RECHAZA el `git commit` si una ficha de cobertura marcada como CERRADA deja
 * una clave sin resolver. A diferencia del pre-commit de git, esto:
 *   - corre a nivel del harness (la IA no lo puede saltar),
 *   - NO se puede evadir con `git commit --no-verify` (interceptamos el comando antes de git),
 *   - no depende de vitest/Node-en-el-proyecto (corre con el Node de tu máquina).
 *
 * La lógica de cobertura vive en raw-cobertura.js (compartida con raw-check.js, el
 * gate de CI del Nivel 2). Este archivo es solo la CÁSCARA de hook: stdin → veredicto.
 *
 * Contrato PreToolUse: lee JSON por stdin { tool_name, tool_input:{command}, cwd }.
 * Para BLOQUEAR: exit 2 + mensaje por stderr (el harness se lo muestra a la IA).
 * Para PERMITIR: exit 0 sin ruido.
 *
 * Filosofía de fallo: ante un error interno, FALLA-ABIERTO (exit 0) para no brickear
 * tus commits — pero lo avisa por stderr. Un candado que rompe el flujo se apaga solo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { revisarCobertura } = require('./raw-cobertura');

// Helpers de git para el router (C3): leen el diff staged. Best-effort, falla-abierto
// (sin git, o fuera de un repo, devuelven vacío → el router no hace nada).
function gitOut(dir, args) { try { const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' }); return r.stdout || ''; } catch (_) { return ''; } }
function gitLines(dir, args) { return gitOut(dir, args).split('\n').map((s) => s.trim()).filter(Boolean); }

// C4 — freno de mano (OPT-IN por proyecto vía `.raw-fondo-on`). Frena operaciones IRREVERSIBLES
// (deploy/publish/rm -rf/push --force/drop table/migrate reset) salvo (a) patrón de confianza en
// `.raw-fondo-allow`, o (b) OK explícito del dueño: `RAW_FONDO_OK=1` antepuesto al comando.
// Dormido por defecto → no cambia el entorno de nadie hasta que se cree `.raw-fondo-on`.
function c4Habilitado(dir) { try { return fs.existsSync(path.join(dir, '.raw-fondo-on')); } catch (_) { return false; } }
const IRREVERSIBLE = /\b(?:vercel\s+(?:deploy|--prod|prod)|netlify\s+deploy|(?:npm|pnpm|yarn)\s+publish|gh\s+release\s+create|rm\s+-[a-z]*f|rm\s+[^|;&\n]*--force|Remove-Item\b[^|;&\n]*-(?:Recurse|Force)|git\s+push\b[^|;&\n]*(?:--force|--force-with-lease|-f\b)|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|drop\s+(?:table|database|schema)|truncate\s+table|prisma\s+migrate\s+reset|prisma\s+db\s+push\b[^|;&\n]*--accept-data-loss)/i;
function esConfianzaFondo(command, dir) {
  try {
    const p = path.join(dir, '.raw-fondo-allow');
    if (!fs.existsSync(p)) return false;
    return fs.readFileSync(p, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#')).some((pat) => command.includes(pat));
  } catch (_) { return false; }
}

function allow() { process.exit(0); }
function block(msg) {
  process.stderr.write(
    '\n⛔ THE RAW METHOD — commit bloqueado por el candado de cobertura.\n\n' +
    msg +
    '\n\nResolvé cada clave ([x] con nota de CÓMO, o [x] N/A — <por qué>) antes de cerrar.\n' +
    'Esto no es castigo: es el freno que evita declarar "hecho" algo con un ángulo sin revisar.\n'
  );
  process.exit(2); // exit 2 = PreToolUse bloquea la llamada
}

function readStdin() {
  // Windows/PowerShell antepone un BOM UTF-8 al pipe; sin quitarlo, JSON.parse
  // revienta y el candado fallaría-abierto (nunca bloquearía). Ver ponytail.
  try { return fs.readFileSync(0, "utf8").replace(/^\uFEFF/, "").trim(); } catch (_) { return ''; }
}

function main() {
  let data = {};
  try { data = JSON.parse(readStdin() || '{}'); } catch (_) { data = {}; }

  const command = (data.tool_input && data.tool_input.command) || '';
  const dir = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // C4 — FRENO DE MANO (opt-in). Corre para CUALQUIER comando, antes que nada.
  // Quitamos strings entre comillas antes de matchear: así el `-m "..."` de un commit ni una
  // palabra peligrosa citada en un mensaje disparan un falso positivo (que empujaría al bypass).
  const cmdSinComillas = command.replace(/"[^"]*"|'[^']*'/g, '');
  if (c4Habilitado(dir) && IRREVERSIBLE.test(cmdSinComillas) && !/\bRAW_FONDO_OK=1\b/.test(command) && !esConfianzaFondo(command, dir)) {
    process.stderr.write(
      '\n⛔ THE RAW METHOD — FRENO DE MANO (C4): operación IRREVERSIBLE (FONDO).\n\n' +
      '  · ' + command.slice(0, 200) + '\n\n' +
      'Esto no lo decide el agente solo: traelo al dueño. Si el dueño YA autorizó, corré el comando\n' +
      'anteponiendo  RAW_FONDO_OK=1 . O sumá el patrón de confianza a  .raw-fondo-allow .\n'
    );
    process.exit(2);
  }

  // Solo nos importan los comandos que PERSISTEN un commit. Tolera opciones globales de git
  // entre `git` y el subcomando (-c k=v, -C dir, --no-pager, ...) y cubre merge/revert/cherry-pick/am.
  // ponytail: el hook es best-effort local (no conoce aliases como `git ci`); el backstop real de
  // los casos exóticos es raw-check en CI, que corre sobre el estado ya guardado sin importar el comando.
  const ES_COMMIT = /\bgit\s+(?:-c\s+\S+\s+|-C\s+\S+\s+|--?[\w-]+(?:=\S+)?\s+)*(commit|merge|revert|cherry-pick|am)\b/i;
  if (!ES_COMMIT.test(command)) return allow();

  const { esMetodo, cerradas, problemas } = revisarCobertura(dir);
  if (!esMetodo) return allow(); // fuera de un proyecto Raw Method, no nos metemos

  // Regla 0 (C10 — SECRETOS SHIFT-LEFT): el escaneo de secretos corre AL COMMIT, no solo en CI.
  // Como el hook no se evade con --no-verify, un secreto no llega a entrar al historial local.
  // Falla-abierto si raw-secrets no está (no brickeamos por falta del scanner).
  try {
    const { escanear } = require('./raw-secrets');
    const secretos = escanear(dir).filter((f) => f.severity === 'critical' || f.severity === 'high');
    if (secretos.length) {
      process.stderr.write(
        '\n⛔ THE RAW METHOD — commit bloqueado: SECRETO(S) en el código.\n\n' +
        secretos.map((f) => `  · [${f.severity}] ${f.type} — ${f.file}:${f.line}`).join('\n') +
        '\n\nSacá el secreto (movelo a una variable de entorno / gestor de secretos) y rotá el que se filtró.\n' +
        'El escaneo corre AL COMMIT (shift-left, C10); no se evade con --no-verify.\n'
      );
      process.exit(2);
    }
  } catch (_) { /* raw-secrets ausente: seguimos con cobertura (falla-abierto local) */ }

  // Regla 1 (CANDADO COBERTURA): ninguna ficha cerrada deja una clave muda.
  if (problemas.length) {
    return block('Cobertura incompleta en bloque(s) cerrado(s):\n' + problemas.map((p) => '  · ' + p).join('\n'));
  }

  // ¿Este commit CIERRA un bloque? Robusto al wording del mensaje: lo declara el mensaje
  // ([cierre]/cerrar bloque/close block), O hay una ficha CERRADA entre los archivos staged
  // (el diff del cierre trae su propia ficha). Así funciona aunque el mensaje sea "B15 — ...".
  const declaraCierre = /\[cierre\]|cerrar\s+bloque|close\s+block/i.test(command);
  const staged = gitLines(dir, ['diff', '--cached', '--name-only']);
  const norm = (s) => s.replace(/\\/g, '/');
  const fichasStaged = cerradas.filter((f) => staged.some((sf) => norm(sf).endsWith(f.archivo)));
  const cerrando = declaraCierre || fichasStaged.length > 0;

  // Regla 2: declara cierre pero NO hay ninguna ficha cerrada.
  if (declaraCierre && cerradas.length === 0) {
    return block(
      'El commit declara un CIERRE de bloque pero no hay ninguna ficha de cobertura cerrada.\n' +
      '  · Copiá plantillas/ficha-cobertura.md, resolvé sus 15 claves y llená "Fecha de cierre".'
    );
  }

  // Regla 3 (C3 — ROUTER core): al cerrar, el diff no puede tocar un pilar de alta confianza
  // (dinero/migración/deps/salientes) y que la ficha lo marque N/A. Cierra el "falso N/A".
  // Chequea SOLO las fichas que se cierran en este commit (fallback: todas, si el cierre vino por
  // mensaje sin ficha staged) — así una N/A vieja y correcta no choca con un diff nuevo.
  if (cerrando && cerradas.length > 0) {
    try {
      const { clavesRequeridas, problemasDeRouter } = require('./raw-router');
      const req = clavesRequeridas(staged, gitOut(dir, ['diff', '--cached']));
      if (req.size) {
        const fichas = fichasStaged.length ? fichasStaged : cerradas;
        const probs = [];
        for (const f of fichas) for (const p of problemasDeRouter(f, req)) probs.push(`${f.archivo}: ${p}`);
        if (probs.length) return block('El router detectó un pilar TOCADO por el diff pero marcado N/A (falso N/A):\n' + probs.map((p) => '  · ' + p).join('\n'));
      }
    } catch (_) { /* sin git o error interno: falla-abierto, no brickeamos el commit */ }
  }

  // Regla 4 (C13 — DOCS EN EL MISMO COMMIT): un cierre exige tocar bitácora/pendientes.
  if (cerrando && staged.length && !staged.some((f) => /(^|\/)(bit[aá]cora|pendientes|backlog|changelog)[^/]*\.(md|txt|mdx)$/i.test(f))) {
    return block(
      'Registrás un CIERRE pero el commit no toca la bitácora ni los pendientes.\n' +
      '  · Actualizá BITACORA.md y PENDIENTES.md en el MISMO commit — un doc que miente sobre el estado es un bug.'
    );
  }

  return allow();
}

try {
  main();
} catch (e) {
  // Falla-abierto: nunca brickeamos un commit por un error del propio candado.
  try { process.stderr.write(`[raw-gate] aviso: el candado no pudo evaluar (${e && e.message}); se deja pasar.\n`); } catch (_) {}
  process.exit(0);
}
