'use strict';

const nodemailer = require('nodemailer');

function createEmailService(config = {}) {
  const email = config.email || {};
  const enabled = email.enabled !== false && Boolean(email.host && email.user && email.password);
  let transporter = null;
  if (enabled) {
    transporter = nodemailer.createTransport({
      host: email.host,
      port: Number(email.port || 587),
      secure: Boolean(email.secure),
      auth: { user: email.user, pass: email.password }
    });
  }

  async function send({ to, subject, text, html }) {
    if (!transporter) throw Object.assign(new Error('尚未配置邮件服务'), { status: 503, expose: true });
    return transporter.sendMail({ from: email.from || email.user, to, subject, text, html });
  }

  async function sendVerificationEmail({ to, displayName, verifyUrl, siteName }) {
    const subject = `${siteName || 'Questra'} 邮箱验证`;
    return send({ to, subject,
      text: `${displayName}，请打开以下链接验证邮箱：${verifyUrl}\n链接有效期 24 小时。`,
      html: `<p>${escapeHtml(displayName)}，请点击以下链接验证邮箱：</p><p><a href="${escapeHtml(verifyUrl)}">验证邮箱</a></p><p>链接有效期 24 小时。</p>` });
  }

  async function sendPasswordResetEmail({ to, displayName, resetUrl, siteName }) {
    const subject = `${siteName || 'Questra'} 重置密码`;
    return send({ to, subject,
      text: `${displayName}，请打开以下链接重置密码：${resetUrl}\n链接有效期 1 小时。`,
      html: `<p>${escapeHtml(displayName)}，请点击以下链接重置密码：</p><p><a href="${escapeHtml(resetUrl)}">重置密码</a></p><p>链接有效期 1 小时。</p>` });
  }

  return { configured: Boolean(transporter), sendVerificationEmail, sendPasswordResetEmail };
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

module.exports = { createEmailService };
