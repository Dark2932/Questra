# 开发与扩展

本文面向贡献者、维护者和需要把 Questra 接入其他系统的开发者。

## 工作原理

Questra 是一个单进程 Node.js 应用：Express 装配 HTTP 路由和安全中间件，better-sqlite3 以 WAL 模式访问 SQLite，生产前端由同一进程托管。没有 `client/dist` 时，服务回退到 `views/` 中的兼容 EJS 页面。

普通用户认证与管理员认证分属两个身份域。`src/user-account.js`、`src/user-session.js` 和 `src/middleware/user-auth.js` 管理普通用户；`src/services/auth-token-service.js` 管理邮箱验证/重置 Token；`src/services/email-service.js` 封装 SMTP。问卷的 `src/services/access-policy.js` 负责访问方式和参与限制，提交时由 `survey-service` 在同一 SQLite 事务内复核。管理端用户生命周期接口位于 `src/routes/admin-api.js`，删除用户前会把历史答卷的 `user_id` 置空。

一次公开提交的主要流程是：读取问卷快照 -> 校验答案 -> 调用 `beforeSubmit` -> 在事务中写入答卷并判分 -> 调用 `afterSubmit` -> 返回结果。`beforeSubmit` 失败会阻止写入；`afterSubmit` 失败只记录日志，不回滚已经保存的数据。

题库与问卷实例通过快照解耦；分组通过关联表管理；迁移文件按名称排序并记录在 `schema_migrations` 中。单机 SQLite 是当前部署边界，多节点不能同时写同一数据库文件。

## 从源码开发

Node.js 22 是开发基线。pnpm 使用根目录 workspace 和 `pnpm-lock.yaml`：

```text
pnpm install --frozen-lockfile
pnpm run build
pnpm run dev:all
```

npm 不需要安装 pnpm：

```text
npm install
npm run install:client
npm run build
npm run dev:all
```

`dev:all` 以前台模式启动后端（3000）和 Vite 前端（5173），前端代理 `/api` 与 `/static` 到后端。只启动后端可用 `pnpm run dev` 或 `npm run dev`；只启动前端可用 `pnpm run dev:client` 或 `npm run dev:client`。

生产构建使用 `pnpm run build` 或 `npm run build`，产物为 `client/dist`。源码 CLI 的脚本与全局子命令一致：`start`、`migrate`、`status`、`stop`、`restart`、`backup`、`help`；需要传参时在 npm/pnpm 脚本后加 `--`。全部脚本、参数和生命周期行为见[命令参考](commands.md)。

## 代码边界

```text
bin/questra.js          CLI、后台进程和生命周期管理
src/app.js              Express 装配、认证入口和静态资源
src/routes/             公开、管理和兼容页面路由
src/services/           题目、快照、选题、校验和判分规则
src/db.js               SQLite 连接和迁移执行器
src/middleware/         认证、限流和安全响应头
src/*.js                配置、账户、会话、Token 和设置
client/src/             React 管理端、用户认证/资料页、向导和填写端
migrations/             只增不改的数据库迁移
views/、public/         无 React 构建时的兼容界面与静态资源
```

业务规则应放在 service，HTTP 参数转换和状态码应放在 route，避免在路由或前端复制判分逻辑。修改 API 时同时检查客户端调用、错误处理和 `docs/api.md`。站点外观与页脚配置复用 `app_settings` 键值表；React 与 EJS 兼容页都必须将版权模板作为纯文本渲染，并保持相同的占位符和受控程序版权预设。

## 扩展钩子

当前最稳定的扩展模型是 `survey.config.js` 中的 `hooks`，没有强制的插件注册器：

```js
'use strict';

module.exports = {
  hooks: {
    async beforeSubmit(data) {
      const response = await fetch(process.env.QUESTRA_APPROVAL_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ surveyId: data.survey.id, answers: data.answers })
      });
      if (!response.ok) throw new Error(`审批系统返回 HTTP ${response.status}`);
    },
    async afterSubmit(data) {
      console.log(`答卷 ${data.responseId} 已保存`);
    }
  }
};
```

两个钩子收到的对象包含 `survey`、`answers` 和 `submittedAt`；`afterSubmit` 还包含 `responseId`、`score` 和 `maxScore`。普通问卷的分数为 `null`。外部请求应设置超时、不要记录 Token，并使重试具有幂等性。非关键通知应放入 `afterSubmit`，否则通知服务故障会阻止填写者提交。

多个项目共用逻辑时，可提取为普通 CommonJS npm 模块，再在配置中 `require`。插件只能依赖公开配置和钩子数据，不应直接修改 Questra 内部表结构；需要新数据时应提供自己的存储或经过评估的迁移。

## 数据库和迁移

当前核心表包括 `question_pool`、`question_groups`、`question_group_items`、`surveys`、`survey_questions`、`responses` 和 `answers`，管理员认证使用 `admin_accounts`、`admin_sessions`、`app_settings`。`survey_questions.is_active` 区分当前题目结构与仍被历史答卷引用的旧快照；`question_pool.is_open_text` 与 `survey_questions.is_open_text` 在不重建旧表 CHECK 约束的前提下区分填空和开放文本。结构编辑不得删除历史答卷。已有迁移不能修改；新增结构使用下一个编号，并同时覆盖空库和已有库升级测试。考虑 WAL、外键级联、备份恢复和历史快照兼容。

迁移 `006_user_auth_and_access.sql` 新增 `users`、`user_sessions`、`user_auth_tokens`、`survey_access_policies`，并为 `responses` 增加可空 `user_id`。新资源若复用参与限制，应先调用 `access-policy` 服务并保持授权检查与资源写入处于同一事务；不能信任客户端传入的用户 ID、邮箱或剩余次数。

## API 开发

完整端点、认证、数据结构和示例集中在 [HTTP API](api.md)。公开接口不得泄露标准答案或管理数据；管理写接口、登录和公开提交均有进程内限流。变更接口时应更新客户端 `client/src/api.js`、后端校验、测试和 API 文档，并明确错误状态和兼容行为。普通用户前端通过 `useUserAuth` 独立维护状态，问卷草稿保存在会话存储，不能把用户身份或 Token 放入提交体。命令行参数和环境变量不在 API 文档中重复，统一维护在[命令参考](commands.md)和[安装与部署](installation.md)。

## 测试和发布

提交前至少运行：

```text
pnpm run check
pnpm run build
pnpm run release:check
```

npm 可分别使用对应的 `npm run` 命令。`check` 覆盖仓库边界、后端 lint/测试、前端 lint/测试；`release:check` 还验证发布包内容。CI 在 Node.js 22 和 pnpm 11 上执行，发布包必须包含 `client/dist`、迁移、视图和文档，但不能包含数据库、Token、日志、依赖目录或测试缓存。

版本发布由 GitHub Actions 根据 `package.json` 版本创建标签：版本未手动修改时自动递增 patch，手动修改时直接使用新版本且不再递增；如果本地或远程已经存在同名标签，本次发布会在打标签前终止。major/minor 版本会创建 Release，patch 版本只创建标签，除非维护者随后在 GitHub 发布对应 Release。

CI 创建的 Release 使用 `workflow_dispatch` 调用发布工作流；维护者在 GitHub 手动发布 Release 时，只需选择指向目标源码的版本标签并填写标题、说明等版本信息，无需手动上传安装包。`release.published` 会检出该标签对应的源码，完成检查和前端构建，生成 `questra-<版本>.tgz` 并上传到当前 Release。正式 Release 随后使用同一个文件执行 npm Trusted Publishing；预发布 Release 只上传 `.tgz`，不会进入 npm 正式渠道。Release 标签必须与该源码中的 `package.json` 版本一致。正式发布前不要在本地执行真实 `npm publish`，也不要把 Registry 凭据写入仓库。
