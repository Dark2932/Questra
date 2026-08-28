# 安装与部署

本文面向安装者和运维者，涵盖 npm 全局包、GitHub Release 构建产物和源码三种方式。

## 环境要求

- Node.js 22 或更高版本。
- npm 10.9+；源码开发还可使用 pnpm 11+。
- `better-sqlite3` 能获取预编译包；否则需要本机原生编译工具。
- 公网部署建议准备 HTTPS 反向代理、独立数据目录和备份空间。

检查版本：

```text
node --version
npm --version
pnpm --version
```

Windows 本地编译需要 Visual Studio Build Tools 的 C++ 工具和 Python；Debian/Ubuntu 需要 `build-essential`、`python3` 和 `make`；macOS 可先执行 `xcode-select --install`。不要为解决原生模块失败而删除锁文件，应先检查 Node 主版本和工具链。

## 选择安装方式

### npm 全局安装

适合日常使用和服务器部署：

```text
npm install --global questra@latest
questra --version
```

`--global` 将运行文件放入 npm 全局目录并注册 `questra` 命令。PowerShell 无法识别命令时，检查 `npm prefix --global` 是否在 PATH 中；Linux/macOS 检查 `command -v questra`。

### GitHub Release 的 `.tgz`

适合固定版本、离线安装或审核过的构建产物：

1. 在 [GitHub Releases](https://github.com/Dark2932/Questra/releases) 下载 `questra-<版本>.tgz`。
2. 在下载目录执行本地全局安装：

```text
npm install --global ./questra-0.3.0.tgz
questra --version
```

将文件名改为实际版本。`.tgz` 是 npm 包归档，不是可直接交给 Node 执行的脚本；安装后使用包注册的 `questra` 命令。

### 源码构建

源码方式适合修改代码、调试或参与贡献，不会注册全局命令。仓库推荐 pnpm workspace：

```text
git clone https://github.com/Dark2932/Questra.git
cd Questra
pnpm install --frozen-lockfile
pnpm run build
```

`pnpm install` 按锁文件安装根项目和 `client/` 依赖；`pnpm run build` 生成生产前端。

npm 方式：

```text
git clone https://github.com/Dark2932/Questra.git
cd Questra
npm install
npm run install:client
npm run build
```

npm 根项目不使用 workspace 自动安装前端依赖，所以要额外执行 `npm run install:client`。两种方式的运行脚本行为相同。

## 首次启动

全局或 Release 安装：

```text
questra start
```

源码安装：

```text
pnpm run start
# 或 npm run start
```

默认监听 `0.0.0.0:3000`。打开 `http://localhost:3000/admin` 后，欢迎向导会创建唯一管理员账户和初始站点设置。启动过程会自动创建数据目录、执行未应用迁移并生成持久化 Admin Token。

启动成功后，Questra 会在终端打印“访问地址”。`start` 的后台模式会由启动命令直接打印该地址，前台模式会在服务监听成功后打印；如果指定了 `--host` 或 `--port`，输出会反映实际配置。后台进程的详细请求日志仍写入运行状态目录中的日志文件。

## 配置和数据目录

Questra 从启动命令所在目录读取可选的 `survey.config.js`，但相对数据库路径以 Questra 安装根目录为基准。默认文件为安装根目录下的 `data/questra.db` 和 `.admin-token`。生产环境应设置 `QUESTRA_DATA_DIR`，使数据不随 npm 包升级或卸载：

PowerShell：

```powershell
$env:QUESTRA_DATA_DIR = 'D:\QuestraData'
questra start
```

Bash/Zsh：

```bash
export QUESTRA_DATA_DIR='/var/lib/questra'
questra start
```

可在 `survey.config.js` 中长期设置端口、地址、站点名称、日志和钩子：

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

端口和地址的优先级是命令行参数 > 环境变量 > 配置文件 > 默认值。常用环境变量还包括 `QUESTRA_ADMIN_TOKEN`、`QUESTRA_RUNTIME_FILE` 和 `QUESTRA_LOG_FILE`。Token 优先使用环境变量，其次读取数据目录的 `.admin-token`，最后才自动生成。

## 生命周期命令

完整的全局命令、每个选项和源码脚本对应关系见[命令参考](commands.md)。下面只保留部署中最常用的生命周期操作：

| 目的 | 全局安装 | 源码安装 |
| --- | --- | --- |
| 启动后台服务 | `questra start` | `pnpm run start` / `npm run start` |
| 前台运行 | `questra start --foreground` | `pnpm run start -- --foreground` |
| 查看状态 | `questra status` | `pnpm run status` / `npm run status` |
| 停止 | `questra stop` | `pnpm run stop` / `npm run stop` |
| 重启 | `questra restart` | `pnpm run restart` / `npm run restart` |
| 数据迁移 | `questra migrate` | `pnpm run migrate` / `npm run migrate` |
| 在线备份 | `questra backup` | `pnpm run backup` / `npm run backup` |

源码也可以用通用入口原样传递全局命令：`pnpm run questra -- status` 或 `npm run questra -- start --foreground`。脚本参数必须放在 `--` 后面。

## 长期运行和公网部署

`start` 默认后台运行，适合个人电脑。systemd、Windows 任务计划程序、macOS launchd、PM2 或 Docker 接管进程时，应使用 `--foreground`，让管理器直接监控 Questra 进程。服务账号需要对数据、运行状态和日志目录有读写权限。

Questra 自身只提供 HTTP。公网部署时让 Caddy、Nginx 或云负载均衡器终止 TLS，再转发到本机 Questra。至少转发 `/api/health`，不要把 `data/`、数据库或 `.admin-token` 暴露为静态文件。反向代理还应限制管理端访问并正确处理较大的 JSON 请求体。

## 迁移、备份和升级

迁移文件按文件名顺序各执行一次：

```text
questra migrate
```

不要修改已在线执行的迁移；新结构只能添加下一个编号的迁移文件。在线备份无需停止服务：

```text
questra backup
questra backup --output D:\backup\questra.db
```

Questra 使用 SQLite WAL 在线备份 API。不要只复制主 `.db` 文件；恢复前停止服务、保留当前数据库副本、替换为经过验证的备份，再执行迁移并启动。升级前先备份数据目录和 `.admin-token`。

## 排障

- 命令无法识别：检查 npm 全局目录 PATH，或在源码目录使用 `pnpm run ...` / `npm run ...`。
- 原生依赖失败：确认 Node.js 22、包管理器版本和平台编译工具，不要删除锁文件。
- 端口被占用：改用 `--port`，并检查已有 Questra 实例的 `status` 和日志。
- 页面空白：源码运行时确认 `client/dist/index.html` 存在并重新执行 `pnpm run build` 或 `npm run build`。
- 未授权：使用当前数据目录的 `.admin-token` 或确认 `QUESTRA_ADMIN_TOKEN` 没有覆盖预期 Token。
- 数据库打不开：先确认 `QUESTRA_DATA_DIR`、配置路径和服务账号权限，再检查日志；不要直接删除生产数据库。
