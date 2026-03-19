'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const gitContext = require('../src/git-context');
const { GIT_CONFIG_GW_SECTION, GIT_CONFIG_GW_WORKSPACE, GIT_CONFIG_REMOTE_GW_WORKSPACE } = require('../src/constants');

describe('parseGitConfig', () => {
  it('parses [section] and key = value', () => {
    const content = `[core]
	repositoryformatversion = 0
	filemode = true

[remote "origin"]
	url = git@github.com:user/repo.git
	fetch = +refs/heads/*:refs/remotes/origin/*
`;
    const parsed = gitContext.parseGitConfig(content);
    assert.ok(parsed.sections['core']);
    assert.strictEqual(parsed.sections['core'].repositoryformatversion, '0');
    const key = 'remote "origin"';
    assert.ok(parsed.sections[key]);
    assert.strictEqual(parsed.sections[key].url, 'git@github.com:user/repo.git');
  });

  it('parses [gw] workspace', () => {
    const content = `[gw]
	workspace = draweb
`;
    const parsed = gitContext.parseGitConfig(content);
    assert.strictEqual(parsed.sections['gw'].workspace, 'draweb');
  });

  it('handles empty content', () => {
    const parsed = gitContext.parseGitConfig('');
    assert.deepStrictEqual(parsed.sections, {});
  });
});

describe('getCurrentWorkspace and getRemotesWithWorkspace', () => {
  it('returns null when not in a git repo', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-test-'));
    try {
      const ws = gitContext.getCurrentWorkspace(tmp);
      assert.strictEqual(ws, null);
      const remotes = gitContext.getRemotesWithWorkspace(tmp);
      assert.deepStrictEqual(remotes, {});
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });

  it('returns workspace and remotes when .git/config has gw and remote', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-test-'));
    const gitDir = path.join(tmp, '.git');
    fs.mkdirSync(gitDir, { recursive: true });
    const configContent = `[core]
	repositoryformatversion = 0
[gw]
	workspace = draweb
[remote "origin"]
	url = git@draweb.github.com:user/repo.git
	gwWorkspace = draweb
`;
    fs.writeFileSync(path.join(gitDir, 'config'), configContent);
    try {
      const ws = gitContext.getCurrentWorkspace(tmp);
      assert.strictEqual(ws, 'draweb');
      const remotes = gitContext.getRemotesWithWorkspace(tmp);
      assert.strictEqual(remotes.origin.url, 'git@draweb.github.com:user/repo.git');
      assert.strictEqual(remotes.origin.gwWorkspace, 'draweb');
      const byWs = gitContext.getRemotesByWorkspace(tmp);
      assert.deepStrictEqual(byWs.draweb, ['origin']);
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });
});

describe('findGitRoot', () => {
  it('finds repo root from subdirectory', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-test-'));
    const gitDir = path.join(tmp, '.git');
    fs.mkdirSync(gitDir, { recursive: true });
    const sub = path.join(tmp, 'sub', 'dir');
    fs.mkdirSync(sub, { recursive: true });
    try {
      const root = gitContext.findGitRoot(sub);
      assert.strictEqual(root, tmp);
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });

  it('returns null when no .git', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-test-'));
    try {
      assert.strictEqual(gitContext.findGitRoot(tmp), null);
    } finally {
      fs.rmSync(tmp, { recursive: true });
    }
  });
});
