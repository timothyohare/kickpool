// DynamoDB document client. Uses DynamoDB Local when DYNAMODB_ENDPOINT is set
// (local dev), otherwise the real AWS endpoint (production / Amplify Lambda).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const endpoint = process.env.DYNAMODB_ENDPOINT;

// Use DynamoDB when explicitly pointed at a local endpoint, or when running on
// AWS Lambda (Amplify SSR). Otherwise the prediction store falls back to memory.
export const dynamoEnabled = Boolean(endpoint) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

export const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION ?? 'ap-southeast-2',
    ...(endpoint ? { endpoint } : {}),
  })
);

export const TABLE = (name: string): string =>
  `${process.env.DYNAMODB_TABLE_PREFIX ?? 'kickpool'}-${name}`;
