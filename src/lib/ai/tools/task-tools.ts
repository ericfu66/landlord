import { createChatCompletion, type AIConfig } from '@/lib/ai/client'

export const GENERATE_TASKS_TOOL = {
  type: 'function' as const,
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

export interface GeneratedTask {
  title: string
  description: string
  condition_type: string
  condition_target: string | null
  condition_count: number
  gold_reward: number
  xp_reward: number
}

export interface GenerateTasksResult {
  tasks: GeneratedTask[]
}

export async function generateTasksWithAI(apiConfig: AIConfig, context: string): Promise<GenerateTasksResult> {
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