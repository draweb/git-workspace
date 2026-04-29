'use strict';

/**
 * Comando: gw workspace remove <nombre> [--clean-ssh]
 * Uso: Elimina un workspace de la config y opcionalmente limpia hosts SSH.
 * Ejemplo: gw workspace remove draweb --clean-ssh
 */

const config = require('../config');
const sshConfig = require('../ssh-config');
const { validateWorkspaceName } = require('../utils/validate');
const { EXIT_CODES } = require('../constants');

function run(nombre, opts) {
  const v = validateWorkspaceName(nombre);
  if (!v.valid) {
    console.error('gw:', v.message);
    return EXIT_CODES.USAGE;
  }
  try {
    const workspace = config.getWorkspace(nombre);
    const removed = config.removeWorkspace(nombre);
    if (!removed) {
      console.error("gw: workspace '" + nombre + "' no encontrado. Usa gw workspace list.");
      return EXIT_CODES.USAGE;
    }
    if (opts && opts.cleanSsh) {
      const n = sshConfig.removeHostBlocksByWorkspace(nombre);
      if (n > 0) console.log('Eliminados ' + n + ' host(s) de ~/.ssh/config.');
    }
    console.log('Workspace "' + nombre + '" eliminado.');
    return EXIT_CODES.SUCCESS;
  } catch (e) {
    console.error('gw:', e.message);
    return EXIT_CODES.ENV;
  }
}

module.exports = { run };
