import Anthropic from '@anthropic-ai/sdk';
import type { Match } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface PulseEvent {
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'HALF_TIME' | 'FULL_TIME';
  team: string;
  player?: string;
  minute?: string;
  homeScore: number;
  awayScore: number;
}

export interface PulseNarration {
  notification: string;  // < 120 chars for push
  commentary: string;    // 2-3 sentences
  generatedAt: string;
}

function stripMarkdown(text: string): string {
  return text.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```$/m, '').trim();
}

export async function generateMatchPulse(
  match: Match,
  event: PulseEvent,
  priorEvents: PulseEvent[]
): Promise<PulseNarration> {
  const context = priorEvents.length
    ? `Prior events this match: ${priorEvents.map(e => `${e.minute}' ${e.type} (${e.team})`).join(', ')}`
    : 'This is the first event of the match.';

  const prompt = `You are a witty football commentator for a group of 8 Australian mates watching the 2026 World Cup. Your tone is warm, funny, and group-chat-ready — not a TV presenter.

Match: ${match.homeTeam.name} (${match.homeTeam.friendName}) vs ${match.awayTeam.name} (${match.awayTeam.friendName})
Current score: ${match.homeTeam.name} ${event.homeScore}–${event.awayScore} ${match.awayTeam.name}
${context}

Event: ${event.type}${event.player ? ` — ${event.player}` : ''}${event.minute ? ` (${event.minute}')` : ''}${event.team ? ` for ${event.team}` : ''}

Write ONLY valid JSON (no markdown):
{
  "notification": "<under 120 chars, punchy, include emoji, mention the friend's name whose country scored/was affected>",
  "commentary": "<2-3 sentences of colour commentary. Reference the friend names. Be witty but fair. Group chat energy.>"
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const parsed = JSON.parse(stripMarkdown(raw));

  return {
    notification: parsed.notification ?? '',
    commentary: parsed.commentary ?? '',
    generatedAt: new Date().toISOString(),
  };
}
