'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function getSshConfigPath() {
  const home = os.homedir();
  return path.join(home, '.ssh', 'config');
}

function parseSshConfig(content) {
  const lines = (content || '').split(/\r?\n/);
  const blocks = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      if (current) current.raw.push(line);
      continue;
    }
    const match = trimmed.match(/^(\S+)\s+(.+)$/);
    if (match) {
      const key = match[1].toLowerCase();
      const value = match[2].trim();
      if (key === 'host') {
        current = { host: value, options: {}, raw: [line] };
        blocks.push(current);
      } else if (current && (key === 'hostname' || key === 'identityfile' || key === 'user')) {
        if (key === 'identityfile') {
          current.options.identityFile = current.options.identityFile
            ? [].concat(current.options.identityFile, value)[0]
            : value;
        } else {
          current.options[key] = value;
        }
        current.raw.push(line);
      } else if (current) {
        current.raw.push(line);
      }
    } else if (current) {
      current.raw.push(line);
    }
  }
  return blocks;
}

function readSshConfig() {
  const configPath = getSshConfigPath();
  if (!fs.existsSync(configPath)) return '';
  return fs.readFileSync(configPath, 'utf8');
}

function findHostBlock(blocks, hostAlias) {
  return blocks.find(b => b.host && b.host.toLowerCase() === hostAlias.toLowerCase());
}

function listIdentityFiles() {
  const content = readSshConfig();
  const blocks = parseSshConfig(content);
  const home = os.homedir();
  const seen = new Set();
  const files = [];
  for (const block of blocks) {
    const idFile = block.options && block.options.identityFile;
    if (idFile) {
      let resolved = idFile.replace(/^~/, home);
      if (!path.isAbsolute(resolved)) {
        resolved = path.join(home, '.ssh', resolved);
      }
      resolved = path.normalize(resolved);
      if (!seen.has(resolved) && fs.existsSync(resolved)) {
        seen.add(resolved);
        files.push({ path: resolved, host: block.host });
      }
    }
  }
  const sshDir = path.join(home, '.ssh');
  if (fs.existsSync(sshDir)) {
    const list = fs.readdirSync(sshDir);
    for (const f of list) {
      if (f.endsWith('.pub')) continue;
      if (f.startsWith('id_') && f !== 'id_rsa' && f !== 'id_ed25519') continue;
      const full = path.join(sshDir, f);
      if (fs.statSync(full).isFile() && !seen.has(full)) {
        seen.add(full);
        files.push({ path: full, host: null });
      }
    }
  }
  return files;
}

function ensureHostAlias(aliasHost, hostName, identityFile) {
  const configPath = getSshConfigPath();
  const content = fs.existsSync(configPath) ? readSshConfig() : '';
  const blocks = parseSshConfig(content);
  const existing = findHostBlock(blocks, aliasHost);
  const identityAbsolute = path.isAbsolute(identityFile)
    ? identityFile
    : path.join(os.homedir(), '.ssh', identityFile.replace(/^~[/\\]\.ssh[/\\]?/, ''));
  const blockLines = [
    '',
    `# gw workspace alias for ${aliasHost}`,
    `Host ${aliasHost}`,
    `  HostName ${hostName}`,
    `  User git`,
    `  IdentityFile ${identityAbsolute}`
  ];
  let newContent;
  if (existing) {
    const idx = blocks.indexOf(existing);
    existing.raw = blockLines.slice(1);
    const all = blocks.map(b => b.raw.join('\n')).join('\n\n');
    newContent = all.trim() + '\n';
  } else {
    newContent = (content.trim() ? content.trim() + '\n' : '') + blockLines.join('\n') + '\n';
  }
  const tmpPath = configPath + '.gw.tmp.' + process.pid;
  fs.writeFileSync(tmpPath, newContent, 'utf8');
  fs.renameSync(tmpPath, configPath);
}

function removeHostBlocksByWorkspace(workspaceName) {
  const configPath = getSshConfigPath();
  if (!fs.existsSync(configPath)) return 0;
  const content = readSshConfig();
  const blocks = parseSshConfig(content);
  const prefix = workspaceName.toLowerCase() + '.';
  const toRemove = blocks.filter(b => b.host && b.host.toLowerCase().startsWith(prefix));
  if (toRemove.length === 0) return 0;
  const kept = blocks.filter(b => !toRemove.includes(b));
  const newContent = kept.map(b => b.raw.join('\n')).join('\n\n').trim() + (kept.length ? '\n' : '');
  const tmpPath = configPath + '.gw.tmp.' + process.pid;
  fs.writeFileSync(tmpPath, newContent, 'utf8');
  fs.renameSync(tmpPath, configPath);
  return toRemove.length;
}

function getHostsForIdentityFile(identityFile) {
  const content = readSshConfig();
  const blocks = parseSshConfig(content);
  const home = os.homedir();
  const abs = path.isAbsolute(identityFile)
    ? identityFile
    : path.join(home, '.ssh', identityFile.replace(/^~[/\\]\.ssh[/\\]?/, ''));
  const normalized = path.normalize(abs);
  return blocks
    .filter(b => b.options && b.options.identityFile)
    .filter(b => path.normalize(b.options.identityFile.replace(/^~/, home)) === normalized)
    .map(b => b.host);
}

module.exports = {
  getSshConfigPath,
  readSshConfig,
  parseSshConfig,
  findHostBlock,
  listIdentityFiles,
  ensureHostAlias,
  removeHostBlocksByWorkspace,
  getHostsForIdentityFile
};
