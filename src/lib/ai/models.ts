export interface AIModel {
  id: string
  name: string
  owned_by?: string
}

export interface ModelsResponse {
  object: string
  data: Array<{
    id: string
    object: string
    created: number
    owned_by: string
  }>
}

export async function fetchModels(baseUrl: string, apiKey: string): Promise<AIModel[]> {
  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`)
  }

  const data: ModelsResponse = await response.json()

  // 优先展示的模型关键词（用于排序）
  const priorityKeywords = ['gpt-4', 'gpt-3.5', 'claude', 'deepseek', 'qwen', 'llama', 'kimi', 'gemini', 'mixtral']
  
  // 过滤掉 Embedding 模型和特殊模型
  const excludedKeywords = ['embedding', 'embed', 'moderation', 'tts', 'whisper', 'dall-e', 'davinci', 'babbage', 'curie', 'ada']
  
  const filteredModels = data.data.filter(model => {
    const id = model.id.toLowerCase()
    return !excludedKeywords.some(keyword => id.includes(keyword))
  })

  return filteredModels
    .map(model => ({
      id: model.id,
      name: model.id,
      owned_by: model.owned_by
    }))
    .sort((a, b) => {
      const aId = a.id.toLowerCase()
      const bId = b.id.toLowerCase()
      
      // 计算优先级分数（匹配的关键词越多，分数越高）
      const aScore = priorityKeywords.filter(kw => aId.includes(kw)).length
      const bScore = priorityKeywords.filter(kw => bId.includes(kw)).length
      
      // 先按优先级分数排序，分数相同按字母排序
      if (bScore !== aScore) {
        return bScore - aScore
      }
      return a.id.localeCompare(b.id)
    })
}

export function normalizeModelId(modelId: string): string {
  return modelId.trim()
}

export function isValidModelId(modelId: string): boolean {
  return modelId.length > 0 && !modelId.includes(' ')
}