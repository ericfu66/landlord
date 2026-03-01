# 房东模拟器

AI驱动的Galgame房东模拟器，使用 Next.js 14 全栈构建。

## 功能特性

- 🔐 **账户系统**: 注册、登录、会话管理
- 👥 **AI角色招募**: 使用OpenAI协议生成角色
- 🏢 **基建系统**: 10格楼层房间建造
- 💬 **多模式交互**: 日常/约会/调情/自由对话
- 📊 **变量系统**: 好感度/顺从度/堕落度追踪
- 💰 **经济系统**: 货币、体力、打工
- 💾 **存档系统**: 自动存档、多存档槽
- ⚙️ **管理面板**: 用户管理、API统计

## 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion
- **状态管理**: Zustand
- **数据库**: sql.js (SQLite in JavaScript)
- **AI**: OpenAI兼容API (Function Calling)
- **测试**: Vitest, Playwright

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env.local`:

```bash
DATABASE_PATH=./data/landlord.db
SESSION_SECRET=your-super-secret-key-change-in-production
NEXT_PUBLIC_DEFAULT_BG_URL=https://images.unsplash.com/photo-1545324418-cc1a3fa10c00
```

### 3. 初始化数据库

```bash
npm run db:migrate
npm run db:seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 默认账户

- **管理员**: `ericfu` / `jesica16`

## 可用脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run start        # 启动生产服务器
npm run test         # 运行单元测试
npm run test:watch   # 监听模式测试
npm run test:e2e     # 运行E2E测试
npm run lint         # 代码检查
npm run db:migrate   # 运行数据库迁移
npm run db:seed      # 填充初始数据
```

## 项目结构

```
src/
├── app/                 # Next.js App Router
│   ├── (auth)/         # 认证相关页面
│   ├── (game)/         # 游戏页面
│   ├── admin/          # 管理员面板
│   └── api/            # API路由
├── components/         # React组件
│   ├── game/          # 游戏组件
│   ├── panels/        # 面板组件
│   └── ui/            # 基础UI组件
├── lib/               # 工具库
│   ├── ai/           # AI客户端
│   ├── auth/         # 认证逻辑
│   ├── security/     # 安全工具
│   └── services/     # 业务服务
├── prompts/          # AI提示词模板
├── store/            # Zustand状态
└── types/            # TypeScript类型
```

## API配置

1. 登录后访问 `/game/settings`
2. 填写你的OpenAI兼容API地址和Key
3. 点击"测试连接"验证
4. 点击"获取可用模型"选择模型

## 许可证

MIT