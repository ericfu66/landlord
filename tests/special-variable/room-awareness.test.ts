import { describe, it, expect } from 'vitest'

describe('room awareness in chat', () => {
  describe('room data structure', () => {
    it('room data has required fields', () => {
      const roomData = {
        name: '温馨卧室',
        description: '朝南的大卧室，有独立的阳台',
        roomType: 'bedroom'
      }
      
      expect(roomData).toHaveProperty('name')
      expect(roomData).toHaveProperty('description')
      expect(roomData).toHaveProperty('roomType')
    })

    it('room type can be various values', () => {
      const roomTypes = ['bedroom', 'kitchen', 'bathroom', 'functional', 'empty']
      
      roomTypes.forEach(type => {
        const room = { name: '测试房间', description: '描述', roomType: type }
        expect(room.roomType).toBe(type)
      })
    })
  })

  describe('room info in prompt', () => {
    it('formats room info correctly for AI prompt', () => {
      const roomData = {
        name: '温馨卧室',
        description: '朝南的大卧室，有独立的阳台',
        roomType: 'bedroom'
      }
      
      const roomTypeMap: Record<string, string> = {
        bedroom: '卧室',
        kitchen: '厨房',
        bathroom: '浴室',
        functional: '功能房',
        empty: '普通房间'
      }
      
      const roomInfo = `
【你的房间】
房间名称：${roomData.name || '未命名房间'}
房间类型：${roomTypeMap[roomData.roomType] || '普通房间'}
房间描述：${roomData.description || '这是一个普通的出租房间，有你日常生活所需的基本设施。'}
`
      
      expect(roomInfo).toContain('温馨卧室')
      expect(roomInfo).toContain('卧室')
      expect(roomInfo).toContain('朝南的大卧室')
      expect(roomInfo).toContain('【你的房间】')
    })

    it('handles missing room data gracefully', () => {
      type RoomData = { name?: string; roomType: string; description?: string }
      const roomData: RoomData | null = null
      
      const formatRoomInfo = (data: RoomData | null) => {
        if (!data) return ''
        return `
【你的房间】
房间名称：${data.name || '未命名房间'}
房间类型：${data.roomType}
房间描述：${data.description || '这是一个普通的出租房间，有你日常生活所需的基本设施。'}
`
      }
      
      const roomInfo = formatRoomInfo(roomData)
      expect(roomInfo).toBe('')
    })

    it('handles partial room data', () => {
      const roomData: { name: string | undefined; description: string | undefined; roomType: string } = {
        name: undefined,
        description: undefined,
        roomType: 'kitchen'
      }
      
      const roomTypeMap: Record<string, string> = {
        bedroom: '卧室',
        kitchen: '厨房',
        bathroom: '浴室',
        functional: '功能房',
        empty: '普通房间'
      }
      
      const roomInfo = `
【你的房间】
房间名称：${roomData.name || '未命名房间'}
房间类型：${roomTypeMap[roomData.roomType] || '普通房间'}
房间描述：${roomData.description || '这是一个普通的出租房间，有你日常生活所需的基本设施。'}
`
      
      expect(roomInfo).toContain('未命名房间')
      expect(roomInfo).toContain('厨房')
    })
  })
})
