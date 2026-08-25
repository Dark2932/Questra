# Questra

Questra 是面向个人开发者的轻量级自托管问卷与考试框架。后端使用 Node.js、Express 和 SQLite，前端使用 React、Vite、Ant Design 和 Tailwind CSS。生产环境由 Express 统一托管前端构建产物，适合直接运行在低配个人服务器上。

## 快速开始

```bash
npm install
npm run migrate
npm run build:client
npm start
```

启动后终端会打印 Admin Token 和完整管理地址。Token 会持久化到数据目录下的 `.admin-token` 文件（0600 权限），**服务重启后保持不变**，`npm run dev`（自动重载）期间也不需要重新授权。需要更换 Token 时删除该文件，或设置环境变量 `QUESTRA_ADMIN_TOKEN` 固定使用。直接打开管理地址即可进入管理端；若浏览器提示需要授权，可在授权页直接粘贴最新 Token 恢复，或使用带 `?token=` 参数的管理链接。

作为 npm 包使用时，可在包含 `survey.config.js` 的目录运行：

```bash
npx questra migrate
npx questra start --port 3000 --host 0.0.0.0
```

Node.js 最低版本为 18。生产环境建议由 Caddy 或 Nginx 终止 HTTPS，并只开放实际使用的端口。

## 项目结构

```text
Questra/
├─ .github/workflows/ci.yml       # CI：测试、Lint、构建与打包校验
├─ bin/
│  └─ questra.js                 # commander CLI：start / migrate / backup
├─ client/                       # 前端 React 应用
│  ├─ src/
│  │  ├─ components/             # 布局与 UI 组件
│  │  ├─ pages/                  # 页面组件（管理端 + 公开问卷）
│  │  ├─ hooks/                  # 主题切换等自定义 Hook
│  │  ├─ lib/                    # 展示格式化等纯函数（含 Vitest 单测）
│  │  ├─ api.js                  # API 请求封装
│  │  ├─ App.jsx                 # 路由与主题配置
│  │  └─ main.jsx                # 入口
│  ├─ dist/                      # 构建产物（生产环境由 Express 托管）
│  ├─ eslint.config.js
│  ├─ package.json
│  ├─ vite.config.js
│  └─ tailwind.config.js
├─ migrations/
│  ├─ 001_initial.sql            # 问卷基础 DDL 与索引
│  └─ 002_exam_scoring.sql       # 标准答案与考试计分字段
├─ public/                       # 旧版静态资源（保留向后兼容）
├─ scripts/
│  └─ build-client.js            # npm pack / publish 前自动构建前端
├─ src/
│  ├─ lib/                       # HTTP 辅助与序列化
│  ├─ middleware/admin-auth.js   # Admin Token 校验
│  ├─ middleware/security.js     # 安全响应头（CSP 等）
│  ├─ middleware/rate-limit.js   # 内存限流（提交与写接口）
│  ├─ routes/                    # 管理 API 和公开路由
│  ├─ services/survey-service.js # 深拷贝、校验与事务
│  ├─ app.js                     # Express 应用装配
│  ├─ config.js                  # 配置加载
│  └─ db.js                      # SQLite 连接与迁移
├─ test/app.test.js              # 核心链路集成测试
├─ views/                        # 旧版 EJS 模板（保留向后兼容）
├─ eslint.config.mjs             # 后端 ESLint 配置
├─ package.json
├─ survey.config.js              # 当前项目配置与钩子示例
└─ survey.config.example.js      # 发布包内的配置模板
```

## 开发模式

前端开发服务器（端口 5173）会自动代理 API 请求到后端（端口 3000）：

```bash
# 一键同时启动后端与前端开发服务器
npm run dev:all

# 或分开启动
npm run dev         # 终端 1：后端（--watch 自动重载）
npm run dev:client  # 终端 2：前端开发服务器
```

访问 `http://localhost:5173/admin?token=xxx` 进行开发调试。

### 质量检查

```bash
npm run lint         # 后端 ESLint
npm run lint:client  # 前端 ESLint
npm run format       # 后端 Prettier
npm test             # 后端集成测试（node:test）
cd client && npm run lint && npm test && npm run build  # 前端全链路
```

GitHub Actions（`.github/workflows/ci.yml`）会在每次 push 时自动执行后端测试与 Lint、前端 Lint/测试/构建，并校验 npm 发布包包含 `client/dist`。

## 数据库 Schema

完整可执行 DDL 位于 [`migrations/001_initial.sql`](migrations/001_initial.sql)。

- `question_pool`：公共题目模板，`options_json` 保存选择题选项。
- `surveys`：普通问卷或考试实例、状态、截止时间与计分配置。
- `survey_questions`：实例生成时的题目、标准答案和分值快照。`pool_question_id` 仅追溯来源，不建立外键，因此题池修改或删除不会波及已发布实例。
- `responses`：一次问卷或考试提交，考试记录总分和满分。
- `answers`：逐题答案、多选 JSON 数组、正确性和本题得分。

SQLite 启用外键、WAL 和 `synchronous=NORMAL`。一个进程只持有一个数据库连接，不加载 ORM 或图表运行库，以控制内存占用。

## REST API

管理 API 必须携带 `Authorization: Bearer <token>`、`x-admin-token` 或 Admin Token Cookie。浏览器首次通过 `/admin?token=<token>` 进入时会自动写入 HttpOnly Cookie。管理 API 和公开提交接口均按 IP 限流（60 次/分钟、提交 30 次/分钟），超限返回 `429`。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | 健康检查（含数据库连通性，供反向代理 / systemd 探测） |
| `GET` | `/api/config` | 获取站点配置 |
| `GET` | `/api/admin/dashboard` | 仪表盘统计和七日趋势 |
| `GET/POST` | `/api/admin/questions` | 列出或创建题目 |
| `PUT/DELETE` | `/api/admin/questions/:id` | 更新或删除题目 |
| `GET/POST` | `/api/admin/surveys` | 列出或深拷贝生成问卷 |
| `GET/PUT/DELETE` | `/api/admin/surveys/:id` | 查看、更新或删除问卷 |
| `GET` | `/api/admin/surveys/:id/responses` | 查看回收明细 |
| `GET` | `/api/admin/surveys/:id/export?format=csv\|json` | 导出答卷（默认 CSV，带 UTF-8 BOM，Excel 可直接打开） |
| `GET` | `/api/surveys/:id` | 获取有效公开问卷 |
| `POST` | `/api/surveys/:id/responses` | 校验并提交答卷（限流 30 次/分钟/IP） |

创建题目：

```json
{"title":"你最常用的编辑器？","type":"single","options":["VS Code","Vim","其他"],"required":true}
```

生成问卷：

```json
{"title":"开发者工具调研","description":"仅用于个人项目规划","questionIds":[1,2,3],"expiresAt":"2026-12-31T16:00:00.000Z"}
```

## 考试与计分

问题池中的标准答案是可选字段：没有答案的题目仍可用于普通问卷，但不能加入考试。单选答案为字符串，多选和文本可接受答案为数组：

```json
{"title":"Node.js 使用哪个 JavaScript 引擎？","type":"single","options":["V8","SpiderMonkey"],"correctAnswer":"V8","required":true}
```

权重模式按 `满分 × 题型权重 ÷ 该题型题目数` 计算单题分值，考试实际包含的题型权重必须合计 100%：

```json
{
  "kind":"exam",
  "title":"Node.js 基础考试",
  "questionIds":[1,2,3],
  "scoringMode":"weighted",
  "totalScore":100,
  "typeWeights":{"single":40,"multiple":30,"text":30}
}
```

逐题累加模式直接为每道问题池题目指定分值，满分由所有题目分值相加得到。管理页面提供按题型批量填写的快捷项：

```json
{
  "kind":"exam",
  "title":"专项练习",
  "questionIds":[1,2],
  "scoringMode":"per_question",
  "questionScores":{"1":5,"2":15}
}
```

自动判分规则：单选完全匹配；多选答案集合完全匹配，不计算部分分；文本忽略首尾空格和大小写后，匹配任一可接受答案。标准答案只在受 Token 保护的管理 API 返回，公开页面和公开 GET API 不包含答案。

提交答卷时，`answers` 的键是问卷题目 `survey_questions.id`，不是问题池 ID：

```json
{"answers":{"12":"VS Code","13":["Node.js","SQLite"],"14":"希望支持导出 CSV"}}
```

## 扩展钩子

`survey.config.js` 展示了使用内置 `fetch` 发送钉钉通知的完整示例。Webhook 从 `DINGTALK_WEBHOOK_URL` 环境变量读取，不应写死在源码中。

`beforeSubmit(answerData)` 在数据库写入前执行，抛出异常会阻止提交；`afterSubmit(answerData)` 在事务提交后执行。后者失败只记录服务日志，不会让填写者误以为答卷未保存而重复提交。

## CLI

```bash
npm start                      # 启动服务
npm run dev                    # 监听文件变化
npm run migrate                # 手动迁移
npx questra start --config ./prod.js --port 8080
npx questra backup             # 在线备份数据库（WAL 安全，无需停机）
npx questra backup -o /backup/questra.db
```

默认数据库为启动目录下的 `data/questra.db`，该目录已加入 `.gitignore`。直接复制数据库文件时建议先停止服务（WAL 模式存在未合并的 `-wal` / `-shm` 文件）；推荐使用 `npx questra backup`，它利用 SQLite 在线备份 API，服务运行期间也能导出一致性快照。数据库损坏时，先备份当前版本再重新执行 `npm run migrate` 重建。

## 运维建议

- 生产环境使用 Caddy 或 Nginx 终止 HTTPS；`/api/health` 可配置为反向代理或 systemd 的探活端点。
- 服务公开了安全响应头（CSP、`nosniff`、`X-Frame-Options: DENY` 等），仅在 `NODE_ENV=production` 时启用，开发模式不受影响。
- 只需公开实际使用的端口；管理地址随机 Token 每次启动都会重新生成，建议固定 `QUESTRA_ADMIN_TOKEN` 并妥善保管。

## 设计系统

- **框架**：React 18 + Vite + Ant Design 6
- **样式**：Tailwind CSS + CSS Variables
- **主题**：浅色/深色模式，暗色模式采用 Apple 设计风格（纯黑底 + 毛玻璃头部）
- **配色**：Apple HIG 语义色，暗色基底 `#000000`、分层灰 `#1c1c1e` / `#2c2c2e`，10px 圆角
- **动效**：克制优雅，页面切换 200ms easeOut（framer-motion），无花哨特效
- **测试**：后端 `node:test` 集成测试，前端 Vitest 单测，CI 自动执行 Lint / Test / Build / 打包校验

