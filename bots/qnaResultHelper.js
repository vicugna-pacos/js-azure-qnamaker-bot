const { MessageFactory } = require('botbuilder');

// 良い回答と判断する閾値
const SCORE_GOOD_ANSWER = 0.7;

/**
 * QnA Maker から返ってきた答えを適切な形にしてクライアントへ返す
 * 
 * @param {any} qnaResult QnA Maker から返ってきたanswer
 * @returns なし
 */
module.exports.createAnswer = async function(context, qnaResults) {
     console.log(qnaResults);
    if (!qnaResults || qnaResults.length == 0) {
        // no answer
        await context.sendActivity('お答えできません。他の言い方で質問してみてください。');
        return;
    }

    if (qnaResults.length == 1) {
        // single answer
        let qnaResult = qnaResults[0];

        await sendAnswer(context, qnaResult);

    } else {
        // 複数回答
        await createSuggestedQuestions(context, qnaResults);

    }

}

/**
 * 答えが複数返ってきたときに、質問文を選択肢としてクライアントへ返す
 * 
 * @param {*} context 
 * @param {*} qnaResults 
 */
async function createSuggestedQuestions(context, qnaResults) {

    let bestAnswer = null;
    let goodAnswer = [];

    for (let qnaResult of qnaResults) {
        // scoreが1ならそれを1件だけ返す
        if (qnaResult.score == 1 && bestAnswer == null) {
            bestAnswer = qnaResult;
            break;

        } else if (qnaResult.score >= SCORE_GOOD_ANSWER) {
            goodAnswer.push(qnaResult);
        }
    }

    if (bestAnswer != null) {
        // スコア1の答えあり
        await sendAnswer(context, bestAnswer);
        return;

    } else if (goodAnswer.length == 1) {
        // 0.7以上の答えが1件のみ
        await sendAnswer(context, goodAnswer[0]);
        return;

    }
    
    // 複数回答を返す場合
    let title = '以下の該当があります。';
    let buttons = [];

    if(goodAnswer.length > 1) {
        // 2件以上
        for (let qnaResult of goodAnswer) {
            buttons.push(qnaResult.questions[0]);
        }

    } else {
        // 高信頼度の回答なし
        for (let qnaResult of qnaResults) {
            buttons.push(qnaResult.questions[0]);
        }
        
    }

    let answer = MessageFactory.suggestedActions(buttons, title);
    await context.sendActivity(answer);
}

/**
 * クライアントへ答えを返す。
 * 質問＋回答
 * 
 * @param {*} context 
 * @param {*} qnaResult 
 */
async function sendAnswer(context, qnaResult) {
    // 質問文を返す
    // score = 1 のときは返さない
    if (qnaResult.score < 1) {
        if (qnaResult.questions && qnaResult.questions.length > 0) {
            let answer = '「' + qnaResult.questions[0] + '」というご質問ですね';
            await context.sendActivity(answer);
        }
    }

    // 回答を返す
    if (qnaResult.context && qnaResult.context.prompts && qnaResult.context.prompts.length > 0) {
        // answerにfollow-up promptが付いている
        let activity = createFollowUpPrompt(qnaResult);
        await context.sendActivity(activity);

    } else {
        await context.sendActivity(qnaResult.answer);

    }

}

/**
 * follow-up prompt をクライアントへ返す
 * 
 * @param {QnAMakerResult} qnaResult 
 * @returns Activity
 */
function createFollowUpPrompt(qnaResult) {
    let title = qnaResult.answer;
    let prompts = qnaResult.context.prompts;
    let buttons = [];

    // DisplayOrderで並べ替え
    prompts.sort(function(a, b) {
        if (a.displayOrder == b.displayOrder) {
            return 0;
        } else if (a.displayOrder < b.displayOrder) {
            return -1;
        }
        return 1;
    });

    // follow-up promptのボタンを作る
    for (let prompt of prompts) {
        buttons.push(prompt.displayText);
    }

    return MessageFactory.suggestedActions(buttons, title);
}