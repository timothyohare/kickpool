import { NextResponse } from 'next/server';
import { fetchMatchById } from '@/lib/api/espn';
import { generateMatchPulse } from '@/lib/claude/agents/match-pulse';
import type { PulseEvent } from '@/lib/claude/agents/match-pulse';

// In-memory store of prior events per match (use DynamoDB for persistence)
const eventHistory = new Map<string, PulseEvent[]>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matchId, event } = body as { matchId: string; event: PulseEvent };

    if (!matchId || !event) {
      return NextResponse.json({ error: 'matchId and event required' }, { status: 400 });
    }

    const match = await fetchMatchById(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const priorEvents = eventHistory.get(matchId) ?? [];
    const narration = await generateMatchPulse(match, event, priorEvents);

    // Append event to history
    eventHistory.set(matchId, [...priorEvents, event]);

    return NextResponse.json({ narration });
  } catch (err) {
    console.error('Match Pulse Agent error:', err);
    return NextResponse.json({ error: 'Agent failed' }, { status: 500 });
  }
}
