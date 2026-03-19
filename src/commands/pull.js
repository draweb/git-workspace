'use strict';

const gitContext = require('../git-context');
const { EXIT_CODES } = require('../constants');

function run(argv, deps) {
  const runGit = deps && deps.runGit;
  const root = gitContext.findGitRoot(process.cwd());
  if (!root) return Promise.resolve(null);
  const firstArg = argv[0];
  return gitContext.getRemoteNames(root).then((remoteNames) => {
    const explicitRemote = firstArg && !firstArg.startsWith('-') && remoteNames.includes(firstArg);
    if (explicitRemote) return null;
    const current = gitContext.getCurrentWorkspace(root);
    if (!current) return null;
    const byWorkspace = gitContext.getRemotesByWorkspace(root);
    const remotes = byWorkspace[current] || [];
    if (remotes.length === 0) {
      console.error('gw: no hay remote asociado al workspace "' + current + '".');
      return EXIT_CODES.USAGE;
    }
    const remote = remotes[0];
    return runGit(['pull', remote, ...argv.slice(1)], root);
  });
}

module.exports = { run };
