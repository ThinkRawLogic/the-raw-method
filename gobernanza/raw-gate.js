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
 * Para PERMITIR AVISANDO: exit 0 + JSON por stdout con `hookSpecificOutput.additionalContext`
 *   (único canal MEDIDO que llega a alguien; ver el comentario largo sobre `allow()`).
 *
 * Filosofía de fallo: ante un error interno, FALLA-ABIERTO (exit 0) para no brickear
 * tus commits — pero lo avisa por stderr. Un candado que rompe el flujo se apaga solo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { revisarCobertura } = require('./raw-cobertura');

// El repo EFECTIVO del comando: si hay `git -C <dir>` o un `cd <dir> &&` al inicio, ese es el
// directorio donde opera el git — no el cwd de la sesión. Cierra el bug de escanear el repo
// equivocado al commitear en otro repo desde la sesión de un proyecto.
function dirEfectivo(command, fallback) {
  const expandir = (raw) => {
    let x = raw.replace(/^['"]|['"]$/g, '');
    if (x === '~' || x.startsWith('~/') || x.startsWith('~\\')) x = path.join(os.homedir(), x.slice(1));
    return path.isAbsolute(x) ? x : path.resolve(fallback, x);
  };
  // git --work-tree=<dir> apunta git a otro árbol → ese es el repo efectivo.
  let m = command.match(/--work-tree[= ]("[^"]+"|'[^']+'|\S+)/i);
  if (m) { try { const d = expandir(m[1]); if (fs.existsSync(d)) return d; } catch (_) {} }
  // Exigimos que el `-C <dir>` sea del propio commit (no de un `git -C decoy rev-parse` señuelo antes del commit real).
  m = command.match(/\bgit\s+(?:-c\s+\S+\s+|--no-pager\s+)*-C\s+("[^"]+"|'[^']+'|\S+)(?:\s+(?:-c\s+\S+|--no-pager|--?[\w-]+(?:=\S+)?))*\s+(?:commit|merge|revert|cherry-pick|am)\b/i);
  if (m) { try { const d = expandir(m[1]); if (fs.existsSync(d)) return d; } catch (_) {} }
  // Todos los `cd` (al inicio o tras && ; |), tomando el ÚLTIMO que resuelva a un dir existente.
  const cds = [...command.matchAll(/(?:^|&&|;|\|)\s*cd\s+("[^"]+"|'[^']+'|[^\s&;|]+)/gi)];
  for (let k = cds.length - 1; k >= 0; k--) { try { const d = expandir(cds[k][1]); if (fs.existsSync(d)) return d; } catch (_) {} }
  return fallback;
}

// Helpers de git para el router (C3): leen el diff staged. Best-effort, falla-abierto
// (sin git, o fuera de un repo, devuelven vacío → el router no hace nada).
function gitOut(dir, args) { try { const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' }); return r.stdout || ''; } catch (_) { return ''; } }
function gitLines(dir, args) { return gitOut(dir, args).split('\n').map((s) => s.trim()).filter(Boolean); }

// C4 — freno de mano (OPT-IN por proyecto vía `.raw-fondo-on`). Frena operaciones IRREVERSIBLES
// (deploy/publish/rm -rf/push --force/drop table/migrate reset) salvo (a) patrón de confianza en
// `.raw-fondo-allow`, o (b) OK explícito del dueño: `RAW_FONDO_OK=1` antepuesto al comando.
// Dormido por defecto → no cambia el entorno de nadie hasta que se cree `.raw-fondo-on`.
function c4Habilitado(dir) { try { return fs.existsSync(path.join(dir, '.raw-fondo-on')); } catch (_) { return false; } }
// Lista NEGRA de operaciones irreversibles. Honesto: una lista negra nunca está "completa"
// (por eso C4 es una red, no un sello); se amplía cuando aparece una herramienta nueva.
const IRREVERSIBLE = /\b(?:vercel\s+(?:deploy|--prod|prod)|netlify\s+deploy|(?:fly|flyctl)\s+deploy|wrangler\s+(?:deploy|publish)|firebase\s+deploy|gcloud\s+(?:\S+\s+){1,3}delete|helm\s+(?:delete|uninstall)|kubectl\s+delete|(?:npm|pnpm|yarn)\s+publish|gh\s+release\s+create|aws\s+s3\s+(?:(?:rm|sync)\b[^|;&\n]*--(?:delete|recursive)|rb\b)|rm\s+(?:-\S+\s+)*-[a-z]*f|rm\s+[^|;&\n]*--force|find\s+[^|;&\n]*-delete\b|Remove-Item\b[^|;&\n]*-(?:Recurse|Force)|git\s+push\b[^|;&\n]*(?:--force|--force-with-lease|\s-f\b|\s\+\w)|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|git\s+branch\s+[^|;&\n]*-[a-zA-Z]*D|drop\s+(?:table|database|schema)|truncate\s+table|dropdb\b|prisma\s+migrate\s+reset|prisma\s+db\s+push\b[^|;&\n]*--accept-data-loss|supabase\s+db\s+reset)/i;
function esConfianzaFondo(command, dir) {
  try {
    const p = path.join(dir, '.raw-fondo-allow');
    if (!fs.existsSync(p)) return false;
    return fs.readFileSync(p, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#')).some((pat) => command.includes(pat));
  } catch (_) { return false; }
}

// Lee las fichas del ÍNDICE de git (contenido staged), para evaluar lo que REALMENTE se commitea
// — no el worktree, que se puede desincronizar para saltear los chequeos (C13/audit).
function leerFichasDelIndex(root) {
  const { parseFicha, esFicha } = require('./raw-cobertura');
  const out = [];
  for (const sf of gitLines(root, ['diff', '--cached', '--name-only'])) {
    if (!/(^|\/)(docs\/_cobertura|_cobertura)\/[^/]+\.md$/i.test(sf.replace(/\\/g, '/'))) continue;
    const texto = gitOut(root, ['show', ':' + sf]);
    if (!texto) continue;
    const ficha = parseFicha(texto, path.basename(sf));
    if (esFicha(ficha)) out.push(ficha);
  }
  return out;
}

// PERMITIR, opcionalmente con un AVISO. El canal es `hookSpecificOutput.additionalContext` del
// contrato PreToolUse: JSON por stdout + exit 0 → el harness INYECTA ese texto en el contexto de
// la IA que corrió el comando, y NO frena nada (sin `permissionDecision`, la decisión de permisos
// sigue su curso normal). Un stdout que no se pudiera parsear tampoco rompe: el comando pasa igual.
//
// POR QUÉ ESTE CANAL Y NO OTRO — `medido: 2026-08-19` (Claude Code 2.1.229, hook cableado de verdad,
// commit real que cumplía la condición; NO simulado por stdin):
//   · `systemMessage` (lo que usaba este archivo antes): NO LLEGA A NADIE. El dueño miró la pantalla
//     tras un commit real y no apareció nada; y tampoco entró al contexto de la IA. La doc oficial
//     dice que llega a los dos — acá no llegó. Era un candado decorativo: peor que nada, porque
//     tranquiliza. (La misma creencia sigue escrita en raw-session.js para SessionStart, SIN medir.)
//   · stderr con exit 0: NO LLEGA (se descarta; probado en el mismo commit, con marcador propio).
//   · `additionalContext`: LLEGA. Textual, en el resultado de la herramienta Bash de la IA:
//     «PreToolUse:Bash hook additional context: ⚠ THE RAW METHOD — b.md: …» y el commit pasó igual.
// De ahí que el texto del aviso le ORDENE a la IA contárselo al dueño: el canal probado que llega
// al humano es la IA hablando, el mismo camino que el método ya usa para el banner (SKILL.md).
function allow(aviso) {
  if (aviso) {
    try { process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: aviso } })); } catch (_) {}
  }
  process.exit(0);
}
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
  const cwd = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const dir = dirEfectivo(command, cwd); // el repo donde REALMENTE corre el git (cd / git -C), no solo el cwd

  // C4 — FRENO DE MANO (opt-in). Corre para CUALQUIER comando, antes que nada.
  // Quitamos strings entre comillas antes de matchear: así el `-m "..."` de un commit ni una
  // palabra peligrosa citada en un mensaje disparan un falso positivo (que empujaría al bypass).
  const cmdSinComillas = command.replace(/(?:^|\s)-[a-z]*m\s+(?:"[^"]*"|'[^']*')/g, ' '); // el mensaje de -m/-am/-cm, no TODO string citado (un irreversible entre comillas NO debe evadir)
  if (c4Habilitado(dir) && IRREVERSIBLE.test(cmdSinComillas) && !/--dry-run\b/i.test(command) && !/\bRAW_FONDO_OK=1\b/.test(command) && !esConfianzaFondo(command, dir)) {
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

  const { esMetodo, root, fichas, cerradas, problemas } = revisarCobertura(dir);
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

  // Regla 1b + base del router/C13: evaluar la versión del ÍNDICE de las fichas staged (lo que se
  // commitea de verdad). Una ficha cerrada en el índice no se puede "abrir" en el worktree para saltear.
  let idxCerradas = [], idxFichas = [];
  try {
    const idx = revisarCobertura(dir, leerFichasDelIndex);
    if (idx.problemas.length) {
      return block('Cobertura incompleta en la versión STAGED (índice) de un bloque cerrado:\n' + idx.problemas.map((p) => '  · ' + p).join('\n'));
    }
    idxCerradas = idx.cerradas || [];
    idxFichas = idx.fichas || [];
  } catch (_) { /* sin git: falla-abierto */ }

  // ¿Este commit CIERRA un bloque? Por el mensaje ([cierre]/cerrar bloque/close block), O porque hay
  // una ficha CERRADA en el ÍNDICE (el diff del cierre trae su propia ficha). Robusto al wording.
  const declaraCierre = /\[cierre\]|cerrar\s+bloque|close\s+block/i.test(command);
  // `git commit -a/-am` auto-stagea al EJECUTARSE; cuando corre el hook (antes de git) los cambios
  // NO están en el índice → miramos el worktree (diff HEAD) para no quedar ciegos.
  const conA = /\bgit\s+commit\b[^|;&\n]*\s-[a-z]*a/i.test(command);
  const diffArgs = conA ? ['diff', 'HEAD'] : ['diff', '--cached'];
  const staged = gitLines(dir, [...diffArgs, '--name-only']);
  const cerrando = declaraCierre || idxCerradas.length > 0 || (conA && cerradas.length > 0);
  // Para router/C13: con -a, el worktree; si no, lo del índice (o worktree si no hay ficha staged).
  const cerradasEfectivas = conA ? cerradas : (idxCerradas.length ? idxCerradas : cerradas);

  // Regla 2: declara cierre pero NO hay ninguna ficha cerrada (ni en worktree ni en índice).
  // El mensaje distingue los dos motivos, que se veían iguales: no hay ficha, o SÍ hay .md en
  // _cobertura/ pero ninguno se reconoció como ficha (una casilla mal escrita la vuelve invisible).
  // Decirle "copiá la plantilla" a alguien que YA tiene su ficha ahí lo manda a resolver otro problema.
  if (declaraCierre && cerradas.length === 0 && idxCerradas.length === 0) {
    let pista = '';
    try {
      const sinReconocer = fichas.length === 0 && root ? require('./raw-cobertura').noFichas(root) : [];
      if (sinReconocer.length) {
        pista = `  · OJO: hay ${sinReconocer.length} archivo(s) .md en _cobertura/ que el candado NO reconoció como ficha:\n` +
          sinReconocer.map((f) => `      ${f}`).join('\n') +
          '\n    Una ficha se reconoce por el nombre de sus casillas (`- [x] **(spec-leída)** …`); si uno quedó\n' +
          '    mal escrito, esa ficha es INVISIBLE para el candado. Revisá esos archivos antes de copiar otra plantilla.\n';
      }
    } catch (_) { /* el diagnóstico nunca puede tumbar el veredicto */ }
    return block(
      'El commit declara un CIERRE de bloque pero no hay ninguna ficha de cobertura cerrada.\n' +
      pista +
      '  · Copiá plantillas/ficha-cobertura.md, resolvé TODAS sus claves y llená "Fecha de cierre".'
    );
  }

  // Regla 3 (C3 — ROUTER core): al cerrar, el diff no puede tocar un pilar de alta confianza
  // (dinero/migración/deps/salientes) y que la ficha lo marque N/A. Cierra el "falso N/A".
  if (cerrando && cerradasEfectivas.length > 0) {
    try {
      const { clavesRequeridas, problemasDeRouter } = require('./raw-router');
      const req = clavesRequeridas(staged, gitOut(dir, diffArgs));
      if (req.size) {
        const probs = [];
        for (const f of cerradasEfectivas) for (const p of problemasDeRouter(f, req)) probs.push(`${f.archivo}: ${p}`);
        if (probs.length) return block('El router detectó un pilar TOCADO por el diff pero marcado N/A (falso N/A):\n' + probs.map((p) => '  · ' + p).join('\n'));
      }
    } catch (_) { /* sin git o error interno: falla-abierto, no brickeamos el commit */ }
  }

  // Regla 4 (C13 — DOCS EN EL MISMO COMMIT): un cierre exige tocar bitácora/pendientes CON contenido
  // (no un archivo señuelo vacío con el nombre correcto).
  const tocaDocReal = staged.some((f) => {
    if (!/(^|\/)(bit[aá]cora|pendientes|backlog|changelog)[^/]*\.(md|txt|mdx)$/i.test(f)) return false;
    const ns = gitOut(dir, [...diffArgs, '--numstat', '--', f]).trim().split(/\s+/);
    return parseInt(ns[0], 10) > 0; // líneas AÑADIDAS > 0
  });
  if (cerrando && staged.length && !tocaDocReal) {
    return block(
      'Registrás un CIERRE pero el commit no toca la bitácora ni los pendientes.\n' +
      '  · Actualizá BITACORA.md y PENDIENTES.md en el MISMO commit — un doc que miente sobre el estado es un bug.'
    );
  }

  // AVISO (NO bloquea) — la ceremonia de cierre se dispara con dos campos que escribe el mismo
  // agente que cierra: "Fecha de cierre" y la palabra "[cierre]" en el mensaje. Sin ninguno de los
  // dos, una ficha TERMINADA pasa como si nada y los candados de cierre (50/50 honesto, auditor
  // independiente, "qué revisar", disposición de debilidades) no corren sobre ella: el gate queda
  // inerte y hoy no dice una palabra. Acá lo dice.
  //
  // CUÁNDO SE CALLA (y por qué): trabajar sobre una ficha a medio llenar es lo NORMAL durante un
  // bloque — avisar en cada commit sería ruido, y un aviso ruidoso se apaga. El disparador es la
  // ficha COMPLETA: las 15 claves resueltas, con su nota. Ahí ya no queda trabajo de cobertura
  // pendiente, así que la fecha vacía es lo único que separa el bloque de su ceremonia; es el
  // único momento en que el aviso agrega información en vez de repetir lo obvio.
  const tocadas = conA
    ? fichas.filter((f) => staged.some((sf) => sf.replace(/\\/g, '/').endsWith(f.archivo)))
    : idxFichas; // sin -a, el lector del índice YA devuelve sólo las fichas staged
  const { problemasDeFicha } = require('./raw-cobertura');
  const completasSinCerrar = tocadas.filter((f) => !f.cerrada && problemasDeFicha(f).length === 0);
  if (completasSinCerrar.length) {
    const nombres = completasSinCerrar.map((f) => f.archivo).slice(0, 3).join(', ');
    return allow(
      `⚠ THE RAW METHOD — ${nombres}: la ficha está COMPLETA pero sin "Fecha de cierre", así que ` +
      'los candados de CIERRE (reporte 50/50, auditor independiente, "qué revisar") NO corrieron sobre ella. ' +
      'DECÍSELO AL DUEÑO en tu próxima respuesta, con el nombre de la ficha: este aviso llega SOLO a vos ' +
      '(él no lo ve en pantalla), y callártelo lo deja creyendo que el bloque pasó por su ceremonia de cierre. ' +
      'Si este commit cierra el bloque, llená la fecha. Si el bloque sigue abierto, decilo igual y seguí: no frena nada.'
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
