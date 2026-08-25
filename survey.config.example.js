'use strict';

module.exports = {
  port: 3000,
  host: '0.0.0.0',
  database: './data/questra.db',
  siteName: '我的问卷',
  // 是否将每次 HTTP 请求打印到运行 Questra 的终端，默认开启。
  logging: true,
  hooks: {
    async beforeSubmit(answerData) {
      const webhook = process.env.DINGTALK_WEBHOOK_URL;
      if (!webhook) return;

      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'text',
          text: { content: `收到问卷《${answerData.survey.title}》的新答卷` }
        })
      });
      if (!response.ok) throw new Error(`钉钉通知失败: ${response.status}`);
    },
    async afterSubmit(answerData) {
      console.log(`答卷 ${answerData.responseId} 已保存`);
    }
  }
};
