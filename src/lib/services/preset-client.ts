import { InteractionMode } from '@/types/preset'

export const DEFAULT_PRESETS: Record<InteractionMode, { name: string; description: string }> = {
  daily: { name: '日常聊天', description: '与角色的日常对话交流' },
  date: { name: '约会', description: '邀请角色外出约会' },
  flirt: { name: '调情', description: '亲密互动（好感度>50解锁）' },
  free: { name: '自由对话', description: '无限制的自由交流' }
}

export function canUseFlirtMode(favorability: number): boolean {
  return favorability > 50
}

export function getInteractionModeInfo(mode: InteractionMode, favorability: number = 0): {
  name: string
  description: string
  unlocked: boolean
} {
  const info = DEFAULT_PRESETS[mode]
  const unlocked = mode === 'flirt' ? canUseFlirtMode(favorability) : true
  
  return { ...info, unlocked }
}