'use strict';

const config = require('../config');
const { EXIT_CODES } = require('../constants');

function run() {
  try {
    const workspaces = config.getWorkspaces();
    const names = Object.keys(workspaces);
    if (names.length === 0) {
      console.log('No hay workspaces configurados. Usa gw workspace add <nombre>');
      return EXIT_CODES.SUCCESS;
    }
    for (const name of names.sort()) {
      const w = workspaces[name];
      console.log(`${name}: ${w.name} <${w.email}>`);
    }
    return EXIT_CODES.SUCCESS;
  } catch (e) {
    console.error('gw:', e.message);
    return EXIT_CODES.ENV;
  }
}

module.exports = { run };
