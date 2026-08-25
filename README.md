# Questra

Questra 是面向个人开发者和小型团队的轻量级自托管问卷与考试系统。它使用 Node.js、Express 和 SQLite 提供 API 与数据存储，使用 React、Vite、Ant Design 构建管理端和填写端；生产环境由同一个 Express 进程托管前端静态文件。

主要能力：

- 题库、题目分组、手动选题和按题型随机抽题
- 普通问卷与考试，支持题型权重或逐题分值两种计分方式
- 问卷实例快照，题库后续修改不会影响已生成问卷
- 答卷明细和 CSV / JSON 导出
- Admin Token 鉴权、写接口限流、安全响应头和健康检查
- SQLite WAL、自动迁移和在线一致性备份
- `beforeSubmit` / `afterSubmit` JavaScript 扩展钩子
- 后台 CLI，以及 React 构建缺失时的 EJS 兼容界面

## 环境要求

- Node.js 20 或更高版本
- npm 10 或更高版本
- 支持 `better-sqlite3` 的 Windows、Linux 或 macOS 环境

开发工具链中的 ESLint 10 要求较新的 Node.js 20 版本；参与开发时建议使用当前 Node.js 20 LTS 最新补丁版、22 LTS 或 24。

## 从源码快速启动

PowerShell：

```powershell
npm ci
npm run install:client
Copy-Item survey.config.example.js survey.config.js
npm run migrate
npm run build
npm start
Get-Content "$HOME\.questra\questra.log" -Tail 30
```

Bash：

```bash
npm ci
npm run install:client
cp survey.config.example.js survey.config.js
npm run migrate
npm run build
npm start
tail -n 30 ~/.questra/questra.log
```

`npm start` 会在后台启动服务并立即返回。日志末尾会显示访问地址、完整管理地址和 Admin Token；默认地址是 `http://localhost:3000`。首次进入 React 管理端时，URL 中的 `?token=` 会被保存到当前标签页的 `sessionStorage` 并从地址栏移除。

启动服务时也会自动执行尚未应用的数据库迁移，因此日常重启不必重复运行 `npm run migrate`。首次部署显式执行迁移的好处是可以在启动前单独发现数据库或权限问题。

停止和查看服务：

```bash
npm run start -- --help
npx questra status
npx questra stop
```

## 配置

`survey.config.js` 是部署实例的本地配置，不应提交。仓库只追踪 `survey.config.example.js`：

```js
'use strict';

module.exports = {
  port: 3000,
  host: '0.0.0.0',
  database: './data/questra.db',
  siteName: '我的问卷',
  logging: true,
  hooks: {
    async beforeSubmit(answerData) {
      // 抛出异常会阻止本次提交。
    },
    async afterSubmit(answerData) {
      // 此处失败只写日志，已保存的答卷不会回滚。
    }
  }
};
```

相对数据库路径始终相对于启动命令的工作目录解析。配置优先级如下：

| 设置 | 优先级（从高到低） | 默认值 |
| --- | --- | --- |
| 端口 | `--port`、`PORT`、配置文件 `port` | `3000` |
| 地址 | `--host`、`HOST`、配置文件 `host` | `0.0.0.0` |
| 配置文件 | `--config`、工作目录下 `survey.config.js` | 内置默认配置 |
| Admin Token | `QUESTRA_ADMIN_TOKEN`、数据库目录 `.admin-token`、自动生成 | 自动生成 UUID |
| 运行状态 | `QUESTRA_RUNTIME_FILE` | `~/.questra/runtime.json` |
| 服务日志 | `QUESTRA_LOG_FILE` | `~/.questra/questra.log` |

自动生成的 Token 会写入数据库目录下的 `.admin-token`，重启后保持不变。需要轮换 Token 时，先停止服务，再删除该文件并重新启动；生产环境更适合通过密钥管理系统设置 `QUESTRA_ADMIN_TOKEN`。

钩子可以直接使用 Node.js 内置 `fetch` 调用 Webhook。Webhook URL、API Key 等秘密应放在环境变量中，不要写入配置模板或源码。

## CLI

源码目录内可使用 `npx questra`；发布包也支持全局安装：

```bash
npm install -g questra
questra --help
```

| 命令 | 作用 |
| --- | --- |
| `questra start [--port N] [--host HOST] [--config FILE]` | 后台启动，日志写入用户目录 |
| `questra start --foreground` | 前台启动，供开发或 systemd、PM2、Docker 使用 |
| `questra status` | 查看 PID、端口、工作目录和启动时间 |
| `questra stop` | 停止当前运行状态文件对应的实例 |
| `questra restart` | 使用记录的工作目录、配置、地址和端口重启 |
| `questra migrate [--config FILE]` | 执行尚未应用的 SQL 迁移 |
| `questra backup [-o FILE] [--config FILE]` | 使用 SQLite 在线备份 API 导出一致性快照 |

默认只有一份全局运行状态。需要并行管理多个实例时，必须为每个实例设置不同的 `QUESTRA_RUNTIME_FILE` 和 `QUESTRA_LOG_FILE`，并在执行 `start`、`status`、`stop`、`restart` 时保持相同环境变量。

## 开发流程

先安装根目录与前端两套依赖：

```bash
npm ci
npm run install:client
```

一条命令同时启动后端和 Vite：

```bash
npm run dev:all
```

- 后端前台监听 `http://localhost:3000`，Node.js `--watch` 自动重启。
- Vite 默认监听 `http://localhost:5173`，并将 `/api`、`/static` 代理到后端。
- 管理端开发地址为 `http://localhost:5173/admin?token=<Admin Token>`。

也可以在两个终端中分别运行：

```bash
npm run dev
npm run dev:client
```

常用质量命令：

| 命令 | 内容 |
| --- | --- |
| `npm run check:repo` | 检查追踪文件、必要文件和 `.gitignore` 边界 |
| `npm run lint` | 检查后端、CLI、脚本和测试 |
| `npm test` | 执行 Node.js 集成测试 |
| `npm run lint:client` | 检查 React 源码 |
| `npm run test:client` | 执行 Vitest 单元测试 |
| `npm run check` | 依次执行仓库策略、前后端 Lint 和测试 |
| `npm run format` | 格式化后端、CLI 源码；会直接改文件 |

## 构建与发布

生产构建：

```bash
npm run build
```

构建流程为：

```text
client/src
  -> Vite 构建
  -> client/dist
  -> Express 托管 /assets、/admin、/s/:id
```

`client/dist` 是生成产物，不提交到 Git。若前端依赖尚未安装，`npm run build` 会先根据 `client/package-lock.json` 执行 `npm ci`。没有 `client/dist/index.html` 时，服务仍可启动，并回退到 `views/` 与 `public/` 中的旧版 EJS 界面。

发布前建议运行：

```bash
npm ci
npm run install:client
npm run check
npm run build
npm pack --dry-run
```

`npm pack` 和 `npm publish` 会触发 `prepack`：重新执行前端 `npm ci` 与构建，确保 tarball 不复用旧的 `client/dist`。最终 npm 包由 `package.json#files` 限定为 CLI、后端、迁移、EJS 兼容资源、前端构建产物和配置示例，不包含本地数据库或配置。

GitHub Actions 在 push 到 `main` 和 pull request 时执行三组任务：

1. 仓库策略检查、后端 Lint 与集成测试。
2. 前端 Lint、Vitest 与 Vite 构建。
3. `npm pack --dry-run`，并确认发布清单声明了 `client/dist`。

## 运行架构

```text
浏览器
  |-- /admin, /s/:id --------> React SPA（client/dist）
  |-- /api/admin/* ----------> Admin Token -> 管理 API
  |-- /api/surveys/* --------> 公开读取 / 限流提交
                                |
                                v
                         survey-service
                         快照、校验、判分、事务
                                |
                                v
                         better-sqlite3 + WAL
                                |
                                v
                         migrations/*.sql
```

核心目录职责：

```text
Questra/
├─ .github/workflows/ci.yml      # CI 检查、测试、构建和打包校验
├─ bin/questra.js                # CLI 与后台进程生命周期
├─ client/
│  ├─ src/api.js                 # 前端 API 封装
│  ├─ src/components/            # 布局、交互和通用组件
│  ├─ src/pages/                 # 管理端与公开填写页面
│  ├─ src/lib/                   # 展示纯函数及 Vitest 测试
│  └─ dist/                      # Vite 生产产物，不提交
├─ migrations/                  # 顺序执行且只执行一次的 SQLite 迁移
├─ public/                      # EJS 兼容界面的静态资源
├─ scripts/
│  ├─ build-client.js           # 本地与 prepack 前端构建
│  └─ check-repository.js       # Git 追踪和忽略策略守卫
├─ src/
│  ├─ lib/                      # HTTP 错误与序列化
│  ├─ middleware/               # 鉴权、安全响应头、内存限流
│  ├─ routes/                   # 管理 API、公开 API、EJS 路由
│  ├─ services/survey-service.js# 业务校验、快照、计分与事务
│  ├─ admin-token.js            # Token 加载和持久化
│  ├─ app.js                    # Express 应用装配
│  ├─ config.js                 # 配置加载和默认值
│  ├─ db.js                     # SQLite 连接和迁移
│  └─ runtime-state.js          # 后台实例状态和日志路径
├─ test/app.test.js             # 后端核心链路集成测试
├─ views/                       # 无 React 构建时的 EJS 兼容页面
├─ survey.config.example.js     # 可提交的配置模板
├─ package.json                 # 根项目命令与 npm 发布清单
└─ client/package.json          # 前端依赖与命令
```

## 数据与迁移

默认数据库为 `data/questra.db`。SQLite 启用外键、WAL 和 `synchronous=NORMAL`，迁移记录保存在 `schema_migrations`。

| 表 | 作用 |
| --- | --- |
| `question_pool` | 题库及标准答案 |
| `question_groups` / `question_group_items` | 题目分组与关联 |
| `surveys` | 问卷、考试、抽题与计分配置 |
| `survey_questions` | 生成实例时复制的题目快照 |
| `responses` | 一次提交及考试总分 |
| `answers` | 逐题答案、正确性和得分 |

不要在服务运行时直接复制单个 `.db` 文件，因为 WAL 中可能还有未合并数据。使用在线备份：

```bash
npx questra backup
npx questra backup --output D:\backup\questra.db
```

默认备份写入当前工作目录的 `data/questra-backup-<时间>.db`。数据库、WAL / SHM、备份、`.admin-token` 和运行日志均已被 `.gitignore` 屏蔽。

## 问卷与考试

题目类型包括单选、多选、文本和判断题。普通问卷可以不设置标准答案；考试中的每道题都必须有标准答案。

创建普通问卷：

```json
{
  "title": "开发者工具调研",
  "description": "内部调研",
  "selectionMode": "manual",
  "questionIds": [1, 2, 3]
}
```

随机抽题会从全部题目或指定分组中，按题型分别抽取指定数量。题目只在创建或结构化编辑时抽取一次，不会为每位填写者重新随机。

权重计分按“满分 × 题型权重 ÷ 该题型题数”计算每题分值，实际包含题型的权重总和必须为 100%：

```json
{
  "kind": "exam",
  "title": "Node.js 基础考试",
  "questionIds": [1, 2, 3],
  "scoringMode": "weighted",
  "totalScore": 100,
  "typeWeights": { "single": 40, "multiple": 30, "text": 30 }
}
```

逐题计分使用 `scoringMode: "per_question"` 和 `questionScores`。单选、判断题完全匹配；多选必须集合完全匹配；文本忽略首尾空格和大小写后匹配任一可接受答案。公开 API 不返回标准答案。

实例已有答卷后，只允许修改标题、描述、状态和截止时间；题目、抽题或计分结构不能再变更。没有答卷的实例可以重建结构，同时保留原实例 ID。

## REST API

管理 API 支持 `Authorization: Bearer <token>`、`x-admin-token`、查询参数或兼容界面的 HttpOnly Cookie。React 管理端使用当前标签页的 `sessionStorage` 保存 Token。管理 API 每 IP 每分钟最多 60 次，公开提交接口每 IP 每分钟最多 30 次。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | 进程与数据库健康检查 |
| `GET` | `/api/config` | 公开站点名称 |
| `GET` | `/api/admin/dashboard` | 管理统计与七日趋势 |
| `GET/POST` | `/api/admin/groups` | 列出或创建题目分组 |
| `PUT/DELETE` | `/api/admin/groups/:id` | 重命名或删除分组 |
| `GET/POST` | `/api/admin/questions` | 列出或创建题目 |
| `PUT/DELETE` | `/api/admin/questions/:id` | 更新或删除题目 |
| `GET/POST` | `/api/admin/surveys` | 列出或创建问卷实例 |
| `GET/PUT/DELETE` | `/api/admin/surveys/:id` | 查看、更新或删除实例 |
| `GET` | `/api/admin/surveys/:id/responses` | 查看答卷明细 |
| `GET` | `/api/admin/surveys/:id/export?format=csv\|json` | 导出答卷，默认 CSV |
| `GET` | `/api/surveys/:id` | 获取有效公开问卷 |
| `POST` | `/api/surveys/:id/responses` | 校验并提交答卷 |

提交时 `answers` 的键是实例内 `survey_questions.id`，不是题库 ID：

```json
{
  "answers": {
    "12": "VS Code",
    "13": ["Node.js", "SQLite"],
    "14": "自由文本"
  }
}
```

## 部署与安全

- 使用 Caddy 或 Nginx 终止 HTTPS，只公开需要的端口。
- 在 systemd、PM2 或容器中使用 `questra start --foreground`，让进程管理器接管退出和重启。
- 设置 `NODE_ENV=production` 后启用 CSP、`nosniff`、`X-Frame-Options: DENY` 等响应头。
- 使用 `/api/health` 作为反向代理或编排系统的探活端点。
- 定期执行 `questra backup`，并将备份存储到仓库目录之外。
- 请求日志会自动遮盖 URL 中的 `token` 参数，但仍应限制日志文件访问权限。

## Git 提交边界

`.gitignore` 负责屏蔽依赖、前端产物、覆盖率、环境文件、本地配置、数据库及其 WAL / SHM、备份、Token、日志、临时文件、IDE 和系统文件。以下文件应始终提交：

- 根目录和 `client/` 的 `package.json`、`package-lock.json`
- `survey.config.example.js`，但不是 `survey.config.js`
- 所有 `migrations/*.sql`
- 后端、前端、脚本、测试、EJS 与公共静态源码

提交前运行：

```bash
npm run check:repo
git status --short --ignored
git diff --cached --name-only
```

`.gitignore` 无法自动取消已经被 Git 追踪的文件；`check:repo` 会对此失败并阻止 CI 通过。确实需要提交被忽略的测试夹具时，应先为精确路径添加 `!` 例外规则，不要长期使用 `git add -f` 绕过保护。

## License

[MIT](LICENSE)
