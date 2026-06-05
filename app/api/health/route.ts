import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? `set (${process.env.ANTHROPIC_API_KEY.slice(0, 10)}...)` : 'MISSING',
      THE_ODDS_API_KEY: process.env.THE_ODDS_API_KEY ? 'set' : 'missing',
      TAVILY_API_KEY: process.env.TAVILY_API_KEY ? 'set' : 'missing',
    },
  });
}
