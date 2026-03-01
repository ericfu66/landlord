import { getDb, saveDb } from '@/lib/db'
import { createChatCompletion } from '@/lib/ai/client'
import { getUserById } from '@/lib/auth/session'
import { incrementApiCalls } from '@/lib/auth/repo'

export interface Job {
  name: string
  salary: number
  description: string
}

export const GENERATE_JOBS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_jobs',
    description: '生成工作选项',
    parameters: {
      type: 'object',
      properties: {
        jobs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '工作名称' },
              salary: { type: 'integer', description: '日薪 (100-300)', minimum: 100, maximum: 300 },
              description: { type: 'string', description: '工作描述' }
            },
            required: ['name', 'salary', 'description']
          }
        }
      },
      required: ['jobs']
    }
  }
}

export function validateJobSalary(salary: number): number {
  return Math.max(100, Math.min(300, salary))
}

export async function generateJobs(userId: number): Promise<Job[]> {
  const user = await getUserById(userId)
  if (!user || !user.api_config) {
    return getDefaultJobs()
  }

  try {
    const config = JSON.parse(user.api_config as string)
    
    const response = await createChatCompletion(config, {
      messages: [
        {
          role: 'system',
          content: '你是一个工作生成助手。请生成3个不同的工作选项，每个工作的日薪在100-300之间。工作应该多样化，包括体力劳动、文职工作等。'
        },
        {
          role: 'user',
          content: '请生成3个工作选项。'
        }
      ],
      tools: [GENERATE_JOBS_TOOL],
      tool_choice: { type: 'function', function: { name: 'generate_jobs' } }
    })

    await incrementApiCalls(userId)

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall) {
      return getDefaultJobs()
    }

    const data = JSON.parse(toolCall.function.arguments)
    return data.jobs.map((job: Job) => ({
      ...job,
      salary: validateJobSalary(job.salary)
    }))
  } catch (error) {
    console.error('Generate jobs error:', error)
    return getDefaultJobs()
  }
}

export function getDefaultJobs(): Job[] {
  const defaultJobs = [
    { name: '便利店店员', salary: 150, description: '在便利店工作，负责收银和理货' },
    { name: '餐厅服务员', salary: 180, description: '在餐厅服务顾客，清理餐桌' },
    { name: '快递分拣员', salary: 200, description: '在快递站分拣包裹，体力劳动' },
    { name: '数据录入员', salary: 120, description: '在办公室录入数据，文职工作' },
    { name: '保安', salary: 160, description: '在商场或小区负责安保工作' }
  ]
  
  const shuffled = defaultJobs.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

export async function startJob(saveId: number, job: Job): Promise<void> {
  const db = await getDb()
  
  db.run(
    'UPDATE game_states SET current_job = ? WHERE save_id = ?',
    [JSON.stringify({ ...job, daysWorked: 0 }), saveId]
  )
  saveDb()
}

export async function quitJob(saveId: number): Promise<void> {
  const db = await getDb()
  db.run('UPDATE game_states SET current_job = NULL WHERE save_id = ?', [saveId])
  saveDb()
}

export async function getCurrentJob(saveId: number): Promise<{ name: string; salary: number; daysWorked: number } | null> {
  const db = await getDb()
  const result = db.exec('SELECT current_job FROM game_states WHERE save_id = ?', [saveId])
  
  if (result.length === 0 || !result[0].values[0][0]) {
    return null
  }
  
  return JSON.parse(result[0].values[0][0] as string)
}

export async function incrementJobDays(saveId: number): Promise<void> {
  const job = await getCurrentJob(saveId)
  if (!job) return
  
  const db = await getDb()
  db.run(
    'UPDATE game_states SET current_job = ? WHERE save_id = ?',
    [JSON.stringify({ ...job, daysWorked: job.daysWorked + 1 }), saveId]
  )
  saveDb()
}