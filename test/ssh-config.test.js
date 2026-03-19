'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseSshConfig, findHostBlock } = require('../src/ssh-config');

describe('parseSshConfig', () => {
  it('parses a single Host block', () => {
    const content = `
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
`;
    const blocks = parseSshConfig(content);
    assert.strictEqual(blocks.length, 1);
    assert.strictEqual(blocks[0].host, 'github.com');
    assert.strictEqual(blocks[0].options.hostname, 'github.com');
    assert.strictEqual(blocks[0].options.user, 'git');
    assert.strictEqual(blocks[0].options.identityFile, '~/.ssh/id_ed25519');
  });

  it('parses multiple Host blocks', () => {
    const content = `
Host draweb.github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_draweb

Host other
  HostName gitlab.com
  IdentityFile ~/.ssh/id_rsa
`;
    const blocks = parseSshConfig(content);
    assert.strictEqual(blocks.length, 2);
    assert.strictEqual(blocks[0].host, 'draweb.github.com');
    assert.strictEqual(blocks[0].options.identityFile, '~/.ssh/id_ed25519_draweb');
    assert.strictEqual(blocks[1].host, 'other');
    assert.strictEqual(blocks[1].options.hostname, 'gitlab.com');
  });

  it('ignores comments and empty lines', () => {
    const content = `
# comment
Host x
  HostName x.com
`;
    const blocks = parseSshConfig(content);
    assert.strictEqual(blocks.length, 1);
    assert.strictEqual(blocks[0].host, 'x');
  });

  it('returns empty array for empty content', () => {
    assert.deepStrictEqual(parseSshConfig(''), []);
    assert.deepStrictEqual(parseSshConfig(null), []);
  });
});

describe('findHostBlock', () => {
  it('finds block by host alias', () => {
    const blocks = [
      { host: 'draweb.github.com', options: {} },
      { host: 'other', options: {} }
    ];
    const found = findHostBlock(blocks, 'draweb.github.com');
    assert.strictEqual(found.host, 'draweb.github.com');
  });

  it('is case insensitive', () => {
    const blocks = [{ host: 'Draweb.Github.COM', options: {} }];
    const found = findHostBlock(blocks, 'draweb.github.com');
    assert.ok(found);
  });

  it('returns undefined when not found', () => {
    const blocks = [{ host: 'other', options: {} }];
    assert.strictEqual(findHostBlock(blocks, 'draweb.github.com'), undefined);
  });
});
