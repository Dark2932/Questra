# Questra

Questra 是一个轻量、可自托管的问卷与考试系统。它适合个人服务器、内网调研、课程测验和小型团队，不依赖云服务；数据保存在本机 SQLite 数据库中。

## 介绍

你可以用 Questra：

- 建立题库，并按分组管理题目
- 创建普通问卷或自动判分的考试
- 手动选题，或按题型从题库随机抽题
- 通过链接公开填写问卷
- 在后台查看答卷，导出 CSV / JSON
- 用 Webhook 钩子把新答卷通知到钉钉、企业微信或自己的系统

Questra 的核心思路很简单：**题库是素材，问卷是发布时生成的快照，答卷写入本机数据库**。修改题库不会改变已经发布的问卷。

## 安装

推荐使用全局安装，安装后可以在任意部署目录运行 `questra`：

```powershell
npm install -g questra
```

要求 Node.js 20 或更高版本。检查安装是否成功：

```powershell
questra --version
```

如果命令无法识别，请关闭并重新打开终端，让系统重新加载 npm 的全局命令目录。

Windows 使用 PowerShell，Linux 和 macOS 使用 Terminal；三套系统的 npm 安装命令相同。差异主要在环境变量写法、日志查看命令和长期运行服务的管理工具，详见 [深入部署与开发指南](docs/guide.md) 的跨平台章节。

## 启动

`questra start` 每次都可以从任意目录执行。若要加载自定义 `survey.config.js`，请在配置文件所在目录执行，或显式传入 `--config`；否则 Questra 会使用默认配置。无论从哪里执行，数据库都不会写入当前目录：

```powershell
questra start
```

从其他目录加载配置：

```powershell
questra start --config C:\Questra\production\survey.config.js
```

启动后会自动完成这些事情：

1. 在 Questra 安装根目录的 `data/questra.db` 创建 SQLite 数据库（不会写入当前执行目录）。
2. 执行尚未应用的数据库迁移。
3. 创建并保存 Admin Token。
4. 在后台监听 `http://localhost:3000`。

终端会显示管理地址，例如：

```text
http://localhost:3000/admin?token=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

复制完整地址到浏览器即可进入管理后台。Token 默认保存在 `data/.admin-token`，服务重启后仍然有效。

常用管理命令：

```powershell
questra status     # 查看是否运行
questra restart    # 重启
questra stop       # 停止
```

端口被占用时可以换一个端口：

```powershell
questra start --port 8080
```

不同系统的常用路径和服务方式：

| 系统 | 默认数据目录 | 默认日志目录 | 长期运行建议 |
| --- | --- | --- | --- |
| Windows | Questra 安装根目录 `data\` | `%USERPROFILE%\.questra\questra.log` | 任务计划程序、PM2 或前台模式 |
| Linux | Questra 安装根目录 `data/` | `~/.questra/questra.log` | systemd、PM2 或 Docker |
| macOS | Questra 安装根目录 `data/` | `~/.questra/questra.log` | launchd、PM2 或前台模式 |

浏览器访问方式、管理界面和公开问卷链接在三个系统上相同。

详细部署、反向代理、进程托管和故障排查，请阅读 [深入部署与开发指南](docs/guide.md)。

## 如何使用

### 1. 进入管理后台

打开启动时显示的管理地址。管理后台包含仪表盘、题库、问卷和答卷页面。

如果没有保存管理地址，可以查看日志：

```powershell
Get-Content "$HOME\.questra\questra.log" -Tail 30
```

Linux / macOS：

```bash
tail -n 30 ~/.questra/questra.log
```

也可以在浏览器中打开 `/admin`，然后粘贴 Admin Token。

### 2. 创建题目

进入“题库”后新建题目，支持：

- 单选题
- 多选题
- 文本题
- 判断题

普通问卷不要求设置标准答案。考试中的每一道题都必须设置标准答案，否则无法发布考试。

题目可以加入自定义分组。分组只影响管理和随机抽题，不会改变已经生成的问卷。

### 3. 创建普通问卷

进入“问卷”并新建实例：

1. 选择“普通问卷”。
2. 填写标题和说明。
3. 手动选择题目，或选择随机抽题并指定题型数量。
4. 可选填截止时间。
5. 保存后复制公开填写链接 `/s/<问卷 ID>`。

把这个链接发给填写者即可。公开页面不会显示管理 Token 或标准答案。

### 4. 创建考试

创建时选择“考试 / 答题”，然后选择一种计分方式：

- **满分与题型权重**：例如单选 40%、多选 30%、文本 30%，最终满分为 100。
- **逐题分值累加**：为每道题直接填写分值。

单选和判断题要求完全匹配；多选题必须选项集合完全一致；文本答案会忽略首尾空格和大小写。

### 5. 查看和导出答卷

在问卷详情中查看回收数量和逐题答案。导出支持：

- CSV：适合 Excel，包含 UTF-8 BOM，中文不会乱码
- JSON：适合二次开发和数据处理

有答卷后，问卷的题目和计分结构不能再修改，只能修改标题、说明、状态和截止时间。这是为了保证历史成绩不会被新配置改变。

## 细节补充

### 配置文件

Questra 默认从当前目录读取 `survey.config.js`，但数据库不会跟随当前目录变化：默认始终保存到 Questra 安装根目录的 `data/`。没有配置文件也可以启动；需要自定义端口、数据库位置、站点名称或插件钩子时再创建它。可参考仓库中的 `survey.config.example.js`。

常用配置：

```js
module.exports = {
  port: 3000,
  host: '0.0.0.0',
  database: './data/questra.db', // 相对路径以 Questra 安装根目录为基准
  siteName: '我的问卷',
  logging: true
};
```

不要把真实 Webhook、API Key 或生产配置提交到 Git。`survey.config.js`、数据库、日志和前端构建产物都已被 `.gitignore` 屏蔽。

Windows 的配置路径可以是 `C:\Questra\production\survey.config.js`；Linux / macOS 通常是 `/srv/questra/survey.config.js` 或 `~/questra/survey.config.js`。配置文件格式和 API 在三个系统上完全一致。

### 数据、Token 和备份

- 数据库默认位于 Questra 安装根目录的 `data/questra.db`。
- 可设置 `QUESTRA_DATA_DIR` 把数据放到安装目录之外（生产环境推荐使用独立数据盘）；该环境变量优先于配置文件的 `database`。
- Admin Token 默认位于数据库目录的 `.admin-token`（默认是安装根目录的 `data/.admin-token`）。
- 服务日志默认位于用户目录的 `.questra/questra.log`。
- 数据库使用 SQLite WAL 模式，建议使用在线备份命令：

  ```text
  questra backup
  ```

默认备份文件写入数据库所在目录；使用 `--output` 可以指定其他绝对路径。

不要在服务运行时只复制 `.db` 文件；WAL 文件中可能还有未合并的数据。

从旧版本升级时，如果旧数据库在启动目录的 `data/`，请先停止服务，再将
`QUESTRA_DATA_DIR` 设置为该目录的绝对路径。这样新版本会继续使用原数据库和
`.admin-token`，确认数据正常后再考虑迁移到独立数据盘。

### 认证和安全

管理 API 支持 `Authorization: Bearer <token>` 和 `x-admin-token`。也可以使用 `/admin?token=<token>` 首次进入。生产环境建议：

- 设置 `QUESTRA_ADMIN_TOKEN`，由密钥管理系统提供固定 Token
- 使用 Caddy 或 Nginx 提供 HTTPS
- 不要把管理地址和 Token 发到公开渠道
- 只开放实际使用的端口
- 使用 `/api/health` 作为探活地址

公开提交接口按 IP 限流，管理写接口也有频率限制。安全响应头只在 `NODE_ENV=production` 时启用。

### 开发和插件

Questra 的扩展点是 `survey.config.js` 中的 `beforeSubmit` 和 `afterSubmit`：前者在入库前执行，抛出错误会拒绝提交；后者在入库成功后执行，失败只记录日志，不会回滚答卷。

从源码开发、编写 Webhook 插件、调用 REST API、配置 systemd / PM2、运行测试和发布 npm 包，请阅读 [深入部署与开发指南](docs/guide.md)。

### 许可证

Questra 使用 [MIT License](LICENSE)。
