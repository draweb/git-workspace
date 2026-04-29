'use strict';

/**
 * Comando: gw workspace pubkey <nombre>
 * Uso: Imprime en consola la clave pública del workspace (validando prefijo ssh-rsa).
 * Ejemplo: gw workspace pubkey draweb | clip
 */

const fs = require('fs');
const config = require('../config');
const { publicKeyPath, ensureSshRsaPublicKey } = require('../ssh-key-utils');
const { validateWorkspaceName } = require('../utils/validate');
const { EXIT_CODES } = require('../constants');

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
  const pub = ensureSshRsaPublicKey(workspace.identityFile);
  if (!pub.ok) {
    if (pub.code === 'INVALID_PREFIX') {
      console.error('gw: la clave pública debe comenzar con "ssh-rsa". Archivo:', pub.pubPath);
      return EXIT_CODES.USAGE;
    }
    if (pub.code === 'READ_ERROR') {
      console.error('gw: no se pudo leer', pub.pubPath, ':', pub.error.message);
      return EXIT_CODES.ENV;
    }
  }
  process.stdout.write(pub.content + '\n');
  return EXIT_CODES.SUCCESS;
}

module.exports = { run, publicKeyPath };
