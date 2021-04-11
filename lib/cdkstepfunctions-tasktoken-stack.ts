import * as cdk from "@aws-cdk/core";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as sns from "@aws-cdk/aws-sns";
import * as subscriptions from "@aws-cdk/aws-sns-subscriptions";
import { PythonFunction } from "@aws-cdk/aws-lambda-python";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as sm from "@aws-cdk/aws-secretsmanager";
import * as kms from "@aws-cdk/aws-kms";

export class CdkstepfunctionsTasktokenStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);
    
    const PREFIX_NAME = id.toLowerCase().replace("stack", "")
    
    const imported_key = kms.Key.fromKeyArn(
      this,
      "imported_key",
      "arn:aws:kms:ap-northeast-1:xxxxxxxx:key/xxxxxxxxxxxxxxx"
    )

    const slack_secret = sm.Secret.fromSecretAttributes(this, "slack_secret", {
      secretArn:
        "arn:aws:secretsmanager:ap-northeast-1:xxxxxxxx:secret:xxxxxxxxxxxx",
      encryptionKey: imported_key,
    })

    const SLACK_TOKEN = slack_secret
      .secretValueFromJson("SLACK_TOKEN")
      .toString()

    const SLACK_CHANNEL = slack_secret
      .secretValueFromJson("SLACK_CHANNEL")
      .toString()

    const SLACK_SIGNING_SECRET = slack_secret
      .secretValueFromJson("SLACK_SIGNING_SECRET")
      .toString()
      
    // Define StateMachine
    
    const topic = new sns.Topic(this, 'topic', {
      topicName: PREFIX_NAME + "-topic"
    })
    
    const task = new tasks.SnsPublish(this, 'task', {
      topic,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      message: sfn.TaskInput.fromObject({
        message: "hello",
        taskToken: sfn.JsonPath.taskToken
      })
    })
    
    const definition = task;

    const state_machine = new sfn.StateMachine(this, "state_machine", {
      definition,
      timeout: cdk.Duration.minutes(3),
      stateMachineName: PREFIX_NAME + "-statemachine",
    })
    
    // subscribe sns topic 

    const role = new iam.Role(this, "role", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: PREFIX_NAME + "-role",
    })

    const policy_statement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["sns:Publish"],
      principals: [new iam.ServicePrincipal("events.amazonaws.com")],
      resources: [topic.topicArn],
    })

    topic.addToResourcePolicy(policy_statement)
    
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    )
    
    state_machine.grantTaskResponse(role)
    
    // lambda that subscribe sns and post to slack
    
    const post_function = new PythonFunction(this, "post_function", {
      entry: "lambda",
      index: "post.py",
      handler: "lambda_handler",
      functionName: PREFIX_NAME + "-post",
      runtime: lambda.Runtime.PYTHON_3_8,
      timeout: cdk.Duration.seconds(10),
      environment: {
        SLACK_TOKEN: SLACK_TOKEN,
        SLACK_CHANNEL: SLACK_CHANNEL,
      }
    })
    
    topic.addSubscription(
      new subscriptions.LambdaSubscription(post_function)
    )
    
    // lambda for receiving message from slack and send it to step machine
    
    const receive_function = new PythonFunction(this, "receive_function", {
      entry: "lambda",
      index: "receive.py",
      handler: "lambda_handler",
      functionName: PREFIX_NAME + "-receive",
      runtime: lambda.Runtime.PYTHON_3_8,
      timeout: cdk.Duration.seconds(10),
      role: role,
      environment: {
        SLACK_TOKEN: SLACK_TOKEN,
        SLACK_CHANNEL: SLACK_CHANNEL,
        SLACK_SIGNING_SECRET: SLACK_SIGNING_SECRET,
      }
    })
    
    // apigw for receiving message from slack

    const api = new apigateway.LambdaRestApi(this, "api", {
      handler: receive_function,
      restApiName: PREFIX_NAME + "-api",
      proxy: false,
      deploy: true,
    })

    api.root.addMethod("ANY");
    
  }
}
