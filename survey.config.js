'use strict';

/** @type {import('./src/config').SurveyConfig} */
module.exports = {
  port: 3000,
  host: '0.0.0.0',
  database: './data/questra.db',
  siteName: 'Questra',
  hooks: {
    // 提交前通知钉钉。抛出异常会阻止答卷入库，并向用户返回错误。
    async beforeSubmit(answerData) {
      const webhook = process.env.DINGTALK_WEBHOOK_URL;
      if (!webhook) return;

      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'text',
          text: {
            content: `[Questra] 收到问卷《${answerData.survey.title}》，共 ${answerData.answers.length} 个答案。`
          }
        })
      });

      if (!response.ok) {
        throw new Error(`钉钉通知失败: HTTP ${response.status}`);
      }
    },

    // 入库完成后可在这里同步 CRM、表格或其他 Webhook。
    async afterSubmit(answerData) {
      console.log(`[hook] 答卷 ${answerData.responseId} 已保存`);
    }
  }
};
