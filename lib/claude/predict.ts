import Anthropic from '@anthropic-ai/sdk';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Match, Prediction } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function stripMarkdown(text: string): string {
  return text.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```$/m, '').trim();
}

// Deterministic, free prediction for local dev / CI (MOCK_LLM=1). An optional
// fixtures/llm/<matchId>.json overrides the generated value for hand-crafted cases.
function goldenPrediction(match: Match): Prediction {
  const file = join(process.cwd(), 'fixtures', 'llm', `${match.id}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as Prediction;

  // Seed from team abbreviations so the same match always yields the same numbers.
  const seed = [...(match.homeTeam.abbr + match.awayTeam.abbr)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const home = 25 + (seed % 50);          // 25–74
  const draw = Math.round((100 - home) * 0.4);
  const away = 100 - home - draw;
  return {
    matchId: match.id,
    generatedAt: new Date().toISOString(),
    homeWinProbability: home,
    drawProbability: draw,
    awayWinProbability: away,
    predictedScore: { home: seed % 4, away: (seed >> 2) % 3 },
    narrative: `[MOCK] A deterministic stand-in prediction for ${match.homeTeam.name} vs ${match.awayTeam.name}. Set MOCK_LLM=0 to call Claude for real analysis.`,
    keyFactors: ['Mock factor: form', 'Mock factor: squad depth', 'Mock factor: home advantage'],
    confidence: home > 60 ? 'high' : home > 45 ? 'medium' : 'low',
  };
}

export async function generatePrediction(match: Match): Promise<Prediction> {
  if (process.env.MOCK_LLM === '1') return goldenPrediction(match);

  const prompt = `You are a football analyst predicting a 2026 FIFA World Cup match. Respond with ONLY valid JSON (no markdown fences).

Match: ${match.homeTeam.name} vs ${match.awayTeam.name}
Stage: ${match.stage}${match.group ? ` | Group ${match.group}` : ''}
Date (UTC): ${match.utcDate}
Venue: ${match.venue}

Owners: ${match.homeTeam.name} → ${match.homeTeam.friendName} | ${match.awayTeam.name} → ${match.awayTeam.friendName}

Respond with this exact JSON structure:
{
  "homeWinProbability": <integer 0-100>,
  "drawProbability": <integer 0-100>,
  "awayWinProbability": <integer 0-100>,
  "predictedScore": { "home": <integer>, "away": <integer> },
  "narrative": "<2-3 paragraph match analysis>",
  "keyFactors": ["<factor>", "<factor>", "<factor>"],
  "confidence": "low|medium|high"
}

Probabilities must sum to 100.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const cleaned = stripMarkdown(raw);
  const parsed = JSON.parse(cleaned);

  return {
    matchId: match.id,
    generatedAt: new Date().toISOString(),
    homeWinProbability: parsed.homeWinProbability,
    drawProbability: parsed.drawProbability,
    awayWinProbability: parsed.awayWinProbability,
    predictedScore: parsed.predictedScore,
    narrative: parsed.narrative,
    keyFactors: parsed.keyFactors,
    confidence: parsed.confidence,
  };
}
