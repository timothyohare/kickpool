/**
 * Kill switch for real Anthropic calls.
 *
 * The 2026 World Cup is over and every LLM feature in this repo (match
 * predictions, post-game sledges, live match-pulse) has a deterministic,
 * free stand-in. Live inference is therefore OFF by default and only happens
 * when it is explicitly re-enabled with `KICKPOOL_LLM=1`.
 *
 * `MOCK_LLM=1` (local dev / CI / fixtures / Playwright) also forces the
 * deterministic path, and wins over `KICKPOOL_LLM`.
 *
 * See CLAUDE.md § "LLM inference (disabled by default)".
 */
export function llmEnabled(): boolean {
  if (process.env.MOCK_LLM === '1') return false;
  return process.env.KICKPOOL_LLM === '1';
}
