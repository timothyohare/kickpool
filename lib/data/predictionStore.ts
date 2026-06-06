import type { Prediction } from '@/types';

const CACHE_TTL = 24 * 60 * 60 * 1000;

interface Entry { prediction: Prediction; at: number }
const store = new Map<string, Entry>();

export function getPrediction(matchId: string): Prediction | null {
  const entry = store.get(matchId);
  if (!entry || Date.now() - entry.at > CACHE_TTL) return null;
  return entry.prediction;
}

export function setPrediction(matchId: string, prediction: Prediction): void {
  store.set(matchId, { prediction, at: Date.now() });
}

export function getAllPredictions(): Record<string, Prediction> {
  const now = Date.now();
  const result: Record<string, Prediction> = {};
  for (const [matchId, entry] of store.entries()) {
    if (now - entry.at <= CACHE_TTL) result[matchId] = entry.prediction;
  }
  return result;
}
