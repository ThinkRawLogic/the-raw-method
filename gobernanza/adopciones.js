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

const ADOPCIONES = [
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
];

module.exports = { ADOPCIONES };
