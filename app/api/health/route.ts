import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING',
      TAVILY_API_KEY: process.env.TAVILY_API_KEY ? 'set' : 'missing',
    },
  });
}
