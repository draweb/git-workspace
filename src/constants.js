'use strict';

const path = require('path');
const os = require('os');

const CONFIG_DIR = process.platform === 'win32'
  ? path.join(os.homedir(), '.gw')
  : path.join(os.homedir(), '.config', 'gw');
const CONFIG_FILE = 'config.json';
const GW_CONFIG_PATH = path.join(CONFIG_DIR, CONFIG_FILE);

const GIT_CONFIG_GW_SECTION = 'gw';
const GIT_CONFIG_GW_WORKSPACE = 'workspace';
const GIT_CONFIG_REMOTE_GW_WORKSPACE = 'gwWorkspace';

const WORKSPACE_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

const EXIT_CODES = {
  SUCCESS: 0,
  USAGE: 1,
  ENV: 2,
  EXTERNAL: 3
};

module.exports = {
  CONFIG_DIR,
  CONFIG_FILE,
  GW_CONFIG_PATH,
  GIT_CONFIG_GW_SECTION,
  GIT_CONFIG_GW_WORKSPACE,
  GIT_CONFIG_REMOTE_GW_WORKSPACE,
  WORKSPACE_NAME_REGEX,
  EXIT_CODES
};
