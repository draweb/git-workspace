'use strict';

/**
 * Texto de ayuda estructurado, cabecera temática y bloques post-help.
 */

const { createStyle } = require('./term-style');
const { useUnicodeIcons } = require('./term-ui');
const { CONFIG_DIR, GW_CONFIG_PATH } = require('./constants');

function parseBool01(v) {
  if (v === '0' || v === 'false' || v === 'off') return false;
  if (v === '1' || v === 'true' || v === 'on') return true;
  return null;
}

function bannerPolicy(stream) {
  const b = parseBool01(process.env.GW_BANNER);
  if (b === false) return 'off';
  if (b === true) return 'force';
  return stream && stream.isTTY ? 'tty' : 'off';
}

function simpleHash(str) {
  let h = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const TAGLINES = {
  root: [
    'Un push al día… y los workspaces en orden.',
    'Menos "git cómo", más "gw ya".',
    'Clone, identidad, SSH: todo en su sitio.',
    'Branches claras, workspaces claros: misma filosofía.',
    'Tu identidad por proyecto, sin drama de claves.',
    'De local a remoto sin mezclar las llaves.',
    'Aquí las claves rotan con backup; en main, con calma.'
  ],
  workspace: [
    'Añade un workspace: suma una identidad, no un problema.',
    'Listar, editar, rotar: el ABC del buen vecino SSH.',
    'Cada workspace es un mini-yo con su propia llave.',
    'pubkey en stdout: piping friendly, humano en el resto.'
  ],
  key: [
    'Rota la RSA, guarda el backup: sueño húmedo de ops.',
    'Nueva clave, mismo nombre: el repo ni se entera (casi).',
    'ssh-keygen con cariño y -q para no asustar al terminal.'
  ]
};

function pickBannerTagline(context) {
  const list = TAGLINES[context] || TAGLINES.root;
  const day = new Date().getUTCDate();
  const idx = (simpleHash(process.cwd()) + day) % list.length;
  return list[idx];
}

function asciiFrameTop() {
  return '  +---- git workspace ----+';
}

function asciiFrameBottom() {
  return '  +------------------------+';
}

/**
 * Bloque de cabecera para addHelpText('before', …). Sin colores si no aplica.
 * @param {'root'|'workspace'|'key'} context
 * @param {import('stream').Writable} [stream]
 * @returns {string}
 */
function helpBannerBefore(context, stream) {
  const out = stream || process.stdout;
  const policy = bannerPolicy(out);
  if (policy === 'off') return '';

  const st = createStyle(out);
  const unicode = useUnicodeIcons(out);
  const tag = pickBannerTagline(context);
  const lines = [];

  if (policy === 'tty') {
    lines.push(st.dim(asciiFrameTop()));
    lines.push(st.heading(unicode ? '\u2728 gw' : 'gw') + st.dim(' · Draweb Git Workspace'));
    lines.push(st.dim(asciiFrameBottom()));
    lines.push('');
    lines.push(st.cyan(tag));
  } else {
    lines.push('gw · Draweb Git Workspace');
    lines.push(tag);
  }

  return lines.join('\n') + '\n';
}

function rootHelpAfter(pkg) {
  const st = createStyle(process.stdout);
  const u = useUnicodeIcons(process.stdout);
  const tick = u ? '\u2714 ' : '* ';
  const arrow = u ? '\u2192 ' : '-> ';
  const nl = '\n';
  const cfg = GW_CONFIG_PATH;
  const dir = CONFIG_DIR;
  let s = nl;
  s += st.heading('Inicio rápido') + nl;
  s += st.bullet(st.green(tick + 'gw workspace list')) + nl;
  s += st.bullet(st.green(tick + 'gw workspace add miws --new-key')) + nl;
  s += st.bullet(st.green(tick + 'gw clone -w miws git@github.com:user/repo.git')) + nl;
  s += nl + st.heading('Comandos') + nl;
  s += st.dim('  Workspaces') + nl;
  s += '    workspace add|list|remove|show|pubkey|current|edit' + nl;
  s += '    workspace key rotate' + nl;
  s += st.dim('  Repo / git') + nl;
  s += '    clone -w, remote add/set-url -w, init -w, repo link, push, pull, fetch' + nl;
  s += st.dim('  Otros') + nl;
  s += '    doctor  (o check)' + nl;
  s += nl + st.heading('Archivos') + nl;
  s += st.bullet(st.dim('Config: ') + cfg) + nl;
  s += st.bullet(st.dim('Directorio: ') + dir) + nl;
  s += nl + st.heading('Más ayuda') + nl;
  s += st.bullet(arrow + st.cyan('gw workspace --help')) + nl;
  s += st.bullet(arrow + st.cyan('gw workspace key --help')) + nl;
  if (pkg && pkg.repository && pkg.repository.url) {
    const url = typeof pkg.repository.url === 'string' ? pkg.repository.url : pkg.repository.url.href;
    if (url) s += st.bullet(st.dim('Repo: ') + url) + nl;
  }
  return s;
}

function workspaceHelpAfter() {
  const st = createStyle(process.stdout);
  const u = useUnicodeIcons(process.stdout);
  const arrow = u ? '\u2192 ' : '-> ';
  const nl = '\n';
  let s = nl + st.heading('Subcomandos anidados (clave)') + nl;
  s += st.bullet(st.yellow('gw workspace key rotate <nombre>') + st.dim('  — nueva RSA 4096, con backup')) + nl;
  s += st.bullet(arrow + st.cyan('gw workspace key --help')) + nl;
  s += nl + st.heading('Ejemplos') + nl;
  s += '  gw workspace add draweb' + nl;
  s += '  gw workspace pubkey draweb | clip' + nl;
  return s;
}

function workspaceKeyHelpAfter() {
  const st = createStyle(process.stdout);
  const nl = '\n';
  return nl + st.dim('La rotación pide confirmación, hace backup .bak-YYYYMMDD-HHmmss y actualiza identityFile.') + nl;
}

module.exports = {
  helpBannerBefore,
  pickBannerTagline,
  rootHelpAfter,
  workspaceHelpAfter,
  workspaceKeyHelpAfter
};
