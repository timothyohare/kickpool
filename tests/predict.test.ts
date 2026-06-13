import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generatePrediction } from '@/lib/claude/predict';
import { match } from './helpers/match';

// MOCK_LLM=1 routes to the deterministic golden prediction — no API key,
// no network, fully reproducible.
const prev = process.env.MOCK_LLM;
beforeAll(() => { process.env.MOCK_LLM = '1'; });
afterAll(() => {
  // Restore precisely: assigning `undefined` would write the string "undefined".
  if (prev === undefined) delete process.env.MOCK_LLM;
  else process.env.MOCK_LLM = prev;
});

const fixtureMatch = match({ id: '760415', home: 'MEX', away: 'RSA' });

describe('generatePrediction (mock)', () => {
  it('returns probabilities that sum to 100', async () => {
    const p = await generatePrediction(fixtureMatch);
    expect(p.homeWinProbability + p.drawProbability + p.awayWinProbability).toBe(100);
  });

  it('is deterministic for the same match', async () => {
    const a = await generatePrediction(fixtureMatch);
    const b = await generatePrediction(fixtureMatch);
    expect(a.homeWinProbability).toBe(b.homeWinProbability);
    expect(a.predictedScore).toEqual(b.predictedScore);
  });

  it('echoes the match id', async () => {
    const p = await generatePrediction(fixtureMatch);
    expect(p.matchId).toBe('760415');
  });

  it('produces in-range probabilities and a non-empty narrative', async () => {
    const p = await generatePrediction(fixtureMatch);
    for (const v of [p.homeWinProbability, p.drawProbability, p.awayWinProbability]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    expect(p.narrative.length).toBeGreaterThan(0);
    expect(p.keyFactors.length).toBeGreaterThan(0);
  });

  it('classifies confidence consistently with the home probability', async () => {
    const p = await generatePrediction(fixtureMatch);
    const expected = p.homeWinProbability > 60 ? 'high' : p.homeWinProbability > 45 ? 'medium' : 'low';
    expect(p.confidence).toBe(expected);
  });

  it('keeps probabilities summing to 100 for a different matchup too', async () => {
    const other = match({ id: '999', home: 'BRA', away: 'ENG' });
    const p = await generatePrediction(other);
    expect(p.homeWinProbability + p.drawProbability + p.awayWinProbability).toBe(100);
    expect(p.predictedScore.home).toBeGreaterThanOrEqual(0);
    expect(p.predictedScore.away).toBeGreaterThanOrEqual(0);
  });
});
