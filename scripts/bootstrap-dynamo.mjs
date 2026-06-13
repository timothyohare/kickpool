// Create the kickpool DynamoDB tables in DynamoDB Local (Plan 02). Idempotent.
// Usage: docker compose up -d && node scripts/bootstrap-dynamo.mjs
import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';

const endpoint = process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000';
const prefix = process.env.DYNAMODB_TABLE_PREFIX ?? 'kickpool';
const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-2',
  endpoint,
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

// PK/SK schema per SPEC §4.2. Only the predictions table is needed today.
const tables = [
  {
    TableName: `${prefix}-predictions`,
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

// Docker publishes the port before DynamoDB Local is ready to serve, so the
// first request can hit ECONNRESET/timeout. Poll ListTables until it responds
// (or give up after ~30s) before doing any real work.
async function waitForReady(attempts = 30, delayMs = 1000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return (await client.send(new ListTablesCommand({}))).TableNames ?? [];
    } catch (err) {
      if (i === attempts) throw err;
      console.log(`waiting for DynamoDB Local (${i}/${attempts})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return [];
}

const existing = new Set(await waitForReady());
for (const t of tables) {
  if (existing.has(t.TableName)) {
    console.log(`exists: ${t.TableName}`);
    continue;
  }
  await client.send(new CreateTableCommand(t));
  console.log(`created: ${t.TableName}`);
}
console.log(`Done (endpoint ${endpoint}).`);
