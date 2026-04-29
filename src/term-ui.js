'use strict';

/**
 * Iconos de consola y spinner (stderr). Políticas GW_ICONS y GW_SPINNER.
 */

const { createStyle } = require('./term-style');

function parseBool01(v) {
  if (v === '0' || v === 'false' || v === 'off') return false;
  if (v === '1' || v === 'true' || v === 'on') return true;
  return null;
}

function useUnicodeIcons(stream) {
  const g = parseBool01(process.env.GW_ICONS);
  if (g === false) return false;
  if (g === true) return true;
  const s = stream || process.stderr;
  return !!(s && s.isTTY);
}

function iconOk(stream) {
  return useUnicodeIcons(stream) ? '\u2714 ' : '[OK] ';
}

function iconWarn(stream) {
  return useUnicodeIcons(stream) ? '\u26a0 ' : '[WARN] ';
}

function iconErr(stream) {
  return useUnicodeIcons(stream) ? '\u2716 ' : '[ERR] ';
}

function iconInfo(stream) {
  return useUnicodeIcons(stream) ? '\u2192 ' : '> ';
}

function canUseSpinner() {
  const sp = parseBool01(process.env.GW_SPINNER);
  if (sp === false) return false;
  if (sp === true) return !!process.stderr.isTTY;
  return !!process.stderr.isTTY;
}

function startSpinner(label) {
  const frames = ['|', '/', '-', '\\'];
  let i = 0;
  const style = createStyle(process.stderr);
  const text = String(label);
  const id = setInterval(() => {
    const f = frames[i++ % frames.length];
    const prefix = style.shouldUseColor() ? `\u001b[2m${f}\u001b[0m` : f;
    process.stderr.write(`\r\u001b[K${prefix} ${text} `);
  }, 100);
  return {
    stop() {
      clearInterval(id);
      process.stderr.write('\r\u001b[K');
    }
  };
}

/**
 * Ejecuta una Promise con spinner en stderr si aplica.
 * @param {string} label
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withSpinner(label, fn) {
  if (!canUseSpinner()) {
    return fn();
  }
  const spin = startSpinner(label);
  try {
    return await fn();
  } finally {
    spin.stop();
  }
}

module.exports = {
  useUnicodeIcons,
  iconOk,
  iconWarn,
  iconErr,
  iconInfo,
  canUseSpinner,
  startSpinner,
  withSpinner
};
