import boto3
import os
import hmac
import hashlib
import urllib.parse
import json
import requests
from datetime import datetime

CORS_DOMAIN = '*'

SLACK_TOKEN = os.environ.get('SLACK_TOKEN')
SLACK_URL = 'https://slack.com/api/chat.update'
SLACK_CHANNEL = os.environ.get('SLACK_CHANNEL')

SLACK_HEADERS = {
    'Authorization': 'Bearer %s' % SLACK_TOKEN,
    'Content-type': 'application/json'
}

SLACK_SIGNING_SECRET = os.environ.get('SLACK_SIGNING_SECRET')
SLACK_SECRET = bytes(SLACK_SIGNING_SECRET, 'latin-1')

stepfunctions = boto3.client('stepfunctions')

def bad(message):
    return {
        'headers': {
            'Access-Control-Allow-Origin': CORS_DOMAIN,
            'Content-Type': 'text/plain'
        },
        'statusCode': 400,
        'body': message
    }


def lambda_handler(event, context):

    print(event)

    try:
        timestamp = event['headers']['X-Slack-Request-Timestamp']
        sig_req = event['headers']['X-Slack-Signature']
        version_number = 'v0'
        body = event['body']
    except:
        return bad(event)

    message = bytes(version_number + ':' + timestamp + ':' + body, 'latin-1')

    sig_calc = hmac.new(
        SLACK_SECRET, 
        msg=message,
        digestmod=hashlib.sha256
    ).hexdigest()

    if sig_req.replace(version_number + '=', '') != sig_calc:
        return bad('bad sig')
        
    # step machineにtask tokenを戻す

    payload = urllib.parse.unquote(body[len('payload='):])
    
    res = json.loads(payload)
    task_token = res['actions'][0]['value']
    
    stepfunctions.send_task_success(
        output=json.dumps({
            'message': 'Callback task completed successfully'
        }),
        taskToken=task_token
    )

    # Slackのメッセージを更新する

    payload = {
        "channel":
        SLACK_CHANNEL,
        "ts":
        res['container']['message_ts'],
        "text":
        "",
        "blocks": [{
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": 'ありがと'
            }
        }]
    }

    headers = {
        'Authorization': 'Bearer %s' % SLACK_TOKEN,
        'Content-type': 'application/json'
    }

    response = requests.post(SLACK_URL, headers=headers, json=payload)

    print(response)

    return {
        'headers': {
            'Access-Control-Allow-Origin': CORS_DOMAIN,
            'Content-Type': 'text/plain'
        },
        'statusCode': 200,
        'body': 'done'
    }
