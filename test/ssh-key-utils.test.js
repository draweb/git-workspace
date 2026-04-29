'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureSshRsaPublicKey } = require('../src/ssh-key-utils');

describe('ensureSshRsaPublicKey', () => {
  it('acepta clave pública con prefijo ssh-rsa', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-rsa-ok-'));
    const key = path.join(tempDir, 'id_rsa_demo');
    fs.writeFileSync(key + '.pub', 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCy demo@test');
    const result = ensureSshRsaPublicKey(key);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.code, undefined);
  });

  it('falla cuando la clave no comienza con ssh-rsa', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-rsa-bad-'));
    const key = path.join(tempDir, 'id_ed25519_demo');
    fs.writeFileSync(key + '.pub', 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI demo@test');
    const result = ensureSshRsaPublicKey(key);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'INVALID_PREFIX');
  });

  it('falla cuando no existe archivo .pub', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-rsa-missing-'));
    const key = path.join(tempDir, 'id_rsa_missing');
    const result = ensureSshRsaPublicKey(key);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'MISSING_PUB');
    assert.ok(result.pubPath.endsWith('.pub'));
  });
});
