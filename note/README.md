+++
title = "Step FunctionsでTask Tokenを使って返事を待つ"
date = "2021-04-11"
tags = ["Step Functions", "SNS", "Slack", "Lambda", "Api Gateway"]
+++

仕事ではSlackを使うことが多いので、Slackで何かが「承認」できると便利かもな、と思うことは全く無いわけではない。（といってもないけど）

そういう時にはStep Functionsで「承認」フローみたいなものを作ることができる。

具体的にはStep FunctionsのTask Tokenというのを使って、そのトークンが帰ってくるのを待機するというタスクを作る。そしてステップマシーンの外にあるLambdaなどが、処理の成功/失敗をそのトークンと共にステップマシーンに送ることで、タスクが完了して次のステップに進むという仕組みになる。

これを利用してとりあえず以下の仕組みを作ってみた。

1. ステップマシーンからSNSにトークンを投げる
2. SNSをサブスクライブしているLambdaがトークンをSlackに投げる
3. Slackのメッセージにボタンを表示して誰かが押すのを待つ
4. 誰かがボタンを押すとApi Gateway経由でLambdaが呼ばれてトークンと共に処理の成功をステップマシーンに伝える
5. ステップマシーンが処理を完了する

![img](/img/2021/04/stepfunctions-tasktoken-stepmachine-1.png)
![img](/img/2021/04/stepfunctions-tasktoken-slack-1.png)
![img](/img/2021/04/stepfunctions-tasktoken-slack-2.png)
![img](/img/2021/04/stepfunctions-tasktoken-stepmachine-2.png)

[CDKのコード](https://github.com/suzukiken/cdkstepfunctions-tasktoken)

実際にこれを動かすにはApi GatewayのURLをSlackの管理画面に登録する必要がある。

Slackの管理サイトは毎回どこの画面だったかなあと迷わされてしまうので、この際だからと思って動画に残しておいた。

![img](/img/2021/04/slack-setup.gif)