// DynamoDB key builders (single-table-style PK/SK per SPEC §4.2).
export const predictionKey = (matchId: string) => ({
  pk: `MATCH#${matchId}`,
  sk: 'PREDICTION',
});

// Post-game sledge, cached alongside the prediction under the same match partition.
export const sledgeKey = (matchId: string) => ({
  pk: `MATCH#${matchId}`,
  sk: 'SLEDGE',
});
