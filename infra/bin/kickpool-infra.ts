#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { KickpoolStack } from '../lib/kickpool-stack';

const app = new cdk.App();

new KickpoolStack(app, 'KickpoolStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-southeast-2',
  },
  description: 'KickPool persistence (DynamoDB) + Amplify SSR compute role',
});
