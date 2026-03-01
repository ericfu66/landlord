import { getDb, saveDb } from '@/lib/db'

export interface GameState {
  saveId: number
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

export async function getGameState(saveId: number): Promise<GameState | null> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, current_time, weather, currency, energy, debt_days, total_floors, current_job
     FROM game_states WHERE save_id = ?`,
    [saveId]
  )

  if (result.length === 0 || result[0].values.length === 0) {
    return null
  }

  const row = result[0].values[0]
  return {
    saveId: row[0] as number,
    currentTime: row[1] as string || '08:00',
    weather: row[2] as string || '晴',
    currency: row[3] as number,
    energy: row[4] as number,
    debtDays: row[5] as number,
    totalFloors: row[6] as number,
    currentJob: row[7] ? JSON.parse(row[7] as string) : null
  }
}

export async function updateGameState(saveId: number, updates: Partial<GameState>): Promise<void> {
  const db = await getDb()
  
  const existing = await getGameState(saveId)
  if (!existing) {
    db.run(
      `INSERT INTO game_states (save_id, current_time, weather, currency, energy, debt_days, total_floors, current_job)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saveId,
        updates.currentTime || '08:00',
        updates.weather || '晴',
        updates.currency ?? 1000,
        updates.energy ?? 3,
        updates.debtDays ?? 0,
        updates.totalFloors ?? 1,
        updates.currentJob ? JSON.stringify(updates.currentJob) : null
      ]
    )
  } else {
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
      db.run(
        `UPDATE game_states SET ${fields.join(', ')} WHERE save_id = ?`,
        [...values, saveId]
      )
    }
  }
  
  saveDb()
}

export async function dailyReset(saveId: number): Promise<void> {
  const db = await getDb()
  
  const state = await getGameState(saveId)
  if (!state) {
    await updateGameState(saveId, { energy: 3 })
    return
  }

  const weathers = ['晴', '多云', '小雨', '大雨', '雪']
  const randomWeather = weathers[Math.floor(Math.random() * weathers.length)]

  let newDebtDays = state.debtDays
  if (state.currency < 0) {
    newDebtDays = state.debtDays + 1
  } else {
    newDebtDays = 0
  }

  await updateGameState(saveId, {
    energy: 3,
    weather: randomWeather,
    debtDays: newDebtDays
  })

  if (state.currentJob) {
    await updateGameState(saveId, {
      currency: state.currency + state.currentJob.salary,
      energy: Math.max(0, state.energy - 1)
    })
  }
}

export async function deductEnergy(saveId: number, amount: number = 1): Promise<boolean> {
  const state = await getGameState(saveId)
  if (!state || state.energy < amount) {
    return false
  }

  await updateGameState(saveId, { energy: state.energy - amount })
  return true
}

export async function addCurrency(saveId: number, amount: number): Promise<void> {
  const state = await getGameState(saveId)
  if (!state) return

  await updateGameState(saveId, { currency: state.currency + amount })
}

export async function deductCurrency(saveId: number, amount: number): Promise<boolean> {
  const state = await getGameState(saveId)
  if (!state || state.currency < amount) {
    return false
  }

  await updateGameState(saveId, { currency: state.currency - amount })
  return true
}

export function generateRandomWeather(): string {
  const weathers = ['晴', '多云', '小雨', '大雨', '雪']
  return weathers[Math.floor(Math.random() * weathers.length)]
}