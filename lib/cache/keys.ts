// DynamoDB key builders (single-table-style PK/SK per SPEC §4.2).
export const predictionKey = (matchId: string) => ({
  pk: `MATCH#${matchId}`,
  sk: 'PREDICTION',
});
