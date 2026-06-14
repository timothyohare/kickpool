import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FriendPicker from '@/components/ui/FriendPicker';
import { FRIENDS } from '@/lib/data/friends';

describe('FriendPicker', () => {
  beforeEach(() => {
    // Clear any cookie between tests.
    document.cookie = 'kickpool_me=; path=/; max-age=0';
  });

  it('renders a link for every friend', () => {
    render(<FriendPicker friends={FRIENDS} currentFriendId="tim" />);
    for (const f of FRIENDS) {
      expect(screen.getByRole('link', { name: f.name })).toBeInTheDocument();
    }
  });

  it('points each link at the my-teams route for that friend', () => {
    render(<FriendPicker friends={FRIENDS} currentFriendId="tim" />);
    expect(screen.getByRole('link', { name: 'Dan' })).toHaveAttribute(
      'href',
      '/my-teams?friend=dan',
    );
  });

  it('writes the selected friend to a cookie on click', async () => {
    const user = userEvent.setup();
    render(<FriendPicker friends={FRIENDS} currentFriendId="tim" />);

    await user.click(screen.getByRole('link', { name: 'Ben' }));

    expect(document.cookie).toContain('kickpool_me=ben');
  });

  it('highlights the current friend with their colour', () => {
    render(<FriendPicker friends={FRIENDS} currentFriendId="tim" />);
    const tim = FRIENDS.find((f) => f.id === 'tim')!;
    expect(screen.getByRole('link', { name: 'Tim' })).toHaveStyle({
      backgroundColor: tim.colour,
    });
  });
});
