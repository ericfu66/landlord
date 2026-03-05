/**
 * Discord 斜杠命令定义
 * 用于房东模拟器游戏的 Discord Bot
 */
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js'
import { getDb, saveDb } from '../src/lib/db'
import * as bcrypt from 'bcryptjs'

// 定义命令类型
export interface BotCommand {
  data: SlashCommandBuilder
  execute: (interaction: any) => Promise<void>
}

// ============ 游戏相关命令 ============

// 查看游戏状态
const statusCommand = new SlashCommandBuilder()
  .setName('status')
  .setDescription('查看当前游戏状态')

// 注册游戏账号（绑定 Discord 账号到游戏）
const registerCommand = new SlashCommandBuilder()
  .setName('register')
  .setDescription('注册房东模拟器游戏账号')
  .addStringOption(option =>
    option
      .setName('username')
      .setDescription('游戏用户名（3-20个字符）')
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(20)
  )
  .addStringOption(option =>
    option
      .setName('password')
      .setDescription('登录密码（至少6位）')
      .setRequired(true)
      .setMinLength(6)
      .setMaxLength(32)
  )

// 查看角色信息
const characterCommand = new SlashCommandBuilder()
  .setName('character')
  .setDescription('查看当前角色信息')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('查看其他用户的角色（管理员）')
      .setRequired(false)
  )

// 查看建筑/房间
const buildingCommand = new SlashCommandBuilder()
  .setName('building')
  .setDescription('查看建筑状态')

// 招募角色
const recruitCommand = new SlashCommandBuilder()
  .setName('recruit')
  .setDescription('招募新角色')
  .addStringOption(option =>
    option
      .setName('name')
      .setDescription('角色名称')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('personality')
      .setDescription('角色性格描述')
      .setRequired(false)
  )

// 工作/打工
const workCommand = new SlashCommandBuilder()
  .setName('work')
  .setDescription('开始打工赚钱')

// 查看余额
const balanceCommand = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('查看当前余额')

// 排行榜
const leaderboardCommand = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('查看财富排行榜')
  .addStringOption(option =>
    option
      .setName('type')
      .setDescription('排行榜类型')
      .setRequired(false)
      .addChoices(
        { name: '财富', value: 'wealth' },
        { name: '好感度', value: 'affection' },
        { name: '等级', value: 'level' }
      )
  )

// ============ 管理命令 ============

// 查看 Bot 信息
const infoCommand = new SlashCommandBuilder()
  .setName('info')
  .setDescription('查看 Bot 信息')

// 帮助命令
const helpCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('查看所有可用命令')

// 管理员命令：查看统计
const statsCommand = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('查看游戏统计（管理员）')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

// 导出所有命令定义（用于注册）
export const commandDefinitions = [
  statusCommand,
  registerCommand,
  characterCommand,
  buildingCommand,
  recruitCommand,
  workCommand,
  balanceCommand,
  leaderboardCommand,
  infoCommand,
  helpCommand,
  statsCommand,
]

// 命令执行处理
export const commandHandlers: Record<string, (interaction: any) => Promise<void>> = {
  status: async (interaction) => {
    // 先延迟响应，防止超时
    await interaction.deferReply({ ephemeral: true })
    
    try {
      const db = await getDb()
      const discordId = interaction.user.id
      
      // 查询用户游戏状态
      const user = db.exec(`
        SELECT currency, energy, total_floors 
        FROM users 
        WHERE discord_id = '${discordId}'
      `)
      
      if (!user || user.length === 0 || user[0].values.length === 0) {
        await interaction.editReply({
          content: '🎮 **游戏状态**\n\n' +
            '你还没有注册账号！\n\n' +
            '使用 `/register <用户名> <密码>` 注册账号开始游戏！'
        })
        return
      }
      
      const [currency, energy, totalFloors] = user[0].values[0]
      
      // 查询角色数
      const characters = db.exec(`
        SELECT COUNT(*) as count 
        FROM characters 
        WHERE user_id = (SELECT id FROM users WHERE discord_id = '${discordId}')
      `)
      const characterCount = characters?.[0]?.values?.[0]?.[0] || 0
      
      await interaction.editReply({
        content: '🎮 **游戏状态**\n\n' +
          `🏢 建筑等级: ${totalFloors}\n` +
          `💰 余额: ¥${currency}\n` +
          `⚡ 体力: ${energy}/100\n` +
          `👥 角色数: ${characterCount}\n\n` +
          '🌐 访问 https://landlord.ericfu66.icu 开始游戏！'
      })
    } catch (error) {
      console.error('Status command error:', error)
      await interaction.editReply({
        content: '❌ 获取状态失败，请稍后重试'
      })
    }
  },

  register: async (interaction) => {
    // 先延迟响应，防止超时
    await interaction.deferReply({ ephemeral: true })
    
    const username = interaction.options.getString('username')
    const password = interaction.options.getString('password')
    const discordId = interaction.user.id
    const discordUsername = interaction.user.username
    const discordAvatar = interaction.user.avatarURL()
    
    try {
      const db = await getDb()
      
      // 检查用户名是否已存在
      const existingUser = db.exec(`
        SELECT id FROM users WHERE username = '${username}'
      `)
      
      if (existingUser && existingUser.length > 0 && existingUser[0].values.length > 0) {
        await interaction.editReply({
          content: '❌ **注册失败**\n\n该用户名已被使用，请选择其他用户名。'
        })
        return
      }
      
      // 检查 Discord 账号是否已绑定
      const existingDiscord = db.exec(`
        SELECT id FROM users WHERE discord_id = '${discordId}'
      `)
      
      if (existingDiscord && existingDiscord.length > 0 && existingDiscord[0].values.length > 0) {
        await interaction.editReply({
          content: '❌ **注册失败**\n\n你的 Discord 账号已绑定游戏账号，每个 Discord 账号只能注册一个游戏账号。'
        })
        return
      }
      
      // 使用 bcrypt 加密密码（10轮salt）
      const passwordHash = await bcrypt.hash(password!, 10)
      
      // 插入新用户
      db.run(`
        INSERT INTO users (
          username, 
          password_hash, 
          discord_id, 
          discord_username, 
          discord_avatar,
          currency,
          energy,
          total_floors,
          needs_onboarding,
          onboarding_step
        ) VALUES (
          '${username}',
          '${passwordHash}',
          '${discordId}',
          '${discordUsername}',
          ${discordAvatar ? `'${discordAvatar}'` : 'NULL'},
          1000,
          3,
          1,
          TRUE,
          'character'
        )
      `)
      
      saveDb()
      
      await interaction.editReply({
        content: `✅ **账号注册成功！**\n\n` +
          `👤 用户名: \`${username}\`\n` +
          `🔒 密码: 已安全加密存储\n` +
          `🔗 Discord: ${discordUsername}\n\n` +
          `💰 初始资金: ¥1000\n` +
          `⚡ 初始体力: 100\n\n` +
          '🎮 **下一步**\n' +
          '1. 访问 https://landlord.ericfu66.icu 登录游戏\n' +
          '2. 完成新手引导，创建你的房东角色\n' +
          '3. 开始招募租客，经营你的公寓！\n\n' +
          '💡 提示：使用 `/status` 随时查看游戏状态'
      })
      
      console.log(`✅ 新用户注册: ${username} (Discord: ${discordUsername})`)
      
    } catch (error) {
      console.error('注册失败:', error)
      await interaction.editReply({
        content: '❌ **注册失败**\n\n服务器内部错误，请稍后重试。'
      })
    }
  },

  character: async (interaction) => {
    await interaction.deferReply({ ephemeral: true })
    
    try {
      const db = await getDb()
      const discordId = interaction.user.id
      
      // 查询用户角色
      const characters = db.exec(`
        SELECT c.name, c.template, c.favorability, c.obedience, c.corruption, c.mood, c.portrait_url
        FROM characters c
        JOIN users u ON c.user_id = u.id
        WHERE u.discord_id = '${discordId}'
      `)
      
      if (!characters || characters.length === 0 || characters[0].values.length === 0) {
        await interaction.editReply({
          content: '👤 **角色信息**\n\n你还没有创建角色，访问网页版完成新手引导来创建！'
        })
        return
      }
      
      const charList = characters[0].values.map((row: any[]) => {
        const [name, template, favor, obey, corrupt, mood] = row
        return `• **${name}** (${template})\n  ❤️${favor} 🎯${obey} 💋${corrupt} 😊${mood}`
      }).join('\n')
      
      await interaction.editReply({
        content: `👤 **我的角色**\n\n${charList}`
      })
    } catch (error) {
      console.error('Character command error:', error)
      await interaction.editReply({
        content: '❌ 获取角色信息失败，请稍后重试'
      })
    }
  },

  building: async (interaction) => {
    await interaction.deferReply({ ephemeral: true })
    
    try {
      const db = await getDb()
      const discordId = interaction.user.id
      
      // 查询建筑状态
      const rooms = db.exec(`
        SELECT r.floor, r.position_start, r.room_type, r.name, c.name as char_name
        FROM rooms r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN characters c ON r.character_name = c.name
        WHERE u.discord_id = '${discordId}'
        ORDER BY r.floor, r.position_start
      `)
      
      if (!rooms || rooms.length === 0 || rooms[0].values.length === 0) {
        await interaction.editReply({
          content: '🏢 **建筑状态**\n\n' +
            '```\n' +
            '楼层 1:\n' +
            '[空] [空] [空] [空] [空]\n' +
            '楼层 2:\n' +
            '[锁] [锁] [锁] [锁] [锁]\n' +
            '```\n\n' +
            '完成新手引导后解锁更多房间！'
        })
        return
      }
      
      // 按楼层分组
      const floorMap = new Map<number, string[]>()
      rooms[0].values.forEach((row: any[]) => {
        const [floor, pos, type, name, charName] = row
        if (!floorMap.has(floor)) floorMap.set(floor, [])
        const display = charName ? `[${charName}]` : name ? `[${name}]` : '[空]'
        floorMap.get(floor)!.push(display)
      })
      
      let buildingText = ''
      floorMap.forEach((roomList, floor) => {
        buildingText += `楼层 ${floor}:\n${roomList.join(' ')}\n\n`
      })
      
      await interaction.editReply({
        content: `🏢 **建筑状态**\n\n\`\`\`\n${buildingText}\`\`\``
      })
    } catch (error) {
      console.error('Building command error:', error)
      await interaction.editReply({
        content: '❌ 获取建筑信息失败，请稍后重试'
      })
    }
  },

  recruit: async (interaction) => {
    // 简单回复不需要延迟
    await interaction.editReply({
      content: '🎭 **开始招募**\n\n' +
        '角色招募需要在网页版完成：\n' +
        'https://landlord.ericfu66.icu/characters\n\n' +
        '在那里你可以：\n' +
        '• 自定义角色外貌和性格\n' +
        '• 使用 AI 生成角色立绘\n' +
        '• 设置角色租金和属性'
    })
  },

  work: async (interaction) => {
    await interaction.editReply({
      content: '💼 **打工系统**\n\n' +
        '可用工作:\n' +
        '• 🧹 清洁 (+¥50, -10体力)\n' +
        '• 🍳 烹饪 (+¥100, -20体力)\n' +
        '• 🎨 画画 (+¥150, -30体力)\n\n' +
        '使用网页版进行详细操作！'
    })
  },

  balance: async (interaction) => {
    await interaction.deferReply({ ephemeral: true })
    
    try {
      const db = await getDb()
      const discordId = interaction.user.id
      
      const user = db.exec(`
        SELECT currency FROM users WHERE discord_id = '${discordId}'
      `)
      
      if (!user || user.length === 0 || user[0].values.length === 0) {
        await interaction.editReply({
          content: '💰 **我的钱包**\n\n你还没有注册账号，使用 `/register` 注册！'
        })
        return
      }
      
      const currency = user[0].values[0][0]
      
      await interaction.editReply({
        content: '💰 **我的钱包**\n\n' +
          `当前余额: ¥${currency}\n` +
          `今日收入: ¥0\n` +
          `总资产: ¥${currency}`
      })
    } catch (error) {
      console.error('Balance command error:', error)
      await interaction.editReply({
        content: '❌ 获取余额失败，请稍后重试'
      })
    }
  },

  leaderboard: async (interaction) => {
    const type = interaction.options.getString('type') || 'wealth'
    const typeNames: Record<string, string> = {
      wealth: '💰 财富榜',
      affection: '❤️ 好感度榜',
      level: '📊 等级榜'
    }
    
    await interaction.deferReply({ ephemeral: true })
    
    try {
      const db = await getDb()
      
      // 查询财富排行榜前10
      const topUsers = db.exec(`
        SELECT username, currency 
        FROM users 
        ORDER BY currency DESC 
        LIMIT 10
      `)
      
      let leaderboardText = ''
      if (topUsers && topUsers.length > 0 && topUsers[0].values.length > 0) {
        leaderboardText = topUsers[0].values.map((row: any[], i: number) => {
          const [name, amount] = row
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•'
          return `${medal} ${name.padEnd(12)} ¥${amount}`
        }).join('\n')
      } else {
        leaderboardText = '暂无数据...'
      }
      
      await interaction.editReply({
        content: `**${typeNames[type]}**\n\n` +
          '\`\`\`\n' +
          leaderboardText +
          '\`\`\`\n\n' +
          '注册账号即可上榜！'
      })
    } catch (error) {
      console.error('Leaderboard command error:', error)
      await interaction.editReply({
        content: `**${typeNames[type]}**\n\n获取排行榜失败，请稍后重试`
      })
    }
  },

  info: async (interaction) => {
    await interaction.editReply({
      content: '🤖 **房东模拟器 Bot**\n\n' +
        `版本: 0.2.0\n` +
        `延迟: ${interaction.client.ws.ping}ms\n` +
        `服务器数: ${interaction.client.guilds.cache.size}\n\n` +
        '🎮 一款 AI 驱动的 Galgame 房东模拟器\n' +
        '🔒 密码使用 bcrypt 加密存储'
    })
  },

  help: async (interaction) => {
    await interaction.editReply({
      content: '📖 **命令列表**\n\n' +
        '🎮 **游戏命令**\n' +
        '`/register <用户名> <密码>` - 注册游戏账号\n' +
        '`/status` - 查看游戏状态\n' +
        '`/character` - 查看角色信息\n' +
        '`/building` - 查看建筑状态\n' +
        '`/recruit` - 招募新角色\n' +
        '`/work` - 打工赚钱\n' +
        '`/balance` - 查看余额\n' +
        '`/leaderboard` - 查看排行榜\n\n' +
        '🤖 **Bot命令**\n' +
        '`/info` - Bot 信息\n' +
        '`/help` - 显示此帮助\n\n' +
        '🌐 **游戏网址**: https://landlord.ericfu66.icu'
    })
  },

  stats: async (interaction) => {
    await interaction.deferReply({ ephemeral: true })
    
    try {
      const db = await getDb()
      
      // 统计用户总数
      const userCount = db.exec(`SELECT COUNT(*) FROM users`)
      const totalUsers = userCount?.[0]?.values?.[0]?.[0] || 0
      
      // 统计角色总数
      const charCount = db.exec(`SELECT COUNT(*) FROM characters`)
      const totalChars = charCount?.[0]?.values?.[0]?.[0] || 0
      
      // 统计总财富
      const totalWealth = db.exec(`SELECT SUM(currency) FROM users`)
      const wealth = totalWealth?.[0]?.values?.[0]?.[0] || 0
      
      await interaction.editReply({
        content: '📊 **游戏统计（管理员）**\n\n' +
          `👤 总用户数: ${totalUsers}\n` +
          `🎭 总角色数: ${totalChars}\n` +
          `💰 经济总量: ¥${wealth}\n` +
          `📈 平均财富: ¥${totalUsers > 0 ? Math.floor(wealth / totalUsers) : 0}`
      })
    } catch (error) {
      console.error('Stats command error:', error)
      await interaction.editReply({
        content: '📊 **游戏统计（管理员）**\n\n统计获取失败，请稍后重试。'
      })
    }
  },
}
