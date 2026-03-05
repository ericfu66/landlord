'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Home,
  Utensils,
  Bath,
  Bed,
  Hammer,
  X,
  Maximize2,
  Minimize2,
  Layers,
  Edit3,
  RotateCcw
} from 'lucide-react'
import { useGameState } from '@/app/game/GameStateContext'

interface Room {
  id: number
  floor: number
  positionStart: number
  positionEnd: number
  roomType: 'empty' | 'bedroom' | 'functional' | 'kitchen' | 'bathroom'
  description?: string
  characterName?: string
  name?: string
  isOutdoor?: boolean
}

const ROOM_TYPES: Record<string, {
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  description: string
}> = {
  empty: {
    label: '空房间',
    icon: Home,
    color: 'text-slate-400',
    bgColor: 'bg-slate-100',
    description: '待装修的空房间'
  },
  bedroom: {
    label: '卧室',
    icon: Bed,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    description: '舒适的卧室空间'
  },
  functional: {
    label: '功能房',
    icon: Home,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: '多功能活动空间'
  },
  kitchen: {
    label: '厨房',
    icon: Utensils,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    description: '烹饪美食的地方'
  },
  bathroom: {
    label: '公共卫浴',
    icon: Bath,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    description: '设备齐全的公共卫浴'
  }
}

const FLOOR_COLORS = [
  { bg: 'bg-rose-100/50', border: 'border-rose-300/50', shadow: 'shadow-rose-200/30', accent: 'from-rose-400/20' },
  { bg: 'bg-blue-100/50', border: 'border-blue-300/50', shadow: 'shadow-blue-200/30', accent: 'from-blue-400/20' },
  { bg: 'bg-amber-100/50', border: 'border-amber-300/50', shadow: 'shadow-amber-200/30', accent: 'from-amber-400/20' },
  { bg: 'bg-emerald-100/50', border: 'border-emerald-300/50', shadow: 'shadow-emerald-200/30', accent: 'from-emerald-400/20' },
  { bg: 'bg-purple-100/50', border: 'border-purple-300/50', shadow: 'shadow-purple-200/30', accent: 'from-purple-400/20' },
]

function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const roomType = ROOM_TYPES[room.roomType] || ROOM_TYPES.empty
  const Icon = roomType.icon
  const cellCount = room.positionEnd - room.positionStart
  const squareMeters = cellCount * 15
  const width = `${cellCount * 10}%`
  const left = `${(room.positionStart - 1) * 10}%`

  return (
    <motion.div
      layoutId={`room-${room.id}`}
      onClick={onClick}
      style={{ width, left }}
      className={`
        absolute top-2 bottom-2 rounded-xl cursor-pointer
        ${roomType.bgColor} border-2 ${roomType.color.replace('text-', 'border-').replace('600', '300')}
        shadow-lg hover:shadow-xl transition-all duration-300
        flex flex-col items-center justify-center gap-0.5 p-2
        hover:scale-[1.02] hover:z-10 group backdrop-blur-sm
      `}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Icon className={`w-5 h-5 ${roomType.color} group-hover:scale-110 transition-transform`} />
      <span className={`text-[10px] font-medium ${roomType.color} text-center px-1 truncate w-full`}>
        {room.name || roomType.label}
      </span>
      <span className="text-[8px] text-slate-500">
        {cellCount}格 · {squareMeters}㎡
      </span>
      {room.characterName && (
        <span className="text-[9px] text-slate-500 truncate w-full text-center px-1">
          {room.characterName}
        </span>
      )}
    </motion.div>
  )
}

function RoomDetailModal({
  room,
  onClose,
  onDemolish,
  onEdit
}: {
  room: Room | null
  onClose: () => void
  onDemolish: (id: number) => void
  onEdit: (room: Room) => void
}) {
  if (!room) return null

  const roomType = ROOM_TYPES[room.roomType] || ROOM_TYPES.empty
  const Icon = roomType.icon
  const cellCount = room.positionEnd - room.positionStart
  const squareMeters = cellCount * 15

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`${roomType.bgColor} p-6 border-b border-slate-200/20`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl bg-white/80 shadow-sm`}>
                  <Icon className={`w-8 h-8 ${roomType.color}`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {room.name || roomType.label}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {room.floor > 0 ? `${room.floor}楼` : `地下${Math.abs(room.floor) + 1}楼`} · {cellCount}格 · {squareMeters}㎡
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">类型：</span>
              <span className={`text-sm font-medium ${roomType.color}`}>
                {roomType.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">位置：</span>
              <span className="text-sm text-slate-300">
                格子 {room.positionStart}-{room.positionEnd}
              </span>
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2">房间描述</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                {room.description || roomType.description}
              </p>
            </div>

            {room.characterName && (
              <div className="bg-violet-500/10 rounded-lg p-3 border border-violet-500/20">
                <span className="text-sm text-violet-400">
                  👤 当前租客：<span className="font-medium">{room.characterName}</span>
                </span>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-800/50 flex gap-3">
            <button
              onClick={() => {
                onEdit(room)
                onClose()
              }}
              className="flex-1 py-2.5 px-4 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              编辑
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 font-medium hover:bg-slate-700 transition-colors"
            >
              关闭
            </button>
            <button
              onClick={() => {
                if (confirm('确定要拆除这个房间吗？')) {
                  onDemolish(room.id)
                  onClose()
                }
              }}
              className="flex-1 py-2.5 px-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              拆除
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function BuildModal({
  isOpen,
  onClose,
  onBuild,
  floors,
  selectedFloor,
  editingRoom,
  allRooms,
  onFloorChange
}: {
  isOpen: boolean
  onClose: () => void
  onBuild: (data: any) => void
  floors: number
  selectedFloor: number
  editingRoom?: Room | null
  allRooms: Room[]
  onFloorChange?: (floor: number) => void
}) {
  // 获取指定楼层的房间
  const getFloorRooms = (floor: number) => {
    return allRooms.filter((r) => r.floor === floor).sort((a, b) => a.positionStart - b.positionStart)
  }

  // 计算可用格子范围
  const getAvailableRanges = (floorNum: number) => {
    const floorRooms = getFloorRooms(floorNum)
    const occupied = floorRooms
      .filter(r => !editingRoom || r.id !== editingRoom.id)
      .sort((a, b) => a.positionStart - b.positionStart)
    
    const available = []
    let current = 1
    
    for (const room of occupied) {
      if (current < room.positionStart) {
        available.push({ start: current, end: room.positionStart })
      }
      current = Math.max(current, room.positionEnd)
    }
    
    if (current <= 10) {
      available.push({ start: current, end: 11 })
    }
    
    return available
  }

  // 获取所有可用起始位置
  const getAvailableStartPositions = (floorNum: number) => {
    const floorRooms = getFloorRooms(floorNum)
    const ranges = getAvailableRanges(floorNum)
    const positions = []
    for (const range of ranges) {
      for (let i = range.start; i < range.end && i <= 10; i++) {
        positions.push(i)
      }
    }
    return positions
  }

  // 获取可用结束位置
  const getAvailableEndPositions = (floorNum: number, startPos: number) => {
    const floorRooms = getFloorRooms(floorNum)
    const ranges = getAvailableRanges(floorNum)
    for (const range of ranges) {
      if (startPos >= range.start && startPos < range.end) {
        const positions = []
        for (let i = startPos + 1; i <= Math.min(range.end - 1, 10); i++) {
          positions.push(i)
        }
        return positions
      }
    }
    return []
  }

  const [form, setForm] = useState({
    floor: selectedFloor,
    positionStart: 1,
    positionEnd: 2,
    roomType: 'bedroom' as Room['roomType'],
    description: '',
    name: '',
    isNewFloor: false
  })

  // 初始化表单
  useEffect(() => {
    if (editingRoom) {
      setForm({
        floor: editingRoom.floor,
        positionStart: editingRoom.positionStart,
        positionEnd: editingRoom.positionEnd,
        roomType: editingRoom.roomType,
        description: editingRoom.description || '',
        name: editingRoom.name || '',
        isNewFloor: false
      })
    } else {
      // 自动选择第一个可用范围
      const availableStarts = getAvailableStartPositions(selectedFloor)
      if (availableStarts.length > 0) {
        const firstStart = availableStarts[0]
        const availableEnds = getAvailableEndPositions(selectedFloor, firstStart)
        if (availableEnds.length > 0) {
          setForm({
            floor: selectedFloor,
            positionStart: firstStart,
            positionEnd: availableEnds[0],
            roomType: 'bedroom',
            description: '',
            name: '',
            isNewFloor: false
          })
        }
      }
    }
  }, [editingRoom, allRooms, selectedFloor])

  if (!isOpen) return null

  const cellCount = form.positionEnd - form.positionStart
  const squareMeters = cellCount * 15

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <h3 className="text-xl font-bold text-slate-100">
            {editingRoom ? '编辑房间' : '建造新房间'}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            当前规格：{cellCount}格 · {squareMeters}㎡
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">楼层</label>
            <select
              value={form.floor}
              onChange={(e) => {
                const newFloor = parseInt(e.target.value)
                setForm({ ...form, floor: newFloor })
                onFloorChange?.(newFloor)
              }}
              disabled={!!editingRoom}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
            >
              {Array.from({ length: floors }).map((_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}楼
                </option>
              ))}
            </select>
          </div>

          {!editingRoom && (
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <label className="block text-sm font-medium text-slate-300 mb-3">选择位置（只显示可用格子）</label>
              
              {/* 可视化格子选择器 */}
              <div className="mb-4">
                <div className="flex gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((pos) => {
                    const floorRooms = getFloorRooms(form.floor)
                    const isOccupied = floorRooms.some(r => 
                      pos >= r.positionStart && pos < r.positionEnd
                    )
                    const isSelected = pos >= form.positionStart && pos < form.positionEnd
                    
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          if (isOccupied) return
                          // 点击设置起始位置，并尝试保持相同长度
                          const currentLength = form.positionEnd - form.positionStart
                          const newEnd = Math.min(pos + currentLength, 11)
                          // 检查新范围是否可用
                          const floorRooms = getFloorRooms(form.floor)
                          const wouldOverlap = floorRooms.some(r => 
                            pos < r.positionEnd && newEnd > r.positionStart
                          )
                          if (wouldOverlap) {
                            // 找到最大可用结束位置
                            const nextRoom = floorRooms
                              .filter(r => r.positionStart > pos)
                              .sort((a, b) => a.positionStart - b.positionStart)[0]
                            const maxEnd = nextRoom ? nextRoom.positionStart : 11
                            setForm({ ...form, positionStart: pos, positionEnd: Math.min(pos + 1, maxEnd) })
                          } else {
                            setForm({ ...form, positionStart: pos, positionEnd: newEnd })
                          }
                        }}
                        disabled={isOccupied}
                        className={`
                          flex-1 h-10 rounded-md text-xs font-medium transition-all
                          ${isOccupied 
                            ? 'bg-red-500/20 text-red-400/50 cursor-not-allowed' 
                            : isSelected
                              ? 'bg-violet-500 text-white'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }
                        `}
                      >
                        {pos}
                      </button>
                    )
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>

              {/* 长度调节 */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">房间长度：{form.positionEnd - form.positionStart} 格</label>
                <input
                  type="range"
                  min={1}
                  max={(() => {
                    const floorRooms = getFloorRooms(form.floor)
                    const nextRoom = floorRooms
                      .filter(r => r.positionStart > form.positionStart)
                      .sort((a, b) => a.positionStart - b.positionStart)[0]
                    return Math.min(10 - form.positionStart + 1, 
                      nextRoom?.positionStart - form.positionStart || 10 - form.positionStart + 1
                    )
                  })()}
                  value={form.positionEnd - form.positionStart}
                  onChange={(e) => setForm({ 
                    ...form, 
                    positionEnd: form.positionStart + parseInt(e.target.value) 
                  })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>1格</span>
                  <span>{(() => {
                    const floorRooms = getFloorRooms(form.floor)
                    const nextRoom = floorRooms
                      .filter(r => r.positionStart > form.positionStart)
                      .sort((a, b) => a.positionStart - b.positionStart)[0]
                    return Math.min(10 - form.positionStart + 1, 
                      nextRoom?.positionStart - form.positionStart || 10 - form.positionStart + 1
                    )
                  })()}格（最大）</span>
                </div>
              </div>
            </div>
          )}

          {editingRoom && (
            <div className="p-3 bg-slate-800/50 rounded-xl">
              <label className="block text-sm font-medium text-slate-300 mb-2">位置</label>
              <p className="text-slate-400 text-sm">
                格子 {editingRoom.positionStart} - {editingRoom.positionEnd}（{editingRoom.positionEnd - editingRoom.positionStart}格 · {(editingRoom.positionEnd - editingRoom.positionStart) * 15}㎡）
              </p>
            </div>
          )}

          {!editingRoom && (
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <input
                type="checkbox"
                id="isNewFloor"
                checked={form.isNewFloor}
                onChange={(e) => setForm({ ...form, isNewFloor: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
              />
              <label htmlFor="isNewFloor" className="text-sm text-amber-400">
                建造新楼层（需要额外 5000 货币 + 1 体力）
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">房间类型</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROOM_TYPES).filter(([k]) => k !== 'empty').map(([key, type]) => {
                const TypeIcon = type.icon
                return (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, roomType: key as any })}
                    className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                      form.roomType === key
                        ? `border-violet-500 ${type.bgColor}`
                        : 'border-slate-600 hover:border-slate-500 bg-slate-800'
                    }`}
                  >
                    <TypeIcon className={`w-5 h-5 ${type.color}`} />
                    <span className="text-sm font-medium text-slate-200">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">房间名称（可选）</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例如：豪华套房、温馨小屋"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">房间描述（可选）</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="描述房间的特点、装修风格等..."
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-800/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 font-medium hover:bg-slate-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (form.positionStart >= form.positionEnd) {
                alert('起始位置必须小于结束位置')
                return
              }
              onBuild({ ...form, roomId: editingRoom?.id })
              onClose()
            }}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Hammer className="w-4 h-4" />
            {editingRoom ? '确认修改' : '确认建造'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function BuildPanel() {
  const { refreshGameState } = useGameState()
  const [rooms, setRooms] = useState<Room[]>([])
  const [floors, setFloors] = useState(5)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showBuildModal, setShowBuildModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [selectedFloorForBuild, setSelectedFloorForBuild] = useState(1)
  const [scale, setScale] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/building')
      const data = await res.json()
      setRooms(data.rooms || [])
      setFloors(data.floors || 5)
    } catch (error) {
      console.error('Fetch rooms error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

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
        fetchRooms()
        await refreshGameState()
        alert(`成功添加新楼层！消耗：${data.cost.currency}货币，${data.cost.energy}体力`)
      } else {
        alert(data.error || '添加楼层失败')
      }
    } catch (error) {
      console.error('Add floor error:', error)
      alert('添加楼层失败')
    }
  }

  const handleBuild = async (formData: any) => {
    try {
      if (formData.roomId) {
        // 编辑现有房间
        const res = await fetch('/api/building', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            roomId: formData.roomId,
            roomType: formData.roomType,
            description: formData.description,
            name: formData.name
          })
        })
        if (res.ok) {
          fetchRooms()
          await refreshGameState()
          setEditingRoom(null)
          alert('房间更新成功')
        } else {
          const data = await res.json()
          alert(data.error || '更新失败')
        }
      } else {
        // 创建新房间
        const res = await fetch('/api/building', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            ...formData
          })
        })
        const data = await res.json()
        if (res.ok) {
          fetchRooms()
          await refreshGameState()
          alert(`建造成功！消耗：${data.cost.currency}货币，${data.cost.energy}体力`)
        } else {
          alert(data.error || '建造失败')
        }
      }
    } catch (error) {
      console.error('Build error:', error)
      alert('操作失败，请重试')
    }
  }

  const handleDemolish = async (roomId: number) => {
    try {
      const res = await fetch('/api/building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', roomId })
      })
      const data = await res.json()
      if (res.ok) {
        fetchRooms()
        await refreshGameState()
        setSelectedRoom(null)
        if (data.refund > 0) {
          alert(`拆除成功！退还：${data.refund}货币`)
        } else {
          alert('拆除成功')
        }
      } else {
        alert(data.error || '拆除失败')
      }
    } catch (error) {
      console.error('Demolish error:', error)
      alert('拆除失败')
    }
  }

  const handleEdit = (room: Room) => {
    setEditingRoom(room)
    setSelectedFloorForBuild(room.floor)
    setShowBuildModal(true)
  }

  const getFloorRooms = (floor: number) => {
    return rooms.filter((r) => r.floor === floor).sort((a, b) => a.positionStart - b.positionStart)
  }

  const getFloorLabel = (floor: number) => {
    if (floor > 0) return `${floor}楼`
    if (floor === 0) return '地下一楼'
    return `地下${Math.abs(floor) + 1}楼`
  }

  const floorList = Array.from({ length: floors }, (_, i) => floors - i)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">基建管理</h1>
            <p className="text-slate-400 text-sm mt-1">
              规划你的房产布局，每格约15㎡，每层最多10格（150㎡）
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Layers className="w-4 h-4" />
            <span>共 {floors} 层</span>
          </div>
        </div>
      </div>

      {/* Building Container */}
      <div
        className="transition-transform duration-300 ease-out overflow-auto pb-24"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center top'
        }}
      >
        <div className="space-y-2 max-w-4xl mx-auto">
          {floorList.map((floorNum, index) => {
            const floorRooms = getFloorRooms(floorNum)
            const colorSet = FLOOR_COLORS[index % FLOOR_COLORS.length]

            return (
              <motion.div
                key={floorNum}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`
                  relative rounded-xl border ${colorSet.border} ${colorSet.bg}
                  shadow-md ${colorSet.shadow}
                  transition-all duration-300 hover:shadow-lg
                  bg-gradient-to-r ${colorSet.accent}
                `}
              >
                {/* Floor Label */}
                <div className="absolute -left-14 top-1/2 -translate-y-1/2 w-12 text-right">
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                    {getFloorLabel(floorNum)}
                  </span>
                </div>

                {/* Floor Content */}
                <div className="p-3 min-h-[80px] relative">
                  {/* Grid markers */}
                  <div className="absolute top-1 left-2 right-2 h-5 flex justify-between text-[8px] text-slate-400/50">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <span key={i} className="w-[10%] text-center">{i}</span>
                    ))}
                  </div>

                  {/* Rooms Container */}
                  <div className="relative h-16 bg-slate-800/30 rounded-lg border border-slate-700/30 mt-6">
                    {floorRooms.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
                        <span className="opacity-50">点击底部按钮建造房间</span>
                      </div>
                    ) : (
                      floorRooms.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          onClick={() => setSelectedRoom(room)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1 bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-1.5 shadow-2xl"
        >
          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-700/50">
            <button
              onClick={() => setScale(Math.max(scale - 0.1, 0.5))}
              className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
              title="缩小"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 w-10 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(Math.min(scale + 0.1, 1.5))}
              className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
              title="放大"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-8 bg-slate-700/50 mx-1" />

          <button
            onClick={() => setScale(1)}
            className="p-2 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            title="重置视图"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-px h-8 bg-slate-700/50 mx-1" />

          <button
            onClick={() => {
              setEditingRoom(null)
              setSelectedFloorForBuild(1)
              setShowBuildModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Hammer className="w-4 h-4" />
            <span className="text-sm">建造房间</span>
          </button>

          <button
            onClick={handleAddFloor}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Layers className="w-4 h-4" />
            <span className="text-sm">添加楼层</span>
          </button>
        </motion.div>
      </div>

      {/* Modals */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onDemolish={handleDemolish}
          onEdit={handleEdit}
        />
      )}

      <BuildModal
        isOpen={showBuildModal}
        onClose={() => {
          setShowBuildModal(false)
          setEditingRoom(null)
        }}
        onBuild={handleBuild}
        floors={floors}
        selectedFloor={selectedFloorForBuild}
        editingRoom={editingRoom}
        allRooms={rooms}
        onFloorChange={setSelectedFloorForBuild}
      />
    </div>
  )
}
