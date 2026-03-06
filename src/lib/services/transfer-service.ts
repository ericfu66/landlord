import { getDb, saveDb } from '@/lib/db'
import { getGameState, updateGameState } from './economy-service'

export interface TransferResult {
  success: boolean
  error?: string
  newBalance?: number
}

/**
 * 转账服务 - 处理角色与房东之间的金币转账
 * 
 * @param userId - 用户ID（房东）
 * @param from - 转账方 ('characterName' 或 'landlord')
 * @param to - 接收方 ('characterName' 或 'landlord')
 * @param amount - 转账金额
 * @param reason - 转账原因
 */
export async function transferCurrency(
  userId: number,
  from: string,
  to: string,
  amount: number,
  reason?: string
): Promise<TransferResult> {
  try {
    // 验证金额
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: '转账金额无效' }
    }

    // 金额范围限制
    if (amount > 1000) {
      return { success: false, error: '单次转账金额不能超过1000' }
    }

    const state = await getGameState(userId)
    if (!state) {
      return { success: false, error: '用户状态不存在' }
    }

    // 角色给房东转账
    if (from !== 'landlord' && to === 'landlord') {
      // 角色给房东转账，直接增加房东金币
      // 注意：角色的金币是虚拟的，不存储在数据库中，所以不需要扣除
      const newCurrency = state.currency + amount
      await updateGameState(userId, { currency: newCurrency })

      console.info('[transfer]', JSON.stringify({
        userId,
        from,
        to,
        amount,
        reason,
        newBalance: newCurrency
      }))

      return { success: true, newBalance: newCurrency }
    }

    // 房东给角色转账
    if (from === 'landlord' && to !== 'landlord') {
      if (state.currency < amount) {
        return { success: false, error: '余额不足' }
      }

      const newCurrency = state.currency - amount
      await updateGameState(userId, { currency: newCurrency })

      console.info('[transfer]', JSON.stringify({
        userId,
        from,
        to,
        amount,
        reason,
        newBalance: newCurrency
      }))

      return { success: true, newBalance: newCurrency }
    }

    return { success: false, error: '不支持的转账类型' }
  } catch (error) {
    console.error('Transfer error:', error)
    return { success: false, error: '转账处理失败' }
  }
}

/**
 * 获取角色向房东转账的历史记录
 */
export async function getTransferHistory(
  userId: number,
  limit: number = 50
): Promise<Array<{
  id: number
  from: string
  to: string
  amount: number
  reason: string
  createdAt: string
}>> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id, sender_name, content, transfer_amount, created_at
     FROM group_chat_messages 
     WHERE save_id = ${userId} AND message_type = 'transfer'
     ORDER BY created_at DESC
     LIMIT ${limit}`
  )

  if (!result || result.length === 0 || !result[0].values) {
    return []
  }

  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    from: row[1] as string,
    to: 'landlord',
    amount: row[3] as number,
    reason: (row[2] as string).replace('[转账] ', ''),
    createdAt: row[4] as string
  }))
}
