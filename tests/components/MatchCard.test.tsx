import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MatchCard from '@/components/matches/MatchCard';
import { final, match } from '../helpers/match';

describe('MatchCard', () => {
  it('renders a finished match with score, FT marker, owners and venue', () => {
    const m = final('MEX', 2, 'RSA', 0);
    m.group = 'A';
    const { container } = render(<MatchCard match={m} />);

    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(screen.getByText('FT')).toBeInTheDocument();
    expect(screen.getByText('MEX')).toBeInTheDocument();
    expect(screen.getByText('RSA')).toBeInTheDocument();
    // Friend owners via FriendBadge.
    expect(screen.getByText('Dan')).toBeInTheDocument();
    expect(screen.getByText('Boris')).toBeInTheDocument();
    // Scoreline (home / away split by a ':' span, so assert on combined text).
    expect(container.textContent).toContain('2:0');
    expect(screen.getByText('Test Stadium')).toBeInTheDocument();
  });

  it('links to the match detail page', () => {
    const m = final('MEX', 2, 'RSA', 0);
    render(<MatchCard match={m} />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      `/fixtures/${m.id}`,
    );
  });

  it('shows the live minute and score for an in-progress match', () => {
    const m = match({ home: 'MEX', away: 'RSA', status: 'STATUS_IN_PROGRESS', homeScore: 1, awayScore: 0 });
    m.minute = "67'";
    const { container } = render(<MatchCard match={m} />);

    expect(screen.getByText("67'")).toBeInTheDocument();
    expect(container.textContent).toContain('1:0');
    expect(screen.queryByText('FT')).not.toBeInTheDocument();
  });

  it('shows kickoff time and "vs" for a scheduled match (no score)', () => {
    const m = match({ home: 'MEX', away: 'RSA', status: 'STATUS_SCHEDULED' });
    render(<MatchCard match={m} />);

    expect(screen.getByText('vs')).toBeInTheDocument();
    // utcDate 2026-06-11T19:00Z → Fri 12 Jun, 5:00 AM AEST
    expect(screen.getByText(/Fri 12 Jun/)).toBeInTheDocument();
    expect(screen.queryByText('FT')).not.toBeInTheDocument();
  });
});
