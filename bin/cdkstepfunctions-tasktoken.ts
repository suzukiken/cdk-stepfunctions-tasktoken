#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkstepfunctionsTasktokenStack } from '../lib/cdkstepfunctions-tasktoken-stack';

const app = new cdk.App();
new CdkstepfunctionsTasktokenStack(app, 'CdkstepfunctionsTasktokenStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
