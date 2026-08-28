# 命令参考

本文是 Questra 命令的完整参考，内容以当前 `bin/questra.js` 和根目录 `package.json` 为准。全局安装使用 `questra ...`；源码目录使用 `pnpm run ...` 或 `npm run ...`。

## 1. 全局 CLI

全局安装或 GitHub Release `.tgz` 安装后，命令名为 `questra`：

```text
questra <command> [options]
```

源码目录也可以通过通用脚本入口使用完全相同的子命令：

```text
pnpm run questra -- <command> [options]
npm run questra -- <command> [options]
```

### 顶层选项

| 选项 | 说明 |
| --- | --- |
| `-V, --version` | 显示当前 Questra 版本。 |
| `-h, --help` | 显示顶层命令列表和各子命令的选项摘要。 |
| 无参数 | 等同于显示帮助，不启动服务。 |

示例：

```text
questra --version
questra --help
questra
```

### `start`

启动 Questra Web 服务。默认模式会将服务放到后台；使用 `--foreground` 时保持当前终端运行。

```text
questra start [options]
```

| 选项 | 说明 | 默认/优先级 |
| --- | --- | --- |
| `-p, --port <port>` | 指定 HTTP 监听端口。 | `--port` > `PORT` > 配置文件 > `3000` |
| `-h, --host <host>` | 指定监听地址。`0.0.0.0` 表示接受所有网卡连接。 | `--host` > `HOST` > 配置文件 > `0.0.0.0` |
| `-c, --config <path>` | 指定 `survey.config.js` 路径。相对路径以当前启动目录解析。 | 未指定时读取当前目录的 `survey.config.js` |
| `--foreground` | 在当前终端前台运行；适合开发和 systemd、任务计划程序、launchd、PM2 或 Docker。 | 未指定该参数时为后台模式，反之为前台模式 |
| `--help` | 显示 `start` 的选项。由于 `-h` 已用于 `--host`，帮助使用 `--help`。 | |

启动成功后会打印访问地址、管理地址、Admin Token、数据目录和日志/进程行为。后台模式的访问地址由启动命令直接打印，前台模式在服务监听成功后打印。

```text
questra start
questra start --port 8080 --host 127.0.0.1
questra start --config C:\Questra\production\survey.config.js
questra start --foreground
```

源码调用：

```text
pnpm run start
npm run start -- --port 8080
pnpm run questra -- start --foreground
```

### `migrate`

创建或升级 SQLite 数据库表结构。启动服务时会自动迁移；需要单独迁移或部署脚本明确控制时使用此命令。

```text
questra migrate [options]
```

| 选项 | 说明 |
| --- | --- |
| `-c, --config <path>` | 使用指定配置文件选择数据库。 |
| `-h, --help` | 显示 `migrate` 的选项。 |

```text
questra migrate
questra migrate --config C:\Questra\production\survey.config.js
```

### `status`

检查当前实例是否运行，并显示 PID、访问地址、数据目录、工作目录和启动时间。

```text
questra status [options]
```

| 选项 | 说明 |
| --- | --- |
| `-h, --help` | 显示 `status` 帮助。 |

```text
questra status
```

### `stop`

停止运行中的 Questra 实例。命令通过运行状态文件定位进程；没有运行实例时会直接返回提示。

```text
questra stop [options]
```

| 选项 | 说明 |
| --- | --- |
| `-h, --help` | 显示 `stop` 帮助。 |

```text
questra stop
```

### `restart`

停止当前实例，并使用运行状态中保存的工作目录、配置文件、端口和监听地址启动新实例。

```text
questra restart [options]
```

| 选项 | 说明 |
| --- | --- |
| `-h, --help` | 显示 `restart` 帮助。 |

```text
questra restart
```

### `backup`

在线备份 SQLite 数据库。服务运行时也可以执行，Questra 使用 SQLite backup API 保证快照一致性。

```text
questra backup [options]
```

| 选项 | 说明 | 默认 |
| --- | --- | --- |
| `-c, --config <path>` | 使用指定配置文件选择数据库。 | 当前目录配置 |
| `-o, --output <path>` | 指定备份输出路径；相对路径以数据库目录为基准。 | 数据库目录下自动生成 `questra-backup-<时间>.db` |
| `-h, --help` | 显示 `backup` 的选项。 | |

```text
questra backup
questra backup --output D:\backup\questra.db
questra backup --config C:\Questra\production\survey.config.js --output D:\backup\production.db
```

不要只复制 WAL 模式下的主 `.db` 文件；恢复前应停止服务、保留当前数据库副本、替换为已验证的备份，再执行迁移。

### `help`

显示顶层命令列表。它与直接执行 `questra --help` 的用途接近，但属于一个显式子命令。

```text
questra help [options]
```

| 选项 | 说明 |
| --- | --- |
| `-h, --help` | 显示 `help` 子命令帮助。 |

```text
questra help
```

## 2. `package.json` 脚本

在源码根目录运行。pnpm 和 npm 的脚本名称相同：

```text
pnpm run <script>
npm run <script>
```

其中 `npm start`、`npm test` 和 `pnpm start`、`pnpm test` 是 `run` 的快捷写法。脚本参数必须放在 `--` 后面，例如 `npm run start -- --port 8080`。

### CLI 对应脚本

这些脚本把全局 CLI 子命令映射到源码入口，不需要全局安装：

| 脚本 | 实际执行 | 对应全局命令 |
| --- | --- | --- |
| `questra` | `node bin/questra.js` | 通用入口；参数从 `--` 后传入 |
| `start` | `node bin/questra.js start` | `questra start` |
| `migrate` | `node bin/questra.js migrate` | `questra migrate` |
| `status` | `node bin/questra.js status` | `questra status` |
| `stop` | `node bin/questra.js stop` | `questra stop` |
| `restart` | `node bin/questra.js restart` | `questra restart` |
| `backup` | `node bin/questra.js backup` | `questra backup` |
| `help` | `node bin/questra.js help` | `questra help` |

示例：

```text
pnpm run status
npm run start -- --foreground
pnpm run backup -- --output .\backups\latest.db
npm run questra -- migrate --config .\survey.config.js
```

### 开发与构建脚本

| 脚本 | 作用 | 常用场景 |
| --- | --- | --- |
| `dev` | 使用 Node.js `--watch` 前台启动后端。 | 修改后端代码时开发 |
| `dev:client` | 在 `client/` 中启动 Vite 开发服务器。 | 修改 React 前端时开发 |
| `dev:all` | 并行启动后端和前端开发服务器。后端为 `3000`，前端为 `5173`。 | 全栈开发 |
| `install:client` | 安装 `client/` 前端依赖。 | npm 源码安装或单独修复前端依赖 |
| `build` | 构建前端生产产物到 `client/dist`；必要时自动安装前端依赖。 | 本地运行和发布前 |
| `build:client` | 与 `build` 相同，显式表示构建前端。 | 只查看前端构建意图 |

```text
pnpm run dev:all
npm run dev
pnpm run build
npm run install:client
```

### 质量检查脚本

| 脚本 | 作用 |
| --- | --- |
| `test` | 运行 `test/` 中的 Node.js 后端测试。 |
| `test:client` | 运行前端 Vitest 测试。 |
| `lint` | 检查后端、CLI、脚本和后端测试代码。 |
| `lint:client` | 检查前端代码。 |
| `format` | 使用 Prettier 格式化 `src/**/*.js` 和 `bin/**/*.js`。 |
| `check:repo` | 检查仓库追踪边界、必要文件和忽略规则。 |
| `check` | 依次运行 `check:repo`、后端 lint/测试和前端 lint/测试。 |
| `release:check` | 运行 `check`，然后执行包管理器的 `pack --dry-run`，验证发布包内容。 |

推荐在提交前运行：

```text
pnpm run check
pnpm run build
pnpm run release:check
```

npm 对应为：

```text
npm run check
npm run build
npm run release:check
```

### npm 生命周期脚本

| 脚本 | 触发时机 | 作用 |
| --- | --- | --- |
| `prepack` | npm/pnpm 执行 `pack` 前自动触发。 | 使用当前包管理器安装或确认前端依赖，并构建 `client/dist`。 |
| `prepublishOnly` | `npm publish` 或 `pnpm publish` 执行发布前触发；普通安装不会触发。 | 运行完整 `check`，发布失败时阻止打包发布。 |

通常不需要手动调用生命周期脚本。若要单独检查它们，可执行 `pnpm run prepack`、`npm run prepack` 或对应的 `prepublishOnly`，但发布前仍应使用 `release:check`。

## 3. 参数、环境和路径

### npm/pnpm 参数传递

脚本名称后面的第一个 `--` 用于分隔包管理器参数和 Questra 参数：

```text
pnpm run start -- --port 8080 --host 127.0.0.1
npm run backup -- --config C:\Questra\survey.config.js --output D:\backup\latest.db
pnpm run questra -- start --foreground
```

### 配置优先级

`start` 的端口和监听地址按以下顺序覆盖：

```text
命令行参数 > 环境变量 > survey.config.js > 默认值
```

常用环境变量：

| 变量 | 作用 |
| --- | --- |
| `PORT` | `start` 未传 `--port` 时的监听端口。 |
| `HOST` | `start` 未传 `--host` 时的监听地址。 |
| `QUESTRA_DATA_DIR` | 覆盖数据库目录，文件名固定为 `questra.db`。 |
| `QUESTRA_ADMIN_TOKEN` | 覆盖数据目录中的 `.admin-token`。 |
| `QUESTRA_RUNTIME_FILE` | 覆盖运行状态 JSON 路径。 |
| `QUESTRA_LOG_FILE` | 覆盖后台日志文件路径。 |

PowerShell 使用 `$env:NAME = 'value'`；Bash/Zsh 使用 `export NAME='value'`。完整配置、进程托管和跨平台路径见[安装与部署](installation.md)。

## 4. 按任务选择命令

| 任务 | 命令 |
| --- | --- |
| 首次源码安装并构建 | `pnpm install --frozen-lockfile` → `pnpm run build`，或 `npm install` → `npm run install:client` → `npm run build` |
| 启动生产构建 | `questra start`，或源码中的 `pnpm run start` / `npm run start` |
| 前台开发 | `pnpm run dev` / `npm run dev` |
| 全栈热开发 | `pnpm run dev:all` / `npm run dev:all` |
| 查看、停止、重启实例 | `questra status` / `stop` / `restart`，或对应源码脚本 |
| 迁移数据库 | `questra migrate`，或 `pnpm run migrate` / `npm run migrate` |
| 在线备份 | `questra backup`，或 `pnpm run backup` / `npm run backup` |
| 提交前检查 | `pnpm run check` / `npm run check` |
| 验证发布包 | `pnpm run release:check` / `npm run release:check` |

产品使用流程见[介绍与使用](usage.md)，HTTP 请求格式见 [HTTP API](api.md)，源码和扩展边界见[开发与扩展](development.md)。
