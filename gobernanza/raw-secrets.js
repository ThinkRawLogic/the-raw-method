#!/usr/bin/env node
/**
 * raw-secrets.js — el candado de SECRETOS (The Raw Method · pilar 2, ejecutable).
 * =============================================================================
 * Port a Node (sin deps, corre en tu Windows hoy) del scanner de cyber-neo. Barre
 * el repo buscando secretos filtrados (llaves, tokens, connection strings, private
 * keys) y FALLA si encuentra uno real. Convierte el "escaneo de secretos" del pilar 2
 * de deuda 👁 (delegada a gitleaks/trufflehog externas) en un candado 🤖 que corre solo.
 *
 *   node gobernanza/raw-secrets.js [dir]     (default: cwd)
 *   exit 0 = limpio · exit 1 = hay secreto(s) de severidad alta/crítica
 * Los de severidad media/baja se reportan pero no bloquean (ruido/falsos positivos).
 * ponytail: allowlist para placeholders y downgrade en archivos de test/example — un
 * candado que grita en falso se apaga solo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MAX_FILE_KB = 500;
const MAX_LINE = 2000;

const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.venv', 'venv', 'env', '.tox',
  '.mypy_cache', '.pytest_cache', 'dist', 'build', '.next', '.nuxt', 'vendor', 'target', 'Pods',
  '.gradle', 'coverage', '.nyc_output', '.cache', 'bower_components']);
const SKIP_EXT = new Set(['.png','.jpg','.jpeg','.gif','.ico','.svg','.webp','.woff','.woff2','.ttf',
  '.eot','.otf','.mp3','.mp4','.avi','.mov','.webm','.zip','.tar','.gz','.bz2','.7z','.rar','.pdf',
  '.doc','.docx','.xls','.xlsx','.pyc','.pyo','.class','.o','.so','.dylib','.dll','.exe','.bin',
  '.dat','.db','.sqlite','.sqlite3','.lock','.map']);
const SKIP_FILES = new Set(['package-lock.json','yarn.lock','pnpm-lock.yaml','Pipfile.lock',
  'poetry.lock','Cargo.lock','Gemfile.lock','go.sum','composer.lock',
  'raw-secrets.js']); // el propio scanner: sus patrones (private-key, etc.) no son secretos

// [nombre, regex, severidad, descripción]
const PATTERNS = [
  ['AWS Access Key ID', /AKIA[0-9A-Z]{16}/, 'critical', 'AWS access key ID'],
  ['AWS Secret Access Key', /aws_secret_access_key\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/i, 'critical', 'AWS secret access key'],
  ['GCP API Key', /AIza[0-9A-Za-z_-]{35}/, 'high', 'Google Cloud API key'],
  ['GCP Service Account', /"type"\s*:\s*"service_account"/, 'critical', 'GCP service account JSON'],
  ['Azure Connection String', /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{88}/i, 'critical', 'Azure Storage connection string'],
  ['GitHub PAT (classic)', /ghp_[A-Za-z0-9_]{36}/, 'critical', 'GitHub personal access token'],
  ['GitHub OAuth', /gho_[A-Za-z0-9_]{36}/, 'critical', 'GitHub OAuth token'],
  ['GitHub App Token', /gh[us]_[A-Za-z0-9_]{36}/, 'high', 'GitHub app token'],
  ['GitHub Fine-Grained PAT', /github_pat_[A-Za-z0-9_]{22,255}/, 'critical', 'GitHub fine-grained PAT'],
  ['GitLab PAT', /glpat-[A-Za-z0-9_-]{20}/, 'critical', 'GitLab personal access token'],
  ['Slack Bot Token', /xoxb-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}/, 'critical', 'Slack bot token'],
  ['Slack User Token', /xoxp-[0-9]{10,13}-[0-9]{10,13}-[0-9]{10,13}-[a-f0-9]{32}/, 'critical', 'Slack user token'],
  ['Slack Webhook', /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]{8,}\/B[A-Z0-9]{8,}\/[A-Za-z0-9]{24}/, 'high', 'Slack webhook'],
  ['Stripe Live Secret Key', /sk_live_[0-9a-zA-Z]{24,}/, 'critical', 'Stripe live secret key'],
  ['Stripe Restricted Key', /rk_live_[0-9a-zA-Z]{24,}/, 'critical', 'Stripe restricted key'],
  ['Stripe Live Publishable', /pk_live_[0-9a-zA-Z]{24,}/, 'medium', 'Stripe live publishable key'],
  ['Twilio API Key', /SK[0-9a-fA-F]{32}/, 'high', 'Twilio API key'],
  ['SendGrid API Key', /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/, 'critical', 'SendGrid API key'],
  ['Mailgun API Key', /key-[0-9a-zA-Z]{32}/, 'high', 'Mailgun API key'],
  ['PostgreSQL Connection', /postgres(?:ql)?:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/, 'critical', 'Postgres connection string con credenciales'],
  ['MySQL Connection', /mysql:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/, 'critical', 'MySQL connection string con credenciales'],
  ['MongoDB Connection', /mongodb(?:\+srv)?:\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/, 'critical', 'MongoDB connection string con credenciales'],
  ['Redis Connection', /redis:\/\/[^\s'"]*:[^\s'"]+@[^\s'"]+/, 'high', 'Redis connection string con credenciales'],
  ['RSA Private Key', /-----BEGIN RSA PRIVATE KEY-----/, 'critical', 'RSA private key'],
  ['EC Private Key', /-----BEGIN EC PRIVATE KEY-----/, 'critical', 'EC private key'],
  ['PGP Private Key', /-----BEGIN PGP PRIVATE KEY BLOCK-----/, 'critical', 'PGP private key'],
  ['Generic Private Key', /-----BEGIN PRIVATE KEY-----/, 'critical', 'private key PKCS#8'],
  ['OpenSSH Private Key', /-----BEGIN OPENSSH PRIVATE KEY-----/, 'critical', 'OpenSSH private key'],
  ['JWT Token', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'high', 'JSON Web Token'],
  ['npm Token', /npm_[A-Za-z0-9]{36}/i, 'critical', 'npm access token'],
  ['npm Auth Token', /\/\/registry\.npmjs\.org\/:_authToken=\S+/, 'critical', 'npm registry auth token'],
  ['PyPI Token', /pypi-[A-Za-z0-9_-]{50,}/, 'critical', 'PyPI API token'],
  ['Telegram Bot Token', /[0-9]{8,10}:[A-Za-z0-9_-]{35}/, 'medium', 'Telegram bot token (patrón laxo → reporta, no bloquea)'],
  ['Discord Webhook', /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+/, 'high', 'Discord webhook'],
  ['Shopify Token', /shpat_[a-fA-F0-9]{32}/, 'critical', 'Shopify admin API token'],
  ['Shopify Shared Secret', /shpss_[a-fA-F0-9]{32}/, 'critical', 'Shopify shared secret'],
  ['OpenAI API Key', /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/, 'critical', 'OpenAI API key'],
  ['OpenAI Project Key', /sk-proj-[A-Za-z0-9_-]{40,}/, 'critical', 'OpenAI project key'],
  ['Anthropic API Key', /sk-ant-[A-Za-z0-9_-]{40,}/, 'critical', 'Anthropic API key'],
  ['Hardcoded Password', /(?:password|passwd|pwd)\s*[=:]\s*['"][^'"]{8,}['"]/i, 'high', 'password hardcodeada'],
  ['Hardcoded Secret', /(?:secret|secret_key)\s*[=:]\s*['"][^'"]{8,}['"]/i, 'high', 'secret hardcodeado'],
  ['Hardcoded API Key', /(?:api_key|apikey|api-key)\s*[=:]\s*['"][^'"]{8,}['"]/i, 'high', 'API key hardcodeada'],
  ['Hardcoded Token', /(?:access_token|auth_token|bearer)\s*[=:]\s*['"][^'"]{8,}['"]/i, 'high', 'token hardcodeado'],
  ['Authorization Bearer', /authorization['"]?\s*[=:]\s*['"]?Bearer\s+[A-Za-z0-9_.-]{20,}/i, 'high', 'Authorization Bearer hardcodeado'],
  ['Env Password', /^(?:DB_PASSWORD|DATABASE_PASSWORD|MYSQL_PASSWORD|POSTGRES_PASSWORD|REDIS_PASSWORD|PASSWORD)\s*=\s*\S{6,}/i, 'high', 'password en .env'],
  ['Env Secret Key', /^(?:SECRET_KEY|JWT_SECRET|SESSION_SECRET|ENCRYPTION_KEY|APP_SECRET|AUTH_SECRET)\s*=\s*\S{6,}/i, 'high', 'secret key en .env'],
  ['Env API Key', /^(?:API_KEY|APIKEY|API_SECRET|APP_KEY|PRIVATE_KEY|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\s*=\s*\S{6,}/i, 'high', 'API key en .env'],
];

const TEST_INDICATORS = new Set(['test','tests','spec','specs','mock','mocks','fake','fakes','fixture',
  'fixtures','example','examples','sample','samples','demo','demos','dummy','stub','stubs','seed']);

// OJO: NADA de '${' ni '{{' acá. Una interpolación de template literal NO es un placeholder —
// en Next/TS los connection strings reales se arman con `${...}` y quedarían exentos (agujero C10).
const ALLOWLIST_WORDS = ['placeholder','your_','your-','xxx','changeme','test_key','replace_me',
  'insert_','<your','sk_test_','pk_test_','example','dummy'];

function esAllowlisted(linea) {
  const l = linea.toLowerCase();
  return ALLOWLIST_WORDS.some((w) => l.includes(w));
}
function esArchivoTest(rel) {
  return rel.toLowerCase().replace(/\\/g, '/').split('/').some((parte) =>
    parte.split(/[-_./]/).some((seg) => TEST_INDICATORS.has(seg)));
}
// Un secreto CRITICAL (AWS key, connection string con credenciales) NUNCA se degrada por estar
// en un archivo test/demo/seed: un secreto real ahí sigue siendo un secreto real. Solo bajamos
// los 'high' (patrones más laxos) para no gritar en fixtures.
function bajarSeveridad(sev) { return sev === 'high' ? 'low' : sev; }

function skipFile(nombre, ext, sizeBytes) {
  if (SKIP_FILES.has(nombre)) return true;
  if (SKIP_EXT.has(ext)) return true;
  if (nombre.endsWith('.min.js') || nombre.endsWith('.min.css')) return true;
  if (sizeBytes > MAX_FILE_KB * 1024) return true;
  return false;
}

function walk(dir, out) {
  let entradas;
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
  for (const e of entradas) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue; // NO saltear todo dot-dir: .github/, .circleci/ etc. SÍ se commitean
      walk(path.join(dir, e.name), out);
    } else if (e.isFile()) {
      out.push(path.join(dir, e.name));
    }
  }
}

function scanFile(filepath, root, findings) {
  const nombre = path.basename(filepath);
  const ext = path.extname(filepath).toLowerCase();
  let st;
  try { st = fs.statSync(filepath); } catch (_) { return; }
  if (skipFile(nombre, ext, st.size)) return;
  let texto;
  try { texto = fs.readFileSync(filepath, 'utf8'); } catch (_) { return; }
  const rel = path.relative(root, filepath);
  const esTest = esArchivoTest(rel);
  const lineas = texto.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    if (linea.length > MAX_LINE) continue;
    for (const [name, rx, sev, desc] of PATTERNS) {
      if (rx.test(linea)) {
        if (esAllowlisted(linea)) continue;
        // Conexión a un host LOCAL (dev/CI/.env.example) NO es un secreto filtrado.
        if (/Connection/i.test(name) && /@(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?|host\.docker\.internal)/i.test(linea)) continue;
        // Password/secret hardcodeado cuyo VALOR es un default débil conocido (nunca un secreto real).
        if (/Hardcoded|Env (?:Password|Secret|API)/i.test(name)) {
          const vm = linea.match(/['"]([^'"]{1,40})['"]/);
          if (vm && /^(?:postgres|admin|root|password|passwd|changeme|secret|example|test|user|dev|guest|public)$/i.test(vm[1])) continue;
        }
        const severidad = esTest ? bajarSeveridad(sev) : sev;
        let ev = linea.trim(); if (ev.length > 160) ev = ev.slice(0, 160) + '...';
        findings.push({ type: name, severity: severidad, file: rel, line: i + 1, description: desc, evidence: ev });
        break; // un hallazgo por línea
      }
    }
  }
}

function checkGitignore(root, findings) {
  const gi = path.join(root, '.gitignore');
  let contenido = '';
  try { contenido = fs.readFileSync(gi, 'utf8'); } catch (_) {}
  let envs = [];
  try {
    envs = fs.readdirSync(root).filter((f) => /^\.env/.test(f) && !/\.(example|sample|template)$/.test(f));
  } catch (_) {}
  if (envs.length && !/(^|\n)\s*\.env/.test(contenido)) {
    findings.push({ type: '.env sin gitignore', severity: 'high', file: '.gitignore', line: 0,
      description: `existen ${envs.join(', ')} pero .env no está en .gitignore`, evidence: '.env no ignorado' });
  }
}

// Un scanner de secretos SHIFT-LEFT solo debe mirar lo que se va a COMMITEAR. Los archivos
// gitignored (.env, .env.local, .env.deploy.local, código generado) son locales por diseño y
// NUNCA entran al repo → flaguearlos es ruido que apaga el candado. Los saltamos.
function gitIgnorados(root, archivos) {
  try {
    const rels = archivos.map((f) => path.relative(root, f).replace(/\\/g, '/'));
    const r = spawnSync('git', ['-C', root, 'check-ignore', '--stdin'], { input: rels.join('\n'), encoding: 'utf8' });
    if (r.error || r.status === 128) return new Set(); // no es repo git / git ausente → no filtrar
    return new Set((r.stdout || '').split('\n').map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean));
  } catch (_) { return new Set(); }
}

function escanear(dir) {
  const root = path.resolve(dir);
  const archivos = [];
  walk(root, archivos);
  const ign = gitIgnorados(root, archivos);
  const visibles = ign.size ? archivos.filter((f) => !ign.has(path.relative(root, f).replace(/\\/g, '/'))) : archivos;
  const findings = [];
  for (const f of visibles) scanFile(f, root, findings);
  checkGitignore(root, findings);
  return findings;
}

module.exports = { escanear, PATTERNS };

if (require.main === module) {
  const dir = process.argv[2] || process.cwd();
  const findings = escanear(dir);
  const bloqueantes = findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  if (!findings.length) {
    console.log('✓ raw-secrets OK — sin secretos detectados.');
    process.exit(0);
  }
  const log = bloqueantes.length ? console.error : console.log;
  log(`\n${bloqueantes.length ? '⛔' : '⚠'} raw-secrets — ${findings.length} posible(s) secreto(s):`);
  for (const f of findings) log(`  [${f.severity}] ${f.type} — ${f.file}:${f.line}`);
  if (bloqueantes.length) {
    console.error('\nSacá el secreto del código (movelo a una variable de entorno / gestor de secretos) y rotá el que se filtró.');
    process.exit(1);
  }
  process.exit(0);
}
