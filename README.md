# PKU Media Service

这是一个基于 Vue + Vite 的前端项目（项目中使用 Vue 2 + Vite 配置），用于媒体服务相关的前端展示与调试。仓库包含若干子工具与示例页面（例如 OMAF 播放器、Babylon/Three 模型示例、Gaussian Splat 演示等）。

项目要点概览
- 使用 Vite 作为构建工具，开发服务器默认监听 0.0.0.0:8088
- 实际使用的是 Vue 2（通过 `@vitejs/plugin-vue2`）而非 Vue 3
- 包含多个独立的演示/工具目录（位于 `public/` 下），以及主应用位于 `src/`
- 对静态资源的构建有自定义处理（压缩、排除大型静态目录）并在开发时为 `.ply` 文件提供 gzip 响应支持

快速开始
1. 克隆仓库并进入项目目录

	 在 PowerShell:

```powershell
git clone <your-repo-url>
cd d:\QY-work\pku_project\pku_media_service
```

2. 安装依赖

```powershell
npm install
# 或者使用 yarn
# yarn
```

3. 本地开发服务器（热重载）

```powershell
npm run dev
```

默认端口与代理
- 开发服务器运行在 0.0.0.0:8088（可在 `vite.config.js` 中修改）
- 配置了一个代理将以 `/ply` 开头的请求转发到内部 API（`https://172.22.23.117:8932`），并在代理中添加了 CORS 头

构建与发布
- 打包：

```powershell
npm run build
```

	注意：build 脚本包含 `vite build && cd dist && npm install .`，即构建后会进入 `dist` 并运行 `npm install .`（请确认是否有意为之，可能用于在 dist 中安装某些可执行依赖或生成平台包）
- 预览构建产物：

```powershell
npm run preview
```

- 部署（示例）：

```powershell
npm run deploy
```

项目结构（高层说明）
- `public/` - 静态资源与若干示例子项目
	- `babylonJs/` - Babylon/Three 模型与示例页面
	- `omafPlayer/` - OMAF 播放器 demo 与工具脚本（包含 Python 示例）
	- `gaussianSplat/` - Gaussian splat 演示页面与相关数据
	- `lib/` - 三方库（three, amis 等）与脚本
	- `scripts/` - omap player 相关的前端脚本集合（如 `omafplayer.js`, `mpdparser.js` 等）
- `src/` - 主应用源码
	- `main.js` - Vue 入口（使用 Vue 2）
	- `App.vue` - 根组件，仅包含 `<router-view />`
	- `router/` - 前端路由（`index.js`）
	- `components/` - Vue 组件集合（如 `model.vue`, `model-list.vue` 等）
	- `api/` - 小型 API 封装（`model.js`）
	- `utils/` - 工具（例如 `request.js`）

重要配置说明
- `vite.config.js`
	- 使用 `@vitejs/plugin-vue2` 以支持 Vue 2
	- 使用 `vite-plugin-compression` 在构建产物中生成 `.gz` 文件（支持 `.js, .css, .html, .ply, .splat`）
	- 自定义插件 `excludeMultiplePublicPathsPlugin` 会在构建开始前临时移动（排除）指定的大型静态目录（如部分 `public/resources/...`），构建完成后再恢复，避免将大型资源打包进 dist
	- 提供开发时对 `.ply` 请求的 gzip 响应（开发时直接读取 `public` 下的文件并 gzip 后返回）

依赖要点
- 核心库：`vue` (实际为 2.x)、`vue-router`、`vite`、`@vitejs/plugin-vue2`
- 媒体/3D：`three`, `babylonjs` 等
- 网络请求：`axios`

开发提示与注意事项
- Vue 版本：尽管 README 起始模板写的是 Vue 3，但本项目使用 Vue 2（请根据实际情况在 IDE 中选择合适的语法高亮和插件）。
- 大型资源：仓库内 `public/resources` 下可能包含非常大的媒体/模型文件。`vite.config.js` 中有排除这些目录的逻辑，以免构建时临时将这些大文件打包进 dist。
- `.ply` 文件：项目在 dev server 中对 `.ply` 文件会以 gzip 形式返回，若将这类资源放到 `public` 下，开发时会即时可用并被正确压缩返回。
- Windows PowerShell: 上面的示例命令为 PowerShell 语法（单行命令请用 `;` 分隔）。

常见问题（FAQ）
- 构建后为什么进了 dist 还要 run `npm install .`？
	- 仔细检查 `package.json` 中的 `build` 脚本（`vite build && cd dist && npm install .`）。可能用于在 dist 中安装某些本地依赖或生成可部署包；如果不需要，请根据实际部署流程调整该脚本。
- 如何添加新的静态 demo？
	- 将 demo 文件放到 `public/` 下合适的位置，必要时在 `vite.config.js` 的 `excludePaths` 中移除或调整排除策略，以便在构建时包含该 demo 的资源。

贡献
- 欢迎提交 PR。请在提交前运行 `npm run build` 并确保变更不将大量静态资源 unintentionally 打包到 dist。

更多信息
- 若需了解 Vue 2 与 Vite 的集成，请参考 `@vitejs/plugin-vue2` 的文档。

完成说明
- 已根据代码仓库现状把 README 扩展为包含安装、运行、构建与目录说明的文档。若你希望我把 README 改成英文版、添加更多子目录的详细说明，或把 `build` 脚本中的 `npm install .` 代替为更合适的命令，告诉我我可以继续修改。
