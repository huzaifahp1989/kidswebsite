import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, '../../src/utils/inAppReview.js'), 'utf8');

function createEnv() {
  const storage = new Map();
  const opened = [];
  const timers = [];
  let androidBridge = null;

  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  };

  const window = {
    AndroidReview: null,
    WTN: null,
    open(url) {
      opened.push(url);
      return { focus: () => {} };
    },
    setTimeout(callback, delay) {
      const timer = { callback, delay, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      timer.cleared = true;
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

  return {
    ...context,
    opened,
    storage,
    timers,
    setNativeApp: (isNative) => { context.isAndroidWebView = () => isNative; },
    setAndroidBridge: (bridge) => { androidBridge = bridge; },
  };
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

test('automatic review is skipped in a regular browser', () => {
  const ctx = createEnv();
  assert.equal(ctx.trackGameCompletionAndMaybeReview(), false);
  assert.equal(ctx.opened.length, 0);
});

test('Android review bridge receives a contextual request first', () => {
  const ctx = createEnv();
  ctx.setNativeApp(true);
  let receivedReason = '';
  ctx.setAndroidBridge({ requestInAppReview: (reason) => { receivedReason = reason; } });
  assert.equal(ctx.trackGameCompletionAndMaybeReview(), true);
  assert.equal(receivedReason, 'kids_zone_activity_completed');
  assert.equal(ctx.opened.length, 0);
});

test('legacy Android review bridge remains supported', () => {
  const ctx = createEnv();
  let called = false;
  ctx.setNativeApp(true);
  ctx.setAndroidBridge({ requestReview: () => { called = true; } });
  assert.equal(ctx.triggerInAppReview('manual'), true);
  assert.equal(called, true);
});

test('WebToNative app-review API is used when the Android bridge is absent', () => {
  const ctx = createEnv();
  ctx.setNativeApp(true);
  let calls = 0;
  ctx.window.WTN = { isNativeApp: true, appReview: { prompt: () => { calls += 1; } } };
  assert.equal(ctx.trackQuizCompletionAndMaybeReview(), true);
  assert.equal(calls, 1);
});

test('Android review bridge takes priority over WebToNative fallback', () => {
  const ctx = createEnv();
  ctx.setNativeApp(true);
  let androidCalls = 0;
  let wtnCalls = 0;
  ctx.setAndroidBridge({ requestInAppReview: () => { androidCalls += 1; } });
  ctx.window.WTN = { isNativeApp: true, appReview: { prompt: () => { wtnCalls += 1; } } };
  assert.equal(ctx.triggerInAppReview('manual'), true);
  assert.equal(androidCalls, 1);
  assert.equal(wtnCalls, 0);
});

test('WebToNative script on a website does not show a native prompt', () => {
  const ctx = createEnv();
  ctx.window.WTN = { isNativeApp: false, appReview: { prompt: () => assert.fail('must not prompt on web') } };
  assert.equal(ctx.triggerInAppReview('manual'), false);
});

test('explicit Play Store review opens the listing on web', () => {
  const ctx = createEnv();
  assert.equal(ctx.openPlayStoreReview(), true);
  assert.equal(ctx.opened.length, 1);
  assert.match(ctx.opened[0], /play\.google\.com/);
});

test('explicit Play Store review uses the native Android bridge', () => {
  const ctx = createEnv();
  ctx.setNativeApp(true);
  let called = false;
  ctx.setAndroidBridge({ openPlayStore: () => { called = true; } });
  assert.equal(ctx.openPlayStoreReview(), true);
  assert.equal(called, true);
  assert.equal(ctx.opened.length, 0);
});

test('radio review timer is cancellable and waits ten minutes', () => {
  const ctx = createEnv();
  const cancel = ctx.trackRadioListeningAndMaybeReview();
  assert.equal(ctx.timers[0].delay, 10 * 60 * 1000);
  cancel();
  assert.equal(ctx.timers[0].cleared, true);
});

test('points do not independently trigger an app review', () => {
  const ctx = createEnv();
  assert.equal(ctx.trackPointsMilestoneAndMaybeReview(50), false);
  assert.equal(ctx.opened.length, 0);
});

test('generic session engagement returns a cleanup callback', () => {
  const ctx = createEnv();
  assert.equal(typeof ctx.trackSessionEngagementAndMaybeReview(), 'function');
});

console.log(process.exitCode ? '\nSome tests failed.' : '\nAll in-app review unit tests passed.');
