#!/usr/bin/env node
/**
 * adopciones.js — el CHANGELOG ejecutable del método (The Raw Method).
 * ===================================================================
 * Cada mejora del método que un proyecto debe ADOPTAR es una entrada acá. El objetivo:
 * cuando el método avanza, los proyectos (los de hoy y el que venga) NO concilian a mano —
 * lo aditivo se aplica solo; lo que chocaría con algo del proyecto se FRENA para el OK del dueño.
 *
 * Cada adopción es IDEMPOTENTE: `detectar(dir)` devuelve true SOLO si el proyecto la necesita
 * (false si ya está aplicada), así correrla mil veces no hace daño.
 *   - auto: true  → aditiva y segura → `aplicar(dir)` la pone sola.
 *   - auto: false → toca algo propio del proyecto → se reporta con `instruccion` para el dueño.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/**
 * CONVIVENCIA — helpers compartidos por las adopciones de trabajo en equipo.
 * El método cubría "¿el código rompe una regla?" y "¿se está siguiendo el método?".
 * Faltaba la tercera: "¿pueden dos personas —o dos proyectos— convivir sin pisarse?".
 */

/** Cuántas personas distintas commitearon. Se mide por REALIDAD (el historial), no por
 *  una bandera que alguien tiene que acordarse de poner. 0 si no es repo o no hay git. */
function committers(dir) {
  try {
    const out = execFileSync('git', ['log', '--all', '--format=%ae'], {
      cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000,
    });
    return new Set(out.split('\n').map((s) => s.trim().toLowerCase()).filter(Boolean)).size;
  } catch (_) { return 0; }
}

/** El hook VIVO (el que git ejecuta), no el .sample. Busca en husky y en .git/hooks. */
function hookVivo(dir, nombre) {
  for (const p of [path.join('.husky', nombre), path.join('.git', 'hooks', nombre)]) {
    const f = path.join(dir, p);
    try { if (fs.existsSync(f) && fs.statSync(f).isFile()) return f; } catch (_) {}
  }
  return null;
}

function leer(f) { try { return fs.readFileSync(f, 'utf8'); } catch (_) { return ''; } }

// Extrae el sello MOTOR_VERSION del texto de un raw-ficha-firma (el motor del skill o la copia .cjs
// de un proyecto). null si no lo tiene (una copia vieja, previa al sello) → cuenta como desactualizada.
// ANCLADA a la DECLARACIÓN (const/let/var al inicio de línea) para que un comentario o string que
// contenga 'MOTOR_VERSION = ...' NO tape el valor real (first-match ciego era un footgun). Char class
// amplia [\w.+-] por si el sello algún día usa guion/ISO o +build. El guard de test-gobernanza importa
// ESTA función (no una regex propia) para validar EXACTAMENTE el valor que gobierna la propagación.
function versionMotor(texto) {
  const m = (texto || '').match(/^\s*(?:const|let|var)\s+MOTOR_VERSION\s*=\s*['"]([\w.+-]+)['"]/m);
  return m ? m[1] : null;
}

const ADOPCIONES = [
  {
    id: 'convivencia-guard-rama',
    desde: '2026.08.03',
    titulo: 'El pre-commit frena los commits en la rama compartida cuando el repo tiene más de una persona',
    auto: false, // toca el hook propio del proyecto (que trae sus gates) → OK del dueño
    // Sólo se enciende si el repo TIENE dos o más committers. A un proyecto de una sola
    // persona no se le dice nada: bloquearle `main` sería fricción, no protección.
    detectar(dir) {
      if (committers(dir) < 2) return false;
      const hook = hookVivo(dir, 'pre-commit');
      if (!hook) return false; // sin pre-commit cableado, primero va el kit base de candados/
      if (fs.existsSync(path.join(dir, '.raw-rama-obligatoria'))) return false; // ya opt-in
      return !/COMMIT_EN_MAIN/.test(leer(hook));
    },
    instruccion:
      'El repo tiene 2+ personas y la rama compartida sigue sin candado. Pegá el bloque "GUARD DE RAMA" ' +
      'de candados/pre-commit.sample al principio de tu pre-commit (ANTES de los gates: tiene que fallar ' +
      'en milisegundos, no después de la suite) y encendelo con  touch .raw-rama-obligatoria. ' +
      'Salida deliberada para el caso legítimo:  COMMIT_EN_MAIN=1 git commit.',
  },
  {
    id: 'convivencia-respaldo',
    desde: '2026.08.03',
    titulo: 'El post-commit respalda cada commit y, cuando no puede, DICE POR QUÉ (red ≠ rama divergida)',
    auto: false, // instalar un push automático es una decisión de comportamiento, no un retoque
    detectar(dir) {
      if (committers(dir) < 2) return false;      // con una persona el aviso viejo no miente
      const hook = hookVivo(dir, 'post-commit');
      if (!hook) return true;                     // equipo y sin respaldo → falta entero
      return !/ls-remote/.test(leer(hook));       // lo tiene, pero sin diagnosticar la causa
    },
    instruccion:
      'Cableá candados/post-commit.sample (a .husky/post-commit, para que lo reciba todo el que clona). ' +
      'Si ya tenías un post-commit que sólo pushea: el nuevo distingue "sin red" de "la rama divergió" — ' +
      'un aviso que nombra la causa equivocada manda a revisar el wifi mientras el respaldo no ocurre.',
  },
  {
    id: 'reflejo-cadena-afirmacion',
    desde: '2026.08.03',
    titulo: 'El reflejo de sesión trae la cadena de una afirmación (existencia → dirección → magnitud) y la estampa "medido:"',
    auto: true,
    // Solo aplica a proyectos con COPIA PROPIA de gobernanza/ (modo B del README): los que
    // usan el hook global apuntando al skill central ya la tienen sin hacer nada. Sin esta
    // entrada, raw-adopcion les decía "proyecto al día" con un reflejo viejo — mintiendo.
    _copia(dir) {
      const f = path.join(dir, 'gobernanza', 'raw-session.js');
      try { return fs.existsSync(f) ? f : null; } catch (_) { return null; }
    },
    detectar(dir) {
      const f = this._copia(dir);
      if (!f) return false; // sin copia propia → propaga solo por el skill central
      try { return !/CADENA DE UNA AFIRMACI/.test(fs.readFileSync(f, 'utf8')); } catch (_) { return false; }
    },
    aplicar(dir) {
      const f = this._copia(dir);
      if (!f) return false;
      // La fuente de verdad es el raw-session.js central (este mismo directorio).
      try { fs.copyFileSync(path.join(__dirname, 'raw-session.js'), f); return true; } catch (_) { return false; }
    },
    instruccion: 'Re-copiá gobernanza/raw-session.js desde el repo central del método (el reflejo ganó la cadena de una afirmación).',
  },
  {
    id: 'ficha-que-revisar',
    desde: '2026.07.25',
    titulo: 'La ficha de cierre trae la sección "Qué revisar — para el dueño" (OK informado)',
    auto: true,
    plantillas: ['docs/_cobertura/_PLANTILLA.md', '_cobertura/_PLANTILLA.md', 'docs/_cobertura/_plantilla.md', 'plantillas/ficha-cobertura.md'],
    _archivo(dir) {
      for (const p of this.plantillas) { const f = path.join(dir, p); try { if (fs.existsSync(f)) return f; } catch (_) {} }
      return null;
    },
    detectar(dir) {
      const f = this._archivo(dir);
      if (!f) return false; // el proyecto no usa fichas de este tipo → no aplica
      try { return !/Qu[eé]\s+revisar/i.test(fs.readFileSync(f, 'utf8')); } catch (_) { return false; }
    },
    aplicar(dir) {
      const f = this._archivo(dir);
      if (!f) return false;
      const secc = '\n\n---\n\n## Qué revisar — para el dueño (obligatorio al cerrar)\n\n' +
        '> Lista **corta, priorizada y en el idioma del dueño** de lo que ÉL puede verificar por su cuenta\n' +
        '> antes de dar el OK (mirar una pantalla, probar un flujo, confirmar un número). Lo más importante\n' +
        '> primero. Convierte el OK de un sello en una decisión. (Adoptado del método — OK informado.)\n\n___\n';
      fs.appendFileSync(f, secc);
      return true;
    },
    instruccion: 'Agregá una sección "Qué revisar — para el dueño" a la plantilla de ficha de cierre.',
  },
  {
    id: 'ficha-firma-motor',
    desde: '2026.08.04',
    titulo: 'El candado raw-ficha-firma se actualiza al motor vigente del método (frescura de la ficha)',
    auto: true, // es un archivo del MÉTODO vendorado en el proyecto, no lógica propia → seguro de refrescar
    _cjs(dir) { const f = path.join(dir, 'src', 'lib', 'raw-ficha-firma.cjs'); try { return fs.existsSync(f) ? f : null; } catch (_) { return null; } },
    detectar(dir) {
      const f = this._cjs(dir);
      if (!f) return false; // no tiene el candado → eso lo mira 'ficha-firma-instalar', no ésta
      const vSkill = versionMotor(leer(path.join(__dirname, 'raw-ficha-firma.js')));
      return !!vSkill && versionMotor(leer(f)) !== vSkill; // sello distinto (o ausente) = copia vieja
    },
    aplicar(dir) {
      const f = this._cjs(dir);
      if (!f) return false;
      try { fs.copyFileSync(path.join(__dirname, 'raw-ficha-firma.js'), f); return true; } catch (_) { return false; }
    },
    instruccion: 'Re-copiá src/lib/raw-ficha-firma.cjs desde gobernanza/raw-ficha-firma.js del método.',
  },
  {
    id: 'ficha-firma-instalar',
    desde: '2026.08.04',
    titulo: 'Un proyecto que USA fichas de cobertura pero NO tiene el candado raw-ficha-firma queda desprotegido',
    auto: false, // instalar toca conformance.test + eslint del proyecto → OK del dueño
    _usaFichas(dir) {
      for (const p of ['docs/_cobertura/_PLANTILLA.md', '_cobertura/_PLANTILLA.md', 'docs/_cobertura/_plantilla.md', 'plantillas/ficha-cobertura.md']) {
        try { if (fs.existsSync(path.join(dir, p))) return true; } catch (_) {}
      }
      // Y si hay fichas REALES aunque falte la plantilla: MISMA fuente de verdad que el motor
      // (leerFichas). Sin esto, un proyecto con fichas cerradas + drift real pero sin _PLANTILLA.md
      // quedaba sin candado y SIN que nadie lo reporte — la ficha mintiendo invisible que el candado
      // existe para cazar (hallazgo del Red Team de la adopción, 2026-08-04).
      try { return require('./raw-ficha-firma').leerFichas(dir).length > 0; } catch (_) { return false; }
    },
    detectar(dir) {
      if (!this._usaFichas(dir)) return false; // no usa fichas → el candado no aplica (no molesta)
      try { return !fs.existsSync(path.join(dir, 'src', 'lib', 'raw-ficha-firma.cjs')); } catch (_) { return false; }
    },
    instruccion:
      'Usás fichas de cobertura pero no tenés el candado que las vigila (una ficha puede quedar mintiendo ' +
      'y ningún gate lo vería). Instalalo: copiá gobernanza/raw-ficha-firma.js del método a ' +
      'src/lib/raw-ficha-firma.cjs, ignoralo en eslint (globalIgnores), agregá el chequeo ' +
      'verificar(process.cwd()) a tu conformance.test.ts, y las secciones "Cobertura firmada" + ' +
      '"Ajustes posteriores" a la plantilla de ficha.',
  },
  {
    id: 'disposicion-v4-plantilla',
    desde: '2026.08.04',
    titulo: 'La plantilla de ficha sube a v4: cada debilidad del cierre lleva su disposición (ninguna queda colgando)',
    auto: false, // reformatea la sección "Debilidades" de la plantilla (doc del proyecto) → OK del dueño
    _plantilla(dir) {
      for (const p of ['docs/_cobertura/_PLANTILLA.md', '_cobertura/_PLANTILLA.md', 'docs/_cobertura/_plantilla.md', 'plantillas/ficha-cobertura.md']) {
        try { const f = path.join(dir, p); if (fs.existsSync(f)) return f; } catch (_) {}
      }
      return null;
    },
    detectar(dir) {
      const f = this._plantilla(dir);
      if (!f) return false; // no usa fichas → no aplica
      const m = leer(f).match(/raw-ficha:\s*v(\d+)/i);
      return !m || parseInt(m[1], 10) < 4; // plantilla por debajo de v4 → falta adoptar
    },
    instruccion:
      'Subí tu plantilla de ficha a v4: cambiá el marcador de arriba a `raw-ficha: v4` y en la sección ' +
      '"Debilidades" pegá el formato de disposición (cada debilidad un bullet con [objetiva-arreglada] / ' +
      '[objetiva-irreducible] / [subjetiva-dueño] / [diferida-dueño]) — copialo de plantillas/ficha-cobertura.md ' +
      'del método. Así ninguna debilidad del cierre queda colgando (el candado central sólo actúa sobre fichas v4).',
  },
];

module.exports = { ADOPCIONES, versionMotor };
