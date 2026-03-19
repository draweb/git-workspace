'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { validateWorkspaceName } = require('../utils/validate');
const { EXIT_CODES } = require('../constants');

/**
 * Ruta del fichero .pub asociado a identityFile del workspace.
 */
function publicKeyPath(identityFile) {
  const normalized = path.normalize(identityFile);
  if (normalized.toLowerCase().endsWith('.pub')) {
    return normalized;
  }
  return normalized + '.pub';
}

function run(nombre) {
  const v = validateWorkspaceName(nombre);
  if (!v.valid) {
    console.error('gw:', v.message);
    return EXIT_CODES.USAGE;
  }
  const workspace = config.getWorkspace(nombre);
  if (!workspace) {
    console.error("gw: workspace '" + nombre + "' no encontrado. Usa gw workspace list.");
    return EXIT_CODES.USAGE;
  }
  const pubPath = publicKeyPath(workspace.identityFile);
  if (!fs.existsSync(pubPath)) {
    console.error('gw: no existe la clave pública:', pubPath);
    console.error('gw: si solo tienes la privada, genera la .pub con: ssh-keygen -y -f "' + workspace.identityFile + '" > "' + pubPath + '"');
    return EXIT_CODES.USAGE;
  }
  try {
    const content = fs.readFileSync(pubPath, 'utf8').trim();
    process.stdout.write(content + '\n');
  } catch (e) {
    console.error('gw: no se pudo leer', pubPath, ':', e.message);
    return EXIT_CODES.ENV;
  }
  return EXIT_CODES.SUCCESS;
}

module.exports = { run, publicKeyPath };
