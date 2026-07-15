import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { PINION_SCOPE, scopePinionCss } from '../tools/scope-css.js';

const buildUrl = new URL('../build/', import.meta.url);

function isInsideKeyframes(rule) {
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) {
      return true;
    }
  }
  return false;
}

function fakeElement() {
  return {
    style: {},
    sheet: { insertRule() {} },
    setAttribute() {},
    removeAttribute() {},
    appendChild() {},
  };
}

test('selector scoping handles document roots and leaves keyframes intact', async () => {
  const input = `
    :root, :host, html, body { --color: blue; }
    a, button:hover { color: blue; }
    @keyframes pulse { from { opacity: 0; } 50% { opacity: .5; } to { opacity: 1; } }
  `;
  const output = await scopePinionCss(input);

  assert.match(output, /:where\(\[data-pinion-root\]\)\s*\{/);
  assert.match(output, /:where\(\[data-pinion-root\]\) a/);
  assert.match(output, /:where\(\[data-pinion-root\]\)\s+button:hover/);
  assert.match(output, /@keyframes pulse\s*\{\s*from\s*\{/);
  assert.doesNotMatch(output, /data-pinion-root[^}]*\bfrom\b/);
});

test('the generated stylesheet cannot select outside a Pinion root', () => {
  const css = fs.readFileSync(new URL('pinion.css', buildUrl), 'utf8');
  const unscoped = [];

  postcss.parse(css).walkRules(rule => {
    if (isInsideKeyframes(rule)) {
      return;
    }
    selectorParser(selectors => {
      selectors.each(selector => {
        if (!selector.toString().startsWith(PINION_SCOPE)) {
          unscoped.push(selector.toString());
        }
      });
    }).processSync(rule.selector);
  });

  assert.deepEqual(unscoped, []);
  assert.match(css, /:where\(\[data-pinion-root\]\) a\{/);
  assert.match(css, /:where\(\[data-pinion-root\]\) button/);
});

test('the browser bundle loads without a Node process shim', () => {
  const code = fs.readFileSync(new URL('pinion.js', buildUrl), 'utf8');
  const document = {
    createElement: fakeElement,
    head: { appendChild() {} },
  };
  const context = {
    console,
    document,
    navigator: { userAgent: 'Pinion bundle test' },
    performance,
    queueMicrotask,
    setTimeout,
    clearTimeout,
    addEventListener() {},
    removeEventListener() {},
  };
  context.window = context;
  context.self = context;
  context.globalThis = context;

  assert.equal(context.process, undefined);
  assert.doesNotMatch(code, /process\.env\.NODE_ENV/);
  vm.runInNewContext(code, context);
  assert.equal(typeof context.pinion.setup, 'function');
});
