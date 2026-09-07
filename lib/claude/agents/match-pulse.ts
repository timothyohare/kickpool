import Anthropic from '@anthropic-ai/sdk';
import { llmEnabled } from '@/lib/claude/enabled';
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

// Deterministic stand-in — the default path (see lib/claude/enabled.ts) and also used for
// local dev / CI (MOCK_LLM=1). Seeded from nothing random, so the same event always narrates
// the same way. Closes the "no MOCK_LLM short-circuit" gap called out in CLAUDE.md.
function mockPulse(match: Match, event: PulseEvent, priorEvents: PulseEvent[]): PulseNarration {
  const { homeTeam: home, awayTeam: away } = match;
  const scoreLine = `${home.name} ${event.homeScore}–${event.awayScore} ${away.name}`;
  const who = event.team === away.name ? away.friendName : home.friendName;
  const min = event.minute ? `${event.minute}' ` : '';
  const headline: Record<PulseEvent['type'], string> = {
    GOAL: `⚽ ${min}GOAL for ${event.team} — ${who}'s lot. ${scoreLine}.`,
    YELLOW_CARD: `🟨 ${min}Yellow, ${event.team}. Steady on, ${who}.`,
    RED_CARD: `🟥 ${min}RED — ${event.team} to ten men. Trouble for ${who}.`,
    HALF_TIME: `⏸️ Half time: ${scoreLine}.`,
    FULL_TIME: `🏁 Full time: ${scoreLine}.`,
  };
  return {
    notification: `[MOCK] ${headline[event.type]}`.slice(0, 118),
    commentary:
      `[MOCK] ${min}${event.type.replace(/_/g, ' ').toLowerCase()} in ${scoreLine}` +
      `${event.player ? ` (${event.player})` : ''}. ${priorEvents.length} prior event` +
      `${priorEvents.length === 1 ? '' : 's'} this match. Set KICKPOOL_LLM=1 for live commentary.`,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateMatchPulse(
  match: Match,
  event: PulseEvent,
  priorEvents: PulseEvent[]
): Promise<PulseNarration> {
  if (!llmEnabled()) return mockPulse(match, event, priorEvents);

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
