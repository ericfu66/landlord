import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { getGameState, updateGameState, dailyReset } from '@/lib/services/economy-service'
import { getDb } from '@/lib/db'
import { generateDailyNews } from '@/lib/services/news-service'

export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await getUserById(session.userId)
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // Ensure game state exists before advancing
    let gameState = await getGameState(session.userId)
    if (!gameState) {
      await updateGameState(session.userId, {
        currency: 1000,
        energy: 3,
        debtDays: 0,
        totalFloors: 1,
        weather: '晴',
        currentTime: '08:00'
      })
    }

    // 执行每日重置并获取结算信息
    const settlement = await dailyReset(session.userId)

    // 获取更新后的游戏状态
    gameState = await getGameState(session.userId)

    // 生成每日新闻
    let dailyNews = null
    if (user.api_config) {
      try {
        const apiConfig = JSON.parse(user.api_config)
        
        // 获取租客列表
        const db = await getDb()
        const charResult = db.exec(`
          SELECT name FROM characters WHERE user_id = ${session.userId}
        `)
        const tenantNames = charResult && charResult[0]?.values 
          ? charResult[0].values.map((row: unknown[]) => row[0] as string)
          : []
        
        // 生成新闻
        dailyNews = await generateDailyNews(
          session.userId,
          apiConfig,
          gameState?.weather || '晴',
          tenantNames
        )
      } catch (newsError) {
        console.error('Generate daily news error:', newsError)
        // 新闻生成失败不影响游戏推进
      }
    }

    // 构建结算消息
    let settlementMessage = '每日结算：'
    if (settlement.rentIncome > 0) {
      settlementMessage += `\n💰 租金收入：+${settlement.rentIncome}`
    }
    if (settlement.salaryIncome > 0) {
      settlementMessage += `\n💼 工资收入：+${settlement.salaryIncome}`
    }
    settlementMessage += `\n📊 总计：+${settlement.totalIncome}（${settlement.previousCurrency} → ${settlement.newCurrency}）`

    return NextResponse.json({
      success: true,
      message: '时间推进成功！\n' + settlementMessage,
      state: gameState,
      settlement: settlement,
      hasNews: !!dailyNews,
      newsTitle: dailyNews?.title || null
    })
  } catch (error) {
    console.error('Advance time error:', error)
    return NextResponse.json(
      { error: '时间推进失败' },
      { status: 500 }
    )
  }
}
