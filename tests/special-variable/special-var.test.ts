import { describe, it, expect } from 'vitest'
import { getCurrentStagePersonality } from '@/lib/services/recruit-service'
import { SpecialVariableData } from '@/prompts/character-template'

describe('special variable system', () => {
  const mockStages: SpecialVariableData['分阶段人设'] = [
    { 阶段范围: '0-20', 阶段名称: '初始阶段', 人格表现: '正常状态，对房东礼貌但保持距离' },
    { 阶段范围: '20-40', 阶段名称: '熟识阶段', 人格表现: '开始主动聊天，偶尔会开些小玩笑' },
    { 阶段范围: '40-60', 阶段名称: '亲近阶段', 人格表现: '会关心房东，主动帮忙做家务' },
    { 阶段范围: '60-80', 阶段名称: '依赖阶段', 人格表现: '经常粘着房东，表现出强烈的占有欲' },
    { 阶段范围: '80-100', 阶段名称: '黑化阶段', 人格表现: '极端依恋，不允许房东和其他人接触' }
  ]

  describe('getCurrentStagePersonality', () => {
    it('returns correct stage for value 0', () => {
      const stage = getCurrentStagePersonality(0, mockStages)
      expect(stage).not.toBeNull()
      expect(stage?.阶段名称).toBe('初始阶段')
      expect(stage?.阶段范围).toBe('0-20')
    })

    it('returns correct stage for value 10', () => {
      const stage = getCurrentStagePersonality(10, mockStages)
      expect(stage?.阶段名称).toBe('初始阶段')
    })

    it('returns correct stage for value 25', () => {
      const stage = getCurrentStagePersonality(25, mockStages)
      expect(stage?.阶段名称).toBe('熟识阶段')
      expect(stage?.阶段范围).toBe('20-40')
    })

    it('returns correct stage for value 50', () => {
      const stage = getCurrentStagePersonality(50, mockStages)
      expect(stage?.阶段名称).toBe('亲近阶段')
      expect(stage?.阶段范围).toBe('40-60')
    })

    it('returns correct stage for value 75', () => {
      const stage = getCurrentStagePersonality(75, mockStages)
      expect(stage?.阶段名称).toBe('依赖阶段')
      expect(stage?.阶段范围).toBe('60-80')
    })

    it('returns correct stage for value 100', () => {
      const stage = getCurrentStagePersonality(100, mockStages)
      expect(stage?.阶段名称).toBe('黑化阶段')
      expect(stage?.阶段范围).toBe('80-100')
    })

    it('returns first stage for value at boundary 20', () => {
      // 20应该属于20-40阶段，不是0-20
      const stage = getCurrentStagePersonality(20, mockStages)
      expect(stage?.阶段范围).toBe('20-40')
    })

    it('returns null for empty stages', () => {
      const stage = getCurrentStagePersonality(50, [])
      expect(stage).toBeNull()
    })

    it('returns null for undefined stages', () => {
      const stage = getCurrentStagePersonality(50, undefined as unknown as SpecialVariableData['分阶段人设'])
      expect(stage).toBeNull()
    })
  })

  describe('stage personality structure', () => {
    it('has exactly 5 stages', () => {
      expect(mockStages).toHaveLength(5)
    })

    it('each stage has required properties', () => {
      mockStages.forEach(stage => {
        expect(stage).toHaveProperty('阶段范围')
        expect(stage).toHaveProperty('阶段名称')
        expect(stage).toHaveProperty('人格表现')
        expect(typeof stage.阶段范围).toBe('string')
        expect(typeof stage.阶段名称).toBe('string')
        expect(typeof stage.人格表现).toBe('string')
      })
    })

    it('stage ranges are in correct format', () => {
      mockStages.forEach(stage => {
        const range = stage.阶段范围
        const match = range.match(/^(\d+)-(\d+)$/)
        expect(match).not.toBeNull()
        if (match) {
          const min = parseInt(match[1])
          const max = parseInt(match[2])
          expect(min).toBeLessThan(max)
        }
      })
    })
  })
})
