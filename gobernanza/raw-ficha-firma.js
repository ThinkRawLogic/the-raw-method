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

// Parsea la sección "Cobertura firmada": líneas `path.ext: hash` (o `path.ext` sin firmar aún).
function parseCobertura(texto) {
  const m = (texto || '').match(/#{1,6}\s*Cobertura firmada[^\n]*\n([\s\S]*?)(?:\n#{1,6}\s|\n---|\s*$)/i);
  if (!m) return [];
  const out = [];
  for (const linea of m[1].split('\n')) {
    const mm = linea.match(/^\s*[-*]?\s*([\w./\\-]+\.[a-z0-9]+)\s*(?::\s*([a-f0-9]{6,}|FALTA))?\s*$/i);
    if (mm) out.push({ archivo: mm[1].replace(/\\/g, '/'), hash: mm[2] || null });
  }
  return out;
}

// ¿La ficha ACUSA un cambio en <archivo> en su sección "Ajustes posteriores"?
function acusado(texto, archivo) {
  const m = (texto || '').match(/#{1,6}\s*Ajustes posteriores[\s\S]*/i);
  if (!m) return false;
  const base = path.basename(archivo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return m[0].includes(archivo) || new RegExp('\\b' + base + '\\b', 'i').test(m[0]);
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
function firmar(dir, fichaRel) {
  const p = path.isAbsolute(fichaRel) ? fichaRel : path.join(dir, fichaRel);
  let texto = fs.readFileSync(p, 'utf8');
  const cob = parseCobertura(texto);
  if (!cob.length) throw new Error('la ficha no tiene una sección "Cobertura firmada" con archivos');
  let nuevo = texto;
  for (const { archivo } of cob) {
    const h = hashArchivo(dir, archivo);
    // reemplaza la línea del archivo con `archivo: hash` (con o sin hash previo)
    const re = new RegExp('^(\\s*[-*]?\\s*)' + archivo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s*:\\s*[a-f0-9]+|\\s*:\\s*FALTA)?\\s*$', 'im');
    nuevo = nuevo.replace(re, `$1${archivo}: ${h}`);
  }
  fs.writeFileSync(p, nuevo);
  return cob.length;
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
