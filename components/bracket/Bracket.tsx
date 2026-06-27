'use client';

import { useState } from 'react';
import type { Bracket, BracketMatch } from '@/lib/data/bracket';
import type { TournamentStage } from '@/types';
import { FRIENDS } from '@/lib/data/friends';
import BracketMatchCard from './BracketMatch';

interface Props {
  bracket: Bracket;
}

// One tab per knockout round; the last tab pairs the final with the 3rd-place play-off (as ESPN does).
const TABS: { key: TournamentStage; label: string; short: string }[] = [
  { key: 'ROUND_OF_32', label: 'Round of 32', short: 'R32' },
  { key: 'ROUND_OF_16', label: 'Round of 16', short: 'R16' },
  { key: 'QUARTER_FINAL', label: 'Quarterfinals', short: 'QF' },
  { key: 'SEMI_FINAL', label: 'Semifinals', short: 'SF' },
  { key: 'FINAL', label: '3rd-Place & Final', short: 'Final' },
];

// Left→right columns of the desktop tree; the final column stacks the final + 3rd-place play-off.
const COLUMNS: { tab: TournamentStage; stages: TournamentStage[] }[] = [
  { tab: 'ROUND_OF_32', stages: ['ROUND_OF_32'] },
  { tab: 'ROUND_OF_16', stages: ['ROUND_OF_16'] },
  { tab: 'QUARTER_FINAL', stages: ['QUARTER_FINAL'] },
  { tab: 'SEMI_FINAL', stages: ['SEMI_FINAL'] },
  { tab: 'FINAL', stages: ['FINAL', 'THIRD_PLACE'] },
];

export default function BracketView({ bracket }: Props) {
  const [activeTab, setActiveTab] = useState<TournamentStage>('ROUND_OF_32');
  const [highlightFriend, setHighlightFriend] = useState<string | null>(null);

  const matchesFor = (stage: TournamentStage): BracketMatch[] =>
    bracket.rounds.find((r) => r.stage === stage)?.matches ?? [];

  return (
    <div className="space-y-4">
      {/* Round selector — switches the focused round on phones, scrolls the tree on desktop */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border transition-colors ${
              activeTab === t.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Friend lens — highlight a friend's teams to trace who they're playing */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Highlight:</span>
        <button
          onClick={() => setHighlightFriend(null)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            !highlightFriend ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
          }`}
        >
          Everyone
        </button>
        {FRIENDS.map((f) => (
          <button
            key={f.id}
            onClick={() => setHighlightFriend(highlightFriend === f.id ? null : f.id)}
            className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
            style={{
              backgroundColor: highlightFriend === f.id ? f.colour : 'transparent',
              borderColor: f.colour,
              color: highlightFriend === f.id ? 'white' : f.colour,
            }}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Bracket: one focused round on small screens, the whole tree (scrollable) on large. */}
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max lg:min-w-0 lg:gap-6">
          {COLUMNS.map((col, colIdx) => {
            const isLast = colIdx === COLUMNS.length - 1;
            const visible = col.tab === activeTab;
            return (
              <div
                key={col.tab}
                className={`${visible ? 'flex' : 'hidden'} lg:flex flex-col flex-1 w-full lg:w-auto`}
              >
                {/* Column header (desktop only — the tab already labels it on mobile) */}
                <div className="hidden lg:block text-center text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                  {TABS.find((t) => t.key === col.tab)?.label}
                </div>

                {isLast ? (
                  <FinalColumn
                    final={matchesFor('FINAL')[0]}
                    third={matchesFor('THIRD_PLACE')[0]}
                    highlightFriend={highlightFriend}
                  />
                ) : (
                  <FeederColumn matches={matchesFor(col.stages[0])} highlightFriend={highlightFriend} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// A round whose winners feed the next column. On desktop, adjacent cards are paired and joined by a
// right-facing connector so the tree reads correctly; on mobile the cards simply stack as a list.
function FeederColumn({
  matches,
  highlightFriend,
}: {
  matches: BracketMatch[];
  highlightFriend: string | null;
}) {
  const pairs: BracketMatch[][] = [];
  for (let i = 0; i < matches.length; i += 2) pairs.push(matches.slice(i, i + 2));

  return (
    <div className="flex flex-col gap-3 lg:gap-0 lg:h-full lg:justify-around">
      {pairs.map((pair, i) => (
        <div
          key={i}
          className="relative flex flex-col gap-3 lg:gap-0 lg:flex-1 lg:justify-around lg:pr-6"
        >
          {pair.map((m) => (
            <div key={m.matchNo} className="flex lg:justify-center">
              <BracketMatchCard match={m} highlightFriendId={highlightFriend} />
            </div>
          ))}
          {/* Connector: bracket joining the pair, plus a stub into the next column (desktop only). */}
          {pair.length === 2 && (
            <>
              <span className="hidden lg:block absolute right-3 top-1/4 bottom-1/4 w-3 border-r-2 border-t-2 border-b-2 border-gray-200 rounded-r-md" />
              <span className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-3 border-t-2 border-gray-200" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function FinalColumn({
  final,
  third,
  highlightFriend,
}: {
  final?: BracketMatch;
  third?: BracketMatch;
  highlightFriend: string | null;
}) {
  return (
    <div className="flex flex-col gap-6 lg:h-full lg:justify-center">
      {final && (
        <div className="flex lg:justify-center">
          <BracketMatchCard match={final} highlightFriendId={highlightFriend} />
        </div>
      )}
      {third && (
        <div className="flex lg:justify-center">
          <BracketMatchCard match={third} highlightFriendId={highlightFriend} />
        </div>
      )}
    </div>
  );
}
