import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FriendBadge from '@/components/ui/FriendBadge';

describe('FriendBadge', () => {
  it('renders the name with the friend colour as background', () => {
    render(<FriendBadge name="Dan" colour="#00843D" />);
    const badge = screen.getByText('Dan');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ backgroundColor: '#00843D' });
  });

  it('applies larger padding for the md size', () => {
    const { rerender } = render(<FriendBadge name="Tim" colour="#1565C0" size="sm" />);
    expect(screen.getByText('Tim').className).toContain('text-xs');
    rerender(<FriendBadge name="Tim" colour="#1565C0" size="md" />);
    expect(screen.getByText('Tim').className).toContain('text-sm');
  });
});
