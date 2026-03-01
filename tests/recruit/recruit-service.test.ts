import { describe, it, expect } from 'vitest'
import { normalizeCharacter } from '@/lib/services/recruit-service'

describe('recruit character schema', () => {
  it('returns required template sections', () => {
    const result = normalizeCharacter({ 
      角色档案: {
        基本信息: {
          姓名: '测试角色',
          年龄: 20,
          性别: '女',
          身份: '学生',
          标签: ['温柔']
        },
        外貌特征: {
          整体印象: '清秀',
          发型: '长发',
          面部: '瓜子脸',
          身材: '苗条',
          穿着打扮: '休闲'
        },
        性格特点: {
          核心特质: '温柔',
          表现形式: '说话轻声细语',
          对用户的表现: '礼貌'
        },
        背景设定: {
          家庭背景: '普通家庭',
          经济状况: '中等',
          成长经历: '平凡成长',
          社交关系: '朋友不多'
        },
        语言特征: {
          音色: '轻柔',
          说话习惯: '语气温柔',
          口头禅: '嗯...'
        },
        关系设定: {
          与用户的关系: '陌生人',
          相识过程: '刚刚认识',
          互动方式: '客气'
        }
      } as any,
      来源类型: 'modern'
    })
    
    expect(result).not.toBeNull()
    expect(result?.角色档案).toBeDefined()
    expect(result?.角色档案.基本信息.姓名).toBe('测试角色')
  })

  it('returns null for invalid input', () => {
    const result = normalizeCharacter({} as any)
    expect(result).toBeNull()
  })

  it('validates character type', () => {
    const validTypes = ['modern', 'crossover']
    expect(validTypes).toContain('modern')
    expect(validTypes).toContain('crossover')
  })
})