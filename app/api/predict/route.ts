import { NextResponse } from 'next/server';
import { fetchMatchById } from '@/lib/api/espn';
import { generatePrediction } from '@/lib/claude/predict';

// In-memory cache per deployment (use DynamoDB for persistence across cold starts)
const predictionCache = new Map<string, { prediction: unknown; at: number }>();
const CACHE_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured — add it in Amplify > Environment variables, then redeploy' },
      { status: 503 }
    );
  }

  try {
    const { matchId } = await request.json();
    if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 });

    const cached = predictionCache.get(matchId);
    if (cached && Date.now() - cached.at < CACHE_MS) {
      return NextResponse.json({ prediction: cached.prediction, cached: true });
    }

    const match = await fetchMatchById(matchId);
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const prediction = await generatePrediction(match);
    predictionCache.set(matchId, { prediction, at: Date.now() });

    return NextResponse.json({ prediction, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Predict API error:', message);
    return NextResponse.json({ error: `Prediction failed: ${message}` }, { status: 500 });
  }
}
