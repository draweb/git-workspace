'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateWorkspaceName, validateEmail } = require('../src/utils/validate');

describe('validateWorkspaceName', () => {
  it('accepts valid names', () => {
    assert.strictEqual(validateWorkspaceName('draweb').valid, true);
    assert.strictEqual(validateWorkspaceName('my_workspace').valid, true);
    assert.strictEqual(validateWorkspaceName('my-workspace').valid, true);
    assert.strictEqual(validateWorkspaceName('ws123').valid, true);
  });

  it('rejects empty or invalid', () => {
    const empty = validateWorkspaceName('');
    assert.strictEqual(empty.valid, false);
    assert.ok(empty.message.length > 0);

    assert.strictEqual(validateWorkspaceName('   ').valid, false);
    assert.strictEqual(validateWorkspaceName('a b').valid, false);
    assert.strictEqual(validateWorkspaceName('con espacio').valid, false);
    assert.strictEqual(validateWorkspaceName('punto.workspace').valid, false);
  });

  it('rejects non-string', () => {
    assert.strictEqual(validateWorkspaceName(null).valid, false);
    assert.strictEqual(validateWorkspaceName(123).valid, false);
  });
});

describe('validateEmail', () => {
  it('accepts emails with @', () => {
    assert.strictEqual(validateEmail('user@example.com').valid, true);
    assert.strictEqual(validateEmail('dev@draweb.cloud').valid, true);
  });

  it('rejects empty or without @', () => {
    assert.strictEqual(validateEmail('').valid, false);
    assert.strictEqual(validateEmail('  ').valid, false);
    assert.strictEqual(validateEmail('no-at-sign').valid, false);
  });

  it('rejects non-string', () => {
    assert.strictEqual(validateEmail(null).valid, false);
  });
});
