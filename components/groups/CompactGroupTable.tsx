import Image from 'next/image';
import type { GroupStanding } from '@/types';

interface Props {
  standing: GroupStanding;
  highlightTop?: number;
}

export default function CompactGroupTable({ standing, highlightTop = 2 }: Props) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2 border-b border-gray-100">
        Group {standing.group}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="text-left px-3 py-1.5 font-medium w-5">#</th>
            <th className="text-left px-1 py-1.5 font-medium">Team</th>
            <th className="text-center px-1.5 py-1.5 font-medium w-6">MP</th>
            <th className="text-center px-1.5 py-1.5 font-medium w-6">W</th>
            <th className="text-center px-1.5 py-1.5 font-medium w-6">D</th>
            <th className="text-center px-1.5 py-1.5 font-medium w-6">L</th>
            <th className="text-center px-1.5 py-1.5 font-medium w-8">GD</th>
            <th className="text-center px-1.5 py-1.5 font-bold text-gray-600 w-8">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standing.table.map((row, i) => (
            <tr
              key={row.team.abbr}
              className={`border-b border-gray-50 ${i < highlightTop ? 'bg-blue-50/60' : ''}`}
            >
              <td className="px-3 py-1.5 text-gray-400 font-medium">{row.position}</td>
              <td className="px-1 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Image
                    src={row.team.logo}
                    alt={row.team.name}
                    width={16}
                    height={16}
                    className="rounded-full border border-gray-100 flex-shrink-0"
                    unoptimized
                  />
                  <span className="font-medium text-gray-900 truncate">{row.team.name}</span>
                  <span
                    className="text-[9px] font-semibold px-1 py-0.5 rounded-full text-white flex-shrink-0"
                    style={{ backgroundColor: row.team.friendColour }}
                  >
                    {row.team.friendName}
                  </span>
                </div>
              </td>
              <td className="text-center px-1.5 py-1.5 text-gray-600">{row.played}</td>
              <td className="text-center px-1.5 py-1.5 text-gray-600">{row.won}</td>
              <td className="text-center px-1.5 py-1.5 text-gray-600">{row.drawn}</td>
              <td className="text-center px-1.5 py-1.5 text-gray-600">{row.lost}</td>
              <td className="text-center px-1.5 py-1.5 text-gray-600">
                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </td>
              <td className="text-center px-1.5 py-1.5 font-bold text-gray-900">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
