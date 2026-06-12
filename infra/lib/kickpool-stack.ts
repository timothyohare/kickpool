import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * KickPool persistence + Amplify SSR compute role.
 *
 * Reproduces the three resources currently created by hand:
 *   - DynamoDB table `kickpool-predictions` (durable GenAI prediction cache)
 *   - Managed policy `kickpool-dynamodb-access`
 *   - Role `kickpool-amplify-compute` assumed by the Amplify Next.js SSR Lambda
 *
 * Physical names are pinned so this stack can ADOPT the existing resources via
 * `cdk import` (no recreation), and so a fresh deploy in another account/region
 * yields the same names. The Amplify app itself is console-managed and is NOT in
 * scope here — wire ComputeRoleArn into Amplify > App settings > IAM roles.
 */
export class KickpoolStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const predictions = new dynamodb.Table(this, 'PredictionsTable', {
      tableName: 'kickpool-predictions',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // Never let a stack teardown delete production predictions.
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      // Point-in-time recovery is recommended for prod. It is OFF on the
      // hand-created table; enabling it here is a safe (non-replacing) update,
      // but it will show as drift on first `cdk import`. Flip to true when ready.
      // pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    const dynamoAccess = new iam.ManagedPolicy(this, 'DynamoAccessPolicy', {
      managedPolicyName: 'kickpool-dynamodb-access',
      statements: [
        new iam.PolicyStatement({
          sid: 'KickpoolPredictions',
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:Query',
            'dynamodb:Scan',
          ],
          resources: [predictions.tableArn],
        }),
      ],
    });

    const computeRole = new iam.Role(this, 'AmplifyComputeRole', {
      roleName: 'kickpool-amplify-compute',
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      managedPolicies: [dynamoAccess],
      description: 'Assumed by Amplify SSR compute (Next.js Lambda) to access DynamoDB',
    });

    // Retain the IAM resources on stack teardown so a `cdk destroy` can't break
    // the live Amplify app, and to match the state set during `cdk import`.
    dynamoAccess.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
    computeRole.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

    new cdk.CfnOutput(this, 'PredictionsTableName', { value: predictions.tableName });
    new cdk.CfnOutput(this, 'ComputeRoleArn', { value: computeRole.roleArn });
  }
}
