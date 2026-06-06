import Image from 'next/image';
import type { FriendScore } from '@/types';
import { PRIZE_POOL, PRIZE_1, PRIZE_2 } from '@/lib/data/scoring';

interface Props {
  scores: FriendScore[];
}

const MEDALS = ['🥇', '🥈', '🥉'];
const PRIZES = [PRIZE_1, PRIZE_2];

export default function Leaderboard({ scores }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Prize banner */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-yellow-900 font-bold text-sm">Prize Pool</div>
          <div className="text-yellow-900 text-xs opacity-80">8 × $50 buy-in</div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-yellow-900 font-bold text-lg">${PRIZES[0]}</div>
            <div className="text-yellow-900 text-xs">1st place</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-900 font-bold text-lg">${PRIZES[1]}</div>
            <div className="text-yellow-900 text-xs">2nd place</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {scores.map((friend, idx) => (
          <div key={friend.friendId} className={`px-4 py-3 ${idx < 2 ? 'bg-yellow-50' : ''}`}>
            <div className="flex items-center gap-3">
              {/* Rank */}
              <div className="w-7 text-center text-lg">{MEDALS[idx] ?? idx + 1}</div>

              {/* Name + colour dot */}
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: friend.friendColour }}
                />
                <span className="font-semibold text-gray-900">{friend.friendName}</span>
                {idx === 0 && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full font-medium">
                    Leading
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="font-bold text-gray-900 text-lg">{friend.points}</span>
                <span className="text-xs text-gray-400 ml-1">pts</span>
              </div>
            </div>

            {/* Country flags row */}
            <div className="mt-2 ml-10 flex gap-1.5 flex-wrap">
              {friend.countries.map((c) => (
                <div key={c.abbr} className="relative" title={`${c.name} — ${c.points}pts`}>
                  <Image
                    src={c.logo}
                    alt={c.abbr}
                    width={24}
                    height={24}
                    className={`rounded-full border ${c.alive ? 'border-gray-200' : 'border-gray-100 opacity-30 grayscale'}`}
                    unoptimized
                  />
                  {c.alive && c.points > 1 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border border-white text-white text-[8px] flex items-center justify-center font-bold">
                      ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
