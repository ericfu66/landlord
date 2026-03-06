/**
 * Embedding Client for RAG Memory System
 * Uses SiliconFlow API for text embeddings
 */

export interface EmbeddingConfig {
  baseUrl: string
  apiKey: string
  model?: string
}

export interface EmbeddingResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

// Default SiliconFlow embedding model
export const DEFAULT_EMBEDDING_MODEL = 'BAAI/bge-m3'

/**
 * Create embeddings for text(s)
 * Supports batch processing for multiple texts
 */
export async function createEmbedding(
  config: EmbeddingConfig,
  input: string | string[]
): Promise<number[][]> {
  const response = await fetch(`${config.baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_EMBEDDING_MODEL,
      input,
      encoding_format: 'float'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage: string
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.error?.message || errorJson.message || errorText
    } catch {
      errorMessage = errorText
    }
    throw new Error(`Embedding API error (${response.status}): ${errorMessage || '未知错误'}`)
  }

  const data: EmbeddingResponse = await response.json()
  
  // Return array of embeddings
  return data.data.map(item => item.embedding)
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Find top-k most similar vectors
 * Returns indices of top-k matches
 */
export function findTopKSimilar(
  queryVector: number[],
  candidateVectors: number[][],
  k: number
): Array<{ index: number; similarity: number }> {
  const similarities = candidateVectors.map((vector, index) => ({
    index,
    similarity: cosineSimilarity(queryVector, vector)
  }))

  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity)

  // Return top-k
  return similarities.slice(0, k)
}

/**
 * Test embedding connection
 */
export async function testEmbeddingConnection(
  config: EmbeddingConfig
): Promise<{ success: boolean; error?: string; dimension?: number }> {
  try {
    const embeddings = await createEmbedding(config, '测试文本')
    return { 
      success: true, 
      dimension: embeddings[0]?.length 
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误' 
    }
  }
}
