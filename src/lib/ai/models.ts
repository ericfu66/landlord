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

  return data.data
    .filter(model => model.id.includes('gpt') || model.id.includes('claude') || model.id.includes('deepseek'))
    .map(model => ({
      id: model.id,
      name: model.id,
      owned_by: model.owned_by
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export function normalizeModelId(modelId: string): string {
  return modelId.trim()
}

export function isValidModelId(modelId: string): boolean {
  return modelId.length > 0 && !modelId.includes(' ')
}