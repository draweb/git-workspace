'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert');
const { shouldUseColor, createStyle } = require('../src/term-style');

describe('term-style', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('NO_COLOR desactiva color aunque sea TTY', () => {
    process.env.NO_COLOR = '1';
    delete process.env.GW_COLOR;
    assert.strictEqual(shouldUseColor({ isTTY: true }), false);
  });

  it('GW_COLOR=0 desactiva color', () => {
    delete process.env.NO_COLOR;
    process.env.GW_COLOR = '0';
    assert.strictEqual(shouldUseColor({ isTTY: true }), false);
  });

  it('TTY sin NO_COLOR ni GW_COLOR=0 permite color', () => {
    delete process.env.NO_COLOR;
    delete process.env.GW_COLOR;
    assert.strictEqual(shouldUseColor({ isTTY: true }), true);
  });

  it('createStyle no añade códigos si no hay color', () => {
    process.env.GW_COLOR = '0';
    const st = createStyle({ isTTY: true });
    assert.strictEqual(st.bold('x'), 'x');
  });
});
