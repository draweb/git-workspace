'use strict';

const gitContext = require('../git-context');
const { EXIT_CODES } = require('../constants');

function run(argv, deps) {
  const runGit = deps && deps.runGit;
  const root = gitContext.findGitRoot(process.cwd());
  if (!root) {
    return Promise.resolve(null);
  }
  const allRemotes = argv.includes('--all-remotes');
  const argsWithoutAllRemotes = argv.filter(a => a !== '--all-remotes');
  const firstArg = argsWithoutAllRemotes[0];
  return gitContext.getRemoteNames(root).then((remoteNames) => {
    const explicitRemote = firstArg && !firstArg.startsWith('-') && remoteNames.includes(firstArg);
    if (explicitRemote) return null;
    const current = gitContext.getCurrentWorkspace(root);
    const byWorkspace = gitContext.getRemotesByWorkspace(root);
    let remotesToUse = [];
    const remotesData = gitContext.getRemotesWithWorkspace(root);
    if (allRemotes) {
      remotesToUse = Object.keys(remotesData).filter(n => remotesData[n].gwWorkspace);
    } else if (current) {
      remotesToUse = byWorkspace[current] || [];
      if (remotesToUse.length === 0) {
        console.error('gw: no hay remote asociado al workspace "' + current + '". Usa gw remote add o gw remote set-url ... -w ' + current);
        return EXIT_CODES.USAGE;
      }
    } else {
      return null;
    }
    if (remotesToUse.length === 0) return null;
    const runOne = (i) => {
      if (i >= remotesToUse.length) return Promise.resolve(EXIT_CODES.SUCCESS);
      const remote = remotesToUse[i];
      const pushArgs = ['push', remote, ...argsWithoutAllRemotes.slice(1)];
      return runGit(pushArgs, root).then((code) => {
        if (code !== 0) return code;
        return runOne(i + 1);
      });
    };
    return runOne(0);
  });
}

module.exports = { run };
