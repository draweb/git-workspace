'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

function withTempConfig(testFn) {
  const originalHomedir = os.homedir;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gw-rotate-'));
  os.homedir = () => tmpDir;
  const configPath = require.resolve('../src/config');
  const constantsPath = require.resolve('../src/constants');
  const rotatePath = require.resolve('../src/commands/workspace-key-rotate');
  delete require.cache[configPath];
  delete require.cache[constantsPath];
  delete require.cache[rotatePath];
  try {
    testFn(tmpDir);
  } finally {
    os.homedir = originalHomedir;
    delete require.cache[configPath];
    delete require.cache[constantsPath];
    delete require.cache[rotatePath];
  }
}

describe('workspace key rotate', () => {
  it('cancela sin cambiar workspace', async () => {
    await new Promise((resolve, reject) => {
      withTempConfig(async (tmpDir) => {
        try {
          const config = require('../src/config');
          const rotate = require('../src/commands/workspace-key-rotate');
          const keyPath = path.join(tmpDir, '.ssh', 'id_rsa_demo');
          fs.mkdirSync(path.dirname(keyPath), { recursive: true });
          fs.writeFileSync(keyPath, 'priv');
          fs.writeFileSync(keyPath + '.pub', 'ssh-rsa AAA demo');
          config.addWorkspace('demo', { name: 'A', email: 'a@a.com', identityFile: keyPath });
          const prompts = require('prompts');
          const originalInject = prompts.inject;
          prompts.inject([false]);
          const code = await rotate.run('demo', {}, { runSshKeygen: async () => 0 });
          prompts.inject = originalInject;
          assert.strictEqual(code, 1);
          assert.strictEqual(config.getWorkspace('demo').identityFile, keyPath);
          resolve();
        } catch (e) { reject(e); }
      });
    });
  });

  it('hace backup y actualiza identityFile al rotar', async () => {
    await new Promise((resolve, reject) => {
      withTempConfig(async (tmpDir) => {
        try {
          const config = require('../src/config');
          const rotate = require('../src/commands/workspace-key-rotate');
          const current = path.join(tmpDir, '.ssh', 'legacy_rsa_demo');
          fs.mkdirSync(path.dirname(current), { recursive: true });
          fs.writeFileSync(current, 'legacy-priv');
          fs.writeFileSync(current + '.pub', 'ssh-rsa AAA legacy');
          config.addWorkspace('demo', { name: 'A', email: 'a@a.com', identityFile: current });
          const prompts = require('prompts');
          const originalInject = prompts.inject;
          prompts.inject([true]);
          const code = await rotate.run('demo', {}, {
            runSshKeygen: async (args) => {
              const fileIdx = args.indexOf('-f');
              const outPath = args[fileIdx + 1];
              fs.writeFileSync(outPath, 'new-priv');
              fs.writeFileSync(outPath + '.pub', 'ssh-rsa AAA new');
              return 0;
            }
          });
          prompts.inject = originalInject;
          assert.strictEqual(code, 0);
          const expected = path.join(tmpDir, '.ssh', 'id_rsa_demo');
          assert.strictEqual(config.getWorkspace('demo').identityFile, expected);
          assert.ok(fs.existsSync(expected));
          assert.ok(fs.existsSync(expected + '.pub'));
          const backupFiles = fs.readdirSync(path.dirname(current)).filter((f) => f.includes('.bak-'));
          assert.ok(backupFiles.length >= 2);
          resolve();
        } catch (e) { reject(e); }
      });
    });
  });

  it('retorna error si ssh-keygen falla', async () => {
    await new Promise((resolve, reject) => {
      withTempConfig(async (tmpDir) => {
        try {
          const config = require('../src/config');
          const rotate = require('../src/commands/workspace-key-rotate');
          const current = path.join(tmpDir, '.ssh', 'legacy_rsa_demo2');
          fs.mkdirSync(path.dirname(current), { recursive: true });
          fs.writeFileSync(current, 'legacy-priv');
          fs.writeFileSync(current + '.pub', 'ssh-rsa AAA legacy');
          config.addWorkspace('demo2', { name: 'A', email: 'a@a.com', identityFile: current });
          const prompts = require('prompts');
          const originalInject = prompts.inject;
          prompts.inject([true]);
          const code = await rotate.run('demo2', {}, { runSshKeygen: async () => 1 });
          prompts.inject = originalInject;
          assert.strictEqual(code, 3);
          resolve();
        } catch (e) { reject(e); }
      });
    });
  });
});
