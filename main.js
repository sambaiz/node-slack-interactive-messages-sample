require('dotenv').config();
const http = require('http');
const { WebClient } = require('@slack/client');
const { createMessageAdapter } = require('@slack/interactive-messages');

const web = new WebClient(process.env.SLACK_ACCESS_TOKEN);
const slackMessages = createMessageAdapter(process.env.SLACK_VERIFICATION_TOKEN);
const channelId = process.env.SLACK_CHANNEL_ID;

const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const auth = require('basic-auth')
const compare = require('tsscmp')

app.use(bodyParser.urlencoded({ extended: false }));
app.all('/auth/*', (req, res, next) => {
  const credentials = auth(req);
  if (!credentials || !check(credentials.name, credentials.pass)) {
    res.status(401).send('Unauthorized');
  } else {
    next();
  }
});

// Interactive Messages Handler
app.use('/slack', slackMessages.expressMiddleware());

slackMessages.action('question_button', (payload) => {
  let replacement = payload.original_message;
  replacement.text =`${payload.user.name} likes ${payload.actions[0].value}`;
  delete replacement.attachments[0].actions;
  return replacement;
});

const check = (name, pass) => {
  return compare(name, process.env.USER_NAME) && compare(pass, process.env.USER_PASSWORD)
}

// Post Messages Handler
app.get('/auth/message', async (req,res) => {
  await web.chat.postMessage(channelId, 'Question', {
    attachments: [
      {
        text: "Which buttons do you like?",
        color: "#f9a41b",
        callback_id: "question_button",
        actions: [
          {
            name: "primary_button",
            type: "button",
            style: "primary",
            text: "Primary",
            value: "Primary Button",
          },
          {
            name: "normal_button",
            type: "button",
            text: "Normal",
            value: "Normal Button"
          },
          {
            name: "danger_button",
            type: "button",
            style: "danger",
            text: "Danger",
            value: "Danger Button",
            confirm: {
              title: "Really?",
              text: "This is danger",
              ok_text: "Yes",
              dismiss_text: "No"
            }
          },
        ]
      }
    ]
  }).catch(console.error);
  res.send('done');
});

const port = process.env.PORT || 3000;
http.createServer(app).listen(port, () => {
  console.log(`server listening on port ${port}`);
});
