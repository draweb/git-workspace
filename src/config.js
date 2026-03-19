'use strict';

const fs = require('fs');
const path = require('path');
const { GW_CONFIG_PATH, CONFIG_DIR } = require('./constants');

function getConfigPath() {
  return GW_CONFIG_PATH;
}

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(CONFIG_DIR, 0o700);
      } catch (_) {}
    }
  }
}

function loadRaw() {
  ensureConfigDir();
  if (!fs.existsSync(GW_CONFIG_PATH)) {
    return { workspaces: {} };
  }
  const data = fs.readFileSync(GW_CONFIG_PATH, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch (e) {
    throw new Error('Config de gw corrupto. Revisa ' + GW_CONFIG_PATH);
  }
  if (!parsed || typeof parsed !== 'object') {
    return { workspaces: {} };
  }
  if (!parsed.workspaces || typeof parsed.workspaces !== 'object') {
    parsed.workspaces = {};
  }
  for (const [name, ws] of Object.entries(parsed.workspaces)) {
    if (!ws || typeof ws !== 'object' || typeof ws.name !== 'string' || typeof ws.email !== 'string' || typeof ws.identityFile !== 'string') {
      delete parsed.workspaces[name];
    }
  }
  return parsed;
}

function getWorkspaces() {
  const raw = loadRaw();
  return raw.workspaces || {};
}

function addWorkspace(name, data) {
  const raw = loadRaw();
  raw.workspaces[name] = {
    name: data.name,
    email: data.email,
    identityFile: data.identityFile
  };
  writeRaw(raw);
}

function removeWorkspace(name) {
  const raw = loadRaw();
  if (!raw.workspaces[name]) return false;
  delete raw.workspaces[name];
  writeRaw(raw);
  return true;
}

function writeRaw(raw) {
  ensureConfigDir();
  const tmpPath = GW_CONFIG_PATH + '.tmp.' + process.pid;
  fs.writeFileSync(tmpPath, JSON.stringify(raw, null, 2), 'utf8');
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(tmpPath, 0o600);
    } catch (_) {}
  }
  fs.renameSync(tmpPath, GW_CONFIG_PATH);
}

function getWorkspace(name) {
  const workspaces = getWorkspaces();
  return workspaces[name] || null;
}

function updateWorkspace(name, data) {
  const raw = loadRaw();
  if (!raw.workspaces[name]) return false;
  if (data.name !== undefined) raw.workspaces[name].name = data.name;
  if (data.email !== undefined) raw.workspaces[name].email = data.email;
  if (data.identityFile !== undefined) raw.workspaces[name].identityFile = data.identityFile;
  writeRaw(raw);
  return true;
}

module.exports = {
  getConfigPath,
  ensureConfigDir,
  loadRaw,
  getWorkspaces,
  getWorkspace,
  addWorkspace,
  removeWorkspace,
  updateWorkspace
};
