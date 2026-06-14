import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import GroupTable from '@/components/groups/GroupTable';
import { groupStanding, standingRow } from '../helpers/factories';

const standing = groupStanding('A', [
  standingRow('MEX', { position: 1, played: 1, won: 1, goalsFor: 2, goalsAgainst: 0, points: 3 }),
  standingRow('KOR', { position: 2, played: 1, won: 1, goalsFor: 2, goalsAgainst: 1, points: 3 }),
  standingRow('CZE', { position: 3, played: 1, lost: 1, goalsFor: 1, goalsAgainst: 2, points: 0 }),
  standingRow('RSA', { position: 4, played: 1, lost: 1, goalsFor: 0, goalsAgainst: 2, points: 0 }),
]);

describe('GroupTable', () => {
  it('renders the group header and column headers', () => {
    render(<GroupTable standing={standing} />);
    expect(screen.getByText('GROUP A')).toBeInTheDocument();
    for (const col of ['P', 'W', 'D', 'L', 'GD', 'Pts']) {
      expect(screen.getByRole('columnheader', { name: col })).toBeInTheDocument();
    }
    expect(screen.getByText('Top 2 advance')).toBeInTheDocument();
  });

  it('renders a row per team in position order', () => {
    render(<GroupTable standing={standing} />);
    const rows = screen.getAllByRole('row').slice(1); // drop header row
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText('MEX')).toBeInTheDocument();
    expect(within(rows[3]).getByText('RSA')).toBeInTheDocument();
  });

  it('formats goal difference with an explicit + for positive values', () => {
    render(<GroupTable standing={standing} />);
    const mexRow = screen.getAllByRole('row')[1];
    expect(within(mexRow).getByText('+2')).toBeInTheDocument();
    const czeRow = screen.getAllByRole('row')[3];
    expect(within(czeRow).getByText('-1')).toBeInTheDocument();
  });

  it('shows each team owner and points', () => {
    render(<GroupTable standing={standing} />);
    const mexRow = screen.getAllByRole('row')[1];
    expect(within(mexRow).getByText('Dan')).toBeInTheDocument(); // MEX → Dan
    expect(within(mexRow).getByText('3')).toBeInTheDocument();
  });
});
