// Golden-fixture loader for deterministic, offline ESPN data (Plan 03).
// Active only when USE_FIXTURES=1. The live variant is synthesized from
// scoreboard.json on the fly (FIXTURE_SCENARIO=live) so no duplicate blob is stored.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'fixtures', 'espn');
const cache = new Map<string, unknown>();

function read(file: string): unknown {
  if (!cache.has(file)) {
    cache.set(file, JSON.parse(readFileSync(join(DIR, file), 'utf8')));
  }
  // structuredClone so callers/transforms never mutate the cached copy.
  return structuredClone(cache.get(file));
}

// Force the first event to an in-progress 1–0 so the live UI can be exercised.
function makeLive(scoreboard: Record<string, unknown>): Record<string, unknown> {
  const events = (scoreboard.events ?? []) as Record<string, unknown>[];
  const comp = (events[0]?.competitions as Record<string, unknown>[] | undefined)?.[0];
  if (comp) {
    comp.status = {
      ...(comp.status as object ?? {}),
      type: { name: 'STATUS_IN_PROGRESS', state: 'in', completed: false, shortDetail: "67'", detail: "67'" },
    };
    const [home, away] = (comp.competitors ?? []) as Record<string, unknown>[];
    if (home) home.score = '1';
    if (away) away.score = '0';
  }
  return scoreboard;
}

export function loadFixture(url: string): unknown {
  if (url.includes('/standings')) return read('standings.json');
  const board = read('scoreboard.json') as Record<string, unknown>;
  return process.env.FIXTURE_SCENARIO === 'live' ? makeLive(board) : board;
}
