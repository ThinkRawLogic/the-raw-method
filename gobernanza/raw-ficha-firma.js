#!/usr/bin/env node
/**
 * raw-ficha-firma.js — FRESCURA DE LA FICHA (The Raw Method · candado de la clase
 * "el pulido posterior al cierre vuelve FALSA la ficha del bloque").
 * =============================================================================
 * El caso real (B26, 2026-07-31): la ficha se cerró afirmando "bornes 34px"; después
 * del cierre el dueño pidió pulir y pasaron a 27px; la ficha quedó mintiendo y NINGÚN
 * gate lo vio (typecheck/lint/tests/build en verde con la ficha falsa).
 *
 * NO verifica "¿este párrafo dice la verdad?" — eso es JUICIO, y disfrazar juicio de
 * candado es lo que el método prohíbe. Es un PROXY MECÁNICO: la ficha DECLARA qué
 * archivos cubre y se FIRMA (hash) al cerrar; si un archivo cubierto CAMBIA después sin
 * que la ficha lo ACUSE en "Ajustes posteriores", hay drift → la ficha PUEDE estar mintiendo.
 *
 * DOS RESTRICCIONES QUE RESPETA:
 *  1. NO bloquea el push: falla el gate/commit (o `verificar` en CI), nunca el respaldo.
 *  2. §58a (pulido libre): se EXIME el bloque más reciente (máxima "Fecha de cierre") —
 *     está en ventana de pulido. El drift de un bloque se caza al cerrar el SIGUIENTE.
 *     Residuo declarado: la staleness del ÚLTIMO bloque no se caza hasta que aparece uno nuevo.
 *
 * CLI:  node raw-ficha-firma.js verificar <dir>        (exit 1 si hay drift sin acusar)
 *       node raw-ficha-firma.js firmar <dir> <ficha>   (computa y escribe los hashes al sellar)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hashArchivo(dir, rel) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, rel))).digest('hex').slice(0, 12); }
  catch { return 'FALTA'; } // archivo borrado/renombrado también es drift
}

function fechaCierre(texto) {
  const m = (texto || '').match(/Fecha de cierre:\**[ \t]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  return m ? m[1] : null;
}

// UNA sola definición de "línea de ruta cubierta": prefijo (bullet/sangría) + ruta + `: hash` opcional.
// La ruta es CUALQUIER token sin espacios ni `:` — admite acentos/ñ, corchetes de App Router ([id]),
// paréntesis (grupo), @slot, todo — SIN enumerar caracteres (enumerar siempre deja alguno afuera: el
// Red Team cazó que `\w` es ASCII y tiraba `src/página.tsx` en silencio). Las rutas del repo son
// relativas, sin `:`, así que `[^\s:]+` no colisiona con el separador del hash.
const RUTA_RE = /^(\s*[-*]?\s*)([^\s:]+\.[a-z0-9]+)\s*(?::\s*([a-f0-9]{6,}|FALTA))?\s*$/i;

// Cuerpo de la sección <titulo> hasta el PRÓXIMO heading de nivel <= al de la sección (así sub-headings
// `###` y separadores `---` internos NO cortan; sólo frena en el próximo `##`), o fin de archivo. UNA
// definición de "dónde termina la sección" que comparten parseCobertura, acusado y firmar — para que
// sus bordes NO puedan divergir (esa divergencia era un hueco: firmar firmaba lo que parse no veía).
function seccion(texto, titulo) {
  const lineas = (texto || '').split('\n');
  let ini = -1, nivel = 0;
  const reTit = new RegExp('^(#{1,6})\\s*' + titulo, 'i');
  for (let i = 0; i < lineas.length; i++) {
    const h = lineas[i].match(reTit);
    if (h) { nivel = h[1].length; ini = i + 1; break; }
  }
  if (ini === -1) return null;
  let fin = lineas.length;
  for (let i = ini; i < lineas.length; i++) {
    const h = lineas[i].match(/^(#{1,6})\s/);
    if (h && h[1].length <= nivel) { fin = i; break; }
  }
  return { lineas, ini, fin, cuerpo: lineas.slice(ini, fin).join('\n') };
}

// Parsea la sección "Cobertura firmada": líneas `path.ext: hash` (o `path.ext` sin firmar aún).
function parseCobertura(texto) {
  const s = seccion(texto, 'Cobertura firmada');
  if (!s) return [];
  const out = [];
  for (let i = s.ini; i < s.fin; i++) {
    const mm = s.lineas[i].match(RUTA_RE);
    if (mm) out.push({ archivo: mm[2].replace(/\\/g, '/'), hash: mm[3] || null });
  }
  return out;
}

// ¿La ficha ACUSA un cambio en <archivo> en su sección "Ajustes posteriores"?
// Matchea la ruta declarada como TOKEN COMPLETO (no substring): a los lados, inicio/fin o un carácter
// que NO continúa una ruta (`\w . / \ @ -`). Tres cosas que el Red Team exigió, de una:
//  · acota a la sección (vía seccion()) → si "Ajustes" va ANTES de "Cobertura", no se traga la lista;
//  · exige ruta completa (no basename) → acusar un page.tsx no tapa a otro homónimo;
//  · token exacto (no `.includes`) → 'admin/ui/card.tsx' NO absuelve a 'ui/card.tsx' (sufijo-substring).
// Tolera './' y backslashes a ambos lados. Dirección segura: ante la duda, NO absuelve (sobre-avisa).
function acusado(texto, archivo) {
  const s = seccion(texto, 'Ajustes posteriores');
  if (!s) return false;
  const cuerpo = s.cuerpo.replace(/\\/g, '/');
  const objetivo = archivo.replace(/\\/g, '/').replace(/^\.\//, '');
  const esc = objetivo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const borde = '[^\\w./\\\\@-]'; // sólo lo que SÍ continúa una ruta no cuenta como borde
  return new RegExp('(^|' + borde + ')(?:\\./)?' + esc + '($|' + borde + ')').test(cuerpo);
}

function leerFichas(dir) {
  const dirs = [path.join(dir, 'docs', '_cobertura'), path.join(dir, '_cobertura')];
  const fichas = [];
  for (const d of dirs) {
    let ent = []; try { ent = fs.readdirSync(d); } catch { continue; }
    for (const f of ent) {
      if (!f.endsWith('.md') || f.startsWith('_') || f.toLowerCase() === 'leeme.md') continue;
      let texto = ''; try { texto = fs.readFileSync(path.join(d, f), 'utf8'); } catch { continue; }
      const cierre = fechaCierre(texto);
      const cobertura = parseCobertura(texto);
      if (cierre && cobertura.length) fichas.push({ nombre: f, texto, cierre, cobertura });
    }
  }
  return fichas;
}

// Devuelve el drift: archivos cubiertos cuyo hash NO coincide y NO están acusados.
// Exime el bloque más reciente (máxima fecha de cierre) — ventana de pulido §58a.
function verificar(dir) {
  const fichas = leerFichas(dir);
  if (!fichas.length) return [];
  const maxFecha = fichas.reduce((a, f) => (f.cierre > a ? f.cierre : a), '');
  const drift = [];
  for (const f of fichas) {
    if (f.cierre === maxFecha) continue; // el más reciente: pulido libre (§58a)
    for (const { archivo, hash } of f.cobertura) {
      if (!hash) continue; // declarado pero sin firmar (aún no sellado) → no cuenta
      const actual = hashArchivo(dir, archivo);
      if (actual !== hash && !acusado(f.texto, archivo)) {
        drift.push({ ficha: f.nombre, archivo, esperado: hash, actual });
      }
    }
  }
  return drift;
}

// Escribe/actualiza los hashes de la sección "Cobertura firmada" de UNA ficha (al sellar/cerrar).
// Usa la MISMA seccion() y el MISMO RUTA_RE que parseCobertura → firmar y verificar NO pueden discrepar
// sobre el límite de la sección ni sobre qué es una ruta (antes divergían: un archivo tras un '----'
// quedaba firmado pero invisible). Firma por índice de línea (no replace global), preservando todo lo
// demás y el CRLF de la línea. Si NINGUNA ruta se pudo firmar, lanza (no miente "firmado"). Se hashea
// la ruta normalizada pero se conserva la ruta tal cual la escribió el autor.
function firmar(dir, fichaRel) {
  const p = path.isAbsolute(fichaRel) ? fichaRel : path.join(dir, fichaRel);
  const s = seccion(fs.readFileSync(p, 'utf8'), 'Cobertura firmada');
  if (!s) throw new Error('la ficha no tiene una sección "Cobertura firmada"');
  const lineas = s.lineas;
  let firmados = 0;
  for (let i = s.ini; i < s.fin; i++) {
    const mm = lineas[i].match(RUTA_RE);
    if (!mm) continue;
    const cr = lineas[i].endsWith('\r') ? '\r' : ''; // preserva CRLF (Windows): sólo esta línea se reescribe
    lineas[i] = `${mm[1]}${mm[2]}: ${hashArchivo(dir, mm[2].replace(/\\/g, '/'))}${cr}`;
    firmados++;
  }
  if (!firmados) throw new Error('la ficha no tiene una sección "Cobertura firmada" con archivos');
  fs.writeFileSync(p, lineas.join('\n'));
  return firmados;
}

module.exports = { hashArchivo, fechaCierre, parseCobertura, acusado, leerFichas, verificar, firmar };

if (require.main === module) {
  const modo = process.argv[2];
  const dir = process.argv[3] || process.cwd();
  if (modo === 'firmar') {
    const n = firmar(dir, process.argv[4]);
    console.log(`✓ raw-ficha-firma — ${n} archivo(s) firmado(s) en ${process.argv[4]}.`);
    process.exit(0);
  }
  const drift = verificar(dir);
  if (!drift.length) { console.log('✓ raw-ficha-firma — ninguna ficha cerrada quedó contradicha por pulido posterior.'); process.exit(0); }
  console.error(`⛔ raw-ficha-firma — ${drift.length} archivo(s) cubierto(s) cambiaron DESPUÉS del cierre SIN acuse en la ficha:`);
  for (const d of drift) console.error(`  · ${d.ficha}: ${d.archivo} (firma ${d.esperado} → ahora ${d.actual})`);
  console.error('\nLa ficha PUEDE estar mintiendo. Actualizá lo que afirma, o registrá el cambio en su sección');
  console.error('"Ajustes posteriores" y re-firmá (node raw-ficha-firma.js firmar <dir> <ficha>). No se ignora en silencio.');
  process.exit(1);
}
