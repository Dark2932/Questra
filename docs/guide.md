# Questra 深入部署与开发指南

这份指南面向两类人：

- 想把 Questra 稳定部署到服务器上的管理员
- 想修改界面、调用 API 或编写提交后处理插件的开发者

README 只负责帮助你快速跑起来；本文件解释每个步骤背后的含义，并给出可以直接改造的示例。

## 快速导航

- 只想安装使用：阅读 README 的“安装”和“启动”。
- 负责线上部署：阅读第 2 节、第 6 节和第 8 节。
- 需要调用接口或写自动化：阅读第 4 节和第 5 节。
- 需要修改源码或发布版本：阅读第 7 节。

## 1. 先理解 Questra

### 1.1 Questra 由什么组成

Questra 是一个 Node.js 进程。这个进程同时承担三件事：

1. 用 Express 提供 HTTP API。
2. 用 SQLite 保存题库、问卷和答卷。
3. 托管 React/Vite 编译出来的管理端和填写页面。

可以把它理解为“一个程序 + 一个数据库文件”，不需要额外安装 MySQL、Redis 或消息队列。它很适合低配置个人服务器，但也意味着默认是单机部署：多台服务器同时写同一个 SQLite 文件不是支持的运行方式。

### 1.2 题库、问卷和答卷的关系

- **题库（question pool）**：可以反复使用和编辑的题目素材。
- **问卷实例（survey）**：发布时从题库复制出来的快照。
- **答卷（response）**：填写者提交的一次结果。

生成问卷时，题目标题、选项、必填属性、标准答案和分值会复制到 `survey_questions`。因此你后来修改题库，不会偷偷改变已经发出去的问卷或历史成绩。这是 Questra 保持数据可追溯的关键设计。

### 1.3 运行目录很重要

Questra 从“启动命令所在目录”读取配置，但默认数据路径绑定到 Questra 安装根目录：

```text
配置所在目录/
└─ survey.config.js       # 可选，本地配置

Questra 安装根目录/
└─ data/
   ├─ questra.db          # SQLite 数据库
   └─ .admin-token        # 自动生成的管理 Token
```

例如 Questra 安装在 `C:\Users\me\AppData\Roaming\npm\node_modules\questra`，无论你从哪个目录执行 `questra start`，默认数据库都会是该安装根目录下的 `data\questra.db`。不要直接编辑或删除 npm 安装目录中的数据；生产环境建议用 `QUESTRA_DATA_DIR` 指向安装目录之外的持久化目录。

## 2. 部署

### 2.1 环境要求

- Node.js 22 或更高版本
- npm >=10.9.0 或 pnpm >=11.0.0
- 能编译或安装 `better-sqlite3` 原生模块的 Windows、Linux 或 macOS
- 生产环境建议有 HTTPS 反向代理和定期备份空间

检查版本：

```powershell
node --version
npm --version
pnpm --version
```

开发和 CI 以 Node.js 22、npm 10.9+、pnpm 11.24.0 为基线。使用 nvm 时，Linux / macOS 的 nvm 可在仓库根目录执行 `nvm use` 读取 `.nvmrc` 中的 `22`；nvm-windows 通常需要显式执行 `nvm use 22`。切换后重新打开终端，让 PATH 生效。

Node.js 版本太旧时，常见表现是依赖安装失败、`commander` 无法加载或 Vite/Vitest 报引擎不匹配。优先切换到 Node.js 22，不要先删除 lockfile 重新安装。

### 平台差异总览

Questra 的 Node.js、SQLite、浏览器界面和 REST API 在 Windows、Linux、macOS 上保持一致。需要区分的是终端语法、文件路径和系统级进程管理器：

| 项目 | Windows | Linux | macOS |
| --- | --- | --- | --- |
| 终端 | PowerShell | Bash / Zsh | Terminal 中的 Zsh / Bash |
| 配置路径示例 | `C:\Questra\production\survey.config.js` | `/srv/questra/survey.config.js` | `/Users/me/questra/survey.config.js` |
| 数据目录 | 安装根目录 `data\` | 安装根目录 `data/` | 安装根目录 `data/` |
| 用户运行目录 | `%USERPROFILE%\.questra` | `~/.questra` | `~/.questra` |
| 查看日志 | `Get-Content ... -Tail 100` | `tail -n 100 ...` | `tail -n 100 ...` |
| 查看端口 | `Get-NetTCPConnection` | `ss -ltnp` 或 `lsof -i` | `lsof -nP -iTCP` |
| 常用托管方式 | 任务计划程序、PM2、前台模式 | systemd、PM2、Docker | launchd、PM2、前台模式 |

PowerShell 使用 `$env:NAME = 'value'` 设置当前终端环境变量；Bash / Zsh 使用 `export NAME='value'`。`survey.config.js` 的 JavaScript 内容不因操作系统而改变。

如果只是个人电脑或临时内网使用，三套系统都可以直接运行 `questra start`。如果需要开机自启、崩溃重启和系统日志，应使用对应平台的服务管理器，并让 Questra 以前台模式运行。

### 各系统安装 Node.js 的建议

Questra 要求 Node.js 22+，并以 Node.js 22 LTS 作为开发和 CI 基线。安装 Node.js 后再执行 `npm install -g questra@latest`。

| 系统 | 推荐方式 | 说明 |
| --- | --- | --- |
| Windows | nvm-windows 切换到 Node.js 22，或 Node.js 官方 22 LTS 安装程序 | 安装后重新打开 PowerShell，让 PATH 生效 |
| Linux | nvm 安装并切换 Node.js 22，或发行版包管理器 | 服务器上建议固定 Node 主版本，不要让系统升级自动切换运行时 |
| macOS | nvm 安装并切换 Node.js 22，或 Homebrew / Node.js 官方 22 LTS 安装程序 | Apple Silicon 和 Intel 的 npm 全局目录可能不同，用 `which questra` 验证 |

`better-sqlite3` 通常会下载当前 Node 版本的预编译包。如果安装时进入本地编译：

- Windows：安装 Visual Studio Build Tools 的 C++ 构建工具，并确保 Python 可用。
- Debian / Ubuntu：安装 `build-essential`、`python3` 和 `make`。
- macOS：执行 `xcode-select --install`，然后重试 npm 安装。

不要因为原生依赖安装失败就删除 `pnpm-lock.yaml`；先确认 Node 主版本、pnpm 版本和编译工具链。

### 2.2 推荐安装方式

管理员只需要：

```powershell
npm install -g questra@latest
```

全局安装做了两件事：把 Questra 的运行文件安装到 npm 全局目录，并把 `questra` 命令加入 PATH。默认数据跟随 Questra 安装根目录，不会因为你从不同目录执行命令而产生多份数据库。生产环境应设置 `QUESTRA_DATA_DIR`，把数据库放在 npm 包目录之外，避免升级或卸载包时误操作数据。

如果 PowerShell 提示“无法识别 questra”，执行 `npm prefix -g` 查看全局目录，确认该目录在 PATH 中，然后重新打开终端。Windows 下命令入口通常位于 `%AppData%\npm\questra.ps1`。

### 2.3 首次启动

在独立部署目录启动：

```powershell
New-Item -ItemType Directory -Force C:\Questra\production | Out-Null
Set-Location C:\Questra\production
questra start
```

Linux：

```bash
sudo mkdir -p /srv/questra
sudo chown "$USER":"$USER" /srv/questra
cd /srv/questra
questra start
```

macOS：

```bash
mkdir -p "$HOME/questra"
cd "$HOME/questra"
questra start
```

首次启动会自动：

- 创建数据目录和数据库文件
- 执行所有未记录在 `schema_migrations` 的 SQL 迁移
- 创建随机 Admin Token，并以受限权限写入 `.admin-token`
- 首次打开管理页时显示初始化向导，创建唯一管理员账户和站点设置
- 默认在用户目录的 `.questra\runtime.json` 记录 PID、端口、工作目录和配置路径
- 默认将后台进程日志写入 `.questra\questra.log`；设置 `QUESTRA_RUNTIME_FILE` 或 `QUESTRA_LOG_FILE` 后会改用指定路径

启动成功后，先检查服务状态：

```powershell
questra status
```

Linux / macOS 使用同一个命令：

```bash
questra status
```

再检查健康接口：

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

Linux / macOS：

```bash
curl http://127.0.0.1:3000/api/health
```

正常结果包含 `status: "ok"` 和 `database: "ok"`。如果健康检查失败，先看日志，不要直接删除数据库。

#### 初始化和账号登录

首次打开 `/admin` 时，前端会依次显示欢迎页、管理员账户和站点设置。初始化接口只在
`admin_accounts` 为空时接受请求，数据库通过 `id = 1` 约束保证整个实例只有一组管理员账户。
密码使用 Node.js 内置 `scrypt` 加随机盐哈希保存，不会写入明文密码。

初始化完成后，登录接口会签发 7 天有效的 HttpOnly 会话 Cookie。修改账号名或密码会使已有会话失效，
需要在所有设备重新登录。旧版本的 Admin Token、`?token=` 链接和 `Authorization: Bearer` 仍可作为兼容入口。

如果忘记密码，使用仍有效的 Admin Token 进入后台后，在“设置 → 账号安全”中修改；生产环境应同时保护
`.admin-token` 文件和数据库目录。

后台“设置”按类别分为：

- **站点设置**：修改站点名称和图标；名称留空恢复为 `Questra`，图标支持 URL、站内路径或小型图片。管理界面上传图片限制为 128 KB，API 还会校验图片地址或 Data URL 的长度。
- **账号安全**：修改管理员昵称、登录账号和密码；系统不提供第二管理员账户。

### 2.4 配置端口、地址和数据库

临时调整可以使用启动参数：

```powershell
questra start --port 8080 --host 127.0.0.1
```

长期配置写入当前目录的 `survey.config.js`：

```js
'use strict';

module.exports = {
  port: 3000,
  host: '0.0.0.0',
  database: './data/questra.db',
  siteName: '团队反馈中心',
  logging: true,
  hooks: {}
};
```

参数含义：

| 配置 | 作用 | 默认值 |
| --- | --- | --- |
| `port` | HTTP 监听端口 | `3000` |
| `host` | 监听地址；`0.0.0.0` 表示接受外部访问 | `0.0.0.0` |
| `database` | SQLite 文件路径；相对路径以安装根目录为基准 | `./data/questra.db` |
| `siteName` | 页面和标题中显示的站点名 | `Questra` |
| `logging` | 是否输出请求日志 | `true` |
| `hooks` | 提交前后扩展钩子 | `{}` |

端口和监听地址的优先级为 `命令行参数` > `环境变量` > `survey.config.js` > `默认值`：

```text
端口：--port > PORT > survey.config.js > 3000
地址：--host > HOST > survey.config.js > 0.0.0.0
```

数据库路径会被解析成绝对路径。默认路径是安装根目录的 `data/questra.db`；配置中的相对 `database` 路径也以安装根目录为基准，而不是当前工作目录。迁移、启动和备份会因此始终指向同一个数据库。

### 2.5 固定管理 Token

默认策略是：优先使用 `QUESTRA_ADMIN_TOKEN`，没有时复用数据库目录下的 `.admin-token`，文件不存在才生成随机 Token。

生产环境建议先固定持久化数据目录：

Windows PowerShell：

```powershell
$env:QUESTRA_DATA_DIR = 'D:\QuestraData'
```

Linux / macOS：

```bash
export QUESTRA_DATA_DIR='/var/lib/questra'
```

`QUESTRA_DATA_DIR` 优先于配置文件中的 `database`。如果它使用相对路径，仍以 Questra 安装根目录为基准。生产环境使用绝对路径更清晰，也不受 npm 更新包目录的影响。

#### 从旧版本迁移数据

旧版本可能把数据库写入“执行命令的目录/data”。升级后，新版本默认改用安装根目录，
因此不会自动在多个旧目录之间猜测要使用哪一份数据。迁移时请按以下顺序操作：

1. 停止旧的 Questra 服务，并确认旧数据库目录中同时保留 `questra.db`、`questra.db-wal`、`questra.db-shm`（如果存在）及 `.admin-token`。
2. 将 `QUESTRA_DATA_DIR` 设置为这个旧 `data` 目录的绝对路径。
3. 使用同一个环境变量运行 `questra migrate` 和 `questra start`，检查问卷和答卷是否完整。
4. 确认无误后，再把数据库目录复制到独立数据盘，并将环境变量更新为新路径。

Windows PowerShell 示例：

```powershell
$env:QUESTRA_DATA_DIR = 'D:\old-questra\data'
questra migrate
questra start
```

Linux / macOS 示例：

```bash
export QUESTRA_DATA_DIR='/srv/old-questra/data'
questra migrate
questra start
```

PowerShell 临时设置：

```powershell
$env:QUESTRA_ADMIN_TOKEN = '请替换为长度足够的随机字符串'
questra restart
```

Linux / macOS 当前终端设置：

```bash
export QUESTRA_ADMIN_TOKEN='请替换为长度足够的随机字符串'
questra restart
```

如果需要每次登录都生效，可把 `export` 写入 Linux 的 `~/.bashrc` / `~/.zshrc` 或 macOS 的 `~/.zshrc`；生产服务更推荐使用系统服务的 EnvironmentFile / plist，而不是写入交互式 shell 配置。轮换由文件自动生成的 Token 前，先取消 `QUESTRA_ADMIN_TOKEN` 环境变量，否则环境变量仍会覆盖新文件。

生产环境应通过 systemd EnvironmentFile、Windows 服务管理器、容器 Secret 或云密钥服务注入，不要把 Token 写进 Git。轮换自动生成的 Token 时，停止服务后删除数据库目录下的 `.admin-token`，再重新启动。

### 2.6 让服务长期运行

Questra 的 `start` 默认后台运行，适合个人电脑和简单服务器。`status`、`stop`、`restart` 通过用户目录的运行状态文件找到实例。

进程管理器接管服务时使用前台模式：

```powershell
questra start --foreground
```

前台模式不会自行分离当前终端，收到 `Ctrl+C`、SIGTERM 等停止信号时会先关闭 HTTP 服务和 SQLite 连接，再退出。systemd、PM2、Docker 等管理器应监控这个前台进程，而不是监控一个会自行返回的后台命令。

systemd 示例：

```ini
[Unit]
Description=Questra survey service
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/questra
ExecStart=/usr/local/bin/questra start --foreground
Environment=NODE_ENV=production
EnvironmentFile=-/etc/questra/questra.env
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`/etc/questra/questra.env` 可以保存：

```text
QUESTRA_ADMIN_TOKEN=replace-with-secret
QUESTRA_DATA_DIR=/var/lib/questra
QUESTRA_RUNTIME_FILE=/run/questra/runtime.json
QUESTRA_LOG_FILE=/var/log/questra/questra.log
```

生产环境中请让日志轮转工具管理日志文件，并限制 Token 和数据库的读权限。
`ExecStart` 必须替换为目标主机上 `command -v questra` 返回的绝对路径；如果使用 nvm，systemd 服务不会自动加载交互式 shell 配置，建议使用固定的系统级 Node/npm 安装或填写 nvm 下实际可执行文件路径。使用 `/run/questra/runtime.json` 或 `/var/log/questra/questra.log` 前，还要预先创建目录并授予服务账号写权限。

#### Windows 任务计划程序

Windows 没有 systemd。可以在“任务计划程序”创建“开机时”任务：

1. 触发器选择“系统启动时”或“用户登录时”。
2. 操作选择“启动程序”。
3. 程序填写 `questra.cmd` 的完整路径；可以先运行 `where.exe questra` 查找，例如 `%AppData%\npm\questra.cmd`。
4. 参数填写 `start --foreground`。
5. “起始于”填写部署目录，例如 `C:\Questra\production`。
6. 需要无人值守运行时勾选“无论用户是否登录都运行”，并配置服务账号对数据目录的读写权限。

不要让任务计划程序执行 `questra start` 的默认后台模式，否则会多包一层进程，停止和重启状态更难追踪。

#### macOS launchd

macOS 的系统级服务通常使用 launchd。用户级服务可以保存到 `~/Library/LaunchAgents/com.questra.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.questra</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/questra</string>
    <string>start</string>
    <string>--foreground</string>
  </array>
  <key>WorkingDirectory</key><string>/Users/me/questra</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key><string>production</string>
    <key>QUESTRA_ADMIN_TOKEN</key><string>replace-with-secret</string>
    <key>QUESTRA_DATA_DIR</key><string>/Users/me/Library/Application Support/Questra</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/Users/me/Library/Logs/questra.log</string>
  <key>StandardErrorPath</key><string>/Users/me/Library/Logs/questra-error.log</string>
</dict>
</plist>
```

先用 `which questra` 确认可执行文件路径；Apple Silicon 常见路径是 `/opt/homebrew/bin/questra`，Intel Mac 常见路径是 `/usr/local/bin/questra`。加载和停止：

```bash
launchctl bootstrap gui/$(id -u) "$HOME/Library/LaunchAgents/com.questra.plist"
launchctl kickstart -k gui/$(id -u)/com.questra
launchctl bootout gui/$(id -u)/com.questra
```

plist 中的 Token 只能由部署用户读取。多人共用的 Mac 或正式服务器更适合使用系统级服务账号和外部密钥存储。

### 2.7 HTTPS 和反向代理

Questra 自身提供 HTTP。公网部署时建议让 Caddy、Nginx 或云负载均衡器负责 TLS，Questra 只监听本机地址：

```text
浏览器 --HTTPS--> Caddy/Nginx --HTTP 127.0.0.1:3000--> Questra
```

反向代理至少需要：

- 转发普通 GET、POST、PUT、DELETE 请求
- 正确转发 `Host`。Questra 默认未启用 Express 的 `trust proxy`，限流可能按反向代理的地址计算；当前版本没有对应的配置项，如需按真实客户端 IP 限流，需要在源码中为受信代理显式启用该设置，或在代理层完成限流。
- 支持较大的 JSON 请求体（Questra 默认上限 256 KB）
- 将 `/api/health` 暴露给探活系统

不要把 SQLite 文件、`data/` 目录或 `.admin-token` 目录配置为静态文件目录。

## 3. 使用

### 3.1 管理后台认证

推荐使用启动横幅中的地址：

```text
http://localhost:3000/admin?token=<Admin Token>
```

React 管理端会把 URL 中的 Token 保存到当前标签页的 `sessionStorage`，并从地址栏移除。使用账号密码登录后，HttpOnly 会话 Cookie 默认有效 7 天，刷新页面、关闭标签页甚至重启浏览器通常都不需要重新登录；仅使用兼容的 Token 链接时，Token 通常只保存在当前标签页，关闭标签页后需要再次使用完整链接或粘贴 Token。

程序化调用管理 API 时使用：

```http
Authorization: Bearer <Admin Token>
```

也支持：

```http
x-admin-token: <Admin Token>
```

公开问卷 API 不需要 Token，且不会返回标准答案。

### 3.2 题目设计建议

题目保存到题库时，建议先明确三件事：

1. 填写者看到的标题和选项是什么。
2. 是否必填。
3. 它是普通调研题，还是可以用于考试判分的题。

单选题和判断题的答案必须是选项中的一个值；多选题答案是选项数组；文本题可以设置多个可接受答案。考试中没有标准答案的题目会被拒绝发布。

分组是组织工具，不是权限系统。删除分组不会删除题目，也不会删除已生成问卷。

### 3.3 创建普通问卷

管理页面适合日常使用；API 适合自动化。手动创建问卷的请求示例：

```http
POST /api/admin/surveys
Authorization: Bearer <token>
Content-Type: application/json
```

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

随机抽题示例：

```json
{
  "kind": "survey",
  "title": "随机练习",
  "selectionMode": "random",
  "sourceGroupId": 2,
  "randomCounts": {
    "single": 5,
    "multiple": 2,
    "text": 1,
    "judgment": 2
  }
}
```

随机抽题是在问卷创建时执行一次，不是每位填写者打开链接时重新抽取。组内题目数量不足时，创建会返回 400 错误。

公开读取：

```http
GET /api/surveys/<survey-id>
```

公开填写页面：

```text
http://localhost:3000/s/<survey-id>
```

### 3.4 创建考试和判分

权重模式：

```json
{
  "kind": "exam",
  "title": "Node.js 基础",
  "questionIds": [1, 2, 3],
  "scoringMode": "weighted",
  "totalScore": 100,
  "typeWeights": {
    "single": 40,
    "multiple": 30,
    "text": 30
  }
}
```

权重只填写实际出现的题型，合计必须为 100。每道题的分值为：

```text
满分 × 该题型权重 ÷ 该题型题数
```

逐题分值模式：

```json
{
  "kind": "exam",
  "title": "专项练习",
  "questionIds": [1, 2],
  "scoringMode": "per_question",
  "questionScores": {
    "1": 5,
    "2": 15
  }
}
```

判分规则：

- 单选和判断：字符串完全匹配
- 多选：去重后比较集合，必须完全一致，不给部分分
- 文本：首尾空白和大小写会被忽略，匹配任意标准答案即可

提交答案时，键必须是问卷实例题目的 ID，而不是题库题目 ID：

```json
{
  "answers": {
    "12": "V8",
    "13": ["Node.js", "SQLite"],
    "14": "nodejs"
  }
}
```

### 3.5 查看和导出

管理员可以查看问卷统计、答卷列表和逐题判分结果。导出接口：

```text
GET /api/admin/surveys/<survey-id>/export
GET /api/admin/surveys/<survey-id>/export?format=json
```

默认 CSV 适合 Excel；JSON 适合程序处理。导出接口也需要 Admin Token。

## 4. 插件和扩展开发

### 4.1 当前的插件模型

Questra 目前没有强制的 `questra-plugin` 类或生命周期注册器。最稳定、最简单的扩展方式是：

1. 在 `survey.config.js` 中实现 `beforeSubmit` 或 `afterSubmit`。
2. 在钩子里调用外部 Webhook、写入自己的服务或做业务校验。
3. 通过环境变量提供密钥。

这相当于“配置文件就是一个小插件”。好处是部署简单，不需要修改 Questra 核心；代价是钩子运行在 Questra 进程里，插件异常或慢请求会影响提交链路。

### 4.2 钩子数据结构

两个钩子收到的对象大致如下：

```js
{
  survey: {
    id: '问卷 ID',
    title: '问卷标题'
  },
  answers: [
    {
      questionId: 12,
      title: '题目标题',
      type: 'single',
      value: 'V8'
    }
  ],
  submittedAt: '2026-08-25T12:00:00.000Z',
  responseId: '答卷 ID',
  score: 80,
  maxScore: 100
}
```

普通问卷的 `score` 和 `maxScore` 为 `null`。`responseId`、分数等字段在数据库保存完成后才会补充，因此 `beforeSubmit` 看不到这些字段，`afterSubmit` 可以看到。

### 4.3 beforeSubmit：提交前校验或通知

`beforeSubmit` 在数据库写入前执行。它适合：

- 检查外部报名系统中的用户资格
- 拒绝重复提交
- 在允许保存前通知审批系统
- 对答案做额外业务校验

抛出异常会阻止保存，并向填写者返回错误。示例：

```js
'use strict';

module.exports = {
  async beforeSubmit(answerData) {
    const webhook = process.env.QUESTRA_APPROVAL_WEBHOOK;
    if (!webhook) return;

    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        surveyId: answerData.survey.id,
        title: answerData.survey.title,
        answers: answerData.answers
      })
    });

    if (!response.ok) {
      throw new Error(`审批系统返回 HTTP ${response.status}`);
    }
  }
};
```

注意：外部系统超时也会让本次提交失败。对非关键通知不要使用 `beforeSubmit`，否则填写者可能因为通知系统故障无法提交。

### 4.4 afterSubmit：保存后的通知

`afterSubmit` 在答卷已经写入 SQLite 后执行。Questra 会等待这个钩子的 Promise 完成后再返回提交响应，但不会因为钩子失败回滚已保存的数据。它适合：

- 发送钉钉、企业微信或 Slack 通知
- 把答卷同步到 CRM、表格或数据仓库
- 写入自己的审计系统

它抛出的错误只会记录到服务日志，不会撤销已经保存的答卷：

```js
module.exports = {
  async afterSubmit(answerData) {
    const webhook = process.env.DINGTALK_WEBHOOK_URL;
    if (!webhook) return;

    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'text',
          text: {
            content: `收到《${answerData.survey.title}》的新答卷 ${answerData.responseId}`
          }
        })
      });
      if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
    } catch (error) {
      console.error('[plugin] 通知失败:', error.message);
    }
  }
};
```

Questra 本身也会捕获 `afterSubmit` 异常；示例中的 `try/catch` 是为了让插件日志更容易加入自己的上下文。

### 4.5 把插件拆成独立 npm 模块

当多个 Questra 项目要共用同一套逻辑时，可以把函数提取成普通 CommonJS 模块：

```js
// questra-notify.js
'use strict';

function createNotifier({ webhook, fetchImpl = fetch }) {
  return {
    async afterSubmit(data) {
      if (!webhook) return;
      const response = await fetchImpl(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`通知失败: ${response.status}`);
    }
  };
}

module.exports = { createNotifier };
```

在部署目录安装模块后，在 `survey.config.js` 中接入：

```js
const { createNotifier } = require('questra-notify');

module.exports = {
  hooks: createNotifier({
    webhook: process.env.DINGTALK_WEBHOOK_URL
  })
};
```

插件应做到：

- 不在源码中写死秘密
- 对外部请求设置合理超时或失败处理
- 记录可定位的错误信息
- 避免在 `beforeSubmit` 中做不必要的慢操作
- 让重复调用安全（Webhook 重试时不会产生重复业务记录）

## 5. API 和自动化

### 5.1 基础接口

| 方法 | 路径 | 需要 Token | 作用 |
| --- | --- | --- | --- |
| `GET` | `/api/health` | 否 | 健康检查 |
| `GET` | `/api/config` | 否 | 获取站点名称和图标 |
| `GET` | `/api/setup/status` | 否 | 查询是否已完成首次初始化 |
| `POST` | `/api/setup` | 否（仅首次） | 创建唯一管理员账户并保存站点初始设置 |
| `POST` | `/api/auth/login` | 否 | 使用管理员账号密码登录并签发会话 Cookie |
| `GET` | `/api/auth/me` | 会话或 Token | 获取当前登录状态 |
| `POST` | `/api/auth/logout` | 否 | 注销当前会话 |
| `GET` | `/api/surveys/:id` | 否 | 获取有效公开问卷 |
| `POST` | `/api/surveys/:id/responses` | 否 | 提交答卷 |
| `GET` | `/api/admin/dashboard` | 是 | 管理统计 |
| `GET` | `/api/admin/settings` | 是 | 查看站点名称、站点图标和管理员资料 |
| `PUT` | `/api/admin/settings/site` | 是 | 修改站点名称、站点图标 |
| `PUT` | `/api/admin/settings/account` | 是 | 修改唯一管理员昵称、账号或密码 |
| `GET/POST` | `/api/admin/questions` | 是 | 查询或创建题目 |
| `PUT/DELETE` | `/api/admin/questions/:id` | 是 | 更新或删除题目 |
| `GET/POST` | `/api/admin/groups` | 是 | 查询或创建分组 |
| `PUT/DELETE` | `/api/admin/groups/:id` | 是 | 修改或删除分组 |
| `GET/POST` | `/api/admin/surveys` | 是 | 查询或创建问卷 |
| `GET/PUT/DELETE` | `/api/admin/surveys/:id` | 是 | 查看、修改或删除问卷 |
| `GET` | `/api/admin/surveys/:id/responses` | 是 | 查看答卷 |
| `GET` | `/api/admin/surveys/:id/export` | 是 | 导出 CSV / JSON |

管理写接口、初始化/登录接口和公开提交接口都有内存限流。限流状态在进程重启后清空，不适合用作长期审计数据。

### 5.2 curl 示例

创建题目：

```bash
curl -X POST http://localhost:3000/api/admin/questions \
  -H "Authorization: Bearer $QUESTRA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"你使用什么编辑器？","type":"single","options":["VS Code","Vim"],"required":true}'
```

提交答卷：

```bash
curl -X POST http://localhost:3000/api/surveys/<survey-id>/responses \
  -H "Content-Type: application/json" \
  -d '{"answers":{"<survey-question-id>":"VS Code"}}'
```

### 5.3 公开数据和保密边界

公开 GET 接口只返回填写者需要看到的字段。考试标准答案只在受保护的管理接口中返回。不要在插件日志中打印完整 Token，也不要把管理 API 直接暴露给不可信客户端。

### 5.4 CLI 命令和参数

| 命令 | 参数 | 说明 |
| --- | --- | --- |
| `questra start` | `-p, --port <port>` | 覆盖监听端口，默认 `3000` |
| `questra start` | `-h, --host <host>` | 覆盖监听地址，默认 `0.0.0.0` |
| `questra start` | `-c, --config <path>` | 指定配置文件；相对数据库路径仍以安装根目录为基准 |
| `questra start` | `--foreground` | 在当前终端运行，适合开发、systemd、任务计划程序、launchd、PM2 或 Docker |
| `questra start` | `--help` | 显示 `start` 子命令帮助；短参数 `-h` 已用于 `--host` |
| `questra migrate` | `-c, --config <path>` | 使用指定配置创建或升级数据库表结构 |
| `questra migrate` | `-h, --help` | 显示 `migrate` 子命令帮助 |
| `questra backup` | `-c, --config <path>` | 使用指定配置选择要备份的数据库 |
| `questra backup` | `-o, --output <path>` | 指定备份文件；相对路径以数据库目录为基准，默认自动生成文件名 |
| `questra backup` | `-h, --help` | 显示 `backup` 子命令帮助 |
| `questra status` | 无 | 查看运行状态、PID、端口和数据目录 |
| `questra stop` | 无 | 停止当前运行实例 |
| `questra restart` | 无 | 按原配置和端口重启实例 |
| `questra help` | 无 | 显示顶层命令列表 |
| `questra -V, --version` | 无 | 显示当前版本 |
| `questra -h, --help` | 无 | 显示命令列表及所有子命令参数 |

端口和监听地址的参数优先级为：命令行参数 > 环境变量 > `survey.config.js` > 默认值。运行 `questra --help` 可查看
当前安装包实际生成的完整帮助。

## 6. 数据、迁移和备份

### 6.1 数据表概念

主要表及用途：

| 表 | 用途 |
| --- | --- |
| `question_pool` | 题库题目和标准答案 |
| `question_groups` | 题目分组 |
| `question_group_items` | 题目与分组关联 |
| `surveys` | 问卷、考试、抽题和计分配置 |
| `survey_questions` | 问卷实例题目快照 |
| `responses` | 答卷和考试总分 |
| `answers` | 逐题答案、正确性和得分 |

### 6.2 迁移

迁移文件位于 `migrations/`，按文件名排序执行，每个文件只执行一次：

```powershell
questra migrate
```

不要修改已经在线执行过的迁移文件。新增数据库结构时添加下一个编号，例如当前最新迁移为 `004_admin_accounts_settings.sql`，下一份应命名为 `005_add_xxx.sql`，并在测试中覆盖升级路径。

### 6.3 在线备份

```powershell
questra backup
questra backup --output D:\backup\questra.db
```

Questra 使用 SQLite 在线备份 API，运行服务期间也能生成一致性快照。WAL 模式下不要只复制主 `.db` 文件；`-wal` 和 `-shm` 中可能有尚未合并的数据。

不传 `--output` 时，备份写入数据库所在目录。相对 `--output` 路径也以数据库目录为基准；跨磁盘或交给外部备份系统时建议使用绝对路径。

备份恢复前：

1. 停止 Questra。
2. 保留当前数据库副本。
3. 用验证过的备份替换数据库文件。
4. 执行 `questra migrate`，再启动服务。

## 7. 从源码开发

### 7.1 安装源码依赖

仓库推荐使用 pnpm workspace 管理根项目和 `client/`，CI 以根目录的 `pnpm-lock.yaml` 复现依赖。开发基线是 Node.js 22、pnpm 11 和 npm 10.9+。使用 pnpm 时在仓库根目录执行：

```powershell
pnpm install --frozen-lockfile
```

npm 开发者不需要安装 pnpm，分别安装后端和前端依赖：

```powershell
npm install
npm run install:client
```

Linux / macOS 使用完全相同的命令；如果需要创建本地配置：

```bash
cp survey.config.example.js survey.config.js
```

Windows PowerShell 对应：

```powershell
Copy-Item survey.config.example.js survey.config.js
```

根项目是 CommonJS 后端，前端是 React + Vite 的 ESM 项目。项目脚本会自动沿用发起命令的 npm 或 pnpm。`pnpm-lock.yaml` 是仓库和 CI 的依赖基线；npm 本地生成的 `package-lock.json` 不提交，依赖变更最终需要同步更新 `pnpm-lock.yaml`。

### 7.2 开发服务器

一键启动后端和前端：

```powershell
pnpm run dev:all
```

后端使用 Node.js `--watch` 在 `3000` 端口前台运行，Vite 使用 `5173` 端口，并把 `/api` 和 `/static` 代理到后端。开发管理地址：

```text
http://localhost:5173/admin?token=<Admin Token>
```

也可以分开启动：

```powershell
pnpm run dev
pnpm run dev:client
```

Linux / macOS 的命令相同。环境变量仍按终端语法设置：PowerShell 使用 `$env:NAME = 'value'`，Bash / Zsh 使用 `export NAME='value'`。

npm 开发者可把本节命令开头的 `pnpm` 替换为 `npm`，例如 `npm run dev:all`；其余参数不变。

### 7.3 代码职责

```text
bin/questra.js              CLI、后台进程、备份和生命周期
src/app.js                  Express 中间件和路由装配
src/config.js               配置默认值、安装目录和数据路径解析
src/db.js                   SQLite 连接和迁移
src/routes/                 管理 API、公开 API、兼容页面
src/services/               快照、校验、判分和事务
src/middleware/             鉴权、安全响应头、限流
client/src/                 React 管理端和填写端
migrations/                 不可回写的数据库升级脚本
views/、public/             无 React 构建时的兼容界面
```

新增功能时，优先把业务规则放进 `src/services/`，把 HTTP 参数解析放进 `src/routes/`，不要在路由中复制一套判分逻辑。

### 7.4 测试和检查

```powershell
pnpm run check
pnpm run build
```

`check` 包含仓库提交边界检查、后端 ESLint、Node.js 集成测试、前端 ESLint 和 Vitest。后端测试由仓库脚本枚举 `test/*.test.js`，不依赖 Windows、Linux 或 macOS 的 Shell 通配符行为。`build` 会生成 `client/dist`，生产 Express 会托管该目录。

npm 对应命令为 `npm run check` 和 `npm run build`。

### 7.5 发布 npm 包

版本递增和正式发布是两个步骤。推送到 `main` 并通过 CI 后，如果提交没有改变 `package.json` 的版本号，工作流会自动执行 `npm version patch`、提交版本变更并创建同名 Git 标签；如果提交已经手动改了版本号，则直接使用该版本创建标签，不会再额外递增。需要手动调整版本时，可使用 `npm version patch`、`npm version minor` 或 `npm version major`，再运行检查并提交变更。

正式发布的 GitHub Release + npm Trusted Publishing 流程见下一节。日常开发脚本兼容 npm 和 pnpm；`npm login`、`npm whoami` 和手动 `npm publish` 仅作为不使用 Trusted Publishing 时的备用发布方式。

### 7.6 从标签发布 npm

只有提交进入 `main` 并通过质量检查（后端检查、前端检查、构建和发布白名单校验）后，版本 job 才会执行以下流程；Pull Request 或其他分支不会直接创建标签。

1. 比较当前提交和上一个提交的 `package.json` 版本号。版本未变化时，用 npm 的 `version patch --no-git-tag-version` 自动增加补丁号，并以 `github-actions[bot]` 身份提交 `[skip ci]` 版本变更；版本已经变化时，直接使用提交中的版本号。
2. 创建与 `package.json` 完全相同的 Git 标签，例如版本 `0.3.0` 对应标签 `0.3.0`。
3. 如果 major 或 minor 发生变化，自动创建 GitHub Release，并显式触发 `publish.yaml`；patch 版本只打标签，不自动创建 Release。

版本 job 需要 `contents: write` 和 `actions: write` 权限；若组织或分支保护策略禁止机器人回写 `main`、创建标签或触发工作流，该 job 会失败，需要调整策略后重新运行。

维护者首次启用前，需要在 npm 包的 **Trusted Publishers** 设置中添加 GitHub Actions，填写仓库所有者 `Dark2932`、仓库名 `Questra` 和工作流文件名 `publish.yaml`。手动发布 Release 时，`release.published` 会触发该工作流；自动创建的 Release 使用 `GITHUB_TOKEN`，GitHub 不会可靠地产生下游 Release 事件，因此版本 job 会额外以 `workflow_dispatch` 显式触发 `publish.yaml`。工作流会检查 Release 标签与 `package.json` 版本一致，生成一个 `.tgz`，先上传到 Release，再将同一个文件通过 npm Trusted Publishing 的 OIDC 身份发布到 npm Registry。工作流不读取或保存长期 `NPM_TOKEN`。

如果历史 Release 没有触发工作流，可在 Actions 页面选择 **Publish to npm → Run workflow**，输入已有标签（例如 `0.2.1`）手动补跑。`publish.yaml` 同时支持 `release.published` 和这个手动入口。

这里的 `pnpm install` 只在 GitHub Actions 构建机上执行，用于安装测试、Lint 和前端构建所需的源码依赖；它不会进入发布包，也不是用户安装 Questra 的前置条件。发布完成后，用户直接使用 npm 即可：

```bash
npm install --global questra@latest
questra start
```

## 8. 故障排查

### 命令无法识别

```powershell
npm prefix -g
Get-Command questra
where.exe questra
```

Linux / macOS：

```bash
npm prefix -g
command -v questra
which questra
```

确认 npm 全局目录在 PATH 中，然后重新打开终端。源码开发时可以按当前包管理器执行 `pnpm link --global` 或 `npm link` 注册当前版本。

### 端口被占用

```powershell
Get-NetTCPConnection -LocalPort 3000
questra start --port 3010
```

Linux：

```bash
ss -ltnp | grep ':3000'
questra start --port 3010
```

macOS：

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
questra start --port 3010
```

### 服务状态显示未运行

先读取日志：

```powershell
Get-Content "$HOME\.questra\questra.log" -Tail 100
```

Linux / macOS：

```bash
tail -n 100 ~/.questra/questra.log
```

如果手工杀掉了进程，旧的 `runtime.json` 通常会在下一次 `status` 时被清理。多个实例并行运行时，为每个实例设置不同的 `QUESTRA_RUNTIME_FILE` 和 `QUESTRA_LOG_FILE`。

### 管理后台提示未授权

确认使用的是当前数据库目录下的 `.admin-token` 对应 Token，或检查 `QUESTRA_ADMIN_TOKEN` 是否覆盖了文件中的 Token。不要只看旧日志；后台启动会持续追加日志。

### GitHub Actions 版本或发布失败

- `fatal: empty ident name`：版本号被手动修改时，版本 job 仍需创建 annotated tag。Runner 没有默认 Git 身份；当前工作流会在版本判断前配置 `github-actions[bot]`，推送修复后的工作流后重新运行即可。
- `npm error code ENEEDAUTH`：Release 已触发 `publish.yaml`，但 npm 未接受 OIDC 身份。请在 npm 包的 **Trusted Publishers** 中绑定仓库 `Dark2932/Questra` 和工作流文件 `publish.yaml`，并确认 job 保留 `id-token: write` 权限；绑定后可在 Actions 中手动补跑对应标签。

### 数据库打不开或迁移失败

检查安装目录、`QUESTRA_DATA_DIR`、数据库路径和文件权限。Linux/macOS 全局 npm 目录可能不可写；此时应把 `QUESTRA_DATA_DIR` 指向服务账号可写的持久化目录。先备份现有数据库，再处理迁移；不要为了“重新开始”直接删除生产数据库。

### 页面空白或加载旧界面

源码开发时，检查 `client/dist/index.html` 是否存在并重新构建：

```powershell
pnpm run build
```

已通过 npm 安装的发布包已经包含 `client/dist`，不应在全局安装目录执行构建；若页面资源损坏，请重新安装或升级 `questra@latest`。只有源码仓库包含前端源码和构建脚本，才能使用上面的 `pnpm run build`（npm 开发者可替换为 `npm run build`）。没有构建产物时，Questra 会回退到 `views/` 的兼容 EJS 界面，这是预期的降级行为。
