'use strict';

const gitContext = require('../git-context');
const { EXIT_CODES } = require('../constants');

function run() {
  const root = gitContext.findGitRoot(process.cwd());
  if (!root) {
    console.error('gw: no es un repositorio git.');
    return EXIT_CODES.USAGE;
  }
  const remotes = gitContext.getRemotesWithWorkspace(root);
  const names = Object.keys(remotes).sort();
  if (names.length === 0) {
    console.log('No hay remotes configurados.');
    return EXIT_CODES.SUCCESS;
  }
  for (const name of names) {
    const r = remotes[name];
    const ws = r.gwWorkspace || '—';
    console.log(name + '\t' + r.url + ' (workspace: ' + ws + ')');
  }
  return EXIT_CODES.SUCCESS;
}

module.exports = { run };
