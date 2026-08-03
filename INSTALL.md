# Instalar The Raw Method (como skill de Claude Code)

The Raw Method es un **skill de Claude Code**: una carpeta con `SKILL.md` + sus referencias, plantillas y candados. Instalarlo = poner esta carpeta donde Claude Code la ve.

## Instalación global (sirve en TODOS tus proyectos)

Cloná el repo dentro de tu carpeta de skills global:

```bash
git clone https://github.com/ThinkRawLogic/the-raw-method.git ~/.claude/skills/the-raw-method
```

En Windows, `~` es `C:\Users\TU-USUARIO`, así que queda en `C:\Users\TU-USUARIO\.claude\skills\the-raw-method`.

Eso es todo. Claude Code lo detecta solo (lo lista en sus skills disponibles).

## Cómo se usa

Hay tres formas, de la más automática a la manual:

1. **Automática** — si el proyecto tiene en su `CLAUDE.md` una línea que dice *"este proyecto sigue The Raw Method"*, Claude lo aplica solo al abrir ese proyecto. (Es lo que recomendamos: un puntero en el `CLAUDE.md` del proyecto.)
2. **Por comando** — escribí `/the-raw-method` para invocarlo a mano.
3. **Mencionándolo** — decí *"aplicá The Raw Method"* / *"auditá con The Raw Method"* y Claude lo carga.

## Modo siempre-activo (opcional, por máquina)

Por defecto, el reflejo de sesión (`gobernanza/raw-session.js`) solo se inyecta dentro de un
proyecto Raw Method (una carpeta —o un padre— con `.the-raw-method`, `docs/_cobertura`,
`INVARIABLES.md`, etc.). Si querés que el método arranque en **toda** sesión de tu máquina,
sea cual sea la carpeta, creá un marcador en tu carpeta de usuario:

```bash
touch ~/.claude/.the-raw-method
```

En Windows (PowerShell): `New-Item -ItemType File "$HOME\.claude\.the-raw-method"`.

Dos aclaraciones:

- Requiere tener la **gobernanza cableada** (los hooks de `gobernanza/hooks.json` en tu
  `~/.claude/settings.json`) — sin eso, no hay hook que lea el flag. Ver `gobernanza/README.md`.
- Solo afecta el **reflejo de sesión**. El gate de commits y la cobertura siguen operando sobre
  la raíz real de cada proyecto (el marcador más cercano al proyecto gana), así que tus otros
  repos no ganan fricción nueva. (Por eso el flag vive dentro de `~/.claude` y no en `~` directo:
  ahí nunca cae en la búsqueda de raíces de proyecto.)

Para desactivarlo, borrá el flag.

## Cómo se actualiza

Cuando haya mejoras, actualizás con un `pull`:

```bash
cd ~/.claude/skills/the-raw-method && git pull
```

## Qué hay adentro

- `SKILL.md` — la columna del método (3 patas, los 16 pilares, las 3 capas de enforcement, el Red Team, la criba, la honestidad proactiva).
- `referencias/` — el detalle: los 16 pilares, la auditoría adversaria, los modelos de IA, los documentos vivos, los candados.
- `plantillas/` — plantillas VACÍAS que un proyecto nuevo copia y llena a medida que aprende.
- `candados/` — el arnés reusable (tests de conformidad que hacen cumplir las reglas solas).
- `ARRANCAR-AQUI.md` — la puerta de entrada: lo mínimo para empezar hoy.
- `SOBRE-THE-RAW-METHOD.html` — la página que explica el método en cristiano.

---

*The Raw Method · Raw Logic · No fluff. No licenses. No surprises.*
