import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'
import { getLevelInfo } from './task-service'

// 天赋定义
export const TALENTS = {
  // 魅力系
  charisma_sweet_talk: { name: '甜言蜜语', maxLevel: 3, tier: 1, effect: 'favorability', description: '好感度变化量+10%/级' },
  charisma_affinity: { name: '亲和力', maxLevel: 3, tier: 1, effect: 'initial_favorability', description: '新角色初始好感+5/级' },
  charisma_eloquence: { name: '能说会道', maxLevel: 3, tier: 2, effect: 'persuasion', description: '劝说效果+10%/级' },
  charisma_aura: { name: '魅力光环', maxLevel: 2, tier: 2, effect: 'daily_favorability', description: '每日好感+1/级' },
  charisma_idol: { name: '万人迷', maxLevel: 1, tier: 3, effect: 'mode_threshold', description: '特殊模式阈值-20' },
  // 暗影系
  shadow_intimidate: { name: '威压', maxLevel: 3, tier: 1, effect: 'obedience', description: '服从度变化量+10%/级' },
  shadow_hint: { name: '暗示', maxLevel: 3, tier: 1, effect: 'corruption', description: '黑化变化量+10%/级' },
  shadow_manipulate: { name: '操纵术', maxLevel: 3, tier: 2, effect: 'special_var', description: '特殊变量效果+10%/级' },
  shadow_fear: { name: '恐惧支配', maxLevel: 2, tier: 2, effect: 'rent_obedience', description: '服从>50角色租金+10%/级' },
  shadow_abyss: { name: '堕落深渊', maxLevel: 1, tier: 3, effect: 'hidden_plot', description: '解锁隐藏剧情线' },
  // 经营系
  business_merchant: { name: '精明商人', maxLevel: 3, tier: 1, effect: 'rent_income', description: '租金收入+5%/级' },
  business_discount: { name: '工程折扣', maxLevel: 3, tier: 1, effect: 'build_cost', description: '建造费用-5%/级' },
  business_energy: { name: '精力充沛', maxLevel: 2, tier: 2, effect: 'energy_limit', description: '能量上限+1/级' },
  business_hunter: { name: '高薪猎手', maxLevel: 3, tier: 2, effect: 'salary', description: '工资+10%/级' },
  business_tycoon: { name: '地产大亨', maxLevel: 1, tier: 3, effect: 'floor_cost', description: '新楼层费用-20%' },
} as const

export type TalentId = keyof typeof TALENTS

export interface TalentInfo {
  id: TalentId
  name: string
  maxLevel: number
  tier: number
  effect: string
  description: string
  currentLevel: number
}

// 获取用户天赋
export async function getUserTalents(userId: number): Promise<Record<TalentId, number>> {
  const db = await getDb()
  const safeUserId = safeInt(userId)

  const result = db.exec(`SELECT talent_id, current_level FROM talents WHERE user_id = ${safeUserId}`)

  const talents: Record<string, number> = {}
  for (const id of Object.keys(TALENTS)) {
    talents[id] = 0
  }
  result[0]?.values.forEach((row: unknown[]) => {
    talents[row[0] as string] = row[1] as number
  })

  return talents as Record<TalentId, number>
}

// 获取所有天赋详情（包含当前等级）
export async function getTalentInfos(userId: number): Promise<TalentInfo[]> {
  const userTalents = await getUserTalents(userId)

  return Object.entries(TALENTS).map(([id, info]) => ({
    id: id as TalentId,
    name: info.name,
    maxLevel: info.maxLevel,
    tier: info.tier,
    effect: info.effect,
    description: info.description,
    currentLevel: userTalents[id as TalentId] || 0
  }))
}

// 检查前置条件
async function canAllocate(userId: number, talentId: TalentId): Promise<{ can: boolean; reason?: string }> {
  const talent = TALENTS[talentId]
  if (!talent) return { can: false, reason: '无效的天赋ID' }

  const talents = await getUserTalents(userId)

  // 检查是否已达到最大等级
  if (talent.maxLevel && talents[talentId] >= talent.maxLevel) {
    return { can: false, reason: '该天赋已达最大等级' }
  }

  // 检查前置层级（需要前一层级至少有1点天赋）
  if (talent.tier > 1) {
    const prevTierTalents = Object.entries(TALENTS).filter(([_, t]) => t.tier === talent.tier - 1)
    const hasPrevTier = prevTierTalents.some(([id]) => talents[id as TalentId] > 0)
    if (!hasPrevTier) {
      return { can: false, reason: `需要先学习第${talent.tier - 1}层天赋` }
    }
  }

  return { can: true }
}

// 分配天赋点
export async function allocateTalentPoint(userId: number, talentId: TalentId): Promise<{ success: boolean; error?: string }> {
  // 检查天赋点是否足够
  const levelInfo = await getLevelInfo(userId)
  if (levelInfo.talentPoints <= 0) {
    return { success: false, error: '没有可用的天赋点' }
  }

  // 检查是否可以分配
  const check = await canAllocate(userId, talentId)
  if (!check.can) {
    return { success: false, error: check.reason }
  }

  const db = await getDb()
  const safeUserId = safeInt(userId)
  const safeTalentId = safeSqlString(talentId)

  // 检查是否已有记录
  const existing = db.exec(`SELECT id FROM talents WHERE user_id = ${safeUserId} AND talent_id = '${safeTalentId}'`)

  if (existing[0]?.values?.length && existing[0].values.length > 0) {
    db.exec(`UPDATE talents SET current_level = current_level + 1 WHERE user_id = ${safeUserId} AND talent_id = '${safeTalentId}'`)
  } else {
    db.exec(`INSERT INTO talents (user_id, talent_id, current_level) VALUES (${safeUserId}, '${safeTalentId}', 1)`)
  }

  db.exec(`UPDATE users SET talent_points = talent_points - 1 WHERE id = ${safeUserId}`)
  saveDb()

  return { success: true }
}

// 退点
export async function refundTalent(userId: number, talentId: TalentId): Promise<{ success: boolean; error?: string; refundAmount?: number }> {
  const talents = await getUserTalents(userId)

  if (!(talentId in TALENTS)) {
    return { success: false, error: '无效的天赋ID' }
  }

  if (talents[talentId] <= 0) {
    return { success: false, error: '该天赋未学习' }
  }

  const db = await getDb()
  const safeUserId = safeInt(userId)
  const safeTalentId = safeSqlString(talentId)

  // 退还金币（每级200金币）
  const refundAmount = 200
  db.exec(`UPDATE users SET currency = currency + ${refundAmount}, talent_points = talent_points + 1 WHERE id = ${safeUserId}`)

  // 减少天赋等级
  if (talents[talentId] === 1) {
    db.exec(`DELETE FROM talents WHERE user_id = ${safeUserId} AND talent_id = '${safeTalentId}'`)
  } else {
    db.exec(`UPDATE talents SET current_level = current_level - 1 WHERE user_id = ${safeUserId} AND talent_id = '${safeTalentId}'`)
  }

  saveDb()

  return { success: true, refundAmount }
}

// 获取所有天赋效果加成
export async function getTalentModifiers(userId: number) {
  const talents = await getUserTalents(userId)

  const getLevel = (id: TalentId) => talents[id] || 0

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