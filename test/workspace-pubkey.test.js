'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { publicKeyPath } = require('../src/commands/workspace-pubkey');

describe('publicKeyPath', () => {
  it('añade .pub a la ruta de clave privada', () => {
    const priv = path.join('home', 'u', '.ssh', 'id_ed25519_draweb');
    const pub = publicKeyPath(priv);
    assert.ok(pub.endsWith('.pub'), pub);
    assert.ok(pub.includes('id_ed25519_draweb'), pub);
  });
  it('no duplica .pub si ya termina en .pub', () => {
    const p = path.join('a', 'key.pub');
    assert.strictEqual(publicKeyPath(p), path.normalize(p));
  });
});
