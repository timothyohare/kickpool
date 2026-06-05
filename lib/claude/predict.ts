import Anthropic from '@anthropic-ai/sdk';
import type { Match, Prediction } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function stripMarkdown(text: string): string {
  return text.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```$/m, '').trim();
}

export async function generatePrediction(match: Match): Promise<Prediction> {
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
