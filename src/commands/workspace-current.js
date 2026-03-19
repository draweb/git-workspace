'use strict';

const gitContext = require('../git-context');
const { EXIT_CODES } = require('../constants');

function run() {
  const current = gitContext.getCurrentWorkspace(process.cwd());
  if (!current) {
    console.log('Este repo no tiene workspace asociado. Usa gw repo link -w <nombre> o clona con gw clone -w.');
    return EXIT_CODES.SUCCESS;
  }
  console.log(current);
  return EXIT_CODES.SUCCESS;
}

module.exports = { run };
