import type { Prediction } from '@/types';
import { ddb, dynamoEnabled, TABLE } from '@/lib/cache/dynamo';
import { predictionKey } from '@/lib/cache/keys';
import { GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const CACHE_TTL = 24 * 60 * 60 * 1000;
const T = () => TABLE('predictions');

// In-memory fallback used only when DynamoDB is not configured (e.g. plain local
// dev without Docker). Dies on cold start — DynamoDB is the durable path.
interface Entry { prediction: Prediction; at: number }
const mem = new Map<string, Entry>();

function fresh(at: number): boolean {
  return Date.now() - at <= CACHE_TTL;
}

export async function getPrediction(matchId: string): Promise<Prediction | null> {
  if (!dynamoEnabled) {
    const entry = mem.get(matchId);
    return entry && fresh(entry.at) ? entry.prediction : null;
  }
  try {
    const { Item } = await ddb.send(new GetCommand({ TableName: T(), Key: predictionKey(matchId) }));
    if (!Item || !fresh(Item.at as number)) return null;
    return Item.prediction as Prediction;
  } catch (err) {
    console.warn('[predictionStore] getPrediction failed:', (err as Error).message);
    return null;
  }
}

export async function setPrediction(matchId: string, prediction: Prediction): Promise<void> {
  if (!dynamoEnabled) {
    mem.set(matchId, { prediction, at: Date.now() });
    return;
  }
  try {
    await ddb.send(new PutCommand({
      TableName: T(),
      Item: { ...predictionKey(matchId), prediction, at: Date.now(), generatedAt: prediction.generatedAt },
    }));
  } catch (err) {
    console.warn('[predictionStore] setPrediction failed:', (err as Error).message);
  }
}

export async function getAllPredictions(): Promise<Record<string, Prediction>> {
  if (!dynamoEnabled) {
    const result: Record<string, Prediction> = {};
    for (const [matchId, entry] of mem.entries()) {
      if (fresh(entry.at)) result[matchId] = entry.prediction;
    }
    return result;
  }
  try {
    // Small table (one row per match) — a Scan is fine at this scale.
    const { Items = [] } = await ddb.send(new ScanCommand({ TableName: T() }));
    const result: Record<string, Prediction> = {};
    for (const item of Items) {
      const p = item.prediction as Prediction;
      if (p && fresh(item.at as number)) result[p.matchId] = p;
    }
    return result;
  } catch (err) {
    console.warn('[predictionStore] getAllPredictions failed:', (err as Error).message);
    return {};
  }
}
