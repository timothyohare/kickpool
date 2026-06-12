# KickPool Infrastructure (AWS CDK)

Infrastructure-as-code for KickPool's persistence layer. Reproduces the three
resources that currently back the production app:

| Logical ID | Resource | Physical name |
|------------|----------|---------------|
| `PredictionsTable` | DynamoDB table | `kickpool-predictions` |
| `DynamoAccessPolicy` | IAM managed policy | `kickpool-dynamodb-access` |
| `AmplifyComputeRole` | IAM role (trusts `amplify.amazonaws.com`) | `kickpool-amplify-compute` |

The Amplify app itself is **console-managed and not in this stack**. The
`ComputeRoleArn` output is already wired into **Amplify → App settings → IAM roles →
Compute role**.

## Status — already deployed (prod)

The hand-created resources have been **imported into `KickpoolStack`** in
`aws://810429055117/ap-southeast-2` and are now managed by this CDK app
(`cdk diff` reports no differences). Day-to-day from here:

```bash
cd infra
npm install                 # first time on a new machine
npx cdk diff KickpoolStack  # preview changes
npx cdk deploy KickpoolStack
```

The environment is already bootstrapped. Outputs:

| Output | Value |
|--------|-------|
| `PredictionsTableName` | `kickpool-predictions` |
| `ComputeRoleArn` | `arn:aws:iam::810429055117:role/kickpool-amplify-compute` |

## How the existing resources were adopted (reference)

Done once, recorded here for reproducibility. A plain `cdk deploy` would have failed
("already exists"), so the resources were **imported** non-interactively via
`import-mapping.json` (logical ID → physical identifier):

```bash
npx cdk import KickpoolStack --resource-mapping import-mapping.json
npx cdk deploy KickpoolStack   # add outputs + retain policies, reconcile drift
```

> If you later enable point-in-time recovery (the commented
> `pointInTimeRecoverySpecification` in `lib/kickpool-stack.ts`), `cdk diff` will show
> it as a safe, non-replacing update.

## Fresh deploy (new account/region, or after teardown)

If the resources do **not** exist (e.g. standing up a new environment), just deploy:

```bash
npx cdk deploy KickpoolStack
```

## Safety notes

- The DynamoDB table uses `RemovalPolicy.RETAIN` — `cdk destroy` will **not** delete
  production prediction data; the table is orphaned instead and must be removed manually.
- App runtime selects DynamoDB automatically on Lambda (no `DYNAMODB_ENDPOINT` in prod);
  locally it points at DynamoDB Local. See `../docs/plans/02-dynamodb-persistence.md`.
