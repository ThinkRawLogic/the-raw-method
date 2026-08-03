#!/usr/bin/env node
/**
 * raw-session.js — EL REFLEJO DE SESIÓN (The Raw Method · Nivel 1)
 * ================================================================
 * Hook SessionStart. En cada sesión nueva (o resume/clear/compact), si el
 * proyecto usa The Raw Method, inyecta el reflejo del método como contexto —
 * para que la IA NO pueda "olvidar" que opera bajo él. Fuera de un proyecto
 * Raw Method, calla (no ensucia otras sesiones).
 *
 * Contrato SessionStart (Claude Code nativo): se emite JSON por stdout con dos campos:
 *   - `systemMessage`                    → aviso VISIBLE para el humano (banner en la UI).
 *   - `hookSpecificOutput.additionalContext` → el reflejo completo, que lee la IA.
 * (stdout CRUDO solo llegaría al contexto de la IA — invisible para el usuario; por eso el JSON.)
 */

'use strict';
const fs = require('fs');

// Mismo criterio que el gate (con walk-up por los padres), reusando el módulo compartido.
// Fallback defensivo: si el módulo no cargara, nunca rompemos el arranque de sesión.
let isMethodProject;
try { ({ isMethodProject } = require('./raw-cobertura')); }
catch (_) { isMethodProject = () => false; }

const REFLEJO = `
━━━ THE RAW METHOD — ACTIVO EN ESTE PROYECTO ━━━
Estás operando bajo The Raw Method. Esto NO es opcional, y un bloque NO se declara cerrado solo.

ANTES DE ESCRIBIR (la escalera — pará en el primer peldaño que sirva):
  1. ¿Esto necesita existir? Necesidad especulativa = no lo hagas (YAGNI).
  2. ¿Ya existe en el código? Reusá el primitivo/helper antes de reinventar.
  3. ¿Lo resuelve el stdlib, una feature nativa, o una dep ya instalada? Usalo.
  4. ¿Se puede en una línea? Una línea. Recién ahí, el mínimo que funciona.
El rigor es proporcional al downside (el DIAL): bloque chico = ceremonia chica; dinero/seguridad = a fondo (flota).

LA CADENA DE UNA AFIRMACIÓN (rige en TODO el flujo, no solo al auditar): antes de afirmar al dueño
plata, causa o impacto — existencia → dirección → magnitud, EN ESE ORDEN, el eslabón más barato
primero (¿alguien consume ese número? ¿va hacia donde digo? recién ahí: ¿cuánto?). Medir la
magnitud primero se SIENTE como verificar y no prueba nada. Eslabón sin cerrar = se entrega como
HIPÓTESIS, no como dato. Y toda afirmación medible que entre a un documento lleva su estampa:
\`medido: <resultado>, <fecha>\` — sin estampa, se escribe como hipótesis.

La unidad de trabajo es el BLOQUE (un objetivo claro). Cerrar un bloque dispara la ceremonia,
solo sobre los pilares que el router prendió:
  1. AUDITAR con los tres equipos:
       🔴 Red — ¿está roto?  (lo corre un agente fresco, distinto del que construyó; refuta por
          defecto; cada hallazgo pasa por las 3 lentes y sobrevive si 2 de 3 no lo refutan)
       ⚪ White — ¿logramos el objetivo?  (resultado contra la intención fijada ANTES de construir)
       🔵 Blue — ¿lo vigilamos?  (monitoreo/alertas, si va a producción)
  2. RESOLVER la ficha de cobertura: cada clave [x] con nota de CÓMO se cumplió, o [x] N/A — <por qué>.
       Una clave muda (sin nota) NO cuenta como cerrada.
  3. DOCUMENTAR en el MISMO cambio: ley, backlog, bitácora y todo doc que el cambio dejó desfasado.
  4. REPORTE honesto 50/50: Fortalezas + Debilidades + Qué NO se alcanzó a probar. Sin esto = incompleto.
  5. El OK lo da el DUEÑO, no vos. Lo irreversible (FONDO: publicar, gastar, borrar, ir a producción)
     SIEMPRE frena y espera al dueño. Ante la duda entre FORMA y FONDO, es FONDO.

Motor: de cada problema, una regla que mata la CLASE entera — no solo un parche.
Enforcement duro: el hook raw-gate RECHAZA \`git commit\` si una ficha marcada como cerrada deja una
clave sin resolver. No se evade con --no-verify. Lo que se pueda automatizar, se automatiza; lo que
no (juicio), se declara — nunca se disfraza de candado.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

function main() {
  let dir = process.cwd();
  try {
    const raw = fs.readFileSync(0, "utf8").replace(/^\uFEFF/, "").trim();
    if (raw) { const d = JSON.parse(raw); if (d && d.cwd) dir = d.cwd; }
  } catch (_) {}
  if (process.env.CLAUDE_PROJECT_DIR) dir = process.env.CLAUDE_PROJECT_DIR;

  if (!isMethodProject(dir)) return; // silencio fuera de un proyecto Raw Method

  // Auto-actualización: ¿el método avanzó y este proyecto quedó atrás? Se lo inyectamos a la IA
  // (y lo marcamos en el banner del humano) para que adopte lo aditivo y traiga lo manual al dueño.
  let contexto = REFLEJO, avisoAdopcion = '';
  try {
    const { revisar } = require('./raw-adopcion');
    const { version, pendientes } = revisar(dir);
    if (pendientes.length) {
      avisoAdopcion = ` · ⚠ ${pendientes.length} mejora(s) del método sin adoptar`;
      const script = (__dirname + '/raw-adopcion.js').replace(/\\/g, '/');
      contexto += `\n⚠ EL MÉTODO AVANZÓ (v${version}); este proyecto tiene ${pendientes.length} mejora(s) SIN ADOPTAR:\n` +
        pendientes.map((p) => `  · [${p.auto ? 'auto' : 'OK del dueño'}] ${p.titulo}`).join('\n') +
        `\nAL ARRANCAR: corré \`node "${script}" --aplicar "${dir}"\` (aplica lo auto), traé lo "OK del dueño" al dueño, y avisale QUÉ se adoptó.\n`;
    }
  } catch (_) {}

  // JSON: `systemMessage` = banner VISIBLE para el humano; `additionalContext` = el reflejo
  // que lee la IA. (stdout crudo solo iría al contexto de la IA, invisible para el usuario.)
  const out = {
    systemMessage: '━━━ THE RAW METHOD — ACTIVO EN ESTE PROYECTO ━━━  ·  Raw Logic | A thinking venture' + avisoAdopcion,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: contexto },
  };
  try { process.stdout.write(JSON.stringify(out)); } catch (_) {}
}

try { main(); } catch (_) { /* nunca romper el arranque de sesión */ }
