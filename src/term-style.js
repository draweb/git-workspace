'use strict';

/**
 * Estilos ANSI opcionales para stdout/stderr.
 * Respeta NO_COLOR, GW_COLOR=0|1, FORCE_COLOR y TTY del stream.
 */

const ESC = '\u001b[';

function envDefined(name) {
  const v = process.env[name];
  return v !== undefined && v !== '';
}

function parseBool01(v) {
  if (v === '0' || v === 'false' || v === 'off') return false;
  if (v === '1' || v === 'true' || v === 'on') return true;
  return null;
}

function shouldUseColor(stream) {
  if (envDefined('NO_COLOR')) return false;
  const gw = parseBool01(process.env.GW_COLOR);
  if (gw === false) return false;
  const force =
    gw === true ||
    envDefined('FORCE_COLOR') ||
    parseBool01(process.env.FORCE_COLOR) === true;
  const tty = stream && stream.isTTY === true;
  if (force) return true;
  if (gw === true && !tty) return true;
  return tty;
}

function wrap(stream, open, close, text) {
  if (!shouldUseColor(stream)) return String(text);
  return open + String(text) + close;
}

function createStyle(stream) {
  const s = stream || process.stdout;
  const c = (code, text) => wrap(s, ESC + code + 'm', ESC + '0m', text);
  return {
    stream: s,
    shouldUseColor: () => shouldUseColor(s),
    bold: (t) => c('1', t),
    dim: (t) => c('2', t),
    cyan: (t) => c('36', t),
    green: (t) => c('32', t),
    yellow: (t) => c('33', t),
    red: (t) => c('31', t),
    heading: (t) => c('1', c('36', t)),
    bullet: (t) => wrap(s, ESC + '2m', ESC + '0m', '  ') + t
  };
}

const stdoutStyle = createStyle(process.stdout);
const stderrStyle = createStyle(process.stderr);

module.exports = {
  shouldUseColor,
  createStyle,
  stdoutStyle,
  stderrStyle,
  wrap
};
