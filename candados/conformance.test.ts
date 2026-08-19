/**
 * conformance.test.ts — los candados de conformidad del proyecto
 * ================================================================
 *
 * Parte de The Raw Method. Este es el archivo 🤖 AUTOMÁTICO: corre solo en cada
 * commit (via el pre-commit) y en CI, y HACE FALLAR el guardado si una regla del
 * método se rompe. Un candado no es magia: es un test que LEE archivos del repo y
 * `expect(...).toBe(...)` con la verdad — cuando la verdad no calza, el commit no pasa.
 *
 * Trae DOS candados GENÉRICOS del método, listos para correr:
 *   1. COBERTURA — un bloque cerrado no puede dejar una clave del checklist sin resolver.
 *   2. ARRANQUE  — el prompt de próxima sesión tiene que referenciar los documentos base.
 *
 * Y una sección al final marcada "AGREGA TUS CANDADOS DEL PROYECTO ACÁ": ahí van los
 * candados que nacen de TUS bugs (el patrón está en candado-plantilla.ts).
 *
 * NOTA DE STACK: la implementación es TypeScript + vitest porque es el stack de
 * referencia y se lee fácil. El PATRÓN transfiere a cualquier lenguaje: leer archivos
 * del repo y fallar a propósito. En Python sería pytest; en Go, un TestConformance.
 *
 * ⚠ HAY DOS PARSERS DE FICHA, Y ES A PROPÓSITO. El de acá y el de
 * `gobernanza/raw-cobertura.js` (el motor) leen el mismo formato con código distinto:
 * este kit VIAJA al proyecto y tiene que correr solo, sin depender de que `gobernanza/`
 * exista. Es una REIMPLEMENTACIÓN DELIBERADA, no una copia sincronizada — nadie las
 * genera de la otra, y no hay ningún proceso que las mantenga iguales. Consecuencia
 * práctica: cuando el motor arregla un bug de PARSEO, hay que portarlo a mano acá
 * (y al revés). Este archivo ya trae portado el de la nota "vacía" — ver parseFicha().
 * Diferencia declarada y querida: el motor exige, además, las secciones que el método
 * suma por versión de ficha (v2–v5); este kit es el piso portable (ver más abajo).
 *
 * Correr suelto:  npx vitest run candados/conformance.test.ts
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// --- Dónde vive el proyecto -------------------------------------------------
// El test corre desde la raíz del repo (así lo llama vitest y el pre-commit).
// Si tu layout es distinto, ajusta REPO_ROOT una sola vez acá.
const REPO_ROOT = resolve(process.cwd());

// Dónde el método guarda las fichas de cobertura (una por bloque cerrado)
// y el prompt de arranque de la próxima sesión. Ajusta si tu proyecto los mueve.
const DIR_COBERTURA = join(REPO_ROOT, "docs", "_cobertura");
// El nombre del prompt de arranque varía por proyecto: el genérico usa PROMPT-ARRANQUE.md,
// otros lo llaman PROMPT-PROXIMA-SESION.md. Se busca el primero que exista; si no hay ninguno,
// se apunta al nombre genérico para que el mensaje de error diga cuál copiar.
const NOMBRES_ARRANQUE = ["PROMPT-ARRANQUE.md", "PROMPT-PROXIMA-SESION.md"];
const PROMPT_ARRANQUE =
  NOMBRES_ARRANQUE.map((n) => join(REPO_ROOT, "docs", n)).find((p) => existsSync(p)) ??
  join(REPO_ROOT, "docs", NOMBRES_ARRANQUE[0]);

// ===========================================================================
// CANDADO 1 — COBERTURA
// ---------------------------------------------------------------------------
// La regla (de la plantilla ficha-cobertura.md): al CERRAR un bloque, cada clave
// del checklist se resuelve — se marca [x] con nota, o [x] N/A — <por qué>. Dejar
// una clave en [ ] NO cuenta como cerrado.
//
// Este candado es del tipo "ficha de cobertura": convierte "¿terminamos todo?"
// —una pregunta blanda que se responde con optimismo— en un chequeo duro. La
// casilla está marcada o no lo está.
//
// Cómo sabe si un bloque está CERRADO: la ficha tiene "Fecha de cierre". Si está
// llena (no son guiones bajos), el bloque se declaró cerrado → todas sus claves
// tienen que estar resueltas. Si la fecha sigue vacía, el bloque está en curso y
// el candado no lo molesta.
// ===========================================================================

// Las claves BASE de la ficha — las que este arnés exige a TODA ficha cerrada, sea cual sea
// su versión. Si agregas una clave PROPIA de tu proyecto a la plantilla, agrégala también acá:
// el candado exige que todas estén presentes, así una ficha no puede "perder" un ángulo.
//
// Frontera declarada, para que no se lea como un olvido: las claves y secciones que el método
// suma por VERSIÓN de ficha (v2 honestidad + auditor · v3 "Qué revisar" · v4 disposición de
// debilidades · v5 la clave `(ecosistema)` del protocolo de corrección) NO se exigen acá.
// Las hace cumplir `gobernanza/` (raw-gate en el commit, raw-check en CI), que sí lee el
// marcador `raw-ficha: vN` y por eso puede ser forward-only sin invalidar fichas ya cerradas.
// Este arnés es el piso portable; la gobernanza es la capa que evoluciona con el método.
const CLAVES_CANONICAS = [
  "spec-leída",
  "orden",
  "seguridad",
  "experiencia",
  "concurrencia",
  "errores",
  "rastro",
  "config",
  "aguante",
  "stack",
  "dato",
  "tests",
  "auditoría",
  "docs",
  "OK",
] as const;

interface Ficha {
  archivo: string;
  cerrada: boolean;
  // clave -> marcada ([x]) o no ([ ]); ausente si la clave no aparece en la ficha
  claves: Map<string, boolean>;
  // claves cuya NOTA quedó vacía al cerrar (el "___" sin llenar, o borrada del todo)
  notaFaltante: Set<string>;
}

/** Lee todas las fichas de cobertura del proyecto. */
function leerFichas(): Ficha[] {
  if (!existsSync(DIR_COBERTURA)) return [];
  return readdirSync(DIR_COBERTURA)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseFicha(join(DIR_COBERTURA, f), f));
}

/** Extrae de una ficha si está cerrada y el estado de cada clave. */
function parseFicha(ruta: string, archivo: string): Ficha {
  // CRLF → LF EN LA PUERTA. En JS el `.` NO matchea `\r`: con finales CRLF (lo normal en
  // un .md escrito en Windows), el `(.*)$` de la regex de claves no llega al final de la
  // línea y NINGUNA clave parsea → la ficha entera queda INVISIBLE para el candado. No
  // falla: DESAPARECE en silencio, que es peor. (Mismo motivo por el que lo hace el motor.)
  const texto = readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");

  // ¿Cerrada? Buscamos "Fecha de cierre:" con un valor real (no guiones bajos vacíos).
  const mFecha = texto.match(/Fecha de cierre:\**\s*([^\n]*)/i);
  const valorFecha = (mFecha?.[1] ?? "").replace(/[_*\s]/g, "");
  const cerrada = valorFecha.length > 0;

  // Cada clave aparece en su propia línea:  - [ ] **(clave)** texto... → ___
  // Iteramos por línea para mirar, además de la casilla, si la NOTA quedó sin llenar
  // (marcar [x] sin escribir la nota tampoco cuenta como resuelto).
  const claves = new Map<string, boolean>();
  const notaFaltante = new Set<string>();
  const re = /-\s*\[( |x|X)\]\s*\*\*\(([^)]+)\)\*\*(.*)$/;
  for (const linea of texto.split("\n")) {
    const m = re.exec(linea);
    if (!m) continue;
    const marcada = m[1].toLowerCase() === "x";
    const clave = m[2].trim();
    claves.set(clave, marcada);
    // La NOTA es lo que sigue a la flecha (→ o ->); si no hay flecha, todo el resto.
    // Muda si, tras quitar el relleno (_ * espacios), queda vacía. Así se caza el "___"
    // sin llenar Y la nota borrada del todo, SIN el falso positivo de una nota real que
    // contiene "___" (una ruta, una URL): ahí quedan caracteres de verdad.
    // Antes esto era `linea.includes("___")` y frenaba el commit por una ruta legítima.
    let notaRaw = m[3] ?? "";
    const flecha = notaRaw.match(/(?:→|->)\s*([\s\S]*)$/);
    if (flecha) notaRaw = flecha[1];
    if (notaRaw.replace(/[_*\s]/g, "").length === 0) notaFaltante.add(clave);
  }

  return { archivo, cerrada, claves, notaFaltante };
}

describe("candado: COBERTURA (un bloque cerrado resuelve todas sus claves)", () => {
  const fichas = leerFichas();
  const cerradas = fichas.filter((f) => f.cerrada);

  // Reportamos todos los problemas juntos, no el primero que aparezca: si hay tres
  // fichas mal, quieres verlas las tres, no arreglar una y descubrir la siguiente.
  it("ninguna ficha cerrada deja una clave sin resolver ni le falta una clave", () => {
    const problemas: string[] = [];

    for (const f of cerradas) {
      for (const clave of CLAVES_CANONICAS) {
        if (!f.claves.has(clave)) {
          problemas.push(`${f.archivo}: falta la clave (${clave}) en la ficha`);
        } else if (f.claves.get(clave) === false) {
          problemas.push(`${f.archivo}: la clave (${clave}) quedó en [ ] pero el bloque se declaró cerrado`);
        } else if (f.notaFaltante.has(clave)) {
          problemas.push(`${f.archivo}: la clave (${clave}) está marcada [x] pero su nota quedó vacía (escribí el CÓMO, o "N/A — por qué")`);
        }
      }
    }

    // Un mensaje legible para el dueño no-ingeniero cuando el commit se frena.
    expect(problemas, `\nCobertura incompleta en bloque(s) cerrado(s):\n  - ${problemas.join("\n  - ")}\n`).toEqual([]);
  });

  // Sanidad: si el proyecto ya cerró bloques pero no hay NINGUNA ficha, algo se
  // saltó el proceso. Este chequeo es informativo — no rompe un repo recién nacido.
  it("hay fichas de cobertura una vez que el proyecto arrancó (informativo)", () => {
    if (fichas.length === 0) {
      console.warn(
        `[cobertura] No hay fichas en ${DIR_COBERTURA}. Normal el día 1; ` +
          `si ya cerraste bloques, falta la ficha de cierre.`,
      );
    }
    expect(true).toBe(true); // nunca rompe: es solo un aviso
  });
});

// ===========================================================================
// CANDADO 2 — ARRANQUE
// ---------------------------------------------------------------------------
// La regla (de la plantilla PROMPT-ARRANQUE.md): el prompt que retoma el proyecto
// en la próxima sesión SE DERIVA de los documentos base y tiene que MENCIONARLOS,
// para que la sesión nueva arranque parada sobre todo el contexto y no sobre la
// memoria de la anterior. Olvidar referenciar el contexto es un error que se repite.
//
// El candado falla si el prompt de arranque no nombra los cinco documentos base:
// la ley, la arquitectura, el backlog, el diccionario de datos y la bitácora.
// ===========================================================================

// Cada documento base y las palabras que lo delatan en el prompt (con sinónimos,
// para no ser frágil ante la redacción exacta). Basta UNA de las alternativas.
const DOCS_BASE: { nombre: string; alternativas: string[] }[] = [
  { nombre: "la ley (invariantes)", alternativas: ["ley", "invariante", "invariable"] },
  { nombre: "la arquitectura", alternativas: ["arquitectura"] },
  { nombre: "el backlog", alternativas: ["backlog", "pendiente"] },
  { nombre: "el diccionario de datos", alternativas: ["diccionario"] },
  { nombre: "la bitácora", alternativas: ["bitácora", "bitacora"] },
];

describe("candado: ARRANQUE (el prompt de próxima sesión referencia los documentos base)", () => {
  it("el prompt de arranque existe", () => {
    expect(
      existsSync(PROMPT_ARRANQUE),
      `\nNo se encontró el prompt de arranque en ${PROMPT_ARRANQUE}.\n` +
        `Copia plantillas/PROMPT-ARRANQUE.md al proyecto y mantenlo al cerrar cada bloque.\n`,
    ).toBe(true);
  });

  it("el prompt de arranque menciona los cinco documentos base", () => {
    if (!existsSync(PROMPT_ARRANQUE)) return; // el test de arriba ya reportó la ausencia
    const texto = readFileSync(PROMPT_ARRANQUE, "utf8").toLowerCase();

    const faltantes = DOCS_BASE.filter(
      (doc) => !doc.alternativas.some((alt) => texto.includes(alt.toLowerCase())),
    ).map((doc) => doc.nombre);

    expect(
      faltantes,
      `\nEl prompt de arranque no referencia estos documentos base:\n  - ${faltantes.join("\n  - ")}\n` +
        `Una sesión nueva que no los lee arranca sobre la memoria, no sobre el contexto.\n`,
    ).toEqual([]);
  });
});

// ===========================================================================
// AGREGA TUS CANDADOS DEL PROYECTO ACÁ
// ---------------------------------------------------------------------------
// Los dos candados de arriba son GENÉRICOS del método. Los más valiosos son los
// TUYOS: cada vez que una auditoría encuentra una clase de bug, la lección se
// destila a un candado que la mata para siempre (el motor del método: de cada
// problema, una regla — no solo un parche).
//
// El patrón completo para escribir uno está en candado-plantilla.ts. La forma
// típica —un escáner que hace fallar el commit si REAPARECE un bug ya arreglado—
// se ve así:
//
//   describe("candado: no se compara dinero con decimales sueltos", () => {
//     it("ningún archivo usa `=== ` sobre montos en centavos", () => {
//       const infractores = escanearFuente(/\bmonto\s*===/);
//       expect(infractores, `Reapareció la comparación frágil de dinero`).toEqual([]);
//     });
//   });
//
// Empiezas con estos dos candados y el arnés CRECE con cada bloque cerrado.
// ===========================================================================
