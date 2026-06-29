import type { Sledge } from '@/lib/claude/agents/sledge';
import { ddb, dynamoEnabled, TABLE } from '@/lib/cache/dynamo';
import { sledgeKey } from '@/lib/cache/keys';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// Sledges share the predictions table (single-table: same MATCH# partition, sk=SLEDGE), so no
// extra table to provision. They are cheap to keep — a sledge only displays for ~24h anyway.
const CACHE_TTL = 48 * 60 * 60 * 1000;
const T = () => TABLE('predictions');

// In-memory fallback for plain local dev without DynamoDB (mirrors predictionStore).
interface Entry { sledge: Sledge; at: number }
const mem = new Map<string, Entry>();

const fresh = (at: number) => Date.now() - at <= CACHE_TTL;

export async function getSledge(matchId: string): Promise<Sledge | null> {
  if (!dynamoEnabled) {
    const e = mem.get(matchId);
    return e && fresh(e.at) ? e.sledge : null;
  }
  try {
    const { Item } = await ddb.send(new GetCommand({ TableName: T(), Key: sledgeKey(matchId) }));
    if (!Item || !fresh(Item.at as number)) return null;
    return Item.sledge as Sledge;
  } catch (err) {
    console.warn('[sledgeStore] getSledge failed:', (err as Error).message);
    return null;
  }
}

export async function setSledge(matchId: string, sledge: Sledge): Promise<void> {
  if (!dynamoEnabled) {
    mem.set(matchId, { sledge, at: Date.now() });
    return;
  }
  try {
    await ddb.send(new PutCommand({
      TableName: T(),
      Item: { ...sledgeKey(matchId), sledge, at: Date.now(), generatedAt: sledge.generatedAt },
    }));
  } catch (err) {
    console.warn('[sledgeStore] setSledge failed:', (err as Error).message);
  }
}
