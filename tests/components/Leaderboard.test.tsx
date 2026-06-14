import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import { PRIZE_1, PRIZE_2 } from '@/lib/data/scoring';
import { friendScore, countryEntry } from '../helpers/factories';

const scores = [
  friendScore({ friendId: 'dan', points: 9, countries: [countryEntry('MEX', { points: 3, alive: true })] }),
  friendScore({ friendId: 'tim', points: 6, countries: [countryEntry('KOR', { points: 0, alive: false })] }),
  friendScore({ friendId: 'ben', points: 1, countries: [countryEntry('AUS', { points: 1, alive: true })] }),
];

describe('Leaderboard', () => {
  it('renders the prize banner with first/second place amounts', () => {
    render(<Leaderboard scores={scores} />);
    expect(screen.getByText('Prize Pool')).toBeInTheDocument();
    expect(screen.getByText(`$${PRIZE_1}`)).toBeInTheDocument();
    expect(screen.getByText(`$${PRIZE_2}`)).toBeInTheDocument();
  });

  it('lists every friend with their points', () => {
    render(<Leaderboard scores={scores} />);
    expect(screen.getByText('Dan')).toBeInTheDocument();
    expect(screen.getByText('Tim')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('decorates the leader with a medal and "Leading" badge', () => {
    render(<Leaderboard scores={scores} />);
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('Leading')).toBeInTheDocument();
  });

  it("renders each friend's country flags", () => {
    render(<Leaderboard scores={scores} />);
    expect(screen.getByAltText('MEX')).toBeInTheDocument();
    expect(screen.getByAltText('KOR')).toBeInTheDocument();
    expect(screen.getByAltText('AUS')).toBeInTheDocument();
  });
});
