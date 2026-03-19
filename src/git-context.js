'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { GIT_CONFIG_GW_SECTION, GIT_CONFIG_GW_WORKSPACE, GIT_CONFIG_REMOTE_GW_WORKSPACE } = require('./constants');

function findGitRoot(cwd) {
  let dir = path.resolve(cwd || process.cwd());
  for (let i = 0; i < 100; i++) {
    const gitDir = path.join(dir, '.git');
    if (fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory()) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

function parseGitConfig(content) {
  const result = { sections: {} };
  let current = null;
  const lines = (content || '').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      current = sectionMatch[1].trim();
      if (!result.sections[current]) result.sections[current] = {};
      continue;
    }
    if (current && trimmed.includes('=')) {
      const eq = trimmed.indexOf('=');
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      result.sections[current][key] = value;
    }
  }
  return result;
}

function readRepoConfig(cwd) {
  const root = findGitRoot(cwd);
  if (!root) return null;
  const configPath = path.join(root, '.git', 'config');
  if (!fs.existsSync(configPath)) return null;
  const content = fs.readFileSync(configPath, 'utf8');
  return { root, parsed: parseGitConfig(content) };
}

function getCurrentWorkspace(cwd) {
  const repo = readRepoConfig(cwd);
  if (!repo) return null;
  const section = repo.parsed.sections[GIT_CONFIG_GW_SECTION];
  if (!section || !section[GIT_CONFIG_GW_WORKSPACE]) return null;
  return section[GIT_CONFIG_GW_WORKSPACE].trim();
}

function getRemotesWithWorkspace(cwd) {
  const repo = readRepoConfig(cwd);
  if (!repo) return {};
  const out = {};
  for (const [sectionName, keys] of Object.entries(repo.parsed.sections)) {
    if (sectionName.startsWith('remote "') && sectionName.endsWith('"')) {
      const name = sectionName.slice(8, -1);
      const url = keys.url;
      const gwWorkspace = keys[GIT_CONFIG_REMOTE_GW_WORKSPACE];
      out[name] = { url: url || '', gwWorkspace: gwWorkspace ? gwWorkspace.trim() : null };
    }
  }
  return out;
}

function getRemotesByWorkspace(cwd) {
  const remotes = getRemotesWithWorkspace(cwd);
  const byWs = {};
  for (const [name, data] of Object.entries(remotes)) {
    if (data.gwWorkspace) {
      if (!byWs[data.gwWorkspace]) byWs[data.gwWorkspace] = [];
      byWs[data.gwWorkspace].push(name);
    }
  }
  return byWs;
}

function getRemoteNames(cwd) {
  return new Promise((resolve) => {
    const root = findGitRoot(cwd);
    if (!root) {
      resolve([]);
      return;
    }
    const child = spawn('git', ['remote'], { cwd: root });
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(c));
    child.on('close', (code) => {
      if (code !== 0) {
        resolve([]);
        return;
      }
      const names = Buffer.concat(chunks).toString().trim().split(/\r?\n/).filter(Boolean);
      resolve(names);
    });
    child.on('error', () => resolve([]));
  });
}

function setGitConfig(cwd, key, value) {
  return new Promise((resolve, reject) => {
    const root = findGitRoot(cwd);
    if (!root) return reject(new Error('No es un repositorio git'));
    const child = spawn('git', ['config', key, value], { cwd: root });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error('git config failed'))));
    child.on('error', reject);
  });
}

function setRemoteUrl(cwd, remoteName, url) {
  return new Promise((resolve, reject) => {
    const root = findGitRoot(cwd);
    if (!root) return reject(new Error('No es un repositorio git'));
    const child = spawn('git', ['remote', 'set-url', remoteName, url], { cwd: root });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error('git remote set-url failed'))));
    child.on('error', reject);
  });
}

function addRemote(cwd, name, url) {
  return new Promise((resolve, reject) => {
    const root = findGitRoot(cwd);
    if (!root) return reject(new Error('No es un repositorio git'));
    const child = spawn('git', ['remote', 'add', name, url], { cwd: root });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error('git remote add failed'))));
    child.on('error', reject);
  });
}

function writeGitConfigSection(cwd, section, key, value) {
  const root = findGitRoot(cwd);
  if (!root) return false;
  const configPath = path.join(root, '.git', 'config');
  let content = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  const sectionHeader = `[${section}]`;
  if (!content.includes(sectionHeader)) {
    content = content.trim() + '\n\n' + sectionHeader + '\n\t' + key + ' = ' + value + '\n';
    fs.writeFileSync(configPath, content);
    return true;
  }
  const re = new RegExp(`(\\[${section.replace(/[^\w"]/g, '\\$&')}\\][^\\[]*)(\\n\\[|$)`, 's');
  const match = content.match(re);
  if (!match) return false;
  const block = match[1];
  if (block.includes(key + ' =')) {
    return true;
  }
  const newBlock = block.trimEnd() + '\n\t' + key + ' = ' + value + '\n';
  content = content.replace(re, newBlock + (match[2] || ''));
  fs.writeFileSync(configPath, content);
  return true;
}

module.exports = {
  findGitRoot,
  readRepoConfig,
  getCurrentWorkspace,
  getRemotesWithWorkspace,
  getRemotesByWorkspace,
  getRemoteNames,
  setGitConfig,
  setRemoteUrl,
  addRemote,
  writeGitConfigSection,
  parseGitConfig
};
