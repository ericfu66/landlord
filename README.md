# 🏠 房东模拟器 (Landlord Simulator)

一个基于 AI 的沉浸式角色扮演游戏，你作为房东与各种租客互动，体验独特的 Galgame 式对话玩法。

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-sql.js-orange)](https://sql.js.org/)

## ✨ 主要功能

### 🤖 AI 驱动的角色互动
- **Galgame 式对话**：与租客进行沉浸式 AI 对话，支持日常、正经、调情、约会等多种模式
- **角色生成**：使用 AI 自动生成独特性格的租客角色，支持现代和跨时空角色
- **分阶段人设**：角色拥有动态变化的性格状态（如黑化值、软化度等），随互动发展而变化

### 💬 群聊系统
- **Multi-Agent 群聊**：公寓内租客可在群聊中互动
- **@提及机制**：@特定角色必定触发其回复
- **角色转账**：租客可在群聊中向你转账金币
- **表情包**：角色可发送 AI 生成的表情包

### 🧠 RAG 记忆增强
- **向量检索**：使用 SiliconFlow Embedding API 实现基于相似度的记忆检索
- **智能记忆**：每次对话自动检索最相关的 3 条历史记忆 + 最新 3 条记忆
- **可开关**：不影响未配置的用户

### 🏗️ 公寓经营
- **房间建造**：建造不同类型的房间吸引租客
- **租客招募**：花费金币招募新租客
- **经济系统**：租金收入、金币管理、体力系统

### 🎮 游戏系统
- **世界观设定**：创建自定义世界观背景
- **任务系统**：每日任务和成就系统
- **天赋系统**：提升房东各项能力的技能树
- **每日新闻**：游戏内每日生成的新闻事件
- **日记系统**：租客会记录自己的日记

### 🔗 联机功能
- **Discord OAuth**：支持 Discord 账号登录
- **访问公寓**：访问其他玩家的公寓并与他们的租客互动

## 🛠️ 技术栈

- **前端**：Next.js 14 + React 18 + TypeScript
- **样式**：Tailwind CSS + Framer Motion
- **数据库**：SQLite (sql.js) - 纯前端数据库，无需后端服务器
- **AI 集成**：OpenAI API / 兼容 OpenAI 的第三方 API
- **Embedding**：SiliconFlow API
- **认证**：JWT + Discord OAuth
- **测试**：Vitest + Playwright

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 pnpm

### 安装

```bash
# 克隆项目
git clone https://github.com/ericfu66/landlord.git
cd landlord

# 安装依赖
npm install

# 创建环境变量文件
cp .env.example .env.local
```

### 配置

编辑 `.env.local` 文件：

```env
# 数据库路径（可选，默认使用项目目录下的 data/landlord.db）
DATABASE_PATH=./data/landlord.db

# Discord OAuth 配置（可选，用于 Discord 登录）
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback

# 应用 URL
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# SiliconFlow API Key（可选，用于生成表情包）
SILICONFLOW_API_KEY=your_siliconflow_api_key
```

### 运行

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build
npm start
```

访问 http://localhost:3000 即可开始游戏。

## 📖 使用指南

### 首次使用

1. **注册账号**：使用用户名密码注册，或通过 Discord 登录
2. **创建角色**：设置你的房东形象（姓名、年龄、外貌、性格）
3. **配置 AI**：在设置中配置你的 AI API（支持 OpenAI、SiliconFlow 等）
4. **开始游戏**：进入游戏后，先建造房间，然后招募租客

### AI 配置示例

**SiliconFlow 配置**：
- Base URL: `https://api.siliconflow.cn/v1`
- Model: `Qwen/Qwen2.5-72B-Instruct` 或 `deepseek-ai/DeepSeek-V2.5`

**OpenAI 配置**：
- Base URL: `https://api.openai.com/v1`
- Model: `gpt-4o` 或 `gpt-4o-mini`

### RAG 记忆系统配置（可选）

1. 访问 https://siliconflow.cn 注册并获取 API Key
2. 在游戏设置 → RAG 记忆增强中启用
3. 配置 Embedding：
   - Base URL: `https://api.siliconflow.cn/v1`
   - Model: `BAAI/bge-m3`（推荐）
4. 点击"测试 Embedding 连接"验证配置
5. 保存设置

启用后，每次对话将自动检索最相关的历史记忆，让角色拥有更连贯的长期记忆。

### Discord OAuth 配置（可选）

1. 访问 https://discord.com/developers/applications 创建应用
2. 在 OAuth2 设置中添加重定向 URL：`http://localhost:3000/api/auth/discord/callback`
3. 获取 Client ID 和 Client Secret
4. 填入 `.env.local` 文件

## 📁 项目结构

```
landlord/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   ├── auth/          # 认证相关
│   │   │   ├── interact/      # 角色对话
│   │   │   ├── group-chat/    # 群聊系统
│   │   │   ├── rag/           # RAG 记忆配置
│   │   │   └── ...
│   │   ├── game/              # 游戏页面
│   │   │   ├── building/      # 建造房间
│   │   │   ├── characters/    # 角色列表
│   │   │   ├── group-chat/    # 群聊
│   │   │   ├── interact/      # 角色互动
│   │   │   ├── recruit/       # 招募租客
│   │   │   ├── settings/      # 设置
│   │   │   └── ...
│   │   └── page.tsx           # 首页
│   ├── components/            # React 组件
│   ├── lib/                   # 工具库
│   │   ├── ai/               # AI 客户端
│   │   ├── auth/             # 认证相关
│   │   ├── services/         # 业务服务
│   │   └── db.ts             # 数据库
│   ├── prompts/              # AI Prompt 模板
│   └── types/                # TypeScript 类型
├── database/
│   ├── schema.sql            # 数据库结构
│   └── migrations/           # 数据库迁移
├── tests/                    # 测试文件
├── docs/                     # 文档
└── public/                   # 静态资源
```

## 🧪 测试

```bash
# 运行单元测试
npm test

# 运行测试（监听模式）
npm run test:watch

# 运行 E2E 测试
npm run test:e2e
```

## 📝 核心功能说明

### 角色互动模式

- **日常模式**：普通对话，支持表情包
- **正经模式**：严肃话题讨论
- **调情模式**：需要好感度 ≥ 50
- **约会模式**：需要好感度 ≥ 30

### 分阶段人设

角色拥有一个特殊变量（如黑化值、软化度等），随互动变化，影响角色表现：
- 0-20：初始状态
- 20-40：轻微变化
- 40-60：明显变化
- 60-80：大幅变化
- 80-100：终极状态

### 群聊机制

- 玩家发言触发 2-3 位租客响应
- 使用 `@角色名` 强制触发特定角色
- 角色间可形成最多 3 条的对话链
- 支持转账、表情包、提及他人

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [SiliconFlow](https://siliconflow.cn/) - 提供 Embedding API 支持
- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [sql.js](https://sql.js.org/) - 浏览器端 SQLite

---

🎮 开始你的房东生涯吧！
