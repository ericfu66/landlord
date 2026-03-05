# Discord Bot 配置指南

房东模拟器的 Discord Bot 模块，用于注册斜杠命令和处理游戏相关交互。

## 快速开始

### 1. 获取 Bot Token

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 选择你的应用（或使用已有的 CLIENT_ID）
3. 左侧菜单点击 **"Bot"**
4. 点击 **"Reset Token"** 获取 Token
5. 将 Token 复制到 `.env` 文件的 `DISCORD_BOT_TOKEN`

### 2. 获取服务器 ID（可选，推荐开发时使用）

1. Discord 设置 → 高级 → **开启开发者模式**
2. 右键点击服务器名称 → **复制服务器 ID**
3. 将 ID 填入 `.env` 文件的 `DISCORD_GUILD_ID`

### 3. 邀请 Bot 加入服务器

使用以下链接邀请 Bot（替换 `YOUR_CLIENT_ID`）：

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147483648&scope=bot%20applications.commands
```

或者访问 Developer Portal → OAuth2 → URL Generator：
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Use Slash Commands`

### 4. 注册斜杠命令

```bash
# 注册服务器命令（推荐开发使用，立即生效）
npm run bot:register

# 注册全局命令（所有服务器可用，最长1小时生效）
npm run bot:register:global
```

### 5. 启动 Bot（可选）

```bash
# 启动 Bot 处理命令交互
npm run bot:start
```

## 可用命令

| 命令 | 描述 |
|------|------|
| `/register` | 注册游戏账号 |
| `/status` | 查看游戏状态 |
| `/character` | 查看角色信息 |
| `/building` | 查看建筑状态 |
| `/recruit` | 招募新角色 |
| `/work` | 打工赚钱 |
| `/balance` | 查看余额 |
| `/leaderboard` | 查看排行榜 |
| `/info` | Bot 信息 |
| `/help` | 显示帮助 |
| `/stats` | 游戏统计（管理员） |

## 文件结构

```
discord-bot/
├── commands.ts          # 命令定义和处理
├── register-commands.ts # 命令注册脚本
├── bot.ts              # Bot 启动脚本
└── README.md           # 本文件
```

## 添加新命令

1. 在 `commands.ts` 中添加命令定义：

```typescript
const myCommand = new SlashCommandBuilder()
  .setName('mycommand')
  .setDescription('我的新命令')

export const commandDefinitions = [
  // ... 现有命令
  myCommand,
]
```

2. 添加命令处理逻辑：

```typescript
export const commandHandlers = {
  // ... 现有处理
  mycommand: async (interaction) => {
    await interaction.reply('Hello!')
  },
}
```

3. 重新注册命令：

```bash
npm run bot:register
```

## 注意事项

- **服务器命令**：仅特定服务器可用，修改后立即生效，适合开发测试
- **全局命令**：所有服务器可用，修改后最长需要 1 小时生效，适合生产环境
- 命令注册需要 `applications.commands` 权限
- 每个应用最多 100 个全局命令，每个服务器最多 100 个服务器命令
