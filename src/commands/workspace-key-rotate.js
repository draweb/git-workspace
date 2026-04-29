'use strict';

/**
 * Comando: gw workspace key rotate <nombre>
 * Uso: Regenera la clave RSA del workspace con confirmación previa y backup.
 * Ejemplo: gw workspace key rotate draweb
 */

const path = require('path');
const os = require('os');
const prompts = require('prompts');
const config = require('../config');
const { validateWorkspaceName } = require('../utils/validate');
const { backupIdentityFiles, buildBackupSuffix } = require('../ssh-key-utils');
const { EXIT_CODES } = require('../constants');
const { iconOk } = require('../term-ui');

function getDefaultKeyPath(workspaceName) {
  const home = os.homedir();
  return path.join(home, '.ssh', 'id_rsa_' + workspaceName);
}

async function run(nombre, opts, deps) {
  const runSshKeygen = deps && deps.runSshKeygen;
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
  if (!runSshKeygen) {
    console.error('gw: no se recibió dependencia runSshKeygen.');
    return EXIT_CODES.ENV;
  }

  const targetPath = getDefaultKeyPath(nombre);
  const currentPath = workspace.identityFile;
  console.log('Se va a rotar la clave RSA del workspace "' + nombre + '".');
  console.log('  clave actual :', currentPath);
  console.log('  clave nueva  :', targetPath);
  console.log('  política     : backup de clave anterior (.bak-YYYYMMDD-HHmmss)');

  const res = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: '¿Confirmas la rotación de clave para este workspace?',
    initial: false
  });
  if (!res.confirm) {
    console.error('gw: operación cancelada por el usuario.');
    return EXIT_CODES.USAGE;
  }

  const backupSuffix = buildBackupSuffix();
  try {
    const backup = backupIdentityFiles(currentPath, backupSuffix);
    const keyPath = targetPath;
    const args = ['-t', 'rsa', '-b', '4096', '-C', workspace.email, '-f', keyPath, '-N', ''];
    const code = await runSshKeygen(args);
    if (code !== 0) {
      console.error('gw: no se pudo generar la nueva clave RSA 4096.');
      return EXIT_CODES.EXTERNAL;
    }
    config.updateWorkspace(nombre, { identityFile: keyPath });
    console.log(iconOk(process.stdout) + 'Rotación completada para workspace "' + nombre + '".');
    if (backup.movedPrivate) console.log('  backup privada:', backup.privateBackupPath);
    if (backup.movedPublic) console.log('  backup pública:', backup.publicBackupPath);
    console.log('  nueva clave   :', keyPath);
    return EXIT_CODES.SUCCESS;
  } catch (e) {
    console.error('gw:', e.message);
    return EXIT_CODES.EXTERNAL;
  }
}

module.exports = { run, getDefaultKeyPath };
