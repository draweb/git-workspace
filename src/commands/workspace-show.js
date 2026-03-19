'use strict';

const config = require('../config');
const sshConfig = require('../ssh-config');
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
  console.log('Workspace:', nombre);
  console.log('  name:', workspace.name);
  console.log('  email:', workspace.email);
  console.log('  identityFile:', workspace.identityFile);
  try {
    const hosts = sshConfig.getHostsForIdentityFile(workspace.identityFile);
    if (hosts.length > 0) {
      console.log('  hosts (SSH config):', hosts.join(', '));
    }
  } catch (_) {}
  return EXIT_CODES.SUCCESS;
}

module.exports = { run };
