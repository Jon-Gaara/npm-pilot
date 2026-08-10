# npm-pilot

你的 npm 依赖管理驾驶舱 —— 一个基于 Tauri 的桌面端 npm 包管理工具。

![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-1.97+-DEA584?logo=rust&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特性

- **本地项目 / 全局环境双模式** —— 既可管理单个项目的 `package.json` 依赖，也可管理系统全局安装的 npm 包
- **安装新包** —— 指定包名 + 版本号（留空默认最新版），支持 `dependencies` / `devDependencies` / `--no-save`
- **一键升级** —— 支持升级到 `wanted`（semver 允许范围）或 `latest`（最新版），major 升级有标识
- **一键卸载** —— 卸载前确认，安全移除
- **实时终端日志** —— 流式展示 npm 命令输出，区分 stdout / stderr / 状态
- **筛选与搜索** —— 按"有过时版本 / major 升级 / 有更新"筛选，包名实时搜索
- **暗色主题** —— 面向开发者的深色界面

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | [Tauri 2](https://tauri.app/) |
| 前端 | React 19 + TypeScript |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS 4 |
| 后端 | Rust (tokio, serde) |

## 📦 环境要求

- Windows 10 / 11
- [Node.js](https://nodejs.org/) (>= 18) + npm
- [Rust](https://www.rust-lang.org/) (stable) + [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（C++ 工作负载）

## 🚀 开发

```bash
# 安装前端依赖
npm install

# 启动开发模式（热重载）
npm run tauri dev
```

## 🔨 构建安装包

```bash
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`：
- `nsis/*.exe` —— Windows 安装程序
- `msi/*.msi` —— 企业部署包

## 🧪 测试

```bash
# 前端单元测试（Vitest）
npm run test

# Rust 单元测试
cd src-tauri && cargo test
```

## 📁 项目结构

```
npm-pilot/
├── src/                 # 前端 (React)
│   ├── components/      # UI 组件
│   ├── stores/          # Zustand 状态管理
│   ├── hooks/           # 自定义 hooks
│   └── types/           # TypeScript 类型
├── src-tauri/           # 后端 (Rust)
│   ├── src/commands/    # Tauri 命令
│   └── src/npm.rs       # npm 进程执行封装
└── ...
```

## 🔒 安全

- 所有 npm 调用使用参数数组（无 shell 拼接），配合白名单输入校验，防命令注入
- 安装时默认 `--ignore-scripts`（可选关闭），降低供应链攻击风险
- 严格 CSP（`default-src 'self'`）

## 📄 许可证

[MIT](LICENSE)
