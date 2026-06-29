import type { SledgeCandidate } from './drama';
import { generateSledge } from '@/lib/claude/agents/sledge';
import { getSledge, setSledge } from './sledgeStore';

// Server-side cache warming: get-or-create one sledge per qualifying finished match, exactly like
// predictions. Generation (a Claude call) happens once per match — the first render after it
// finishes — then is served from the cache. Returns matchId → sledge text for `detectDrama`.
// `detectDrama` itself stays pure and never calls this.
export async function warmSledges(candidates: SledgeCandidate[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const c of candidates) {
    try {
      let s = await getSledge(c.matchId);
      if (!s) {
        s = await generateSledge(c);
        await setSledge(c.matchId, s);
      }
      out[c.matchId] = s.text;
    } catch {
      // A single sledge failing must never take down the home page — just skip it.
    }
  }
  return out;
}
