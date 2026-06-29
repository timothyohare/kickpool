import Anthropic from '@anthropic-ai/sdk';
import type { SledgeCandidate } from '@/lib/data/drama';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Sledge {
  matchId: string;
  text: string;
  generatedAt: string;
}

const MAX_LEN = 140;
// Minimal taste guardrail — if Claude returns something off, fall back to a safe canned line.
const BLOCKLIST = [/\bf+u+c+k/i, /\bs+h+i+t/i, /\bc+u+n+t/i, /\bb+i+t+c+h/i, /\bn+i+g+/i, /\bretard/i];

/** Keep only friendly, in-bounds output; otherwise use the safe fallback line. */
export function sanitizeSledge(text: string, fallback: string): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t || t.length > MAX_LEN || BLOCKLIST.some((re) => re.test(t))) return fallback;
  return t;
}

function safeFallback(c: SledgeCandidate): string {
  return c.loserEliminated
    ? `${c.winnerFriend}'s ${c.winnerName} sent ${c.loserFriend} packing. Gallant in defeat.`
    : `${c.winnerFriend}'s ${c.winnerName} got the better of ${c.loserFriend}'s ${c.loserName}.`;
}

// Deterministic stand-in for local dev / CI (MOCK_LLM=1). Seeded from the match id so the same
// game always yields the same line, keeping tests reproducible.
function mockSledge(c: SledgeCandidate): string {
  const pool = c.loserEliminated
    ? [
        `[MOCK] That's all she wrote, ${c.loserFriend} — ${c.winnerFriend}'s ${c.winnerName} sent you home. Proud campaign though.`,
        `[MOCK] ${c.loserFriend} is OUT. ${c.winnerName} did the business for ${c.winnerFriend}. Onto the cricket, mate.`,
      ]
    : [
        `[MOCK] ${c.loserFriend}'s ${c.loserName} had no answer for ${c.winnerFriend}'s ${c.winnerName}. Back to the drawing board.`,
        `[MOCK] ${c.winnerFriend} bags the bragging rights — ${c.winnerName} ${c.winnerScore}–${c.loserScore} over ${c.loserFriend}'s ${c.loserName}.`,
      ];
  const seed = [...c.matchId].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return pool[seed % pool.length];
}

async function callClaude(c: SledgeCandidate): Promise<string> {
  const prompt = `You are the group-chat wit for 8 Australian mates running a World Cup 2026 sweepstake.
Write ONE short, friendly sledge (max 20 words) ribbing the LOSING mate about this result. Warm banter between friends, never mean or offensive. Mention the friends by name. Return ONLY the line, no quotes, no preamble.

Result: ${c.winnerFriend}'s ${c.winnerName} beat ${c.loserFriend}'s ${c.loserName} ${c.winnerScore}–${c.loserScore}.${
    c.loserEliminated ? ` This knocked ${c.loserFriend}'s last team out of the tournament.` : ''
}`;

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 120,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content[0]?.type === 'text' ? res.content[0].text : '';
}

export async function generateSledge(c: SledgeCandidate): Promise<Sledge> {
  const fallback = safeFallback(c);
  let raw: string;
  try {
    raw = process.env.MOCK_LLM === '1' ? mockSledge(c) : await callClaude(c);
  } catch {
    raw = '';
  }
  return { matchId: c.matchId, text: sanitizeSledge(raw, fallback), generatedAt: new Date().toISOString() };
}
