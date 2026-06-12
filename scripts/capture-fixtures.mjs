// Capture golden ESPN fixtures for deterministic, offline local runs (Plan 03).
// Run manually to refresh: `node scripts/capture-fixtures.mjs`
// Trims the scoreboard to a realistic slice so the committed fixture stays small.
// The "live" variant is NOT committed — it is synthesized at load time from
// scoreboard.json (see lib/api/espn-fixtures.ts), so there is no duplicated blob.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'fixtures', 'espn');

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200';
const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';
const KEEP_EVENTS = 8; // enough to populate pages without bloating the repo

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const scoreboard = await getJson(SCOREBOARD);
  scoreboard.events = (scoreboard.events ?? []).slice(0, KEEP_EVENTS);
  await writeFile(join(OUT, 'scoreboard.json'), JSON.stringify(scoreboard, null, 2));
  console.log(`scoreboard.json: ${scoreboard.events.length} events`);

  const standings = await getJson(STANDINGS);
  await writeFile(join(OUT, 'standings.json'), JSON.stringify(standings, null, 2));
  console.log(`standings.json: ${(standings.children ?? []).length} groups`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
