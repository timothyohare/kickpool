import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import LiveRefresh from '@/components/ui/LiveRefresh';

// Controllable router.refresh spy (hoisted so the vi.mock factory can close over it).
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('LiveRefresh', () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders nothing and never refreshes when not live', () => {
    const { container } = render(<LiveRefresh isLive={false} />);
    expect(container).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(120_000));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('shows the live banner with the interval when live', () => {
    render(<LiveRefresh isLive intervalSeconds={30} />);
    expect(screen.getByText(/auto-updates every 30s/i)).toBeInTheDocument();
  });

  it('refreshes once per interval tick', () => {
    render(<LiveRefresh isLive intervalSeconds={30} />);
    expect(refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(30_000));
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(30_000));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('honours a custom interval', () => {
    render(<LiveRefresh isLive intervalSeconds={10} />);
    act(() => vi.advanceTimersByTime(9_000));
    expect(refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1_000));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('clears its timer on unmount (no refresh after teardown)', () => {
    const { unmount } = render(<LiveRefresh isLive intervalSeconds={30} />);
    unmount();
    act(() => vi.advanceTimersByTime(120_000));
    expect(refresh).not.toHaveBeenCalled();
  });
});
