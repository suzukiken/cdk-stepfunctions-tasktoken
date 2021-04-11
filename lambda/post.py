import requests
import json
import os

SLACK_TOKEN = os.environ.get('SLACK_TOKEN')
SLACK_CHANNEL = os.environ.get('SLACK_CHANNEL')
SLACK_POST_URL = 'https://slack.com/api/chat.postMessage'

SLACK_HEADERS = {
    'Authorization': 'Bearer %s' % SLACK_TOKEN,
    'Content-type': 'application/json'
}

message = 'できた？'
button_text = 'はい'

def lambda_handler(event, context):
    print(event)
    
    for record in event['Records']:
        
        if 'aws:sns' != record['EventSource']:
            return

        sns = record['Sns']
        
        task_token = json.loads(sns['Message'])['taskToken']
        
        payload = {
            "channel": SLACK_CHANNEL,
            "blocks": [{
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": message
                }
            }, {
                "type":
                "actions",
                "block_id":
                "actionblock789",
                "elements": [{
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": button_text
                    },
                    "value": task_token,
                    "action_id": "btn_yes"
                }]
            }]
        }
    
        r = requests.post(SLACK_POST_URL,
                          headers=SLACK_HEADERS,
                          data=json.dumps(payload))
    
        print(r)
