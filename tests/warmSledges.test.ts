import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SledgeCandidate } from '@/lib/data/drama';
import type { Sledge } from '@/lib/claude/agents/sledge';

function candidate(over: Partial<SledgeCandidate> & { matchId: string }): SledgeCandidate {
  return {
    at: '2026-06-29T05:00:00Z',
    winnerName: 'Canada',
    loserName: 'South Africa',
    winnerFriend: 'Boomer',
    loserFriend: 'Boris',
    winnerFriendId: 'boomer',
    loserFriendId: 'boris',
    winnerScore: 1,
    loserScore: 0,
    penalties: false,
    loserEliminated: true,
    ...over,
  };
}

// warmSledges get-or-creates one sledge per candidate via the real (in-memory-fallback)
// sledgeStore and the real, deterministic MOCK_LLM sledge agent — same style as
// tests/cache.test.ts, which exercises predictionStore the same way.
describe('warmSledges (in-memory fallback, MOCK_LLM)', () => {
  let warm: typeof import('@/lib/data/sledge').warmSledges;
  let store: typeof import('@/lib/data/sledgeStore');

  const ENV_KEYS = ['DYNAMODB_ENDPOINT', 'AWS_LAMBDA_FUNCTION_NAME', 'MOCK_LLM'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(async () => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    delete process.env.DYNAMODB_ENDPOINT;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    process.env.MOCK_LLM = '1';
    vi.resetModules();
    ({ warmSledges: warm } = await import('@/lib/data/sledge'));
    store = await import('@/lib/data/sledgeStore');
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('generates and caches a sledge for each candidate, keyed by matchId', async () => {
    const candidates = [
      candidate({ matchId: 'm1' }),
      candidate({ matchId: 'm2', winnerFriend: 'Dan', loserFriend: 'Tim' }),
    ];
    const out = await warm(candidates);

    expect(Object.keys(out).sort()).toEqual(['m1', 'm2']);
    expect(out.m1).toContain('Boris');
    expect(out.m2).toContain('Tim');

    // Persisted so a second warm (e.g. a re-render) doesn't need to regenerate.
    expect(await store.getSledge('m1')).not.toBeNull();
    expect(await store.getSledge('m2')).not.toBeNull();
  });

  it('reuses an already-cached sledge instead of regenerating it', async () => {
    const preseeded: Sledge = { matchId: 'm1', text: 'a hand-picked cached line', generatedAt: '2026-06-01T00:00:00Z' };
    await store.setSledge('m1', preseeded);

    const out = await warm([candidate({ matchId: 'm1' })]);

    // If this had regenerated, MOCK_LLM would produce the standard "[MOCK] ..." line instead.
    expect(out.m1).toBe(preseeded.text);
  });

  it("skips a candidate whose store lookup fails, without dropping the rest of the batch", async () => {
    vi.doMock('@/lib/data/sledgeStore', () => ({
      getSledge: vi.fn(async (matchId: string) => {
        if (matchId === 'bad') throw new Error('boom');
        return null;
      }),
      setSledge: vi.fn(async () => {}),
    }));
    vi.resetModules();
    const { warmSledges: warmWithFailingStore } = await import('@/lib/data/sledge');

    const out = await warmWithFailingStore([candidate({ matchId: 'bad' }), candidate({ matchId: 'good' })]);

    expect(out.bad).toBeUndefined();
    expect(out.good).toContain('Boris');

    vi.doUnmock('@/lib/data/sledgeStore');
  });
});
