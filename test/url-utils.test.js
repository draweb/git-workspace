'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseSshUrl, isSshUrl, buildAliasedUrl } = require('../src/url-utils');

describe('parseSshUrl', () => {
  it('parses git@host:path format', () => {
    const r = parseSshUrl('git@github.com:user/repo.git');
    assert.strictEqual(r.host, 'github.com');
    assert.strictEqual(r.pathPart, 'user/repo.git');
    assert.strictEqual(r.isSsh, true);
  });

  it('parses ssh://git@host/path format', () => {
    const r = parseSshUrl('ssh://git@github.com/user/repo.git');
    assert.strictEqual(r.host, 'github.com');
    assert.strictEqual(r.pathPart, 'user/repo.git');
  });

  it('parses git@gitlab.com:group/project.git', () => {
    const r = parseSshUrl('git@gitlab.com:group/project.git');
    assert.strictEqual(r.host, 'gitlab.com');
    assert.strictEqual(r.pathPart, 'group/project.git');
  });

  it('returns null for empty or invalid', () => {
    assert.strictEqual(parseSshUrl(''), null);
    assert.strictEqual(parseSshUrl('   '), null);
    assert.strictEqual(parseSshUrl('https://github.com/user/repo'), null);
    assert.strictEqual(parseSshUrl('not-a-url'), null);
    assert.strictEqual(parseSshUrl(null), null);
  });

  it('trims whitespace', () => {
    const r = parseSshUrl('  git@github.com:user/repo.git  ');
    assert.strictEqual(r.host, 'github.com');
  });
});

describe('isSshUrl', () => {
  it('returns true for SSH URLs', () => {
    assert.strictEqual(isSshUrl('git@github.com:user/repo.git'), true);
    assert.strictEqual(isSshUrl('ssh://git@host/path'), true);
  });

  it('returns false for non-SSH', () => {
    assert.strictEqual(isSshUrl('https://github.com/user/repo'), false);
    assert.strictEqual(isSshUrl(''), false);
  });
});

describe('buildAliasedUrl', () => {
  it('replaces host with alias in git@host:path', () => {
    const out = buildAliasedUrl('git@github.com:user/repo.git', 'draweb.github.com');
    assert.strictEqual(out, 'git@draweb.github.com:user/repo.git');
  });

  it('replaces host with alias in ssh:// format', () => {
    const out = buildAliasedUrl('ssh://git@github.com/user/repo.git', 'draweb.github.com');
    assert.strictEqual(out, 'ssh://git@draweb.github.com/user/repo.git');
  });

  it('returns null for invalid URL', () => {
    assert.strictEqual(buildAliasedUrl('https://x.com/y', 'alias'), null);
    assert.strictEqual(buildAliasedUrl('', 'alias'), null);
  });
});
