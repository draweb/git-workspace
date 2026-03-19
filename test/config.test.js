'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

function withTempConfig(fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-config-test-'));
  const originalHomedir = os.homedir;
  os.homedir = () => tmpDir;
  delete require.cache[require.resolve('../src/constants')];
  delete require.cache[require.resolve('../src/config')];
  try {
    return fn(tmpDir);
  } finally {
    os.homedir = originalHomedir;
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    delete require.cache[require.resolve('../src/constants')];
    delete require.cache[require.resolve('../src/config')];
  }
}

describe('config (with temp dir)', () => {
  it('getWorkspaces returns empty when no config', () => {
    withTempConfig(() => {
      const config = require('../src/config');
      const workspaces = config.getWorkspaces();
      assert.strictEqual(typeof workspaces, 'object');
      assert.strictEqual(Object.keys(workspaces).length, 0);
    });
  });

  it('addWorkspace and getWorkspace', () => {
    withTempConfig(() => {
      const config = require('../src/config');
      config.addWorkspace('testws', {
        name: 'Test User',
        email: 'test@example.com',
        identityFile: '/tmp/.ssh/id_ed25519_test'
      });
      const ws = config.getWorkspace('testws');
      assert.ok(ws);
      assert.strictEqual(ws.name, 'Test User');
      assert.strictEqual(ws.email, 'test@example.com');
      assert.strictEqual(ws.identityFile, '/tmp/.ssh/id_ed25519_test');
      const all = config.getWorkspaces();
      assert.strictEqual(Object.keys(all).length, 1);
    });
  });

  it('removeWorkspace', () => {
    withTempConfig(() => {
      const config = require('../src/config');
      config.addWorkspace('toRemove', { name: 'X', email: 'x@x.com', identityFile: '/x' });
      assert.ok(config.getWorkspace('toRemove'));
      const removed = config.removeWorkspace('toRemove');
      assert.strictEqual(removed, true);
      assert.strictEqual(config.getWorkspace('toRemove'), null);
      assert.strictEqual(config.removeWorkspace('nonexistent'), false);
    });
  });

  it('loadRaw validates workspace shape and drops invalid', () => {
    withTempConfig(() => {
      const config = require('../src/config');
      config.ensureConfigDir();
      fs.writeFileSync(config.getConfigPath(), JSON.stringify({
        workspaces: {
          valid: { name: 'A', email: 'a@a.com', identityFile: '/a' },
          invalid: { name: 'B' },
          invalid2: null
        }
      }));
      delete require.cache[require.resolve('../src/config')];
      const config2 = require('../src/config');
      const raw = config2.loadRaw();
      assert.ok(raw.workspaces.valid);
      assert.strictEqual(raw.workspaces.invalid, undefined);
      assert.strictEqual(raw.workspaces.invalid2, undefined);
    });
  });
});
