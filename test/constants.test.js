'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  EXIT_CODES,
  WORKSPACE_NAME_REGEX,
  GIT_CONFIG_GW_SECTION,
  GIT_CONFIG_GW_WORKSPACE,
  GIT_CONFIG_REMOTE_GW_WORKSPACE
} = require('../src/constants');

describe('EXIT_CODES', () => {
  it('has expected values', () => {
    assert.strictEqual(EXIT_CODES.SUCCESS, 0);
    assert.strictEqual(EXIT_CODES.USAGE, 1);
    assert.strictEqual(EXIT_CODES.ENV, 2);
    assert.strictEqual(EXIT_CODES.EXTERNAL, 3);
  });
});

describe('WORKSPACE_NAME_REGEX', () => {
  it('matches valid workspace names', () => {
    assert.ok(WORKSPACE_NAME_REGEX.test('draweb'));
    assert.ok(WORKSPACE_NAME_REGEX.test('my_ws'));
    assert.ok(WORKSPACE_NAME_REGEX.test('my-ws'));
    assert.ok(WORKSPACE_NAME_REGEX.test('ws123'));
  });

  it('does not match invalid', () => {
    assert.strictEqual(WORKSPACE_NAME_REGEX.test(''), false);
    assert.strictEqual(WORKSPACE_NAME_REGEX.test('a b'), false);
    assert.strictEqual(WORKSPACE_NAME_REGEX.test('a.b'), false);
  });
});

describe('git config constants', () => {
  it('has expected section and key names', () => {
    assert.strictEqual(GIT_CONFIG_GW_SECTION, 'gw');
    assert.strictEqual(GIT_CONFIG_GW_WORKSPACE, 'workspace');
    assert.strictEqual(GIT_CONFIG_REMOTE_GW_WORKSPACE, 'gwWorkspace');
  });
});
