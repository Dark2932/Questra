# Questra

Questra 是一个轻量、自托管的问卷与考试系统。它使用 Express 提供服务、使用 SQLite 保存数据，适合个人服务器、内网调研、课程测验和小型团队，不依赖云服务。

## 介绍

- 用题库管理单选、多选、文本和判断题
- 创建普通问卷，或创建支持自动判分的考试
- 手动选题，或按题型和分组随机抽题
- 通过公开链接收集答卷，并导出 CSV / JSON
- 通过 `beforeSubmit`、`afterSubmit` 钩子接入 Webhook 和其他业务系统

Questra 将题库题目复制为问卷快照。发布问卷后再修改题库，不会改变已经发布的问卷或历史成绩。

## 安装

需要 Node.js 22 或更高版本。使用 nvm 时，在项目或终端中切换到 Node 22：

```text
nvm use 22
```

安装 Questra 最新版本：

```text
npm install -g questra@latest
```

检查命令是否可用：

```text
questra --version
```

如果系统提示无法识别 `questra`，重新打开终端并检查 npm 全局目录是否已加入 PATH。Windows、Linux 和 macOS 的安装命令相同；平台差异见 [深入部署与开发指南](docs/guide.md)。

## 启动

安装后可以从任意目录运行：

```text
questra start
```

默认监听 `http://localhost:3000`，浏览器打开：

```text
http://localhost:3000/admin
```

首次访问会进入欢迎页和初始化向导，用于创建唯一管理员账号、密码、昵称和站点名称。

默认数据保存在 Questra 安装根目录的 `data/questra.db`，不会因为执行命令的目录不同而产生多份数据库。生产环境建议把数据放到独立目录：

```powershell
$env:QUESTRA_DATA_DIR = 'D:\QuestraData'
questra start
```

Linux / macOS：

```bash
export QUESTRA_DATA_DIR="$HOME/questra-data"
questra start
```

自定义端口或配置文件：

```text
questra start --port 8080
questra start --config C:\Questra\production\survey.config.js
```

常用生命周期命令：

```text
questra status
questra restart
questra stop
```

## 如何使用

1. 打开 `/admin`，按向导完成初始化并登录。
2. 在“题库”中创建题目，可按分组整理。
3. 在“问卷”中创建普通问卷或考试，选择题目或随机抽题。
4. 保存后复制 `/s/<问卷 ID>` 公开链接发送给填写者。
5. 在问卷详情中查看答卷，按需导出 CSV 或 JSON。

考试支持两种计分方式：按题型权重计算总分，或为每道题设置固定分值。考试题目必须配置标准答案；普通问卷不要求标准答案。

## 细节补充

- 配置文件、环境变量、CLI 参数和跨平台部署：查看 [深入部署与开发指南](docs/guide.md)。
- 数据库使用 SQLite WAL 模式，在线备份使用 `questra backup`；生产环境不要只复制 `.db` 文件。
- 管理后台使用账号密码和会话 Cookie，兼容 Admin Token。不要公开 Token、数据库或 Webhook 密钥。
- 源码开发推荐 pnpm 11，同时兼容 npm；详细测试、插件、API、迁移和发布流程见指南。
- 推送到 `main` 并通过 CI 后，会自动递增补丁版本并创建同名 Git 标签；发布对应 GitHub Release 后，工作流会通过 OIDC 发布到 npm。

许可证： [MIT License](LICENSE)
