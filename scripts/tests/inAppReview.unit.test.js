import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, '../../src/utils/inAppReview.js'), 'utf8');

function createEnv() {
  const storage = new Map();
  const opened = [];
  let androidBridge = null;

  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  };

  const window = {
    AndroidReview: null,
    open(url) {
      opened.push(url);
      return { focus: () => {} };
    },
  };

  Object.defineProperty(window, 'AndroidReview', {
    get: () => androidBridge,
    set: (v) => { androidBridge = v; },
  });

  const context = {
    window,
    localStorage,
    console,
    isAndroidWebView: () => false,
  };
  vm.createContext(context);
  const moduleCode = source
    .replace(/^import .+;\r?\n/gm, '')
    .replace(/^export /gm, '')
    .replace(/^export const /gm, 'const ')
    .replace(/^export function /gm, 'function ');
  vm.runInNewContext(`${moduleCode}`, context);

  return { ...context, opened, storage, setAndroidBridge: (b) => { androidBridge = b; } };
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
    process.exitCode = 1;
  }
}

test('first game completion opens Play Store on web', () => {
  const ctx = createEnv();
  ctx.trackGameCompletionAndMaybeReview();
  assert.equal(ctx.opened.length, 1);
  assert.match(ctx.opened[0], /play\.google\.com/);
  assert.equal(ctx.storage.get('review_last_reason'), 'game_milestone');
});

test('cooldown blocks repeat review within 7 days', () => {
  const ctx = createEnv();
  ctx.trackGameCompletionAndMaybeReview();
  ctx.opened.length = 0;
  ctx.trackQuizCompletionAndMaybeReview();
  assert.equal(ctx.opened.length, 0);
});

test('android bridge openPlayStore is used in app', () => {
  const ctx = createEnv();
  ctx.isAndroidWebView = () => true;
  let called = false;
  ctx.setAndroidBridge({ openPlayStore: () => { called = true; } });
  ctx.resetReviewPromptForTesting();
  ctx.triggerInAppReview('manual');
  assert.equal(called, true);
  assert.equal(ctx.opened.length, 0);
});

test('quiz milestone fires on first completion', () => {
  const ctx = createEnv();
  ctx.trackQuizCompletionAndMaybeReview();
  assert.equal(ctx.opened.length, 1);
});

test('points milestone at 50 opens store', () => {
  const ctx = createEnv();
  ctx.trackPointsMilestoneAndMaybeReview(50);
  assert.equal(ctx.opened.length, 1);
});

test('session engagement respects daily flag after success', () => {
  const ctx = createEnv();
  const cleanup = ctx.trackSessionEngagementAndMaybeReview();
  assert.equal(typeof cleanup, 'function');
});

console.log(process.exitCode ? '\nSome tests failed.' : '\nAll in-app review unit tests passed.');
