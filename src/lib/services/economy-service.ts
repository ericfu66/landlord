import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'
import { getTalentModifiers } from './talent-service'

export interface GameState {
  userId: number
  currentTime: string
  weather: string
  currency: number
  energy: number
  debtDays: number
  totalFloors: number
  currentJob: {
    name: string
    salary: number
    daysWorked: number
  } | null
}

export interface FailureState {
  gameOver: boolean
  reason?: string
  shouldRemoveSave: boolean
}

export function evaluateFailure(state: {
  currency: number
  debtDays: number
  tenantCount: number
}): FailureState {
  if (state.currency < 0 && state.debtDays > 14 && state.tenantCount === 0) {
    return {
      gameOver: true,
      reason: '负债超过14天且无租客，游戏结束',
      shouldRemoveSave: true
    }
  }

  if (state.currency < 0 && state.debtDays > 7) {
    return {
      gameOver: false,
      reason: '负债超过7天，每7天可能失去一名租客',
      shouldRemoveSave: false
    }
  }

  return {
    gameOver: false,
    shouldRemoveSave: false
  }
}

export async function getGameState(userId: number): Promise<GameState | null> {
  const db = await getDb()
  const result = db.exec(
    `SELECT currency, energy, debt_days, total_floors, weather, current_time, current_job
     FROM users WHERE id = ${userId}`
  )

  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }

  const row = result[0].values[0]
  return {
    userId,
    currentTime: (row[4] as string) || '08:00',
    weather: (row[3] as string) || '晴',
    currency: (row[0] as number) ?? 1000,
    energy: (row[1] as number) ?? 3,
    debtDays: (row[2] as number) ?? 0,
    totalFloors: (row[3] as number) ?? 1,
    currentJob: row[6] ? JSON.parse(row[6] as string) : null
  }
}

export async function updateGameState(
  userId: number,
  updates: Partial<Omit<GameState, 'userId'>>
): Promise<void> {
  const db = await getDb()

  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (updates.currentTime !== undefined) {
    fields.push('current_time = ?')
    values.push(updates.currentTime)
  }
  if (updates.weather !== undefined) {
    fields.push('weather = ?')
    values.push(updates.weather)
  }
  if (updates.currency !== undefined) {
    fields.push('currency = ?')
    values.push(updates.currency)
  }
  if (updates.energy !== undefined) {
    fields.push('energy = ?')
    values.push(updates.energy)
  }
  if (updates.debtDays !== undefined) {
    fields.push('debt_days = ?')
    values.push(updates.debtDays)
  }
  if (updates.totalFloors !== undefined) {
    fields.push('total_floors = ?')
    values.push(updates.totalFloors)
  }
  if (updates.currentJob !== undefined) {
    fields.push('current_job = ?')
    values.push(updates.currentJob ? JSON.stringify(updates.currentJob) : null)
  }

  if (fields.length > 0) {
    // sql.js 不支持参数绑定，需要手动构建 SQL
    const setClauses: string[] = []
    if (updates.currentTime !== undefined) setClauses.push(`current_time = '${updates.currentTime}'`)
    if (updates.weather !== undefined) setClauses.push(`weather = '${updates.weather}'`)
    if (updates.currency !== undefined) setClauses.push(`currency = ${updates.currency}`)
    if (updates.energy !== undefined) setClauses.push(`energy = ${updates.energy}`)
    if (updates.debtDays !== undefined) setClauses.push(`debt_days = ${updates.debtDays}`)
    if (updates.totalFloors !== undefined) setClauses.push(`total_floors = ${updates.totalFloors}`)
    if (updates.currentJob !== undefined) {
      const jobJson = updates.currentJob ? `'${JSON.stringify(updates.currentJob).replace(/'/g, "''")}'` : 'NULL'
      setClauses.push(`current_job = ${jobJson}`)
    }
    
    const safeUserId = safeInt(userId)
    db.run(`UPDATE users SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ${safeUserId}`)
    saveDb()
  }
}

export interface DailySettlement {
  rentIncome: number
  salaryIncome: number
  totalIncome: number
  previousCurrency: number
  newCurrency: number
}

export async function dailyReset(userId: number): Promise<DailySettlement> {
  const db = await getDb()

  const state = await getGameState(userId)
  if (!state) {
    await updateGameState(userId, { energy: 3 })
    return {
      rentIncome: 0,
      salaryIncome: 0,
      totalIncome: 0,
      previousCurrency: 0,
      newCurrency: 0
    }
  }

  const weathers = ['晴', '多云', '小雨', '大雨', '雪']
  const randomWeather = weathers[Math.floor(Math.random() * weathers.length)]

  let newDebtDays = state.debtDays
  if (state.currency < 0) {
    newDebtDays = state.debtDays + 1
  } else {
    newDebtDays = 0
  }

  // 计算所有角色的租金收入
  const charResult = db.exec(
    `SELECT COALESCE(SUM(rent), 0) as total_rent FROM characters WHERE user_id = ${userId}`
  )
  let totalRent = (charResult?.[0]?.values?.[0]?.[0] as number) || 0

  // 应用天赋加成
  const talentMods = await getTalentModifiers(userId)

  // 精明商人：租金收入加成
  if (talentMods.rentIncomeBonus > 1) {
    totalRent = Math.round(totalRent * talentMods.rentIncomeBonus)
  }

  // 恐惧支配：服从>50的角色额外租金加成
  if (talentMods.rentObedienceBonus > 0) {
    const fearResult = db.exec(
      `SELECT COALESCE(SUM(rent), 0) FROM characters WHERE user_id = ${userId} AND obedience > 50`
    )
    const fearRent = (fearResult?.[0]?.values?.[0]?.[0] as number) || 0
    totalRent += Math.round(fearRent * talentMods.rentObedienceBonus)
  }

  // 计算总收入（工资 + 租金）
  let salaryIncome = 0
  if (state.currentJob) {
    salaryIncome = state.currentJob.salary
    // 高薪猎手：工资加成
    if (talentMods.salaryBonus > 1) {
      salaryIncome = Math.round(salaryIncome * talentMods.salaryBonus)
    }
  }
  const totalIncome = totalRent + salaryIncome

  // 计算新的货币数量
  const newCurrency = state.currency + totalIncome

  // 精力充沛：能量上限加成
  const maxEnergy = 3 + (talentMods.energyLimitBonus || 0)

  // 更新游戏状态
  await updateGameState(userId, {
    energy: maxEnergy,
    weather: randomWeather,
    debtDays: newDebtDays,
    currency: newCurrency
  })

  // 如果有工作，扣除体力
  if (state.currentJob) {
    await updateGameState(userId, {
      energy: Math.max(0, maxEnergy - 1) // 工作消耗1点能量
    })
  }

  return {
    rentIncome: totalRent,
    salaryIncome: salaryIncome,
    totalIncome: totalIncome,
    previousCurrency: state.currency,
    newCurrency: newCurrency
  }
}

export async function deductEnergy(userId: number, amount: number = 1): Promise<boolean> {
  const state = await getGameState(userId)
  if (!state || state.energy < amount) {
    return false
  }

  await updateGameState(userId, { energy: state.energy - amount })
  return true
}

export async function addCurrency(userId: number, amount: number): Promise<void> {
  const state = await getGameState(userId)
  if (!state) return

  await updateGameState(userId, { currency: state.currency + amount })
}

export async function deductCurrency(userId: number, amount: number): Promise<boolean> {
  const state = await getGameState(userId)
  if (!state || state.currency < amount) {
    return false
  }

  await updateGameState(userId, { currency: state.currency - amount })
  return true
}

export function generateRandomWeather(): string {
  const weathers = ['晴', '多云', '小雨', '大雨', '雪']
  return weathers[Math.floor(Math.random() * weathers.length)]
}
