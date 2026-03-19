'use strict';

const config = require('../config');
const sshConfig = require('../ssh-config');
const gitContext = require('../git-context');
const { parseSshUrl, buildAliasedUrl, isSshUrl } = require('../url-utils');
const { GIT_CONFIG_REMOTE_GW_WORKSPACE, EXIT_CODES } = require('../constants');

function run(remoteName, workspaceName, url, deps) {
  const workspace = config.getWorkspace(workspaceName);
  if (!workspace) {
    console.error("gw: workspace '" + workspaceName + "' no encontrado.");
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  if (!isSshUrl(url)) {
    console.error('gw: la URL debe ser SSH.');
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  const parsed = parseSshUrl(url);
  if (!parsed) return Promise.resolve(EXIT_CODES.USAGE);
  const aliasHost = workspaceName + '.' + parsed.host;
  const aliasedUrl = buildAliasedUrl(url, aliasHost);
  if (!aliasedUrl) return Promise.resolve(EXIT_CODES.EXTERNAL);
  const root = gitContext.findGitRoot(process.cwd());
  if (!root) {
    console.error('gw: no es un repositorio git.');
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  const remotes = gitContext.getRemotesWithWorkspace(root);
  if (!remotes[remoteName]) {
    console.error('gw: remote "' + remoteName + '" no existe.');
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  try {
    sshConfig.ensureHostAlias(aliasHost, parsed.host, workspace.identityFile);
  } catch (e) {
    console.error('gw: error ~/.ssh/config:', e.message);
    return Promise.resolve(EXIT_CODES.EXTERNAL);
  }
  return gitContext.setRemoteUrl(root, remoteName, aliasedUrl).then(() => {
    gitContext.writeGitConfigSection(root, 'remote "' + remoteName + '"', GIT_CONFIG_REMOTE_GW_WORKSPACE, workspaceName);
    console.log('Remote "' + remoteName + '" actualizado con workspace "' + workspaceName + '".');
    return EXIT_CODES.SUCCESS;
  }).catch((e) => {
    console.error('gw:', e.message);
    return EXIT_CODES.EXTERNAL;
  });
}

module.exports = { run };
