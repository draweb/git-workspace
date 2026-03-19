'use strict';

const gitContext = require('../git-context');
const { EXIT_CODES } = require('../constants');

function run(argv, deps) {
  const runGit = deps && deps.runGit;
  const root = gitContext.findGitRoot(process.cwd());
  if (!root) return Promise.resolve(null);
  const allRemotes = argv.includes('--all-remotes');
  const argsWithoutFlag = argv.filter(a => a !== '--all-remotes');
  const firstArg = argsWithoutFlag[0];
  return gitContext.getRemoteNames(root).then((remoteNames) => {
    const explicitRemote = firstArg && !firstArg.startsWith('-') && remoteNames.includes(firstArg);
    if (explicitRemote) return null;
    const current = gitContext.getCurrentWorkspace(root);
    const remotesData = gitContext.getRemotesWithWorkspace(root);
    let remotesToUse = [];
    if (allRemotes) {
      remotesToUse = Object.keys(remotesData).filter(n => remotesData[n].gwWorkspace);
    } else if (current) {
      const byWorkspace = gitContext.getRemotesByWorkspace(root);
      remotesToUse = byWorkspace[current] || [];
      if (remotesToUse.length === 0) {
        console.error('gw: no hay remote asociado al workspace "' + current + '".');
        return EXIT_CODES.USAGE;
      }
    } else {
      return null;
    }
    if (remotesToUse.length === 0) return null;
    const runOne = (i) => {
      if (i >= remotesToUse.length) return Promise.resolve(EXIT_CODES.SUCCESS);
      return runGit(['fetch', remotesToUse[i], ...argsWithoutFlag.slice(1)], root).then((code) => {
        if (code !== 0) return code;
        return runOne(i + 1);
      });
    };
    return runOne(0);
  });
}

module.exports = { run };
