import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sledgeKey } from '@/lib/cache/keys';
import type { Sledge } from '@/lib/claude/agents/sledge';

describe('sledgeKey', () => {
  it('builds the single-table PK/SK for a match, sharing the partition with the prediction', () => {
    expect(sledgeKey('760415')).toEqual({ pk: 'MATCH#760415', sk: 'SLEDGE' });
  });
});

// In-memory fallback path (mirrors tests/cache.test.ts for predictionStore): forced by clearing
// the env vars BEFORE importing the module, since dynamoEnabled is resolved at import time. The
// DynamoDB-backed path is exercised separately by `npm run verify:persistence`.
describe('sledgeStore (in-memory fallback)', () => {
  let store: typeof import('@/lib/data/sledgeStore');
  const sledge: Sledge = { matchId: '760415', text: "Boris's ship has sailed.", generatedAt: '2026-06-29T05:00:00Z' };

  const ENV_KEYS = ['DYNAMODB_ENDPOINT', 'AWS_LAMBDA_FUNCTION_NAME'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(async () => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    delete process.env.DYNAMODB_ENDPOINT;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    vi.resetModules();
    store = await import('@/lib/data/sledgeStore');
  });

  afterEach(() => {
    vi.useRealTimers();
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('round-trips a sledge through set → get', async () => {
    await store.setSledge('760415', sledge);
    expect(await store.getSledge('760415')).toEqual(sledge);
  });

  it('returns null for an unknown match', async () => {
    expect(await store.getSledge('missing')).toBeNull();
  });

  it('treats entries older than the 48h TTL as stale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T00:00:00Z'));
    await store.setSledge('760415', sledge);
    expect(await store.getSledge('760415')).toEqual(sledge); // fresh now

    vi.setSystemTime(new Date('2026-06-13T00:00:01Z')); // 48h + 1s later
    expect(await store.getSledge('760415')).toBeNull(); // expired
  });
});
