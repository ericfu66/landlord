# 任务与等级系统实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现AI驱动的任务系统 + 等级天赋树，包括数据库表、service层、API端点和前端UI

**Architecture:**
- 数据库层：新增tasks和talents表，通过db.ts的autoMigrate添加users表新字段
- Service层：创建task-service.ts和talent-service.ts，修改economy-service.ts/variables-service.ts集成天赋效果
- API层：创建6个REST端点
- 前端：新增2个页面和导航入口

**Tech Stack:** Next.js App Router, SQL.js, TypeScript, Tailwind CSS, Zustand

---

## 阶段一：数据库与Service层

### Task 1: 添加数据库迁移

**Files:**
- Modify: `src/lib/db.ts:75-78` - 在migrations数组添加新字段
- Modify: `database/schema.sql:224-237` - 添加tasks和talents表定义

**Step 1: 添加users表新字段迁移**

```typescript
// src/lib/db.ts 第75-78行后添加:
`ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1`,
`ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0`,
`ALTER TABLE users ADD COLUMN talent_points INTEGER DEFAULT 0`,
```

**Step 2: 运行验证**

确认数据库迁移正常（新用户会有level=1, xp=0, talent_points=0）

**Step 3: Commit**

```bash
git add src/lib/db.ts database/schema.sql
git commit -m "feat: add level/xp/talent_points fields to users table"
```

---

### Task 2: 创建 task-service.ts

**Files:**
- Create: `src/lib/services/task-service.ts`

**Step 1: 写入测试**

```typescript
// tests/task-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest'

// Mock database setup...

describe('TaskService', () => {
  describe('buildTaskContext', () => {
    it('should build context with user state', async () => {
      const context = await buildTaskContext(1)
      expect(context).toContain('等级')
      expect(context).toContain('金币')
    })
  })

  describe('generateTasks', () => {
    it('should generate 2-3 tasks', async () => {
      const tasks = await generateTasks(1, mockApiConfig, '2026-03-05')
      expect(tasks.length).toBeGreaterThanOrEqual(2)
      expect(tasks.length).toBeLessThanOrEqual(3)
    })
  })

  describe('updateTaskProgress', () => {
    it('should increment progress', async () => {
      await updateTaskProgress(1, 'interact', '小红')
      const tasks = await getActiveTasks(1)
      expect(tasks[0].condition_progress).toBe(1)
    })

    it('should complete task when progress >= count', async () => {
      // 达到条件完成任务，验证奖励发放
      const user = await getUserById(1)
      const oldXp = user.xp
      await updateTaskProgress(1, 'recruit')
      const user2 = await getUserById(1)
      expect(user2.xp).toBeGreaterThan(oldXp)
    })
  })
})
```

**Step 2: 运行测试**

预期：FAIL - 函数未定义

**Step 3: 实现 task-service.ts**

```typescript
// src/lib/services/task-service.ts
import { getDb, safeInt, safeSqlString, saveDb } from '@/lib/db'
import { getGameState, updateGameState, addCurrency } from './economy-service'

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
  const level = user?.[0] || 1
  const xp = user?.[1] || 0
  const currency = user?.[2] || 1000
  const energy = user?.[3] || 3
  const totalFloors = user?.[4] || 1
  const currentJob = user?.[5] ? JSON.parse(user[5] as string) : null

  // 2. 角色列表
  const charResult = db.exec(`
    SELECT name, favorability, obedience, corruption, special_var_name, special_var_value, room_id
    FROM characters WHERE user_id = ${safeUserId} LIMIT 10
  `)
  const characters = charResult[0]?.values.map((row: any[]) => ({
    name: row[0],
    favorability: row[1],
    obedience: row[2],
    corruption: row[3],
    specialVar: row[4] ? `${row[4]}:${row[5]}` : null
  })) || []

  // 3. 建筑概况
  const roomResult = db.exec(`
    SELECT room_type, COUNT(*) as cnt FROM rooms WHERE user_id = ${safeUserId} GROUP BY room_type
  `)
  const roomCounts: Record<string, number> = {}
  roomResult[0]?.values.forEach((row: any[]) => {
    roomCounts[row[0]] = row[1]
  })

  // 4. 当前任务
  const taskResult = db.exec(`
    SELECT title, condition_type, condition_target, condition_count, condition_progress
    FROM tasks WHERE user_id = ${safeUserId} AND status = 'active'
  `)
  const activeTasks = taskResult[0]?.values.map((row: any[]) => ({
    title: row[0],
    type: row[1],
    target: row[2],
    progress: row[4],
    count: row[3]
  })) || []

  // 构建上下文字符串
  let context = `玩家状态：等级${level}, 金币${currency}, 能量${energy}/${3}, 楼层${totalFloors}\n`

  if (characters.length > 0) {
    context += `角色：${characters.map(c =>
      `${c.name}(好感${c.favorability} 服从${c.obedience} 黑化${c.corruption}${c.specialVar ? ' '+c.specialVar : ''})`
    ).join(', ')}\n`
  }

  context += `建筑：卧室${roomCounts.bedroom||0}间 功能房${roomCounts.functional||0}间 空房${roomCounts.empty||0}间\n`

  if (currentJob) {
    context += `工作：${currentJob.name}, 日薪${currentJob.salary}, 已工作${currentJob.daysWorked}天\n`
  }

  if (activeTasks.length > 0) {
    context += `当前任务：${activeTasks.map(t => `${t.title}(${t.progress}/${t.count})`).join(', ')}`
  }

  return context
}

// 生成每日任务
export async function generateTasks(userId: number, apiConfig: any, date: string): Promise<Task[]> {
  const context = await buildTaskContext(userId)

  // 调用AI生成任务（使用Vercel AI SDK）
  const { generateTasks: generateTasksTool } = await import('@/lib/ai/tools/task-tools')
  const result = await generateTasksTool(apiConfig, context)

  const db = await getDb()
  const safeUserId = safeInt(userId)
  const createdTasks: Task[] = []

  for (const taskData of result.tasks) {
    const id = Date.now() + Math.random()
    const stmt = db.prepare(`
      INSERT INTO tasks (user_id, title, description, condition_type, condition_target,
        condition_count, condition_progress, gold_reward, xp_reward, status, created_date)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'active', ?)
    `)
    stmt.run([
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
    createdTasks.push({
      id,
      user_id: userId,
      ...taskData,
      condition_progress: 0,
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
  `)

  return result[0]?.values.map((row: any[]) => ({
    id: row[0],
    user_id: row[1],
    title: row[2],
    description: row[3],
    condition_type: row[4],
    condition_target: row[5],
    condition_count: row[6],
    condition_progress: row[7],
    gold_reward: row[8],
    xp_reward: row[9],
    status: row[10],
    created_date: row[11]
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
    WHERE user_id = ${safeUserId} AND status = 'active'
      AND (condition_type = '${conditionType}' OR (condition_type = '${conditionType}' AND condition_target = ${target ? "'"+target+"'" : 'NULL'}))
  `)

  const completedTasks: Task[] = []

  for (const row of tasksResult[0]?.values || []) {
    const taskId = row[0]
    const count = row[4] as number
    const progress = row[5] as number + (amount || 1)
    const goldReward = row[6]
    const xpReward = row[7]

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
        gold_reward: goldReward,
        xp_reward: xpReward,
        status: 'completed'
      } as Task)
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

// 添加经验（内部函数）
async function addXp(userId: number, amount: number): Promise<{ leveledUp: boolean, newLevel: number }> {
  const db = await getDb()
  const safeUserId = safeInt(userId)

  const userResult = db.exec(`SELECT level, xp FROM users WHERE id = ${safeUserId}`)
  const row = userResult[0]?.values[0]
  if (!row) return { leveledUp: false, newLevel: 1 }

  let level = row[0] as number
  let xp = row[1] as number + amount

  let leveledUp = false
  while (xp >= level * 100 && level < 20) {
    xp -= level * 100
    level++
    leveledUp = true
  }

  db.exec(`UPDATE users SET level = ${level}, xp = ${xp}, talent_points = talent_points + ${leveledUp ? 1 : 0} WHERE id = ${safeUserId}`)
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
```

**Step 4: 运行测试**

预期：PASS

**Step 5: Commit**

```bash
git add src/lib/services/task-service.ts tests/task-service.test.ts
git commit -m "feat: add task service with AI generation and progress tracking"
```

---

### Task 3: 创建 talent-service.ts

**Files:**
- Create: `src/lib/services/talent-service.ts`

**Step 1: 写入测试**

```typescript
// tests/talent-service.test.ts
describe('TalentService', () => {
  describe('getUserTalents', () => {
    it('should return all talents for user', async () => {
      const talents = await getUserTalents(1)
      expect(Array.isArray(talents)).toBe(true)
    })
  })

  describe('allocateTalentPoint', () => {
    it('should add point and deduct talent_points', async () => {
      const user = await getUserById(1)
      const before = user.talent_points

      await allocateTalentPoint(1, 'charisma_sweet_talk')

      const user2 = await getUserById(1)
      expect(user2.talent_points).toBe(before - 1)
    })

    it('should fail if no talent_points available', async () => {
      await expect(allocateTalentPoint(1, 'charisma_sweet_talk')).rejects.toThrow()
    })

    it('should fail if tier locked', async () => {
      // 第一层没点满无法点第二层
      await expect(allocateTalentPoint(1, 'charisma_eloquence')).rejects.toThrow()
    })
  })

  describe('refundTalent', () => {
    it('should refund and return talent_points', async () => {
      const before = (await getUserById(1)).talent_points
      await refundTalent(1, 'charisma_sweet_talk')
      const after = (await getUserById(1)).talent_points
      expect(after).toBe(before + 1)
    })
  })

  describe('getTalentModifiers', () => {
    it('should return all active modifiers', async () => {
      const mods = await getTalentModifiers(1)
      expect(mods).toHaveProperty('favorabilityBonus')
      expect(mods).toHaveBonus')
      expect(mods).toHaveProperty('rentProperty('obedienceBonus')
    })
  })
})
```

**Step 2: 运行测试**

预期：FAIL

**Step 3: 实现 talent-service.ts**

```typescript
// src/lib/services/talent-service.ts
import { getDb, safeInt, safeSqlString, saveDb } from '@/lib/db'
import { getUserById } from '@/lib/auth/repo'

// 天赋定义
export const TALENTS = {
  // 魅力系
  charisma_sweet_talk: { name: '甜言蜜语', maxLevel: 3, tier: 1, effect: 'favorability' },
  charisma_affinity: { name: '亲和力', maxLevel: 3, tier: 1, effect: 'initial_favorability' },
  charisma_eloquence: { name: '能说会道', maxLevel: 3, tier: 2, effect: 'persuasion' },
  charisma_aura: { name: '魅力光环', maxLevel: 2, tier: 2, effect: 'daily_favorability' },
  charisma_idol: { name: '万人迷', maxLevel: 1, tier: 3, effect: 'mode_threshold' },
  // 暗影系
  shadow_intimidate: { name: '威压', maxLevel: 3, tier: 1, effect: 'obedience' },
  shadow_hint: { name: '暗示', maxLevel: 3, tier: 1, effect: 'corruption' },
  shadow_manipulate: { name: '操纵术', maxLevel: 3, tier: 2, effect: 'special_var' },
  shadow_fear: { name: '恐惧支配', maxLevel: 2, tier: 2, effect: 'rent_obedience' },
  shadow_abyss: { name: '堕落深渊', maxLevel: 1, tier: 3, effect: 'hidden_plot' },
  // 经营系
  business_merchant: { name: '精明商人', maxLevel: 3, tier: 1, effect: 'rent_income' },
  business_discount: { name: '工程折扣', maxLevel: 3, tier: 1, effect: 'build_cost' },
  business_energy: { name: '精力充沛', maxLevel: 2, tier: 2, effect: 'energy_limit' },
  business_hunter: { name: '高薪猎手', maxLevel: 3, tier: 2, effect: 'salary' },
  business_tycoon: { name: '地产大亨', maxLevel: 1, tier: 3, effect: 'floor_cost' },
} as const

export type TalentId = keyof typeof TALENTS
export type TalentEffect = typeof TALENTS[TalentId]['effect']

// 获取用户天赋
export async function getUserTalents(userId: number): Promise<Record<TalentId, number>> {
  const db = await getDb()
  const safeUserId = safeInt(userId)

  const result = db.exec(`SELECT talent_id, current_level FROM talents WHERE user_id = ${safeUserId}`)

  const talents: Record<string, number> = {}
  for (const id of Object.keys(TALENTS)) {
    talents[id] = 0
  }
  result[0]?.values.forEach((row: any[]) => {
    talents[row[0]] = row[1]
  })

  return talents as Record<TalentId, number>
}

// 检查前置条件
async function canAllocate(userId: number, talentId: TalentId): Promise<boolean> {
  const talent = TALENTS[talentId]
  const talents = await getUserTalents(userId)

  // 检查是否已达到最大等级
  if (talent.maxLevel && talents[talentId] >= talent.maxLevel) return false

  // 检查前置层级
  if (talent.tier > 1) {
    const prevTierTalents = Object.entries(TALENTS).filter(([_, t]) => t.tier === talent.tier - 1)
    const hasPrevTier = prevTierTalents.some(([id]) => talents[id as TalentId] > 0)
    if (!hasPrevTier) return false
  }

  return true
}

// 分配天赋点
export async function allocateTalentPoint(userId: number, talentId: TalentId): Promise<void> {
  const user = await getUserById(userId)
  if (!user) throw new Error('User not found')
  if (user.talent_points <= 0) throw new Error('No talent points available')
  if (!(talentId in TALENTS)) throw new Error('Invalid talent ID')

  const can = await canAllocate(userId, talentId)
  if (!can) throw new Error('Talent locked or maxed')

  const db = await getDb()
  const safeUserId = safeInt(userId)
  const safeTalentId = safeSqlString(talentId)

  // 检查是否已有记录
  const existing = db.exec(`SELECT id FROM talents WHERE user_id = ${safeUserId} AND talent_id = '${safeTalentId}'`)

  if (existing[0]?.values?.length > 0) {
    db.exec(`UPDATE talents SET current_level = current_level + 1 WHERE user_id = ${safeUserId} AND talent_id = '${safeTalentId}'`)
  } else {
    db.exec(`INSERT INTO talents (user_id, talent_id, current_level) VALUES (${safeUserId}, '${safeTalentId}', 1)`)
  }

  db.exec(`UPDATE users SET talent_points = talent_points - 1 WHERE id = ${safeUserId}`)
  saveDb()
}

// 退点
export async function refundTalent(userId: number, talentId: TalentId): Promise<void> {
  const talents = await getUserTalents(userId)
  if (!(talentId in TALENTS)) throw new Error('Invalid talent ID')
  if (talents[talentId] <= 0) throw new Error('Talent not learned')

  const db = await getDb()
  const safeUserId = safeInt(userId)
  const safeTalentId = safeSqlString(talentId)

  // 退还金币
  const refundCost = 200 * talents[talentId]
  db.exec(`UPDATE users SET currency = currency + ${refundCost}, talent_points = talent_points + 1 WHERE id = ${safeUserId}`)

  // 减少天赋等级
  if (talents[talentId] === 1) {
    db.exec(`DELETE FROM talents WHERE user_id = ${safeUserId} AND talent_id = '${safeTalentId}'`)
  } else {
    db.exec(`UPDATE talents SET current_level = current_level - 1 WHERE user_id = ${safeUserId} AND talent_id = '${safeTalentId}'`)
  }

  saveDb()
}

// 获取所有天赋效果加成
export async function getTalentModifiers(userId: number) {
  const talents = await getUserTalents(userId)

  const getLevel = (id: TalentId) => talents[id]

  return {
    // 魅力系
    favorabilityBonus: 1 + 0.1 * getLevel('charisma_sweet_talk'),
    initialFavorabilityBonus: 5 * getLevel('charisma_affinity'),
    persuasionBonus: 1 + 0.1 * getLevel('charisma_eloquence'),
    dailyFavorabilityBonus: getLevel('charisma_aura'),
    modeThresholdReduction: getLevel('charisma_idol') * 20,

    // 暗影系
    obedienceBonus: 1 + 0.1 * getLevel('shadow_intimidate'),
    corruptionBonus: 1 + 0.1 * getLevel('shadow_hint'),
    specialVarBonus: 1 + 0.1 * getLevel('shadow_manipulate'),
    rentObedienceBonus: getLevel('shadow_fear') * 0.1,
    hiddenPlotUnlocked: getLevel('shadow_abyss') > 0,

    // 经营系
    rentIncomeBonus: 1 + 0.05 * getLevel('business_merchant'),
    buildCostDiscount: 1 - 0.05 * getLevel('business_discount'),
    energyLimitBonus: getLevel('business_energy'),
    salaryBonus: 1 + 0.1 * getLevel('business_hunter'),
    floorCostDiscount: getLevel('business_tycoon') > 0 ? 0.8 : 1,
  }
}
```

**Step 4: 运行测试**

预期：PASS

**Step 5: Commit**

```bash
git add src/lib/services/talent-service.ts tests/talent-service.test.ts
git commit -m "feat: add talent service with tree structure and allocation"
```

---

### Task 4: 创建 AI task-tools.ts

**Files:**
- Create: `src/lib/ai/tools/task-tools.ts`

**Step 1: 实现 AI 工具定义**

```typescript
// src/lib/ai/tools/task-tools.ts
import { createChatCompletion } from '@/lib/ai/client'

export const GENERATE_TASKS_TOOL = {
  type: 'function',
  function: {
    name: 'generate_tasks',
    description: '根据玩家当前状态生成2-3个每日任务',
    parameters: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '任务标题' },
              description: { type: 'string', description: '任务详细描述' },
              condition_type: {
                type: 'string',
                enum: ['interact', 'collect_rent', 'recruit', 'build_room', 'reach_favorability', 'spend_currency', 'work_days', 'group_chat'],
                description: '完成条件类型'
              },
              condition_target: { type: 'string', nullable: true, description: '条件目标（如角色名）' },
              condition_count: { type: 'number', description: '需要完成的次数' },
              gold_reward: { type: 'number', description: '金币奖励 (50-500)' },
              xp_reward: { type: 'number', description: '经验奖励 (10-100)' }
            },
            required: ['title', 'description', 'condition_type', 'condition_count', 'gold_reward', 'xp_reward']
          }
        }
      },
      required: ['tasks']
    }
  }
}

export async function generateTasks(apiConfig: any, context: string) {
  const response = await createChatCompletion(apiConfig, {
    messages: [
      {
        role: 'system',
        content: `你是任务生成助手。根据玩家当前的游戏状态，生成2-3个适合的每日任务。

可用条件类型：
- interact: 与任意角色互动N次
- interact + target: 与指定角色互动N次
- recruit: 招募N个角色
- build_room: 建造N间房间
- collect_rent: 收取N金币租金（累计当日）
- reach_favorability + target: 某角色好感度达到N
- spend_currency: 消费N金币
- work_days: 工作N天
- group_chat: 群聊发送N条消息

奖励范围：
- 金币: 50-500
- 经验: 10-100

根据玩家状态生成合理的任务，例如：
- 如果玩家有很多角色，生成互动任务
- 如果玩家刚招募了新角色，生成互动或好感任务
- 如果玩家金币少，生成赚钱类任务
- 如果玩家能量充足，可以生成建造任务`
      },
      {
        role: 'user',
        content: `玩家当前状态：\n${context}\n\n请生成2-3个任务。`
      }
    ],
    tools: [GENERATE_TASKS_TOOL],
    tool_choice: { type: 'function', function: { name: 'generate_tasks' } }
  })

  const toolCall = response.choices[0]?.message?.tool_calls?.[0]
  if (!toolCall) throw new Error('No tool call returned')

  return JSON.parse(toolCall.function.arguments)
}
```

**Step 2: Commit**

```bash
git add src/lib/ai/tools/task-tools.ts
git commit -m "feat: add AI task generation tool"
```

---

### Task 5: 集成天赋效果到现有Service

**Files:**
- Modify: `src/lib/services/variables-service.ts:60-80` - 应用天赋乘数
- Modify: `src/lib/services/economy-service.ts:165-195` - 租金/工资/能量天赋加成
- Modify: `src/lib/services/building-service.ts:40-50` - 建造费用折扣
- Modify: `src/lib/services/recruit-service.ts:115` - 亲和力初始好感加成

**Step 1: 修改 variables-service.ts**

在 `updateCharacterVariables` 函数中，应用天赋乘数：

```typescript
// src/lib/services/variables-service.ts 中导入
import { getTalentModifiers } from './talent-service'

// 在 updateCharacterVariables 函数中，clamping之后、应用更新前：
const mods = await getTalentModifiers(userId)

// 甜言蜜语：好感变化量乘数
if (updates.favorability !== undefined) {
  updates.favorability = Math.round(updates.favorability * mods.favorabilityBonus)
}

// 能说会道：额外乘数（与甜言蜜语叠加）
if (updates.favorability !== undefined && mods.persuasionBonus > 1) {
  updates.favorability = Math.round(updates.favorability * mods.persuasionBonus)
}

// 威压：服从变化量乘数
if (updates.obedience !== undefined) {
  updates.obedience = Math.round(updates.obedience * mods.obedienceBonus)
}

// 暗示：黑化变化量乘数
if (updates.corruption !== undefined) {
  updates.corruption = Math.round(updates.corruption * mods.corruptionBonus)
}

// 操纵术：特殊变量变化量乘数
if (updates.specialVarDelta !== undefined) {
  updates.specialVarDelta = Math.round(updates.specialVarDelta * mods.specialVarBonus)
}
```

**Step 2: 修改 economy-service.ts**

在 `dailyReset` 函数中应用租金、工资、能量加成：

```typescript
// 获取天赋加成
const mods = await getTalentModifiers(userId)

// 租金收入加成
const rentResult = db.exec(`SELECT COALESCE(SUM(rent), 0) FROM characters WHERE user_id = ${safeUserId}`)
let totalRent = rentResult[0]?.values[0]?.[0] || 0
if (mods.rentIncomeBonus > 1) {
  totalRent = Math.round(totalRent * mods.rentIncomeBonus)
}

// 恐惧支配：服从度>50的角色租金加成
const fearResult = db.exec(`
  SELECT COALESCE(SUM(rent), 0) FROM characters
  WHERE user_id = ${safeUserId} AND obedience > 50
`)
const fearRent = fearResult[0]?.values[0]?.[0] || 0
if (mods.rentObedienceBonus > 0) {
  totalRent += Math.round(fearRent * mods.rentObedienceBonus)
}

// 工资加成
if (state.currentJob && mods.salaryBonus > 1) {
  const originalSalary = state.currentJob.salary
  state.currentJob.salary = Math.round(originalSalary * mods.salaryBonus)
}

// 能量上限加成
const maxEnergy = 3 + (mods.energyLimitBonus || 0)
```

**Step 3: 修改 building-service.ts**

在 `calculateBuildCost` 函数中应用折扣：

```typescript
// 获取天赋加成
const mods = await getTalentModifiers(userId)

let totalCost = 0

// 新楼层费用
if (isNewFloor) {
  let floorCost = 5000
  if (mods.floorCostDiscount < 1) {
    floorCost = Math.round(floorCost * mods.floorCostDiscount)
  }
  totalCost += floorCost
}

// 房间费用
if (mods.buildCostDiscount < 1) {
  roomCost = Math.round(roomCost * mods.buildCostDiscount)
}
```

**Step 4: 修改 recruit-service.ts**

在 `createCharacter` 函数中应用亲和力：

```typescript
// 获取天赋加成
const mods = await getTalentModifiers(userId)

// 设置初始好感度
const initialFavorability = mods.initialFavorabilityBonus

// INSERT SQL 中设置 favorability = ${initialFavorability}
```

**Step 5: Commit**

```bash
git add src/lib/services/variables-service.ts src/lib/services/economy-service.ts src/lib/services/building-service.ts src/lib/services/recruit-service.ts
git commit -m "feat: integrate talent modifiers into existing services"
```

---

## 阶段二：API端点

### Task 6: 创建任务API端点

**Files:**
- Create: `src/app/api/tasks/route.ts`
- Create: `src/app/api/tasks/progress/route.ts`

**Step 1: 实现 GET /api/tasks**

```typescript
// src/app/api/tasks/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getActiveTasks, getLevelInfo } from '@/lib/services/task-service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const tasks = await getActiveTasks(session.userId)
  const levelInfo = await getLevelInfo(session.userId)

  return NextResponse.json({ tasks, levelInfo })
}
```

**Step 2: 实现 POST /api/tasks/progress（内部调用）**

```typescript
// src/app/api/tasks/progress/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { updateTaskProgress } from '@/lib/services/task-service'
import type { ConditionType } from '@/lib/services/task-service'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { condition_type, target, amount } = await request.json()

  const completed = await updateTaskProgress(
    session.userId,
    condition_type as ConditionType,
    target,
    amount
  )

  return NextResponse.json({ completed })
}
```

**Step 3: Commit**

```bash
git add src/app/api/tasks/route.ts src/app/api/tasks/progress/route.ts
git commit -m "feat: add task API endpoints"
```

---

### Task 7: 创建天赋API端点

**Files:**
- Create: `src/app/api/talents/route.ts`
- Create: `src/app/api/talents/allocate/route.ts`
- Create: `src/app/api/talents/refund/route.ts`

**Step 1: 实现 GET /api/talents**

```typescript
// src/app/api/talents/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserTalents, TALENTS } from '@/lib/services/talent-service'
import { getLevelInfo } from '@/lib/services/task-service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const talents = await getUserTalents(session.userId)
  const levelInfo = await getLevelInfo(session.userId)

  return NextResponse.json({
    talents,
    talentDefs: TALENTS,
    talentPoints: levelInfo.talentPoints
  })
}
```

**Step 2: 实现 POST /api/talents/allocate**

```typescript
// src/app/api/talents/allocate/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { allocateTalentPoint } from '@/lib/services/talent-service'
import type { TalentId } from '@/lib/services/talent-service'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { talent_id } = await request.json()

  try {
    await allocateTalentPoint(session.userId, talent_id as TalentId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

**Step 3: 实现 POST /api/talents/refund**

```typescript
// src/app/api/talents/refund/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { refundTalent } from '@/lib/services/talent-service'
import type { TalentId } from '@/lib/services/talent-service'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { talent_id } = await request.json()

  try {
    await refundTalent(session.userId, talent_id as TalentId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

**Step 4: Commit**

```bash
git add src/app/api/talents/route.ts src/app/api/talents/allocate/route.ts src/app/api/talents/refund/route.ts
git commit -m "feat: add talent API endpoints"
```

---

### Task 8: 集成任务生成到每日推进

**Files:**
- Modify: `src/app/api/game/advance/route.ts:30-45` - 添加任务生成调用

**Step 1: 修改 advance route**

```typescript
// src/app/api/game/advance/route.ts 中
// 在 dailyReset 之后、dailyNews 生成之前

// 1. 过期旧任务
await expireOldTasks(session.userId)

// 2. 生成新任务
let newTasks = []
if (user.api_config) {
  try {
    const apiConfig = JSON.parse(user.api_config)
    const today = new Date().toISOString().split('T')[0]
    newTasks = await generateTasks(session.userId, apiConfig, today)
  } catch (taskError) {
    console.error('Generate tasks error:', taskError)
  }
}

// 3. 在返回中添加任务信息
return NextResponse.json({
  // ... existing fields
  tasks: newTasks,
  levelInfo: await getLevelInfo(session.userId)
})
```

**Step 2: 需要在文件顶部导入**

```typescript
import { generateTasks, getLevelInfo, expireOldTasks } from '@/lib/services/task-service'
```

**Step 3: Commit**

```bash
git add src/app/api/game/advance/route.ts
git commit -m "feat: integrate task generation into daily advance"
```

---

### Task 9: 添加任务进度追踪钩子

在关键API中调用任务进度更新：

**Files:**
- Modify: `src/app/api/interact/chat/route.ts` - 互动后更新
- Modify: `src/app/api/recruit/generate-batch/route.ts` - 招募后更新
- Modify: `src/app/api/building/route.ts` - 建造后更新
- Modify: `src/app/api/group-chat/send/route.ts` - 群聊后更新
- Modify: `src/app/api/jobs/route.ts` - 工作后更新

每个位置添加：
```typescript
import { updateTaskProgress } from '@/lib/services/task-service'

// 在操作成功后调用
await updateTaskProgress(session.userId, 'interact', characterName)
await updateTaskProgress(session.userId, 'recruit')
await updateTaskProgress(session.userId, 'build_room', roomType)
await updateTaskProgress(session.userId, 'group_chat')
await updateTaskProgress(session.userId, 'work_days')
```

**Commit**

```bash
git add src/app/api/interact/chat/route.ts src/app/api/recruit/generate-batch/route.ts src/app/api/building/route.ts src/app/api/group-chat/send/route.ts src/app/api/jobs/route.ts
git commit -m "feat: add task progress tracking hooks to existing APIs"
```

---

## 阶段三：前端UI

### Task 10: 创建任务页面

**Files:**
- Create: `src/app/game/tasks/page.tsx`

**Step 1: 实现页面**

参考现有页面结构（`src/app/game/news/page.tsx`），创建任务展示页面：
- 显示活跃任务列表
- 每个任务显示进度条 (progress/count)
- 显示已完成任务（带奖励高亮）
- 底部等级进度条

**Step 2: Commit**

```bash
git add src/app/game/tasks/page.tsx
git commit -m "feat: add tasks page UI"
```

---

### Task 11: 创建天赋页面

**Files:**
- Create: `src/app/game/talents/page.tsx`

**Step 1: 实现页面**

- 三列布局，每列一条路线
- 节点样式：圆形/方形，未解锁灰色，已解锁彩色，当前等级显示数字
- 点击加点（需检查talent_points > 0）
- 长按/右键退点（显示退款金额）

**Step 2: Commit**

```bash
git add src/app/game/talents/page.tsx
git commit -m "feat: add talents page UI"
```

---

### Task 12: 添加导航入口

**Files:**
- Modify: `src/app/game/page.tsx:23-31` - 添加任务和天赋入口

**Step 1: 添加菜单项**

```typescript
// menuItems 数组中添加:
{ id: 'tasks', label: '任务', icon: '📋', href: '/game/talents' },
{ id: 'talents', label: '天赋', icon: '⭐', href: '/game/tasks' },
```

**Step 2: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat: add tasks and talents navigation entries"
```

---

## 总结

共12个Task，预计需要：
- Task 1: 5分钟
- Task 2-4: 30分钟
- Task 5: 20分钟
- Task 6-9: 30分钟
- Task 10-12: 30分钟

总计约2.5小时，按小步骤执行并频繁提交。
