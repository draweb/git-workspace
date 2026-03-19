'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const config = require('../config');
const { validateWorkspaceName, validateEmail } = require('../utils/validate');
const { EXIT_CODES } = require('../constants');
const prompts = require('prompts');

function run(nombre, opts) {
  const v = validateWorkspaceName(nombre);
  if (!v.valid) {
    console.error('gw:', v.message);
    return EXIT_CODES.USAGE;
  }
  const workspace = config.getWorkspace(nombre);
  if (!workspace) {
    console.error("gw: workspace '" + nombre + "' no encontrado.");
    return EXIT_CODES.USAGE;
  }
  const updates = {};
  if (opts.name !== undefined) updates.name = opts.name;
  if (opts.email !== undefined) {
    const e = validateEmail(opts.email);
    if (!e.valid) {
      console.error('gw:', e.message);
      return EXIT_CODES.USAGE;
    }
    updates.email = opts.email;
  }
  if (opts.identityFile !== undefined) {
    const resolved = path.isAbsolute(opts.identityFile) ? opts.identityFile : path.join(os.homedir(), '.ssh', opts.identityFile.replace(/^~[/\\]\.ssh[/\\]?/, ''));
    if (!fs.existsSync(resolved)) {
      console.error('gw: la clave no existe en', resolved);
      return EXIT_CODES.USAGE;
    }
    updates.identityFile = path.normalize(resolved);
  }
  if (Object.keys(updates).length === 0) {
    console.error('gw: indica al menos --name, --email o --identity-file para editar.');
    return EXIT_CODES.USAGE;
  }
  config.updateWorkspace(nombre, updates);
  console.log('Workspace "' + nombre + '" actualizado.');
  return EXIT_CODES.SUCCESS;
}

module.exports = { run };
