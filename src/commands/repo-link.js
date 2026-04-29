'use strict';

/**
 * Comando: gw repo link -w <workspace>
 * Uso: Vincula un repo existente al workspace y ajusta identidad + origin.
 * Ejemplo: gw repo link -w draweb
 */

const path = require('path');
const fs = require('fs');
const config = require('../config');
const sshConfig = require('../ssh-config');
const gitContext = require('../git-context');
const { parseSshUrl, buildAliasedUrl, isSshUrl } = require('../url-utils');
const { ensureSshRsaPublicKey } = require('../ssh-key-utils');
const { GIT_CONFIG_GW_SECTION, GIT_CONFIG_GW_WORKSPACE, GIT_CONFIG_REMOTE_GW_WORKSPACE, EXIT_CODES } = require('../constants');

function run(workspaceName, deps) {
  const workspace = config.getWorkspace(workspaceName);
  if (!workspace) {
    console.error("gw: workspace '" + workspaceName + "' no encontrado.");
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  const pub = ensureSshRsaPublicKey(workspace.identityFile);
  if (!pub.ok) {
    if (pub.code === 'MISSING_PUB') {
      console.error('gw: no existe la clave pública del workspace:', pub.pubPath);
      return Promise.resolve(EXIT_CODES.ENV);
    }
    if (pub.code === 'INVALID_PREFIX') {
      console.error('gw: la clave pública del workspace debe iniciar con "ssh-rsa". Archivo:', pub.pubPath);
      return Promise.resolve(EXIT_CODES.USAGE);
    }
    if (pub.code === 'READ_ERROR') {
      console.error('gw: no se pudo leer la clave pública del workspace:', pub.pubPath);
      return Promise.resolve(EXIT_CODES.ENV);
    }
  }
  const root = gitContext.findGitRoot(process.cwd());
  if (!root) {
    console.error('gw: no es un repositorio git. Ejecuta desde la raíz del repo.');
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  const remotes = gitContext.getRemotesWithWorkspace(root);
  const origin = remotes.origin;
  if (!origin || !origin.url) {
    console.error('gw: no hay remote origin. Añade uno con gw remote add origin -w ' + workspaceName + ' <url-ssh>.');
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  const url = origin.url;
  if (!isSshUrl(url)) {
    console.error('gw: origin tiene URL HTTPS. Usa gw remote set-url origin -w ' + workspaceName + ' <url-ssh> con una URL SSH.');
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  const parsed = parseSshUrl(url);
  if (!parsed) return Promise.resolve(EXIT_CODES.USAGE);
  const aliasHost = workspaceName + '.' + parsed.host;
  const aliasedUrl = buildAliasedUrl(url, aliasHost);
  if (!aliasedUrl) return Promise.resolve(EXIT_CODES.EXTERNAL);
  try {
    sshConfig.ensureHostAlias(aliasHost, parsed.host, workspace.identityFile);
  } catch (e) {
    console.error('gw: error ~/.ssh/config:', e.message);
    return Promise.resolve(EXIT_CODES.EXTERNAL);
  }
  return gitContext.setGitConfig(root, 'user.name', workspace.name).then(() =>
    gitContext.setGitConfig(root, 'user.email', workspace.email)
  ).then(() => gitContext.setRemoteUrl(root, 'origin', aliasedUrl)).then(() => {
    gitContext.writeGitConfigSection(root, 'gw', 'workspace', workspaceName);
    gitContext.writeGitConfigSection(root, 'remote "origin"', GIT_CONFIG_REMOTE_GW_WORKSPACE, workspaceName);
    console.log('Repo asociado al workspace "' + workspaceName + '".');
    return EXIT_CODES.SUCCESS;
  }).catch((e) => {
    console.error('gw:', e.message);
    return EXIT_CODES.EXTERNAL;
  });
}

module.exports = { run };
