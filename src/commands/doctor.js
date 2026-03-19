'use strict';

const fs = require('fs');
const config = require('../config');
const sshConfig = require('../ssh-config');
const gitContext = require('../git-context');
const { EXIT_CODES } = require('../constants');

function run() {
  let hasError = false;
  const workspaces = config.getWorkspaces();
  console.log('Workspaces en config:', Object.keys(workspaces).length);
  for (const [name, ws] of Object.entries(workspaces)) {
    const keyExists = fs.existsSync(ws.identityFile);
    if (!keyExists) {
      console.error('  [ERROR]', name, ': identityFile no existe:', ws.identityFile);
      hasError = true;
    } else {
      console.log('  [OK]', name);
    }
  }
  const sshPath = sshConfig.getSshConfigPath();
  let writable = false;
  try {
    if (fs.existsSync(sshPath)) {
      fs.accessSync(sshPath, fs.constants.W_OK);
      writable = true;
    } else {
      const dir = require('path').dirname(sshPath);
      writable = fs.existsSync(dir) && require('path').join(dir, '.');
    }
  } catch (_) {}
  if (!writable) {
    console.error('~/.ssh/config no existe o no es escribible.');
    hasError = true;
  } else {
    console.log('~/.ssh/config: OK');
  }
  const root = gitContext.findGitRoot(process.cwd());
  if (root) {
    const current = gitContext.getCurrentWorkspace(root);
    console.log('Repo actual: workspace =', current || '(ninguno)');
  }
  return hasError ? EXIT_CODES.ENV : EXIT_CODES.SUCCESS;
}

module.exports = { run };
