'use strict';

const fs = require('fs');
const path = require('path');

function publicKeyPath(identityFile) {
  const normalized = path.normalize(identityFile);
  if (normalized.toLowerCase().endsWith('.pub')) return normalized;
  return normalized + '.pub';
}

function readPublicKey(identityFile) {
  const pubPath = publicKeyPath(identityFile);
  if (!fs.existsSync(pubPath)) {
    return { ok: false, code: 'MISSING_PUB', pubPath };
  }
  try {
    const content = fs.readFileSync(pubPath, 'utf8').trim();
    return { ok: true, pubPath, content };
  } catch (error) {
    return { ok: false, code: 'READ_ERROR', pubPath, error };
  }
}

function ensureSshRsaPublicKey(identityFile) {
  const loaded = readPublicKey(identityFile);
  if (!loaded.ok) return loaded;
  if (!loaded.content.startsWith('ssh-rsa ')) {
    return { ok: false, code: 'INVALID_PREFIX', pubPath: loaded.pubPath, content: loaded.content };
  }
  return loaded;
}

function buildBackupSuffix(date) {
  const d = date || new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `.bak-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function moveIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return false;
  fs.renameSync(sourcePath, targetPath);
  return true;
}

function backupIdentityFiles(identityFile, suffix) {
  const normalized = path.normalize(identityFile);
  const pub = publicKeyPath(normalized);
  const backupSuffix = suffix || buildBackupSuffix();
  const privateBackupPath = normalized + backupSuffix;
  const publicBackupPath = pub + backupSuffix;
  const movedPrivate = moveIfExists(normalized, privateBackupPath);
  const movedPublic = moveIfExists(pub, publicBackupPath);
  return {
    suffix: backupSuffix,
    movedPrivate,
    movedPublic,
    privateBackupPath,
    publicBackupPath
  };
}

module.exports = {
  publicKeyPath,
  readPublicKey,
  ensureSshRsaPublicKey,
  buildBackupSuffix,
  moveIfExists,
  backupIdentityFiles
};
