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

const existing = new Set((await client.send(new ListTablesCommand({}))).TableNames ?? []);
for (const t of tables) {
  if (existing.has(t.TableName)) {
    console.log(`exists: ${t.TableName}`);
    continue;
  }
  await client.send(new CreateTableCommand(t));
  console.log(`created: ${t.TableName}`);
}
console.log(`Done (endpoint ${endpoint}).`);
