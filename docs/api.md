# HTTP API

API 基址为当前站点的 `/api`。成功响应使用 JSON，删除成功返回 `204 No Content`；失败通常返回 `{ "error": "..." }`。请求体默认限制为 256 KB。

## 鉴权

公开读取和提交问卷不需要 Token。管理接口使用以下任一方式：

```http
Authorization: Bearer <Admin Token>
```

也兼容 `x-admin-token` 请求头、`?token=` 查询参数和会话 Cookie。首次初始化后，浏览器推荐使用账号密码登录，服务器签发 7 天 HttpOnly 会话 Cookie。Admin Token 应只通过受保护的启动横幅、环境变量或数据目录管理，不要放进公开链接、日志或源码。

## 公共接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | 检查进程和数据库连接 |
| `GET` | `/api/config` | 获取站点名称和图标 |
| `GET` | `/api/setup/status` | 查询是否完成初始化 |
| `POST` | `/api/setup` | 首次创建唯一管理员和站点设置 |
| `POST` | `/api/auth/login` | 账号密码登录 |
| `GET` | `/api/auth/me` | 获取当前认证用户 |
| `POST` | `/api/auth/logout` | 注销当前会话 |
| `GET` | `/api/surveys/:id` | 获取有效公开问卷，不含标准答案 |
| `POST` | `/api/surveys/:id/responses` | 提交答卷并返回结果 |

健康检查正常时返回 `200`：

```json
{
  "status": "ok",
  "database": "ok",
  "uptime": 12.34,
  "timestamp": "2026-08-28T12:00:00.000Z"
}
```

提交示例：

```bash
curl -X POST http://localhost:3000/api/surveys/<survey-id>/responses \
  -H 'Content-Type: application/json' \
  -d '{"answers":{"<survey-question-id>":"VS Code"}}'
```

提交成功返回 `id`、`message`、`kind`、`score` 和 `maxScore`。服务器会重新校验题目 ID、必填项、选项和文本长度；考试分数由服务器计算。

## 普通用户接口

普通用户使用独立的 `questra_user_session` HttpOnly Cookie，与管理员会话和 Admin Token 不互通。注册、登录、验证和密码重置的写请求要求同源，并受独立限流保护。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `POST` | `/api/user/auth/register` | 注册并发送验证邮件 |
| `POST` | `/api/user/auth/verify` | 消费邮箱验证 Token |
| `POST` | `/api/user/auth/resend-verification` | 重发验证邮件 |
| `POST` | `/api/user/auth/login` | 邮箱密码登录 |
| `GET` | `/api/user/auth/me` | 获取当前普通用户 |
| `POST` | `/api/user/auth/logout` | 注销普通用户会话 |
| `POST` | `/api/user/auth/forgot-password` | 请求重置密码邮件 |
| `POST` | `/api/user/auth/reset-password` | 使用 Token 设置密码 |
| `PUT` | `/api/user/profile` | 修改显示名称 |
| `PUT` | `/api/user/password` | 修改当前密码 |

注册、重发和找回密码接口使用不暴露账户是否存在的统一响应。未验证用户可以登录，但访问 `verified_email` 问卷时返回 `403`。

## 管理接口

所有 `/api/admin/*` 接口都需要管理认证。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | 题目、实例、答卷总数和趋势 |
| `GET` | `/api/admin/settings` | 站点和管理员资料 |
| `PUT` | `/api/admin/settings/site` | 修改站点名称和图标 |
| `PUT` | `/api/admin/settings/account` | 修改唯一管理员昵称、账号或密码 |
| `GET` | `/api/admin/update/status` | 查询当前版本的安装来源和更新能力 |
| `GET` | `/api/admin/update` | 从 GitHub Releases 检测最新正式版本 |
| `POST` | `/api/admin/update/install` | 使用 npm 全局安装服务端校验后的最新版本 |
| `GET` | `/api/admin/questions` | 查询题库，包含标准答案 |
| `POST` | `/api/admin/questions` | 创建题目 |
| `PUT` | `/api/admin/questions/:id` | 更新题目 |
| `DELETE` | `/api/admin/questions/:id` | 删除题目 |
| `GET` | `/api/admin/groups` | 查询分组 |
| `POST` | `/api/admin/groups` | 创建分组 |
| `PUT` | `/api/admin/groups/:id` | 重命名分组 |
| `DELETE` | `/api/admin/groups/:id` | 删除分组 |
| `GET` | `/api/admin/surveys` | 查询问卷和考试列表 |
| `POST` | `/api/admin/surveys` | 从题库生成问卷或考试 |
| `GET` | `/api/admin/surveys/:id` | 查看实例和题目快照 |
| `PUT` | `/api/admin/surveys/:id` | 修改实例类型、基本信息、题目和计分结构 |
| `GET` | `/api/admin/surveys/:id/access` | 查看问卷访问与限制策略 |
| `PUT` | `/api/admin/surveys/:id/access` | 修改问卷访问与限制策略 |
| `GET` | `/api/admin/user-settings` | 查看普通用户注册和邮件配置状态 |
| `PUT` | `/api/admin/user-settings` | 开关普通用户注册 |
| `GET` | `/api/admin/users` | 查询普通用户（仅管理员） |
| `PUT` | `/api/admin/users/:id/status` | 启用或禁用用户 |
| `POST` | `/api/admin/users/:id/revoke-sessions` | 撤销用户全部会话 |
| `DELETE` | `/api/admin/users/:id` | 删除用户并匿名化历史答卷 |
| `DELETE` | `/api/admin/surveys/:id` | 删除实例及其答卷 |
| `GET` | `/api/admin/surveys/:id/responses` | 查看答卷与逐题判分 |
| `GET` | `/api/admin/surveys/:id/export` | 导出 CSV 或 JSON；`includePersonalInfo=1` 时显式包含完整邮箱，默认不包含 |

更新状态接口返回 `installationType`（`source` 或 `global`）、`sourceBuild` 和 `updateSupported`，用于在联网前识别源码构建版。源码构建版不会访问 GitHub，检测和安装操作均被禁用，并提供源码仓库入口。

更新检测会读取 GitHub Releases 中所有已发布且非草稿、非预发布的正式版本。只有当前版本号确实存在于该列表时才算合规；合规版本返回最新正式版本、`versionsBehind`（落后版本数量）、`updateAvailable`、Releases 总入口、发布时间和更新说明。不在列表中的版本返回 `invalidVersion: true`，检测和安装均不可用，页面会提示重新安装最新正式版。安装接口不接受包名或版本参数，会重新读取并校验 Release，只执行固定包名的全局 npm 安装；成功响应包含 `installedVersion`、`restartRequired: true` 和截断后的 npm 输出。安装成功不会自动重启当前进程。

更新接口需要管理认证。安装操作还要求服务器能够访问 GitHub 与 npm，并拥有 npm 全局目录写权限；重复安装任务返回 `409`，外部服务或 npm 失败会返回可读错误。源码目录不会被此接口修改。

## 题目和实例格式

创建单选题：

```json
{
  "title": "你使用什么编辑器？",
  "type": "single",
  "options": ["VS Code", "Vim"],
  "required": true,
  "correctAnswer": "VS Code",
  "groupIds": [2]
}
```

`type` 可为 `single`、`multiple`、`judgment` 或 `text`。判断题的选项固定为“正确”和“错误”；多选标准答案为数组；文本标准答案也可为多个可接受字符串。普通问卷可以省略 `correctAnswer`。

手动生成普通问卷：

```json
{
  "kind": "survey",
  "title": "产品反馈",
  "description": "请用两分钟完成",
  "questionIds": [1, 2, 3],
  "selectionMode": "manual",
  "expiresAt": "2026-12-31T16:00:00.000Z"
}
```

随机生成时使用 `selectionMode: "random"`、可选 `sourceGroupId` 和按题型的 `randomCounts`：

```json
{
  "kind": "exam",
  "title": "随机练习",
  "selectionMode": "random",
  "sourceGroupId": 2,
  "randomCounts": {"single": 5, "multiple": 2, "judgment": 3, "text": 0},
  "scoringMode": "weighted",
  "totalScore": 100,
  "typeWeights": {"single": 50, "multiple": 30, "judgment": 20}
}
```

考试中的每道题必须已有标准答案。`scoringMode` 为 `weighted` 时权重总和必须为 100；为 `per_question` 时传入 `questionScores` 对象。实例生成后题目和计分配置会保存为快照。

编辑实例可提交与创建时相同的结构字段，并可额外提交 `status`。即使实例已有答卷，也可以更换题目、选题方式、实例类型和计分配置；新结构用于后续提交，已有答卷引用的旧题目快照和提交时分数继续保留。答卷接口中的历史题目带有 `archived: true`。当 `expiresAt` 不为空且已到期时，服务端始终将 `status` 保存为 `closed`；只有同一次请求把截止时间改到未来，`status: active` 才会生效。

创建或编辑实例时可以提交 `accessPolicy`：

```json
{
  "accessMode": "verified_email",
  "maxSubmissionsPerUser": 1,
  "maxSubmissionsTotal": 500,
  "cooldownSeconds": 60
}
```

`accessMode` 可为 `anonymous`、`account` 或 `verified_email`。匿名模式不能设置按用户限制；次数、总量和冷却限制由服务端在写入答卷的 SQLite 事务内检查。

## 答卷和导出

`GET /api/admin/surveys/:id/responses` 返回 `{ survey, responses }`。每条答卷包含 `id`、`submittedAt`、`score`、`maxScore` 和按问卷题目 ID 索引的 `answers`；每个答案包含 `value`、`isCorrect` 和 `awardedScore`。普通问卷的判分字段为 `null`。

导出默认为 CSV：

```text
GET /api/admin/surveys/<survey-id>/export
GET /api/admin/surveys/<survey-id>/export?format=json
```

CSV 使用 UTF-8 BOM 以兼容 Excel；JSON 返回实例和答卷数组。

## 错误和限制

常见状态码：`400` 输入无效，`401` 未认证，`404` 资源不存在，`409` 初始化或结构冲突，`410` 问卷关闭/过期，`429` 请求过频，`500` 服务内部错误。初始化、登录、管理写操作和公开提交均使用进程内固定窗口限流；限流状态不会持久化，不应替代长期审计系统。

公开接口永远不返回考试标准答案。反向代理部署时应限制管理 API 的网络可达范围、启用 HTTPS，并避免将数据库目录和 Token 文件暴露为静态资源。
