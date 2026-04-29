'use strict';

/**
 * Comando: gw workspace add <nombre> [--name ... --email ... --identity-file ... --new-key]
 * Uso: Crea un workspace con identidad git y clave SSH asociada.
 * Ejemplo: gw workspace add draweb --name "Tu Nombre" --email tu@email.com --new-key
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const config = require('../config');
const sshConfig = require('../ssh-config');
const { validateWorkspaceName, validateEmail } = require('../utils/validate');
const { EXIT_CODES } = require('../constants');
const { iconOk } = require('../term-ui');

const prompts = require('prompts');

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
  const workspaces = config.getWorkspaces();
  if (workspaces[nombre]) {
    console.error("gw: ya existe un workspace '" + nombre + "'. Usa otro nombre o gw workspace remove " + nombre);
    return EXIT_CODES.USAGE;
  }

  let name = opts && opts.name;
  let email = opts && opts.email;
  let identityFile = opts && opts.identityFile;
  const useNewKey = opts && opts.newKey;

  if (!name || !email) {
    const res = await prompts([
      { type: 'text', name: 'name', message: 'Nombre para git (user.name):', initial: name || '' },
      { type: 'text', name: 'email', message: 'Email para git (user.email):', initial: email || '' }
    ], { onCancel: () => process.exit(EXIT_CODES.USAGE) });
    name = res.name;
    email = res.email;
  }
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) {
    console.error('gw:', emailCheck.message);
    return EXIT_CODES.USAGE;
  }

  if (identityFile) {
    const resolved = path.isAbsolute(identityFile) ? identityFile : path.join(os.homedir(), '.ssh', identityFile.replace(/^~[/\\]\.ssh[/\\]?/, ''));
    if (!fs.existsSync(resolved)) {
      console.error('gw: la clave no existe en', resolved);
      return EXIT_CODES.USAGE;
    }
    identityFile = path.normalize(resolved);
  } else if (useNewKey && runSshKeygen) {
    const keyPath = getDefaultKeyPath(nombre);
    const args = ['-t', 'rsa', '-b', '4096', '-C', email, '-f', keyPath, '-N', ''];
    const code = await runSshKeygen(args);
    if (code !== 0) {
      console.error('gw: no se pudo generar la clave SSH (RSA 4096).');
      return EXIT_CODES.EXTERNAL;
    }
    identityFile = keyPath;
  } else {
    const keys = sshConfig.listIdentityFiles();
    let choice;
    if (keys.length === 0) {
      const keyPath = getDefaultKeyPath(nombre);
      const keyPathRes = await prompts({
        type: 'confirm',
        name: 'create',
        message: 'No hay claves en ~/.ssh. ¿Generar nueva clave para este workspace?',
        initial: true
      });
      if (!keyPathRes.create) return EXIT_CODES.USAGE;
      const args = ['-t', 'rsa', '-b', '4096', '-C', email, '-f', keyPath, '-N', ''];
      const code = await runSshKeygen(args);
      if (code !== 0) {
        console.error('gw: no se pudo generar la clave RSA 4096.');
        return EXIT_CODES.EXTERNAL;
      }
      identityFile = keyPath;
    } else {
      const choices = keys.map((k, i) => ({
        title: k.path + (k.host ? ' (' + k.host + ')' : ''),
        value: k.path
      }));
      choices.push({ title: '[Generar nueva clave]', value: '__new__' });
      const res = await prompts({
        type: 'select',
        name: 'key',
        message: 'Elegir clave SSH existente o generar nueva:',
        choices
      });
      if (res.key === '__new__') {
        const keyPath = getDefaultKeyPath(nombre);
        const args = ['-t', 'rsa', '-b', '4096', '-C', email, '-f', keyPath, '-N', ''];
        const code = await runSshKeygen(args);
        if (code !== 0) {
          console.error('gw: no se pudo generar la clave RSA 4096.');
          return EXIT_CODES.EXTERNAL;
        }
        identityFile = keyPath;
      } else {
        identityFile = res.key;
      }
    }
  }

  try {
    config.addWorkspace(nombre, { name, email, identityFile });
    console.log(iconOk(process.stdout) + 'Workspace "' + nombre + '" añadido.');
    return EXIT_CODES.SUCCESS;
  } catch (e) {
    console.error('gw:', e.message);
    return EXIT_CODES.ENV;
  }
}

module.exports = { run };
