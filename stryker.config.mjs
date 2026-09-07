// StrykerJS mutation testing (gate-mutation). Scoped to lib/ — the pure,
// deterministically-tested logic layer (see tests/**/*.test.ts). Excludes
// dynamo.ts (needs real/mocked AWS, no direct unit test) and match-pulse.ts
// (calls the Anthropic SDK with no MOCK_LLM short-circuit and has no test
// file yet — see docs/openapi.yaml's fuzz-scope note for the same gap), and
// annex-c.ts (vendored, auto-generated FIFA regulation lookup table — "do
// not edit by hand" — its ~4.5k literal-data mutants add no signal and were
// large enough alone to break Stryker's coverage analysis for the whole run;
// see stryker-scale-bug memory).
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const strykerConfig = {
  packageManager: 'npm',
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  mutate: [
    'lib/**/*.ts',
    '!lib/**/*.test.ts',
    '!lib/cache/dynamo.ts',
    '!lib/claude/agents/match-pulse.ts',
    '!lib/data/bracket/annex-c.ts',
  ],
  reporters: ['clear-text', 'progress', 'json'],
  jsonReporter: {
    fileName: 'reports/mutation/mutation.json',
  },
  thresholds: {
    high: 80,
    low: 60,
    break: 55,
  },
};

export default strykerConfig;
