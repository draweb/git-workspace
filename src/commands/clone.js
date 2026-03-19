'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const config = require('../config');
const sshConfig = require('../ssh-config');
const { parseSshUrl, buildAliasedUrl, isSshUrl } = require('../url-utils');
const { GIT_CONFIG_GW_SECTION, GIT_CONFIG_GW_WORKSPACE, EXIT_CODES } = require('../constants');

function run(workspaceName, url, extraArgs, deps) {
  const runGit = deps && deps.runGit;
  const dryRun = deps && deps.dryRun;

  const workspace = config.getWorkspace(workspaceName);
  if (!workspace) {
    console.error("gw: workspace '" + workspaceName + "' no encontrado. Usa gw workspace list.");
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  if (!isSshUrl(url)) {
    if (url.trim().startsWith('https://') || url.trim().startsWith('http://')) {
      console.error('gw: la URL es HTTPS. El workspace solo aplica a SSH. Usa una URL SSH (ej. git@github.com:user/repo.git).');
    } else {
      console.error('gw: la URL debe ser SSH (git@host:path o ssh://...).');
    }
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  const parsed = parseSshUrl(url);
  if (!parsed) {
    console.error('gw: no se pudo interpretar la URL.');
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  if (!fs.existsSync(workspace.identityFile)) {
    console.error('gw: la clave del workspace no existe en', workspace.identityFile);
    return Promise.resolve(EXIT_CODES.ENV);
  }

  const aliasHost = workspaceName + '.' + parsed.host;
  const aliasedUrl = buildAliasedUrl(url, aliasHost);
  if (!aliasedUrl) {
    console.error('gw: error al construir URL aliada.');
    return Promise.resolve(EXIT_CODES.EXTERNAL);
  }

  if (dryRun) {
    console.log('Workspace:', workspaceName);
    console.log('Host alias:', aliasHost, '->', parsed.host);
    console.log('URL aliada:', aliasedUrl);
    console.log('Se ejecutaría: git clone', aliasedUrl, ...extraArgs);
    console.log('Luego: git config user.name/user.email y [gw] workspace en el repo.');
    return Promise.resolve(EXIT_CODES.SUCCESS);
  }

  try {
    sshConfig.ensureHostAlias(aliasHost, parsed.host, workspace.identityFile);
  } catch (e) {
    console.error('gw: error al escribir ~/.ssh/config:', e.message);
    return Promise.resolve(EXIT_CODES.EXTERNAL);
  }

  const cloneArgs = ['clone', aliasedUrl, ...extraArgs.filter(a => a !== '--dry-run')];
  return runGit(cloneArgs).then(async (code) => {
    if (code !== 0) return code;
    const dirArg = extraArgs.find(a => !a.startsWith('-'));
    const defaultDir = parsed.pathPart ? path.basename(parsed.pathPart.replace(/\.git$/, '')) : 'repo';
    const cloneDir = dirArg || defaultDir;
    const cwd = path.isAbsolute(cloneDir) ? cloneDir : path.join(process.cwd(), cloneDir);
    if (!fs.existsSync(path.join(cwd, '.git'))) return code;
    await runGit(['config', 'user.name', workspace.name], cwd);
    await runGit(['config', 'user.email', workspace.email], cwd);
    const gitConfigPath = path.join(cwd, '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      let content = fs.readFileSync(gitConfigPath, 'utf8');
      if (!content.includes('[' + GIT_CONFIG_GW_SECTION + ']')) {
        content = content.trim() + '\n\n[' + GIT_CONFIG_GW_SECTION + ']\n\t' + GIT_CONFIG_GW_WORKSPACE + ' = ' + workspaceName + '\n';
      }
      if (!content.includes('gwWorkspace')) {
        const remoteSection = '[remote "origin"]';
        const idx = content.indexOf(remoteSection);
        if (idx !== -1) {
          const endOfSection = content.indexOf('\n[', idx + 1);
          const insertAt = endOfSection !== -1 ? endOfSection : content.length;
          content = content.slice(0, insertAt) + '\n\tgwWorkspace = ' + workspaceName + content.slice(insertAt);
        }
      }
      fs.writeFileSync(gitConfigPath, content);
    }
    return EXIT_CODES.SUCCESS;
  });
}

module.exports = { run };
