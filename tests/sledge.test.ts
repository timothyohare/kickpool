import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateSledge, sanitizeSledge, type Sledge } from '@/lib/claude/agents/sledge';
import type { SledgeCandidate } from '@/lib/data/drama';

const candidate: SledgeCandidate = {
  matchId: 'k1',
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
};

describe('sanitizeSledge (guardrail)', () => {
  const fallback = 'safe fallback line';
  it('keeps a clean, in-bounds line (trimmed)', () => {
    expect(sanitizeSledge('  Tough day at the office, Boris.  ', fallback)).toBe('Tough day at the office, Boris.');
  });
  it('falls back on empty output', () => {
    expect(sanitizeSledge('   ', fallback)).toBe(fallback);
  });
  it('falls back when the line is too long', () => {
    expect(sanitizeSledge('x'.repeat(200), fallback)).toBe(fallback);
  });
  it('falls back on blocklisted words', () => {
    expect(sanitizeSledge('what a shit result Boris', fallback)).toBe(fallback);
  });
});

describe('generateSledge (MOCK_LLM)', () => {
  const prev = process.env.MOCK_LLM;
  beforeAll(() => { process.env.MOCK_LLM = '1'; });
  afterAll(() => {
    if (prev === undefined) delete process.env.MOCK_LLM;
    else process.env.MOCK_LLM = prev;
  });

  it('returns a deterministic, in-bounds sledge naming the losing friend', async () => {
    const a = await generateSledge(candidate);
    const b = await generateSledge(candidate);
    expect(a.matchId).toBe('k1');
    expect(a.text).toContain('Boris');
    expect(a.text.length).toBeLessThanOrEqual(140);
    expect(a.text).toBe(b.text); // deterministic for the same match
  });

  it('mentions the knockout when the loser was eliminated', async () => {
    const a: Sledge = await generateSledge(candidate);
    expect(a.text.toLowerCase()).toMatch(/out|home|packing|sent/);
  });
});
