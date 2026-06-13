import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { predictionKey } from '@/lib/cache/keys';
import { match } from './helpers/match';
import { generatePrediction } from '@/lib/claude/predict';
import type { Prediction } from '@/types';

describe('predictionKey', () => {
  it('builds the single-table PK/SK for a match', () => {
    expect(predictionKey('760415')).toEqual({ pk: 'MATCH#760415', sk: 'PREDICTION' });
  });
});

// The in-memory fallback path of the prediction store (used when DynamoDB is not
// configured). We force that mode by clearing the env vars BEFORE importing the
// module, since dynamoEnabled is resolved at import time. The DynamoDB-backed
// path is exercised separately by `npm run verify:persistence`.
describe('predictionStore (in-memory fallback)', () => {
  let store: typeof import('@/lib/data/predictionStore');
  let pred: Prediction;

  // Snapshot every env var we mutate so it is restored verbatim afterwards
  // (assigning `undefined` would write the string "undefined", and leaving these
  // changed would leak into other test files sharing the worker process).
  const ENV_KEYS = ['DYNAMODB_ENDPOINT', 'AWS_LAMBDA_FUNCTION_NAME', 'MOCK_LLM'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(async () => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    delete process.env.DYNAMODB_ENDPOINT;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    vi.resetModules();
    store = await import('@/lib/data/predictionStore');
    process.env.MOCK_LLM = '1';
    pred = await generatePrediction(match({ id: '760415', home: 'MEX', away: 'RSA' }));
  });

  afterEach(() => {
    vi.useRealTimers();
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('round-trips a prediction through set → get', async () => {
    await store.setPrediction('760415', pred);
    expect(await store.getPrediction('760415')).toEqual(pred);
  });

  it('returns null for an unknown match', async () => {
    expect(await store.getPrediction('missing')).toBeNull();
  });

  it('exposes all fresh predictions keyed by match id', async () => {
    await store.setPrediction('760415', pred);
    const all = await store.getAllPredictions();
    expect(all['760415']).toEqual(pred);
  });

  it('treats entries older than the 24h TTL as stale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T00:00:00Z'));
    await store.setPrediction('760415', pred);
    expect(await store.getPrediction('760415')).toEqual(pred); // fresh now

    vi.setSystemTime(new Date('2026-06-12T00:00:01Z')); // 24h + 1s later
    expect(await store.getPrediction('760415')).toBeNull(); // expired
    expect(await store.getAllPredictions()).toEqual({}); // dropped from the bulk view
  });
});
