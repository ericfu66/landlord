'use client'

import { useState, useEffect } from 'react'

interface Room {
  id: number
  floor: number
  positionStart: number
  positionEnd: number
  roomType: 'empty' | 'bedroom' | 'functional'
  description?: string
  characterName?: string
}

export default function BuildPanel() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [floors, setFloors] = useState(1)
  const [selectedFloor, setSelectedFloor] = useState(1)
  const [showBuildModal, setShowBuildModal] = useState(false)
  const [buildForm, setBuildForm] = useState({
    positionStart: 1,
    positionEnd: 2,
    roomType: 'bedroom' as 'empty' | 'bedroom' | 'functional',
    description: ''
  })

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/building')
      const data = await res.json()
      setRooms(data.rooms || [])
      setFloors(data.floors || 1)
    } catch (error) {
      console.error('Fetch rooms error:', error)
    }
  }

  const handleAddFloor = async () => {
    try {
      const res = await fetch('/api/building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addFloor' })
      })

      const data = await res.json()

      if (res.ok) {
        setFloors(data.floor)
        setSelectedFloor(data.floor)
        alert(`新建楼层成功，花费 ${data.cost.currency} 货币，${data.cost.energy} 体力`)
      }
    } catch (error) {
      console.error('Add floor error:', error)
    }
  }

  const handleBuild = async () => {
    try {
      const res = await fetch('/api/building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          floor: selectedFloor,
          positionStart: buildForm.positionStart,
          positionEnd: buildForm.positionEnd,
          roomType: buildForm.roomType,
          description: buildForm.description
        })
      })

      const data = await res.json()

      if (res.ok) {
        fetchRooms()
        setShowBuildModal(false)
        alert(`建造成功，花费 ${data.cost.currency} 货币，${data.cost.energy} 体力`)
      } else {
        alert(data.error || '建造失败')
      }
    } catch (error) {
      console.error('Build error:', error)
    }
  }

  const handleDemolish = async (roomId: number) => {
    if (!confirm('确定要拆除这个房间吗？')) return

    try {
      const res = await fetch('/api/building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', roomId })
      })

      const data = await res.json()

      if (res.ok) {
        fetchRooms()
        alert(`拆除成功，返还 ${data.refund} 货币`)
      }
    } catch (error) {
      console.error('Demolish error:', error)
    }
  }

  const getFloorRooms = (floor: number) => {
    return rooms.filter((r) => r.floor === floor)
  }

  const getRoomStyle = (room: Room) => {
    const left = `${(room.positionStart - 1) * 10}%`
    const width = `${(room.positionEnd - room.positionStart) * 10}%`
    
    const colors = {
      empty: 'bg-gray-600/50',
      bedroom: 'bg-purple-600/50',
      functional: 'bg-blue-600/50'
    }
    
    return { left, width, className: colors[room.roomType] }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">基建管理</h2>
        <button
          onClick={handleAddFloor}
          className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          + 新建楼层 (5000💰)
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {Array.from({ length: floors }).map((_, i) => (
          <button
            key={i}
            onClick={() => setSelectedFloor(i + 1)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedFloor === i + 1
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {i + 1} 楼
          </button>
        ))}
      </div>

      <div className="glass-card p-4">
        <div className="relative h-24 bg-gray-800/50 rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-gray-700/50 last:border-r-0"
              />
            ))}
          </div>

          {getFloorRooms(selectedFloor).map((room) => {
            const style = getRoomStyle(room)
            return (
              <div
                key={room.id}
                className={`absolute top-2 bottom-2 ${style.className} border border-white/20 rounded cursor-pointer hover:opacity-80 transition-opacity`}
                style={{ left: style.left, width: style.width }}
                onClick={() => handleDemolish(room.id)}
              >
                <div className="p-2 h-full flex flex-col justify-center items-center">
                  <span className="text-xs font-medium">
                    {room.roomType === 'empty' ? '空房间' : room.roomType === 'bedroom' ? '卧室' : '功能房'}
                  </span>
                  {room.characterName && (
                    <span className="text-xs text-gray-300 truncate w-full text-center">
                      {room.characterName}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-between mt-4 text-xs text-gray-400">
          <span>位置 1</span>
          <span>每格约15㎡</span>
          <span>位置 10</span>
        </div>
      </div>

      <button
        onClick={() => setShowBuildModal(true)}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity"
      >
        建造新房间
      </button>

      {showBuildModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">建造新房间</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">起始位置</label>
                  <select
                    value={buildForm.positionStart}
                    onChange={(e) => setBuildForm({ ...buildForm, positionStart: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
                  >
                    {Array.from({ length: 9 }).map((_, i) => (
                      <option key={i} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">结束位置</label>
                  <select
                    value={buildForm.positionEnd}
                    onChange={(e) => setBuildForm({ ...buildForm, positionEnd: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
                  >
                    {Array.from({ length: 9 }).map((_, i) => (
                      <option key={i} value={i + 2}>{i + 2}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">房间类型</label>
                <select
                  value={buildForm.roomType}
                  onChange={(e) => setBuildForm({ ...buildForm, roomType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
                >
                  <option value="empty">空房间 (免费)</option>
                  <option value="bedroom">卧室 (300💰/格)</option>
                  <option value="functional">功能房 (400💰/格)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">描述 (可选)</label>
                <input
                  type="text"
                  value={buildForm.description}
                  onChange={(e) => setBuildForm({ ...buildForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg"
                  placeholder="用于AI判断好感度匹配"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowBuildModal(false)}
                className="flex-1 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBuild}
                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                确认建造
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}