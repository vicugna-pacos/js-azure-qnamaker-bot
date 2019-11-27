// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler } = require('botbuilder');
const { QnAMaker } = require('botbuilder-ai');
const QnAResultHelper = require('./qnaResultHelper');

class QnABot extends ActivityHandler {
    /**
     * @param {any} logger object for logging events, defaults to console if none is provided
     */
    constructor(logger) {
        super();
        if (!logger) {
            logger = console;
            logger.log('[QnaMakerBot]: logger not passed in, defaulting to console');
        }

        try {
		var endpointHostName = process.env.QnAEndpointHostName
		if(!endpointHostName.startsWith('https://')){
		    endpointHostName =  'https://' + endpointHostName;
		}

		if(!endpointHostName.endsWith('/qnamaker')){
		    endpointHostName =  endpointHostName + '/qnamaker';
        }
        this.qnaMaker = new QnAMaker({
                knowledgeBaseId: process.env.QnAKnowledgebaseId,
                endpointKey: process.env.QnAAuthKey,
                host: endpointHostName
            });
        } catch (err) {
            logger.warn(`QnAMaker Exception: ${ err } Check your QnAMaker configuration in .env`);
        }
        this.logger = logger;

        // If a new user is added to the conversation, send them a greeting message
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity('FAQへようこそ。私に何か質問してみてください。お答えできることがあるかもしれません。');
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        // When a user sends a message, perform a call to the QnA Maker service to retrieve matching Question and Answer pairs.
        this.onMessage(async (context, next) => {
            this.logger.log('Calling QnA Maker');

            // 複数回答を返してもらう
            let options = {
                top : 3
            };

            const qnaResults = await this.qnaMaker.getAnswers(context, options);
            // const qnaResults = await this.qnaMaker.getAnswers(context);

            await QnAResultHelper.createAnswer(context, qnaResults);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.QnABot = QnABot;
