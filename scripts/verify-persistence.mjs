// Smoke-test the local DynamoDB setup (Plan 02): compose up + bootstrap + SDK wiring.
// Usage: docker compose up -d && node scripts/bootstrap-dynamo.mjs && node scripts/verify-persistence.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const endpoint = process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000';
const table = `${process.env.DYNAMODB_TABLE_PREFIX ?? 'kickpool'}-predictions`;
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-2',
  endpoint,
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
}));

const key = { pk: 'MATCH#__verify__', sk: 'PREDICTION' };
const sample = { ...key, prediction: { matchId: '__verify__', narrative: 'round-trip' }, at: Date.now() };

try {
  await ddb.send(new PutCommand({ TableName: table, Item: sample }));
  const { Item } = await ddb.send(new GetCommand({ TableName: table, Key: key }));
  await ddb.send(new DeleteCommand({ TableName: table, Key: key }));
  if (Item?.prediction?.narrative === 'round-trip') {
    console.log(`OK: round-trip persisted to ${table} @ ${endpoint}`);
  } else {
    console.error('FAIL: item not read back', Item);
    process.exit(1);
  }
} catch (err) {
  console.error(`FAIL: ${err.name} — is DynamoDB Local up and bootstrapped?`);
  console.error(err.message);
  process.exit(1);
}
