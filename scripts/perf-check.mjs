#!/usr/bin/env node
// Deterministic latency check for the SDLC harness.
//
// Boots a production build against the golden fixtures (USE_FIXTURES=1, no
// network, in-memory prediction store) and measures p50/p95 latency for the key
// routes, then compares against a committed baseline (perf-baseline.json).
//
// Why fixtures: real ESPN latency is network-bound and noisy, which drowns out
// code-caused regressions. Serving golden JSON isolates OUR cost — parse, the
// live-overlay merge, group sorting, and RSC render — so the numbers move only
// when the code does. (It deliberately does NOT capture real ESPN network time.)
//
// Soft gate: a route fails only on a *large* jump — p95 above
// max(baseline*1.5, baseline+100ms) — so it flags "a lot slower" without
// flaking on machine noise.
//
// Usage:
//   node scripts/perf-check.mjs            # measure + compare to baseline
//   node scripts/perf-check.mjs --update   # (re)write the baseline, always pass
//   node scripts/perf-check.mjs --no-build # reuse an existing .next build
//   --port <n> (default 3100)  --samples <n> (default 40)

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(ROOT, 'perf-baseline.json');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };

const UPDATE = has('--update');
const PORT = Number(val('--port', '3100'));
const SAMPLES = Number(val('--samples', '40'));
const WARMUP = 3;
const BASE = `http://localhost:${PORT}`;

// Routes that render purely from fixtures (760415 = MEX–RSA, present in the
// golden scoreboard). Mix of RSC pages and JSON API routes.
const ROUTES = [
  '/',
  '/fixtures',
  '/fixtures/760415',
  '/leaderboard',
  '/groups',
  '/api/standings',
  '/api/fixtures',
];

const ENV = {
  ...process.env,
  PORT: String(PORT),
  USE_FIXTURES: '1',
  MOCK_LLM: '1',
  ANTHROPIC_API_KEY: 'perf-mock-key',
  DYNAMODB_ENDPOINT: '', // force the in-memory prediction store — no DynamoDB
  FIXTURE_SCENARIO: '',
};

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', ...opts });
  if (r.status !== 0) { console.error(`\n✗ \`${cmd} ${cmdArgs.join(' ')}\` failed`); process.exit(1); }
}

async function waitForHealth({ timeoutMs = 90_000, abort } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const reason = abort?.();
    if (reason) throw new Error(reason);
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok && (await res.json()).ok === true) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`app did not become healthy on ${BASE} within ${timeoutMs}ms`);
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];

async function timeRoute(route) {
  const url = `${BASE}${route}`;
  for (let i = 0; i < WARMUP; i++) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${route} returned ${res.status} during warmup`);
    await res.arrayBuffer();
  }
  const samples = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t0 = performance.now();
    const res = await fetch(url);
    await res.arrayBuffer(); // include full body read
    const dt = performance.now() - t0;
    if (!res.ok) throw new Error(`${route} returned ${res.status}`);
    samples.push(dt);
  }
  samples.sort((a, b) => a - b);
  return { p50: percentile(samples, 0.5), p95: percentile(samples, 0.95) };
}

const r1 = (n) => Math.round(n * 10) / 10;
// Soft-gate budget: 50% over baseline plus a 10ms cushion for absolute machine
// noise. Matched to this app's latency scale — on fixtures the routes are single-
// to low-double-digit ms, so a flat "+100ms" floor would let a 6ms route balloon
// to 100ms undetected. This flags "a lot slower" (≈50%+) while tolerating the
// ~±10ms run-to-run jitter observed on the slower pages.
const allowedP95 = (baseP95) => baseP95 * 1.5 + 10;

async function main() {
  if (!has('--no-build')) {
    console.log('▶ building production bundle…');
    run('npm', ['run', 'build'], { stdio: ['ignore', 'ignore', 'inherit'] });
  } else if (!existsSync(join(ROOT, '.next'))) {
    console.error('✗ --no-build given but no .next build exists'); process.exit(1);
  }

  console.log(`▶ booting next start on :${PORT} (USE_FIXTURES=1)…`);
  const server = spawn('npm', ['run', 'start'], { cwd: ROOT, env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
  // Buffer server logs and only surface them if boot fails (keeps gate output clean).
  let serverLog = '';
  let serverExit = null;
  server.stdout?.on('data', (d) => { serverLog += d; });
  server.stderr?.on('data', (d) => { serverLog += d; });
  server.on('exit', (code) => { serverExit = code ?? 0; });

  let exitCode = 0;
  try {
    await waitForHealth({
      abort: () => serverExit !== null
        ? `next start exited (code ${serverExit}) before becoming healthy:\n${serverLog.trim()}`
        : null,
    });
    console.log(`▶ measuring ${ROUTES.length} routes × ${SAMPLES} samples…\n`);

    const results = {};
    for (const route of ROUTES) results[route] = await timeRoute(route);

    const baseline = !UPDATE && existsSync(BASELINE_PATH)
      ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).routes ?? {}
      : null;

    const pad = (s, n) => String(s).padEnd(n);
    console.log(`${pad('route', 20)}${pad('p50', 9)}${pad('p95', 9)}${pad('base p95', 10)}${pad('budget', 9)}status`);
    console.log('─'.repeat(72));

    const regressions = [];
    for (const route of ROUTES) {
      const { p50, p95 } = results[route];
      const base = baseline?.[route];
      let status = baseline ? '—' : 'baseline';
      if (base) {
        const budget = allowedP95(base.p95);
        if (p95 > budget) { status = '✗ SLOW'; regressions.push({ route, p95, budget, base: base.p95 }); }
        else status = '✓';
        console.log(`${pad(route, 20)}${pad(r1(p50) + 'ms', 9)}${pad(r1(p95) + 'ms', 9)}${pad(r1(base.p95) + 'ms', 10)}${pad(r1(budget) + 'ms', 9)}${status}`);
      } else {
        console.log(`${pad(route, 20)}${pad(r1(p50) + 'ms', 9)}${pad(r1(p95) + 'ms', 9)}${pad('—', 10)}${pad('—', 9)}${status}`);
      }
    }
    console.log('');

    if (UPDATE || !baseline) {
      const payload = {
        note: 'Deterministic (USE_FIXTURES=1) route latency baseline. Update with `npm run perf -- --update`.',
        capturedAt: new Date().toISOString(),
        samples: SAMPLES,
        routes: Object.fromEntries(ROUTES.map((r) => [r, { p50: r1(results[r].p50), p95: r1(results[r].p95) }])),
      };
      writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n');
      console.log(`✓ baseline written to perf-baseline.json (${UPDATE ? 'updated' : 'first run'}).`);
    } else if (regressions.length) {
      console.error(`✗ ${regressions.length} route(s) regressed beyond budget:`);
      for (const r of regressions) console.error(`  ${r.route}: p95 ${r1(r.p95)}ms > budget ${r1(r.budget)}ms (baseline ${r1(r.base)}ms)`);
      console.error('\nIf this is an intended/acceptable change, refresh the baseline: npm run perf -- --update');
      exitCode = 1;
    } else {
      console.log('✓ all routes within latency budget.');
    }
  } catch (err) {
    console.error(`✗ ${err.message}`);
    exitCode = 1;
  } finally {
    server.kill('SIGTERM');
  }
  process.exit(exitCode);
}

main();
