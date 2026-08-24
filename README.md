# Questra

Questra 是面向个人开发者的轻量级自托管问卷框架。它使用 Node.js、Express、EJS 和 SQLite，无前端构建步骤，适合直接运行在低配个人服务器上。

## 快速开始

```bash
npm install
npm run migrate
npm start
```

启动后终端会打印本次运行随机生成的 Admin Token 和完整管理地址。直接打开该地址即可进入管理端。也可以固定环境变量 `QUESTRA_ADMIN_TOKEN`，便于反向代理或进程守护器长期使用。

作为 npm 包使用时，可在包含 `survey.config.js` 的目录运行：

```bash
npx questra migrate
npx questra start --port 3000 --host 0.0.0.0
```

Node.js 最低版本为 18。生产环境建议由 Caddy 或 Nginx 终止 HTTPS，并只开放实际使用的端口。

## 项目结构

```text
Questra/
├─ bin/
│  └─ questra.js                 # commander CLI：start / migrate
├─ migrations/
│  └─ 001_initial.sql            # SQLite DDL 与索引
├─ public/
│  ├─ admin.js                   # 管理端原生 JS
│  ├─ survey.js                  # 用户端提交逻辑
│  └─ styles.css                 # 响应式双端样式
├─ src/
│  ├─ lib/                       # HTTP 辅助与序列化
│  ├─ middleware/admin-auth.js   # Admin Token 校验
│  ├─ routes/                    # 管理 API、页面和公开路由
│  ├─ services/survey-service.js # 深拷贝、校验与事务
│  ├─ app.js                     # Express 应用装配
│  ├─ config.js                  # 配置加载
│  └─ db.js                      # SQLite 连接与迁移
├─ test/app.test.js              # 核心链路集成测试
├─ views/                        # 双端 EJS 模板
├─ package.json
├─ survey.config.js              # 当前项目配置与钩子示例
└─ survey.config.example.js      # 发布包内的配置模板
```

## 数据库 Schema

完整可执行 DDL 位于 [`migrations/001_initial.sql`](migrations/001_initial.sql)。

- `question_pool`：公共题目模板，`options_json` 保存选择题选项。
- `surveys`：问卷实例、状态和可选截止时间。
- `survey_questions`：问卷生成时的完整题目快照。`pool_question_id` 仅追溯来源，不建立外键，因此题池修改或删除不会波及问卷。
- `responses`：一次问卷提交。
- `answers`：逐题答案，多选为 JSON 数组，其他答案为 JSON 字符串。

SQLite 启用外键、WAL 和 `synchronous=NORMAL`。一个进程只持有一个数据库连接，不加载 SPA、ORM 或图表运行库，以控制内存占用。

## REST API

管理 API 必须携带 `Authorization: Bearer <token>`、`x-admin-token` 或 Admin Token Cookie。浏览器首次通过 `/admin?token=<token>` 进入时会自动写入 HttpOnly Cookie。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | 仪表盘统计和七日趋势 |
| `GET/POST` | `/api/admin/questions` | 列出或创建题目 |
| `PUT/DELETE` | `/api/admin/questions/:id` | 更新或删除题目 |
| `GET/POST` | `/api/admin/surveys` | 列出或深拷贝生成问卷 |
| `GET/PUT/DELETE` | `/api/admin/surveys/:id` | 查看、更新或删除问卷 |
| `GET` | `/api/admin/surveys/:id/responses` | 查看回收明细 |
| `GET` | `/api/surveys/:id` | 获取有效公开问卷 |
| `POST` | `/api/surveys/:id/responses` | 校验并提交答卷 |

创建题目：

```json
{"title":"你最常用的编辑器？","type":"single","options":["VS Code","Vim","其他"],"required":true}
```

生成问卷：

```json
{"title":"开发者工具调研","description":"仅用于个人项目规划","questionIds":[1,2,3],"expiresAt":"2026-12-31T16:00:00.000Z"}
```

提交答卷时，`answers` 的键是问卷题目 `survey_questions.id`，不是问题池 ID：

```json
{"answers":{"12":"VS Code","13":["Node.js","SQLite"],"14":"希望支持导出 CSV"}}
```

## 扩展钩子

`survey.config.js` 展示了使用内置 `fetch` 发送钉钉通知的完整示例。Webhook 从 `DINGTALK_WEBHOOK_URL` 环境变量读取，不应写死在源码中。

`beforeSubmit(answerData)` 在数据库写入前执行，抛出异常会阻止提交；`afterSubmit(answerData)` 在事务提交后执行。后者失败只记录服务日志，不会让填写者误以为答卷未保存而重复提交。

## CLI

```bash
npm start                                      # 启动服务
npm run dev                                    # 监听文件变化
npm run migrate                                # 手动迁移
npx questra start --config ./prod.js --port 8080
```

默认数据库为启动目录下的 `data/questra.db`，该目录已加入 `.gitignore`。备份时复制数据库文件即可；WAL 模式下建议先停止服务再复制，或使用 SQLite 在线备份命令。
