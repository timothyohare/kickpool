// Monte-Carlo tournament odds, consumed from the sibling FifaWorldCupMonteCarloSim project.
// Its GitHub Action commits history/latest.json daily; we fetch that committed file (no sim code
// runs here) and join on team abbreviation. Odds are purely additive on the bracket — every
// failure path returns null so the bracket renders exactly as it would without odds.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OddsSnapshot, TeamOdds } from '@/types';
import { normAbbr } from '@/lib/data/friends';

const SOURCE_URL =
  process.env.ODDS_SOURCE_URL ??
  'https://raw.githubusercontent.com/timothyohare/FifaWorldCupMonteCarloSim/main/history/latest.json';

// The sim conditions on group standings and re-simulates the bracket from the actual qualifiers,
// but does not yet condition on knockout results already played — so once knockouts are underway
// the numbers drift. Past this age we hide them rather than show misleading stale odds.
const MAX_AGE_MS = Number(process.env.ODDS_MAX_AGE_DAYS ?? 2) * 24 * 60 * 60 * 1000;

interface RawTeam {
  team?: string;
  champion?: number;
  runnerUp?: number;
  reachFinal?: number;
  reachSemi?: number;
  escapeGroup?: number;
}
interface RawSnapshot {
  generatedAt?: string;
  sims?: number;
  teams?: RawTeam[];
}

/** Pure parse/normalize — exported for tests. `fresh` forces stale=false (committed fixtures). */
export function parseOddsSnapshot(raw: RawSnapshot, fresh = false, now = Date.now()): OddsSnapshot | null {
  if (!raw || !Array.isArray(raw.teams) || raw.teams.length === 0) return null;

  const generatedAt = raw.generatedAt ?? '';
  const ageMs = generatedAt ? now - new Date(generatedAt).getTime() : Infinity;
  const stale = !fresh && ageMs > MAX_AGE_MS;

  const byAbbr: Record<string, TeamOdds> = {};
  for (const t of raw.teams) {
    if (!t.team) continue;
    const abbr = normAbbr(t.team.toUpperCase());
    byAbbr[abbr] = {
      abbr,
      champion: t.champion ?? 0,
      runnerUp: t.runnerUp ?? 0,
      reachFinal: t.reachFinal ?? 0,
      reachSemi: t.reachSemi ?? 0,
      escapeGroup: t.escapeGroup ?? 0,
    };
  }
  if (Object.keys(byAbbr).length === 0) return null;
  return { generatedAt, sims: raw.sims ?? 0, stale, byAbbr };
}

export async function fetchOdds(): Promise<OddsSnapshot | null> {
  try {
    if (process.env.USE_FIXTURES === '1') {
      // Deterministic offline odds for dev/CI/perf; treated as fresh so the demo always renders them.
      const file = join(process.cwd(), 'fixtures', 'odds', 'latest.json');
      return parseOddsSnapshot(JSON.parse(readFileSync(file, 'utf8')) as RawSnapshot, true);
    }
    const res = await fetch(SOURCE_URL, { next: { revalidate: 3600 } } as RequestInit);
    if (!res.ok) return null;
    return parseOddsSnapshot((await res.json()) as RawSnapshot);
  } catch {
    return null; // never break the bracket on an odds failure
  }
}
