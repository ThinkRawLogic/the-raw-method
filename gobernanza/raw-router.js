#!/usr/bin/env node
/**
 * raw-router.js — candado C3 (core): el router deja de ser "a ojo".
 * ================================================================
 * Deriva del DIFF qué pilares de ALTA CONFIANZA tocó el cambio, y prohíbe que la
 * ficha de cierre marque N/A la clave correspondiente. Cierra el "falso N/A": decir
 * "(concurrencia) N/A" en un cambio que sí tocó plata. NO computa los 16 pilares (eso
 * es juicio): solo las señales mecánicas y seguras — dinero, migraciones, deps, salientes.
 *
 * Es el KEYSTONE (evita olvidar un audit + arma los patrones de dominio por señal).
 * Puro y testeable: clavesRequeridas(files, contenido) + problemasDeRouter(ficha, req).
 * Deliberadamente conservador: falso-negativo (perder una señal difusa) antes que
 * falso-positivo (gritar de más → el candado se apaga). Las señales difusas quedan 👁.
 */
'use strict';

// señal → claves de la ficha que NO pueden quedar N/A cuando la señal aparece en el diff.
const REGLAS = [
  { nombre: 'dinero',          archivos: /(_cents|precio|saldo|cobro|tesoreria|montos?|importe|iva|descuento|impuesto|factura|abono|credito|tarifa|reembolso|comisi[oó]n|deposito|retiro|transferencia|moneda|divisa)|(?:^|\/)(pagos|pedidos|devoluciones|carrito|facturaci[oó]n)(?:\/|s?\.)/i, contenido: /_cents\b|\bimporte\b|\biva\b|\breembolso\b/i, claves: ['concurrencia', 'rastro'] },
  { nombre: 'migración',       archivos: /(prisma\/migrations\/|\/migrations\/|\.sql$|schema\.prisma$)/i,                                          contenido: /(create|alter|drop)\s+table|addColumn|createTable/i, claves: ['dato', 'rastro'] },
  { nombre: 'dependencia',     archivos: /(^|\/)package\.json$/i,                                                                                  contenido: null,                                            claves: ['stack'] },
  { nombre: 'llamada externa', archivos: null,                                                                                                    contenido: /\bfetch\s*\(|\baxios\b|http\.request\s*\(/i,     claves: ['errores'] },
];

function clavesRequeridas(files, contenido) {
  const req = new Map(); // clave -> nombre de la señal que la disparó
  const fstr = (files || []).join('\n');
  const c = contenido || '';
  for (const r of REGLAS) {
    const hit = (r.archivos && r.archivos.test(fstr)) || (r.contenido && r.contenido.test(c));
    if (hit) for (const k of r.claves) if (!req.has(k)) req.set(k, r.nombre);
  }
  return req;
}

// Caza "N/A" y sus formas naturales EN ESPAÑOL (el proyecto es 100% español): "No aplica",
// "No corresponde", "N.A.". El \b tras "aplica" evita cazar "no aplicamos redondeo..." (nota real).
// Anclado al INICIO de la nota: una N/A empieza con el token ("N/A — ...", "No aplica ..."). Así una
// nota REAL que menciona "no aplica" a mitad de frase NO se confunde con un N/A. Caza N/A y N/C.
function esNA(nota) {
  return /^\s*(?:n\s*[.\/]?\s*[ac]\b|no\s+(?:aplica(?:ble)?|corresponde|procede|(?:es\s+)?(?:relevante|pertinente)|viene\s+al\s+caso|afecta|impacta|involucra)\b|nada\s+relevante\b|irrelevante\b|not\s+applicable\b)/i.test((nota || '').trim());
}

function problemasDeRouter(ficha, requeridas) {
  const out = [];
  const notas = (ficha && ficha.notas) || new Map();
  for (const [clave, senal] of requeridas) {
    if (esNA(notas.get(clave))) {
      out.push(`el diff toca "${senal}" pero la clave (${clave}) quedó marcada N/A — no puede ser N/A cuando el cambio la toca`);
    }
  }
  return out;
}

module.exports = { clavesRequeridas, problemasDeRouter, esNA, REGLAS };
