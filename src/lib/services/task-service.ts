import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'
import { getGameState, updateGameState, addCurrency } from './economy-service'
import { generateTasksWithAI, type GeneratedTask } from '@/lib/ai/tools/task-tools'
import type { AIConfig } from '@/lib/ai/client'

export interface Task {
  id: number
  user_id: number
  title: string
  description: string
  condition_type: string
  condition_target: string | null
  condition_count: number
  condition_progress: number
  gold_reward: number
  xp_reward: number
  status: 'active' | 'completed' | 'expired'
  created_date: string
}

export type ConditionType =
  | 'interact' | 'collect_rent' | 'recruit' | 'build_room'
  | 'reach_favorability' | 'spend_currency' | 'work_days' | 'group_chat'

// 构建玩家状态摘要用于AI生成任务
export async function buildTaskContext(userId: number): Promise<string> {
  const db = await getDb()
  const safeUserId = safeInt(userId)

  // 1. 玩家基础状态
  const userResult = db.exec(`SELECT level, xp, currency, energy, total_floors, current_job FROM users WHERE id = ${safeUserId}`)
  const user = userResult[0]?.values[0]
  const level = (user?.[0] as number) || 1
  const xp = (user?.[1] as number) || 0
  const currency = (user?.[2] as number) || 1000
  const energy = (user?.[3] as number) || 3
  const totalFloors = (user?.[4] as number) || 1
  const currentJob = user?.[5] ? JSON.parse(user[5] as string) : null

  // 2. 角色列表
  const charResult = db.exec(`
    SELECT name, favorability, obedience, corruption, special_var_name, special_var_value, room_id
    FROM characters WHERE user_id = ${safeUserId} LIMIT 10
  `)
  const characters = charResult[0]?.values.map((row: unknown[]) => ({
    name: row[0] as string,
    favorability: row[1] as number,
    obedience: row[2] as number,
    corruption: row[3] as number,
    specialVar: row[4] ? `${row[4]}:${row[5]}` : null
  })) || []

  // 3. 建筑概况
  const roomResult = db.exec(`
    SELECT room_type, COUNT(*) as cnt FROM rooms WHERE user_id = ${safeUserId} GROUP BY room_type
  `)
  const roomCounts: Record<string, number> = {}
  roomResult[0]?.values.forEach((row: unknown[]) => {
    roomCounts[row[0] as string] = row[1] as number
  })

  // 4. 当前任务
  const taskResult = db.exec(`
    SELECT title, condition_type, condition_target, condition_count, condition_progress
    FROM tasks WHERE user_id = ${safeUserId} AND status = 'active'
  `)
  const activeTasks = taskResult[0]?.values.map((row: unknown[]) => ({
    title: row[0] as string,
    type: row[1] as string,
    target: row[2] as string | null,
    progress: row[4] as number,
    count: row[3] as number
  })) || []

  // 构建上下文字符串
  let context = `玩家状态：等级${level}, 金币${currency}, 能量${energy}/${3}, 楼层${totalFloors}\n`

  if (characters.length > 0) {
    context += `角色：${characters.map((c: { name: string; favorability: number; obedience: number; corruption: number; specialVar: string | null }) =>
      `${c.name}(好感${c.favorability} 服从${c.obedience} 黑化${c.corruption}${c.specialVar ? ' '+c.specialVar : ''})`
    ).join(', ')}\n`
  }

  context += `建筑：卧室${roomCounts.bedroom||0}间 功能房${roomCounts.functional||0}间 空房${roomCounts.empty||0}间\n`

  if (currentJob) {
    context += `工作：${currentJob.name}, 日薪${currentJob.salary}, 已工作${currentJob.daysWorked}天\n`
  }

  if (activeTasks.length > 0) {
    context += `当前任务：${activeTasks.map((t: { title: string; progress: number; count: number }) => `${t.title}(${t.progress}/${t.count})`).join(', ')}`
  }

  return context
}

// 生成每日任务
export async function generateTasks(userId: number, apiConfig: AIConfig | null, date: string): Promise<Task[]> {
  const db = await getDb()
  const safeUserId = safeInt(userId)

  // 检查今天是否已有任务，避免重复生成
  const existing = db.exec(`
    SELECT COUNT(*) FROM tasks WHERE user_id = ${safeUserId} AND created_date = '${date}'
  `)
  if ((existing[0]?.values[0]?.[0] as number) > 0) {
    return getActiveTasks(userId)
  }

  if (!apiConfig) {
    // 无AI配置时生成默认任务
    return generateDefaultTasks(userId, date)
  }

  const context = await buildTaskContext(userId)
  const result = await generateTasksWithAI(apiConfig, context)

  const createdTasks: Task[] = []

  for (const taskData of result.tasks) {
    const stmt = db.prepare(`
      INSERT INTO tasks (user_id, title, description, condition_type, condition_target,
        condition_count, condition_progress, gold_reward, xp_reward, status, created_date)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'active', ?)
    `)
    stmt.bind([
      safeUserId,
      taskData.title,
      taskData.description,
      taskData.condition_type,
      taskData.condition_target || null,
      taskData.condition_count,
      taskData.gold_reward,
      taskData.xp_reward,
      date
    ])
    stmt.step()
    stmt.free()

    // 获取插入的ID
    const idResult = db.exec(`SELECT last_insert_rowid()`)
    const id = idResult[0]?.values[0]?.[0] as number || Date.now()

    createdTasks.push({
      id,
      user_id: userId,
      title: taskData.title,
      description: taskData.description,
      condition_type: taskData.condition_type,
      condition_target: taskData.condition_target || null,
      condition_count: taskData.condition_count,
      condition_progress: 0,
      gold_reward: taskData.gold_reward,
      xp_reward: taskData.xp_reward,
      status: 'active',
      created_date: date
    })
  }

  saveDb()
  return createdTasks
}

// 生成默认任务（无AI配置时）
async function generateDefaultTasks(userId: number, date: string): Promise<Task[]> {
  const db = await getDb()
  const safeUserId = safeInt(userId)

  const defaultTasks: GeneratedTask[] = [
    {
      title: '日常互动',
      description: '与任意角色进行3次互动',
      condition_type: 'interact',
      condition_target: null,
      condition_count: 3,
      gold_reward: 100,
      xp_reward: 30
    },
    {
      title: '勤劳致富',
      description: '工作1天赚取工资',
      condition_type: 'work_days',
      condition_target: null,
      condition_count: 1,
      gold_reward: 150,
      xp_reward: 50
    }
  ]

  const createdTasks: Task[] = []

  for (const taskData of defaultTasks) {
    const stmt = db.prepare(`
      INSERT INTO tasks (user_id, title, description, condition_type, condition_target,
        condition_count, condition_progress, gold_reward, xp_reward, status, created_date)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'active', ?)
    `)
    stmt.bind([
      safeUserId,
      taskData.title,
      taskData.description,
      taskData.condition_type,
      taskData.condition_target || null,
      taskData.condition_count,
      taskData.gold_reward,
      taskData.xp_reward,
      date
    ])
    stmt.step()
    stmt.free()

    const idResult = db.exec(`SELECT last_insert_rowid()`)
    const id = idResult[0]?.values[0]?.[0] as number || Date.now()

    createdTasks.push({
      id,
      user_id: userId,
      title: taskData.title,
      description: taskData.description,
      condition_type: taskData.condition_type,
      condition_target: taskData.condition_target || null,
      condition_count: taskData.condition_count,
      condition_progress: 0,
      gold_reward: taskData.gold_reward,
      xp_reward: taskData.xp_reward,
      status: 'active',
      created_date: date
    })
  }

  saveDb()
  return createdTasks
}

// 获取活跃任务
export async function getActiveTasks(userId: number): Promise<Task[]> {
  const db = await getDb()
  const safeUserId = safeInt(userId)
  const result = db.exec(`
    SELECT id, user_id, title, description, condition_type, condition_target,
      condition_count, condition_progress, gold_reward, xp_reward, status, created_date
    FROM tasks WHERE user_id = ${safeUserId} AND status = 'active'
    ORDER BY created_at DESC
  `)

  return result[0]?.values.map((row: unknown[]) => ({
    id: row[0] as number,
    user_id: row[1] as number,
    title: row[2] as string,
    description: row[3] as string,
    condition_type: row[4] as string,
    condition_target: row[5] as string | null,
    condition_count: row[6] as number,
    condition_progress: row[7] as number,
    gold_reward: row[8] as number,
    xp_reward: row[9] as number,
    status: row[10] as 'active' | 'completed' | 'expired',
    created_date: row[11] as string
  })) || []
}

// 更新任务进度
export async function updateTaskProgress(
  userId: number,
  conditionType: ConditionType,
  target?: string | null,
  amount?: number
): Promise<Task[]> {
  const db = await getDb()
  const safeUserId = safeInt(userId)

  // 查找匹配的任务
  const tasksResult = db.exec(`
    SELECT id, condition_type, condition_target, condition_count, condition_progress,
      gold_reward, xp_reward
    FROM tasks
    WHERE user_id = ${safeUserId} AND status = 'active' AND condition_type = '${conditionType}'
  `)

  const completedTasks: Task[] = []

  for (const row of tasksResult[0]?.values || []) {
    const taskId = row[0] as number
    const taskTarget = row[2] as string | null
    const count = row[3] as number
    const currentProgress = row[4] as number
    const goldReward = row[5] as number
    const xpReward = row[6] as number

    // 如果任务有特定目标，检查是否匹配
    if (taskTarget && target && taskTarget !== target) {
      continue
    }

    // reach_favorability 使用绝对值（当前好感度），其他类型使用累加
    const progress = conditionType === 'reach_favorability'
      ? (amount || 0)
      : currentProgress + (amount || 1)

    // 更新进度
    db.exec(`UPDATE tasks SET condition_progress = ${progress} WHERE id = ${taskId}`)

    // 检查是否完成
    if (progress >= count) {
      db.exec(`UPDATE tasks SET status = 'completed' WHERE id = ${taskId}`)

      // 发放奖励
      await addCurrency(userId, goldReward)
      await addXp(userId, xpReward)

      completedTasks.push({
        id: taskId,
        user_id: userId,
        title: '',
        description: '',
        condition_type: conditionType,
        condition_target: target || null,
        condition_count: count,
        condition_progress: progress,
        gold_reward: goldReward,
        xp_reward: xpReward,
        status: 'completed',
        created_date: ''
      })
    }
  }

  saveDb()
  return completedTasks
}

// 标记过期任务
export async function expireOldTasks(userId: number): Promise<void> {
  const db = await getDb()
  const safeUserId = safeInt(userId)
  const today = new Date().toISOString().split('T')[0]

  db.exec(`
    UPDATE tasks
    SET status = 'expired'
    WHERE user_id = ${safeUserId} AND status = 'active' AND created_date < '${today}'
  `)
  saveDb()
}

// 添加经验
export async function addXp(userId: number, amount: number): Promise<{ leveledUp: boolean, newLevel: number }> {
  const db = await getDb()
  const safeUserId = safeInt(userId)

  const userResult = db.exec(`SELECT level, xp, talent_points FROM users WHERE id = ${safeUserId}`)
  const row = userResult[0]?.values[0]
  if (!row) return { leveledUp: false, newLevel: 1 }

  let level = row[0] as number
  let xp = (row[1] as number) + amount
  let talentPoints = row[2] as number

  let leveledUp = false
  while (xp >= level * 100 && level < 20) {
    xp -= level * 100
    level++
    talentPoints++
    leveledUp = true
  }

  db.exec(`UPDATE users SET level = ${level}, xp = ${xp}, talent_points = ${talentPoints} WHERE id = ${safeUserId}`)
  saveDb()

  return { leveledUp, newLevel: level }
}

// 获取等级信息
export async function getLevelInfo(userId: number): Promise<{ level: number, xp: number, xpToNext: number, talentPoints: number }> {
  const db = await getDb()
  const safeUserId = safeInt(userId)

  const result = db.exec(`SELECT level, xp, talent_points FROM users WHERE id = ${safeUserId}`)
  const row = result[0]?.values[0]
  if (!row) return { level: 1, xp: 0, xpToNext: 100, talentPoints: 0 }

  const level = row[0] as number
  const xp = row[1] as number
  const talentPoints = row[2] as number

  return {
    level,
    xp,
    xpToNext: level * 100,
    talentPoints
  }
}

// 获取所有任务（包括已完成和过期的）
export async function getAllTasks(userId: number, limit: number = 20): Promise<Task[]> {
  const db = await getDb()
  const safeUserId = safeInt(userId)
  const result = db.exec(`
    SELECT id, user_id, title, description, condition_type, condition_target,
      condition_count, condition_progress, gold_reward, xp_reward, status, created_date
    FROM tasks WHERE user_id = ${safeUserId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `)

  return result[0]?.values.map((row: unknown[]) => ({
    id: row[0] as number,
    user_id: row[1] as number,
    title: row[2] as string,
    description: row[3] as string,
    condition_type: row[4] as string,
    condition_target: row[5] as string | null,
    condition_count: row[6] as number,
    condition_progress: row[7] as number,
    gold_reward: row[8] as number,
    xp_reward: row[9] as number,
    status: row[10] as 'active' | 'completed' | 'expired',
    created_date: row[11] as string
  })) || []
}