/**
 * RAG Memory Service
 * Provides vector-based memory retrieval for character conversations
 */

import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'
import { createEmbedding, cosineSimilarity, EmbeddingConfig } from '@/lib/ai/embedding-client'
import { getUserById } from '@/lib/auth/repo'

export interface RagMemoryEntry {
  id: number
  characterName: string
  userId: number
  content: string  // 完整记忆内容
  embedding: number[] | null  // 向量，可能为null如果尚未生成
  memoryType: 'interaction' | 'summary' | 'diary' | 'important'
  createdAt: string
}

export interface RagMemorySearchResult {
  memory: RagMemoryEntry
  similarity: number
}

export interface RagRetrievalConfig {
  topKSimilar: number      // 相似度最高的记忆数量
  recentCount: number      // 最近的记忆数量
  similarityThreshold: number  // 相似度阈值，低于此值的记忆不返回
}

// Default retrieval configuration
export const DEFAULT_RAG_CONFIG: RagRetrievalConfig = {
  topKSimilar: 3,
  recentCount: 3,
  similarityThreshold: 0.5
}

/**
 * Check if user has RAG memory enabled
 */
export async function isRagMemoryEnabled(userId: number): Promise<boolean> {
  const db = await getDb()
  
  try {
    const result = db.exec(
      `SELECT rag_enabled FROM user_settings WHERE user_id = ${safeInt(userId)}`
    )
    
    if (result && result[0]?.values?.length > 0) {
      return result[0].values[0][0] === 1
    }
  } catch {
    // Table might not exist yet
  }
  
  return false
}

/**
 * Enable/disable RAG memory for user
 */
export async function setRagMemoryEnabled(userId: number, enabled: boolean): Promise<void> {
  const db = await getDb()
  
  db.run(`
    INSERT INTO user_settings (user_id, rag_enabled, updated_at)
    VALUES (${safeInt(userId)}, ${enabled ? 1 : 0}, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      rag_enabled = ${enabled ? 1 : 0},
      updated_at = CURRENT_TIMESTAMP
  `)
  
  saveDb()
}

/**
 * Get user's RAG embedding configuration
 * Returns null if not configured (RAG disabled)
 */
export async function getRagEmbeddingConfig(userId: number): Promise<EmbeddingConfig | null> {
  const user = await getUserById(userId)
  if (!user?.rag_config) {
    return null
  }
  
  try {
    const config = JSON.parse(user.rag_config as string)
    if (!config.baseUrl || !config.apiKey) {
      return null
    }
    return config as EmbeddingConfig
  } catch {
    return null
  }
}

/**
 * Save RAG embedding configuration for user
 */
export async function saveRagEmbeddingConfig(
  userId: number, 
  config: EmbeddingConfig
): Promise<void> {
  const db = await getDb()
  
  const configJson = safeSqlString(JSON.stringify(config))
  
  db.run(`
    UPDATE users 
    SET rag_config = '${configJson}'
    WHERE id = ${safeInt(userId)}
  `)
  
  saveDb()
}

/**
 * Add a new memory entry to RAG storage
 * Automatically generates embedding if config is provided
 */
export async function addRagMemory(
  characterName: string,
  userId: number,
  content: string,
  memoryType: RagMemoryEntry['memoryType'] = 'interaction',
  embeddingConfig?: EmbeddingConfig
): Promise<RagMemoryEntry | null> {
  const db = await getDb()
  
  let embedding: number[] | null = null
  
  // Generate embedding if config provided
  if (embeddingConfig) {
    try {
      const embeddings = await createEmbedding(embeddingConfig, content)
      embedding = embeddings[0] || null
    } catch (error) {
      console.error('[RAG] Failed to generate embedding:', error)
      // Continue without embedding, can be generated later
    }
  }
  
  const contentEscaped = safeSqlString(content)
  const embeddingJson = embedding ? safeSqlString(JSON.stringify(embedding)) : null
  const charNameEscaped = safeSqlString(characterName)
  
  db.run(`
    INSERT INTO rag_memories (character_name, user_id, content, embedding, memory_type, created_at)
    VALUES ('${charNameEscaped}', ${safeInt(userId)}, '${contentEscaped}', 
            ${embeddingJson ? `'${embeddingJson}'` : 'NULL'}, 
            '${memoryType}', CURRENT_TIMESTAMP)
  `)
  
  saveDb()
  
  // Get the inserted record
  const result = db.exec(`
    SELECT id, character_name, user_id, content, embedding, memory_type, created_at
    FROM rag_memories 
    WHERE character_name = '${charNameEscaped}' AND user_id = ${safeInt(userId)}
    ORDER BY id DESC LIMIT 1
  `)
  
  if (!result || !result[0]?.values?.length) {
    return null
  }
  
  const row = result[0].values[0]
  return {
    id: row[0] as number,
    characterName: row[1] as string,
    userId: row[2] as number,
    content: row[3] as string,
    embedding: row[4] ? JSON.parse(row[4] as string) : null,
    memoryType: row[5] as RagMemoryEntry['memoryType'],
    createdAt: row[6] as string
  }
}

/**
 * Get all memories for a character
 * Optionally filter by type
 */
export async function getRagMemories(
  characterName: string,
  userId: number,
  options?: {
    memoryType?: RagMemoryEntry['memoryType']
    limit?: number
    withEmbedding?: boolean
  }
): Promise<RagMemoryEntry[]> {
  const db = await getDb()
  
  const charNameEscaped = safeSqlString(characterName)
  let sql = `
    SELECT id, character_name, user_id, content, 
           ${options?.withEmbedding ? 'embedding' : 'NULL as embedding'}, 
           memory_type, created_at
    FROM rag_memories 
    WHERE character_name = '${charNameEscaped}' AND user_id = ${safeInt(userId)}
  `
  
  if (options?.memoryType) {
    sql += ` AND memory_type = '${options.memoryType}'`
  }
  
  sql += ` ORDER BY created_at DESC`
  
  if (options?.limit) {
    sql += ` LIMIT ${safeInt(options.limit)}`
  }
  
  const result = db.exec(sql)
  
  if (!result || !result[0]?.values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    characterName: row[1] as string,
    userId: row[2] as number,
    content: row[3] as string,
    embedding: row[4] ? JSON.parse(row[4] as string) : null,
    memoryType: row[5] as RagMemoryEntry['memoryType'],
    createdAt: row[6] as string
  }))
}

/**
 * Search memories using vector similarity
 * Returns top-k most similar memories + recent memories
 */
export async function searchRagMemories(
  characterName: string,
  userId: number,
  queryText: string,
  embeddingConfig: EmbeddingConfig,
  retrievalConfig: RagRetrievalConfig = DEFAULT_RAG_CONFIG
): Promise<RagMemorySearchResult[]> {
  // 1. Generate embedding for query
  const queryEmbeddings = await createEmbedding(embeddingConfig, queryText)
  const queryVector = queryEmbeddings[0]
  
  if (!queryVector) {
    throw new Error('Failed to generate query embedding')
  }
  
  // 2. Get all memories with embeddings for this character
  const allMemories = await getRagMemories(characterName, userId, { withEmbedding: true })
  
  if (allMemories.length === 0) {
    return []
  }
  
  // 3. Calculate similarity for memories with embeddings
  const memoriesWithSimilarity = allMemories
    .filter(m => m.embedding !== null && m.embedding.length === queryVector.length)
    .map(memory => ({
      memory,
      similarity: cosineSimilarity(queryVector, memory.embedding!)
    }))
    .filter(item => item.similarity >= retrievalConfig.similarityThreshold)
  
  // 4. Get top-k by similarity
  memoriesWithSimilarity.sort((a, b) => b.similarity - a.similarity)
  const topSimilar = memoriesWithSimilarity.slice(0, retrievalConfig.topKSimilar)
  
  // 5. Get recent memories (not in topSimilar)
  const topSimilarIds = new Set(topSimilar.map(item => item.memory.id))
  const recentMemories = allMemories
    .filter(m => !topSimilarIds.has(m.id))
    .slice(0, retrievalConfig.recentCount)
    .map(memory => ({
      memory,
      similarity: 0  // Recent memories don't have similarity score
    }))
  
  // 6. Combine results: top similar first, then recent
  // Sort by created_at descending for display
  const combined = [...topSimilar, ...recentMemories]
  combined.sort((a, b) => new Date(b.memory.createdAt).getTime() - new Date(a.memory.createdAt).getTime())
  
  return combined
}

/**
 * Regenerate embeddings for all memories of a character
 * Useful when changing embedding model or config
 */
export async function regenerateEmbeddings(
  characterName: string,
  userId: number,
  embeddingConfig: EmbeddingConfig
): Promise<{ success: number; failed: number }> {
  const db = await getDb()
  
  // Get all memories without embeddings
  const memories = await getRagMemories(characterName, userId, { withEmbedding: true })
  const memoriesNeedingEmbedding = memories.filter(m => !m.embedding)
  
  let success = 0
  let failed = 0
  
  for (const memory of memoriesNeedingEmbedding) {
    try {
      const embeddings = await createEmbedding(embeddingConfig, memory.content)
      const embedding = embeddings[0]
      
      if (embedding) {
        const embeddingJson = safeSqlString(JSON.stringify(embedding))
        db.run(`
          UPDATE rag_memories 
          SET embedding = '${embeddingJson}'
          WHERE id = ${safeInt(memory.id)}
        `)
        success++
      }
    } catch (error) {
      console.error(`[RAG] Failed to regenerate embedding for memory ${memory.id}:`, error)
      failed++
    }
  }
  
  if (success > 0) {
    saveDb()
  }
  
  return { success, failed }
}

/**
 * Delete old memories for a character
 * Keeps only the most recent N memories
 */
export async function pruneOldMemories(
  characterName: string,
  userId: number,
  keepCount: number = 100
): Promise<number> {
  const db = await getDb()
  const charNameEscaped = safeSqlString(characterName)
  
  // Get IDs to keep
  const result = db.exec(`
    SELECT id FROM rag_memories 
    WHERE character_name = '${charNameEscaped}' AND user_id = ${safeInt(userId)}
    ORDER BY created_at DESC
    LIMIT ${safeInt(keepCount)}
  `)
  
  if (!result || !result[0]?.values?.length) {
    return 0
  }
  
  const keepIds = result[0].values.map((row: unknown[]) => row[0] as number)
  const keepIdsStr = keepIds.join(',')
  
  // Delete others
  db.run(`
    DELETE FROM rag_memories 
    WHERE character_name = '${charNameEscaped}' 
      AND user_id = ${safeInt(userId)}
      AND id NOT IN (${keepIdsStr})
  `)
  
  saveDb()
  
  // Return deleted count
  return db.getRowsModified()
}

/**
 * Convert character_memories (old table) to rag_memories
 * Migration helper
 */
export async function migrateCharacterMemoriesToRag(
  characterName: string,
  userId: number,
  embeddingConfig?: EmbeddingConfig
): Promise<number> {
  const db = await getDb()
  const charNameEscaped = safeSqlString(characterName)
  
  // Get old memories
  const result = db.exec(`
    SELECT summary, interaction_date 
    FROM character_memories 
    WHERE character_name = '${charNameEscaped}' AND user_id = ${safeInt(userId)}
    ORDER BY interaction_date ASC
  `)
  
  if (!result || !result[0]?.values) {
    return 0
  }
  
  let migrated = 0
  
  for (const row of result[0].values) {
    const summary = row[0] as string
    const date = row[1] as string
    const content = `[${date}] ${summary}`
    
    const entry = await addRagMemory(
      characterName, 
      userId, 
      content, 
      'summary',
      embeddingConfig
    )
    
    if (entry) {
      migrated++
    }
  }
  
  return migrated
}

/**
 * Build RAG context string for prompt injection
 */
export function buildRagContext(
  searchResults: RagMemorySearchResult[],
  options?: {
    includeSimilarity?: boolean
    maxLength?: number
  }
): string {
  if (searchResults.length === 0) {
    return ''
  }
  
  let context = '\n【相关记忆】\n'
  
  for (const result of searchResults) {
    const prefix = result.similarity > 0 
      ? `[相似度: ${(result.similarity * 100).toFixed(1)}%] `
      : '[最近] '
    
    context += `${prefix}${result.memory.content}\n`
  }
  
  // Truncate if too long
  if (options?.maxLength && context.length > options.maxLength) {
    context = context.substring(0, options.maxLength) + '\n...'
  }
  
  return context
}
