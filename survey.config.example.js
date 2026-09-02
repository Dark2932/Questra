'use strict';

module.exports = {
  port: 3000,
  host: '0.0.0.0',
  // 全局安装默认使用用户目录下的 .questra/data；自定义位置推荐设置 QUESTRA_DATA_DIR。
  siteName: '我的问卷',
  // 邮箱验证和密码重置需要 SMTP；publicUrl 用于生成邮件中的绝对链接。
  publicUrl: 'https://survey.example.com',
  userRegistration: true,
  email: {
    enabled: false,
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: 'noreply@example.com',
    password: process.env.QUESTRA_SMTP_PASSWORD,
    from: 'Questra <noreply@example.com>'
  },
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
