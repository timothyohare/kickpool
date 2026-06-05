import Image from 'next/image';
import type { GroupStanding } from '@/types';
import FriendBadge from '@/components/ui/FriendBadge';

interface Props {
  standing: GroupStanding;
}

export default function GroupTable({ standing }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-900 px-4 py-2.5">
        <h3 className="text-white font-bold text-sm tracking-wide">GROUP {standing.group}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="text-left px-3 py-2 w-6">#</th>
              <th className="text-left px-3 py-2">Team</th>
              <th className="text-center px-2 py-2 w-8">P</th>
              <th className="text-center px-2 py-2 w-8">W</th>
              <th className="text-center px-2 py-2 w-8">D</th>
              <th className="text-center px-2 py-2 w-8">L</th>
              <th className="text-center px-2 py-2 w-10">GD</th>
              <th className="text-center px-2 py-2 w-10 font-bold text-gray-700">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standing.table.map((row, i) => (
              <tr
                key={row.team.abbr}
                className={`border-t border-gray-100 ${i < 2 ? 'bg-green-50' : ''}`}
              >
                <td className="px-3 py-2.5 text-gray-400 text-xs font-medium">{row.position}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Image
                      src={row.team.logo}
                      alt={row.team.name}
                      width={24}
                      height={24}
                      className="rounded-full border border-gray-100"
                      unoptimized
                    />
                    <span className="font-medium text-gray-900 text-sm">{row.team.name}</span>
                    <FriendBadge name={row.team.friendName} colour={row.team.friendColour} />
                  </div>
                </td>
                <td className="text-center px-2 py-2.5 text-gray-600">{row.played}</td>
                <td className="text-center px-2 py-2.5 text-gray-600">{row.won}</td>
                <td className="text-center px-2 py-2.5 text-gray-600">{row.drawn}</td>
                <td className="text-center px-2 py-2.5 text-gray-600">{row.lost}</td>
                <td className="text-center px-2 py-2.5 text-gray-600">
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
                <td className="text-center px-2 py-2.5 font-bold text-gray-900">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300 mr-1 align-middle" />
          Top 2 advance
        </span>
      </div>
    </div>
  );
}
