# Questra

Questra 是一个轻量、可自托管的问卷与答题系统。它使用单个 Node.js 服务提供管理后台、公开填写页面和 HTTP API，并使用 SQLite 保存数据，适合个人服务器、内网调研、课程测验和小型团队。

## 介绍

- 题库支持单选、多选、判断和文本题，可用分组整理和复用。
- 可以创建普通问卷或自动判分考试，支持手动选题和按题型随机抽题。
- 发布后的题目会保存为快照；以后修改题库不会改变已发布内容和历史成绩。
- 答卷可在后台查看，并导出为 CSV 或 JSON。
- 可通过 HTTP API 和提交钩子接入 Webhook、业务系统或数据平台。

Questra 不依赖 MySQL、Redis 等外部服务，适合单机部署。它不是多节点共享数据库的集群方案。

## 安装

Questra 需要 Node.js 22 或更高版本。请按使用场景从以下三种方式中选择一种即可。

### 从 npm 全局安装

适合大多数用户：

```text
npm i -g questra@latest
questra -V
```

第一条命令安装最新正式版本并注册 `questra` 命令，第二条命令确认安装成功并返回安装版本。

### 从 GitHub Release 全局安装

从 [GitHub Releases](https://github.com/Dark2932/Questra/releases) 下载对应版本的 `questra-<版本>.tgz`，然后在下载目录执行：

```text
npm i -g ./questra-0.3.0.tgz
questra -V
```

将示例文件名替换为实际下载的版本。这种方式安装的是 Release 附件中的固定版本，适合离线保存或部署经过确认的构建产物。

### 从源码构建

> [!IMPORTANT]
>
> 这种方式不会注册全局命令，只能在项目文件夹内通过 npm 或 pnpm 运行；它使用与发布包相同的 CLI 入口，适合开发和调试。

源码开发推荐 pnpm：

```text
git clone https://github.com/Dark2932/Questra.git
cd Questra
pnpm install --frozen-lockfile
pnpm run build
```

也可以使用 npm：

```text
git clone https://github.com/Dark2932/Questra.git
cd Questra
npm install
npm run install:client
npm run build
```

## 快速开始

全局安装后启动：

```text
questra start
```

或从源码构建后启动：

```text
pnpm run start
# 或 npm run start
```

> [!NOTE]
>
> `pnpm run start` 和 `npm run start` 对应 `questra start`；其他命令见[命令参考](docs/commands.md)，开发流程见[开发与扩展](docs/development.md)。

启动成功后，终端会打印访问地址；后台运行时地址也会保留在启动命令的输出中，日志文件记录在运行状态目录。

首次访问会进入欢迎向导。依次创建唯一管理员账户、设置站点名称，然后按以下流程使用：

1. 在“题库”中创建题目并按需建立分组。
2. 在“问卷”中创建普通问卷或考试，选择题目、计分方式和截止时间。
3. 复制 `/s/<问卷 ID>` 公开链接并发送给填写者。
4. 在问卷数据页查看答卷、成绩，并导出 CSV 或 JSON。

常用生命周期命令：

```text
questra status
questra restart
questra stop
questra backup
```

全部全局命令、选项以及源码目录中的 npm/pnpm 脚本见[命令参考](docs/commands.md)。

生产环境应把数据放到安装目录之外，并在公网访问时配置 HTTPS。具体路径、环境变量和不同平台的部署方式见[安装与部署](docs/installation.md)。

## 补充

- [文档导航](docs/README.md)：按安装者、管理员和开发者选择阅读路径。
- [安装与部署](docs/installation.md)：三种安装方式、配置、进程托管、升级、备份和排障。
- [介绍与使用](docs/usage.md)：从欢迎向导到题库、问卷、考试、答卷和站点设置。
- [开发与扩展](docs/development.md)：架构、源码开发、数据库迁移、提交钩子和发布流程。
- [HTTP API](docs/api.md)：鉴权、端点、请求与响应示例。

许可证：[MIT License](LICENSE)
