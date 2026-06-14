import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PredictionTrigger from '@/components/predictions/PredictionTrigger';
import { prediction } from '../helpers/factories';

const MATCH_ID = '760415';

function renderTrigger(props: Partial<React.ComponentProps<typeof PredictionTrigger>> = {}) {
  return render(
    <PredictionTrigger matchId={MATCH_ID} homeTeam="MEX" awayTeam="RSA" {...props} />,
  );
}

describe('PredictionTrigger', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the call-to-action button when there is no prediction', () => {
    renderTrigger();
    expect(screen.getByRole('button', { name: /Get AI Prediction/i })).toBeInTheDocument();
  });

  it('renders an initial prediction immediately (no fetch)', () => {
    renderTrigger({ initialPrediction: prediction() });
    // home 60 > away 25 > draw 15 → home win summary
    expect(screen.getByText(/MEX win \(60%\)/)).toBeInTheDocument();
    expect(screen.getByText(/2[–-]1/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Get AI Prediction/i })).not.toBeInTheDocument();
  });

  it('fetches and renders a prediction on click', async () => {
    const p = prediction({ narrative: 'Mexico look sharp.' });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ prediction: p }) } as Response);
    const user = userEvent.setup();

    renderTrigger();
    await user.click(screen.getByRole('button', { name: /Get AI Prediction/i }));

    expect(fetchSpy).toHaveBeenCalledWith('/api/predict', expect.objectContaining({ method: 'POST' }));
    expect(await screen.findByText(/MEX win \(60%\)/)).toBeInTheDocument();
    // Auto-expands on fetch, showing narrative + key factors.
    expect(screen.getByText('Mexico look sharp.')).toBeInTheDocument();
    expect(screen.getByText('squad depth')).toBeInTheDocument();
  });

  it('shows a spinner label while the request is in flight', async () => {
    let resolveFetch!: (v: unknown) => void;
    const pending = new Promise((r) => { resolveFetch = r; });
    vi.spyOn(globalThis, 'fetch').mockReturnValue(pending as Promise<Response>);
    const user = userEvent.setup();

    renderTrigger();
    await user.click(screen.getByRole('button', { name: /Get AI Prediction/i }));

    expect(screen.getByText(/Analysing/i)).toBeInTheDocument();

    resolveFetch({ ok: true, json: async () => ({ prediction: prediction() }) });
    expect(await screen.findByText(/MEX win \(60%\)/)).toBeInTheDocument();
  });

  it('surfaces an error when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      { ok: false, json: async () => ({ error: 'rate limited' }) } as Response,
    );
    const user = userEvent.setup();

    renderTrigger();
    await user.click(screen.getByRole('button', { name: /Get AI Prediction/i }));

    expect(await screen.findByText('rate limited')).toBeInTheDocument();
  });

  it('hydrates a fresh prediction from localStorage on mount', async () => {
    localStorage.setItem(
      `kp_pred_${MATCH_ID}`,
      JSON.stringify({ prediction: prediction(), at: Date.now() }),
    );
    renderTrigger();
    expect(await screen.findByText(/MEX win \(60%\)/)).toBeInTheDocument();
  });
});
