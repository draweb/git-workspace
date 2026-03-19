'use strict';

const config = require('../config');
const gitContext = require('../git-context');
const { EXIT_CODES } = require('../constants');

function run(workspaceName, extraArgs, deps) {
  const runGit = deps && deps.runGit;
  const workspace = config.getWorkspace(workspaceName);
  if (!workspace) {
    console.error("gw: workspace '" + workspaceName + "' no encontrado.");
    return Promise.resolve(EXIT_CODES.USAGE);
  }
  return runGit(['init', ...extraArgs]).then((code) => {
    if (code !== 0) return code;
    const root = gitContext.findGitRoot(process.cwd());
    if (!root) return code;
    return runGit(['config', 'user.name', workspace.name], root).then(() =>
      runGit(['config', 'user.email', workspace.email], root)
    ).then(() => {
      gitContext.writeGitConfigSection(root, 'gw', 'workspace', workspaceName);
      console.log('Repo inicializado con workspace "' + workspaceName + '".');
      return EXIT_CODES.SUCCESS;
    }).catch((e) => {
      console.error('gw:', e.message);
      return EXIT_CODES.EXTERNAL;
    });
  });
}

module.exports = { run };
