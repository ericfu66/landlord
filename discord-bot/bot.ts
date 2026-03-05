/**
 * Discord Bot 启动脚本
 * 处理斜杠命令交互
 * 使用: npx tsx discord-bot/bot.ts
 */
import { Client, GatewayIntentBits, Interaction } from 'discord.js'
import { commandHandlers } from './commands'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

if (!BOT_TOKEN || BOT_TOKEN === 'your_bot_token_here') {
  console.error('❌ 错误: 请在 .env 文件中设置 DISCORD_BOT_TOKEN')
  process.exit(1)
}

// 创建客户端
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
})

// Bot 启动时
client.once('clientReady', () => {
  console.log('🤖 Bot 已启动！')
  console.log(`✅ 登录账号: ${client.user?.tag}`)
  console.log(`📊 服务器数: ${client.guilds.cache.size}`)
  console.log(`⏱️ 延迟: ${client.ws.ping}ms`)
  console.log('\n📚 可用命令:')
  console.log('  /register - 注册游戏账号')
  console.log('  /status - 查看游戏状态')
  console.log('  /help - 查看帮助')
  console.log('\n按 Ctrl+C 停止 Bot')
})

// 处理交互事件
client.on('interactionCreate', async (interaction: Interaction) => {
  // 只处理斜杠命令
  if (!interaction.isChatInputCommand()) return

  const { commandName } = interaction
  const handler = commandHandlers[commandName]

  if (handler) {
    try {
      console.log(`📥 执行命令: /${commandName} (用户: ${interaction.user.tag})`)
      await handler(interaction)
    } catch (error: any) {
      console.error(`❌ 命令执行失败 /${commandName}:`, error)
      
      const errorMessage = '❌ 命令执行出错，请稍后重试'
      
      try {
        // 根据交互状态选择回复方式
        if (interaction.deferred) {
          await interaction.editReply({ content: errorMessage })
        } else if (!interaction.replied) {
          await interaction.reply({ content: errorMessage, ephemeral: true })
        }
      } catch (replyError) {
        // 忽略回复错误（交互可能已过期）
        console.error('发送错误消息失败:', replyError)
      }
    }
  } else {
    console.warn(`⚠️ 未知命令: /${commandName}`)
    try {
      await interaction.reply({
        content: '❌ 未知命令，请使用 `/help` 查看可用命令',
        ephemeral: true
      })
    } catch (e) {
      // 忽略
    }
  }
})

// 错误处理
client.on('error', (error) => {
  console.error('❌ Bot 错误:', error)
})

process.on('SIGINT', () => {
  console.log('\n👋 正在关闭 Bot...')
  client.destroy()
  process.exit(0)
})

// 启动 Bot
console.log('🚀 正在启动 Bot...')
client.login(BOT_TOKEN)
