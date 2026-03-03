export interface WorldView {
  id: number
  userId: number
  name: string
  description: string
  content: string
  isAiGenerated: boolean
  createdAt: string
  updatedAt: string
}

export interface WorldViewTemplate {
  name: string
  description: string
  content: string
  placeholders?: Record<string, string>
}

export interface WorldViewWithPlaceholder extends WorldView {
  placeholders: Record<string, string>
  resolvedContent: string
}

export function resolveWorldViewPlaceholders(
  content: string, 
  placeholders: Record<string, string>
): string {
  let resolved = content
  for (const [key, value] of Object.entries(placeholders)) {
    resolved = resolved.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return resolved
}
