/**
 * Discord 斜杠命令注册脚本
 * 使用: npx tsx discord-bot/register-commands.ts
 */
import { REST, Routes, SlashCommandBuilder } from 'discord.js'
import { commandDefinitions } from './commands'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const CLIENT_ID = process.env.DISCORD_CLIENT_ID
const GUILD_ID = process.env.DISCORD_GUILD_ID

if (!BOT_TOKEN || BOT_TOKEN === 'your_bot_token_here') {
  console.error('❌ 错误: 请在 .env 文件中设置 DISCORD_BOT_TOKEN')
  console.log('\n获取 Bot Token 步骤:')
  console.log('1. 访问 https://discord.com/developers/applications')
  console.log('2. 选择你的应用')
  console.log('3. 左侧菜单点击 "Bot"')
  console.log('4. 点击 "Reset Token" 获取 Token')
  console.log('5. 将 Token 复制到 .env 文件的 DISCORD_BOT_TOKEN')
  process.exit(1)
}

if (!CLIENT_ID) {
  console.error('❌ 错误: 请在 .env 文件中设置 DISCORD_CLIENT_ID')
  process.exit(1)
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN!)

  try {
    console.log('🚀 开始注册 Discord 斜杠命令...\n')
    console.log(`📋 命令列表 (${commandDefinitions.length} 个):`)
    commandDefinitions.forEach((cmd, i) => {
      console.log(`  ${i + 1}. /${cmd.name} - ${cmd.description}`)
    })
    console.log('')

    // 转换为 JSON 格式
    const commandsJson = commandDefinitions.map(cmd => cmd.toJSON())

    // 检查是否是全局注册
    const isGlobal = process.argv.includes('--global')

    if (isGlobal) {
      // 全局命令（所有服务器可用，最长可能需要 1 小时同步）
      console.log('🌍 注册全局命令（所有服务器）...')
      const data = await rest.put(
        Routes.applicationCommands(CLIENT_ID!),
        { body: commandsJson }
      ) as any[]
      console.log(`✅ 成功注册 ${data.length} 个全局命令！`)
      console.log('⏳ 注意：全局命令最长可能需要 1 小时才能完全同步')
    } else if (GUILD_ID && GUILD_ID !== 'your_guild_id_here') {
      // 服务器命令（仅特定服务器，立即生效，推荐开发使用）
      console.log(`🏠 注册服务器命令（服务器 ID: ${GUILD_ID}）...`)
      const data = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID!, GUILD_ID!),
        { body: commandsJson }
      ) as any[]
      console.log(`✅ 成功注册 ${data.length} 个服务器命令！`)
      console.log('⚡ 命令已立即生效')
    } else {
      // 没有 GUILD_ID，询问用户
      console.log('⚠️ 警告: 未设置 DISCORD_GUILD_ID')
      console.log('\n选项 1: 设置 GUILD_ID 注册服务器命令（推荐开发）')
      console.log('选项 2: 使用 --global 参数注册全局命令')
      console.log('\n获取服务器 ID 步骤:')
      console.log('1. Discord 设置 → 高级 → 开启开发者模式')
      console.log('2. 右键点击服务器名称 → 复制服务器 ID')
      console.log('3. 将 ID 填入 .env 文件的 DISCORD_GUILD_ID')
      console.log('\n或者运行: npx tsx discord-bot/register-commands.ts --global')
      process.exit(1)
    }

    console.log('\n📚 使用说明:')
    console.log('1. 确保 Bot 已加入你的服务器')
    console.log('2. 在服务器中输入 / 即可看到命令')
    console.log('3. 如需更新命令，重新运行此脚本')

  } catch (error: any) {
    console.error('❌ 注册失败:', error.message)
    
    if (error.message.includes('401')) {
      console.log('\n💡 提示: Bot Token 无效，请检查 DISCORD_BOT_TOKEN')
    } else if (error.message.includes('403')) {
      console.log('\n💡 提示: Bot 没有权限，请确保 Bot 已加入服务器且有 applications.commands 权限')
    } else if (error.message.includes('50035')) {
      console.log('\n💡 提示: 命令格式错误，请检查 commands.ts 中的命令定义')
    }
    
    process.exit(1)
  }
}

// 运行注册
registerCommands()
