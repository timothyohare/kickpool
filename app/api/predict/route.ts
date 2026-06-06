import { NextResponse } from 'next/server';
import { fetchMatchById } from '@/lib/api/espn';
import { generatePrediction } from '@/lib/claude/predict';
import { getPrediction, setPrediction } from '@/lib/data/predictionStore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');
  if (!matchId) return NextResponse.json({ prediction: null });
  return NextResponse.json({ prediction: getPrediction(matchId) });
}

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

    const existing = getPrediction(matchId);
    if (existing) return NextResponse.json({ prediction: existing, cached: true });

    const match = await fetchMatchById(matchId);
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const prediction = await generatePrediction(match);
    setPrediction(matchId, prediction);

    return NextResponse.json({ prediction, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Predict API error:', message);
    return NextResponse.json({ error: `Prediction failed: ${message}` }, { status: 500 });
  }
}
