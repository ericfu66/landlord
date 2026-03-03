'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WorkshopItem, WorkshopItemType } from '@/types/workshop'
import { Store, Upload, Download, Trash2, BookOpen, Users, Filter, X } from 'lucide-react'

// 复古画廊风格作品卡片
function GalleryCard({ 
  item, 
  isMyUpload, 
  availableRooms,
  onDownload, 
  onDelete,
  isDownloading 
}: { 
  item: WorkshopItem
  isMyUpload: boolean
  availableRooms: number
  onDownload: () => void
  onDelete: () => void
  isDownloading: boolean
}) {
  const typeColor = item.type === 'character' 
    ? 'from-amber-600/80 to-orange-700/80' 
    : 'from-emerald-600/80 to-teal-700/80'
  
  const typeLabel = item.type === 'character' ? '角色' : '世界观'
  const typeIcon = item.type === 'character' ? '👤' : '🌍'

  return (
    <div className="group relative bg-[#f5f1e8] rounded-sm overflow-hidden border-2 border-[#8b7355] hover:border-[#654321] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(101,67,33,0.3)]">
      {/* 复古相框效果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#d4c4a8]/10 to-[#8b7355]/20 pointer-events-none" />
      
      {/* 类型标签 */}
      <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${typeColor} shadow-lg`}>
        <span className="mr-1">{typeIcon}</span>
        {typeLabel}
      </div>

      {/* 下载次数 */}
      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-[#3d2914]/80 text-[#f5f1e8] rounded-full text-xs">
        <Download size={12} />
        <span>{item.downloads || 0}</span>
      </div>

      {/* 主内容区 */}
      <div className="p-5 pt-16">
        {/* 标题 */}
        <h3 className="font-serif text-xl font-bold text-[#3d2914] mb-2 line-clamp-1">
          {item.name}
        </h3>

        {/* 作者（仅浏览模式） */}
        {!isMyUpload && item.authorName && (
          <div className="flex items-center gap-1 text-sm text-[#8b7355] mb-3">
            <Users size={14} />
            <span className="font-serif">{item.authorName}</span>
          </div>
        )}

        {/* 描述 */}
        <p className="text-sm text-[#654321] mb-4 line-clamp-2 font-serif italic">
          {item.description || '暂无描述'}
        </p>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {isMyUpload ? (
            <button
              onClick={onDelete}
              className="flex-1 py-2.5 bg-[#8b4513] hover:bg-[#654321] text-[#f5f1e8] rounded-sm font-serif transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              删除
            </button>
          ) : (
            <button
              onClick={onDownload}
              disabled={isDownloading || (item.type === 'character' && availableRooms === 0)}
              className={`flex-1 py-2.5 rounded-sm font-serif transition-colors flex items-center justify-center gap-2 ${
                isDownloading
                  ? 'bg-[#a0826d] text-[#f5f1e8] cursor-not-allowed'
                  : item.type === 'character' && availableRooms === 0
                  ? 'bg-[#d4c4a8] text-[#8b7355] cursor-not-allowed'
                  : 'bg-[#2d5016] hover:bg-[#1e350e] text-[#f5f1e8]'
              }`}
            >
              <Download size={16} />
              {isDownloading ? '下载中...' : '下载作品'}
            </button>
          )}
        </div>

        {/* 公开状态（我的上传） */}
        {isMyUpload && (
          <div className={`mt-3 text-center text-xs font-serif ${item.isPublic ? 'text-[#2d5016]' : 'text-[#8b7355]'}`}>
            {item.isPublic ? '📢 公开作品' : '🔒 私有作品'}
          </div>
        )}
      </div>

      {/* 复古装饰角 */}
      <div className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-[#8b7355] to-transparent opacity-30" />
    </div>
  )
}

export default function WorkshopPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'browse' | 'my'>('browse')
  const [filterType, setFilterType] = useState<WorkshopItemType | 'all'>('all')
  const [items, setItems] = useState<WorkshopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadType, setUploadType] = useState<WorkshopItemType>('character')
  const [userCharacters, setUserCharacters] = useState<any[]>([])
  const [userWorldviews, setUserWorldviews] = useState<any[]>([])
  const [selectedOriginalId, setSelectedOriginalId] = useState('')
  const [uploadName, setUploadName] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadIsPublic, setUploadIsPublic] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [availableRooms, setAvailableRooms] = useState(0)

  useEffect(() => {
    fetchItems()
    fetchAvailableRooms()
  }, [activeTab, filterType])

  const fetchItems = async () => {
    setLoading(true)
    try {
      if (activeTab === 'browse') {
        const url = filterType === 'all' 
          ? '/api/workshop' 
          : `/api/workshop?type=${filterType}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setItems(data.items || [])
        }
      } else {
        const res = await fetch('/api/workshop/my')
        if (res.ok) {
          const data = await res.json()
          setItems(data.items || [])
        }
      }
    } catch (err) {
      setError('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableRooms = async () => {
    try {
      const res = await fetch('/api/building')
      if (res.ok) {
        const data = await res.json()
        const rooms = data.rooms || []
        const emptyRooms = rooms.filter((r: any) => !r.characterName)
        setAvailableRooms(emptyRooms.length)
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    }
  }

  const fetchUserContent = async () => {
    try {
      const [charRes, worldviewRes] = await Promise.all([
        fetch('/api/characters'),
        fetch('/api/worldviews')
      ])
      
      if (charRes.ok) {
        const charData = await charRes.json()
        setUserCharacters(charData.characters || [])
      }
      
      if (worldviewRes.ok) {
        const worldviewData = await worldviewRes.json()
        setUserWorldviews(worldviewData.worldviews || [])
      }
    } catch (error) {
      console.error('Failed to fetch user content:', error)
    }
  }

  const handleUpload = async () => {
    if (!selectedOriginalId || !uploadName.trim()) {
      setError('请选择要上传的内容并填写名称')
      return
    }

    setUploading(true)
    try {
      const res = await fetch('/api/workshop/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: uploadType,
          originalId: selectedOriginalId,
          name: uploadName,
          description: uploadDescription,
          isPublic: uploadIsPublic
        })
      })

      if (res.ok) {
        setShowUploadDialog(false)
        resetUploadForm()
        fetchItems()
      } else {
        const data = await res.json()
        setError(data.error || '上传失败')
      }
    } catch (err) {
      setError('上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (itemId: number, type: WorkshopItemType) => {
    if (type === 'character' && availableRooms === 0) {
      alert('没有空房间！请先建造房间')
      return
    }

    setDownloadingId(itemId)
    try {
      const res = await fetch('/api/workshop/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.type === 'character') {
          alert(`角色 "${data.character?.name || '新角色'}" 下载成功！好感度、顺从度等变量已初始化为0。`)
          fetchAvailableRooms()
        } else {
          alert('世界观下载成功！')
        }
        fetchItems()
      } else {
        const data = await res.json()
        alert(data.error || '下载失败')
      }
    } catch (err) {
      alert('下载失败')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (itemId: number) => {
    if (!confirm('确定要删除这个上传吗？')) return

    try {
      const res = await fetch(`/api/workshop/my?id=${itemId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchItems()
      } else {
        setError('删除失败')
      }
    } catch (err) {
      setError('删除失败')
    }
  }

  const resetUploadForm = () => {
    setUploadName('')
    setUploadDescription('')
    setSelectedOriginalId('')
    setUploadIsPublic(true)
    setError('')
  }

  const openUploadDialog = async () => {
    await fetchUserContent()
    setShowUploadDialog(true)
    resetUploadForm()
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 复古画廊标题 */}
      <div className="text-center mb-8">
        <div className="inline-block">
          <div className="border-4 border-[#8b7355] bg-[#f5f1e8] px-8 py-4 shadow-[0_10px_40px_rgba(101,67,33,0.3)]">
            <div className="flex items-center justify-center gap-3">
              <Store size={32} className="text-[#8b4513]" />
              <h1 className="text-4xl font-serif font-bold text-[#3d2914]">
                创意工坊
              </h1>
              <Store size={32} className="text-[#8b4513]" />
            </div>            
            <p className="text-[#8b7355] font-serif italic mt-2">
              分享你的创作，发现他人的精彩
            </p>
          </div>
        </div>
      </div>

      {/* 控制栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 bg-[#f5f1e8] border-2 border-[#d4c4a8] rounded-sm">
        {/* 标签切换 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 font-serif font-bold rounded-sm transition-colors flex items-center gap-2 ${
              activeTab === 'browse'
                ? 'bg-[#8b4513] text-[#f5f1e8]'
                : 'bg-[#d4c4a8] text-[#3d2914] hover:bg-[#c4b498]'
            }`}
          >
            <BookOpen size={18} />
            浏览工坊
          </button>
          
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 font-serif font-bold rounded-sm transition-colors flex items-center gap-2 ${
              activeTab === 'my'
                ? 'bg-[#8b4513] text-[#f5f1e8]'
                : 'bg-[#d4c4a8] text-[#3d2914] hover:bg-[#c4b498]'
            }`}
          >
            <Users size={18} />
            我的上传
          </button>
        </div>

        {/* 筛选器（仅浏览） */}
        {activeTab === 'browse' && (
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#8b7355]" />
            {[
              { id: 'all', label: '全部' },
              { id: 'character', label: '角色' },
              { id: 'worldview', label: '世界观' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id as any)}
                className={`px-3 py-1 font-serif text-sm rounded-sm transition-colors ${
                  filterType === type.id
                    ? 'bg-[#2d5016] text-[#f5f1e8]'
                    : 'bg-[#e8e0d0] text-[#654321] hover:bg-[#d4c4a8]'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}

        {/* 上传按钮 */}
        <button
          onClick={openUploadDialog}
          className="px-6 py-2 bg-[#2d5016] hover:bg-[#1e350e] text-[#f5f1e8] font-serif font-bold rounded-sm transition-colors flex items-center gap-2"
        >
          <Upload size={18} />
          上传作品
        </button>
      </div>

      {/* 空房间提示 */}
      {activeTab === 'browse' && (
        <div className="mb-6 p-4 bg-[#faf6eb] border-l-4 border-[#8b7355] rounded-sm">
          <span className="text-[#654321] font-serif">
            📦 当前空房间: <strong>{availableRooms}</strong> 个 
            {availableRooms === 0 && <span className="text-[#8b4513]">（需要先建造房间才能下载角色）</span>}
          </span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-[#fee2e2] border border-[#ef4444] rounded-sm text-[#dc2626] font-serif">
          {error}
        </div>
      )}

      {/* 项目列表 */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block p-8 bg-[#f5f1e8] border-2 border-[#d4c4a8] rounded-sm">
            <div className="animate-pulse text-[#8b7355] font-serif">
              正在翻阅作品集...
            </div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-block p-8 bg-[#f5f1e8] border-2 border-[#d4c4a8] rounded-sm">
            <Store size={48} className="mx-auto mb-4 text-[#d4c4a8]" />
            <p className="text-[#8b7355] font-serif text-lg">
              {activeTab === 'browse' ? '暂无公开作品' : '您还没有上传过作品'}
            </p>
            {activeTab === 'my' && (
              <button
                onClick={openUploadDialog}
                className="mt-4 px-6 py-2 bg-[#8b4513] hover:bg-[#654321] text-[#f5f1e8] font-serif rounded-sm transition-colors"
              >
                上传第一个作品
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <GalleryCard
              key={item.id}
              item={item}
              isMyUpload={activeTab === 'my'}
              availableRooms={availableRooms}
              onDownload={() => handleDownload(item.id, item.type)}
              onDelete={() => handleDelete(item.id)}
              isDownloading={downloadingId === item.id}
            />
          ))}
        </div>
      )}

      {/* 上传对话框 - 复古风格 */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-[#3d2914]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-[#f5f1e8] border-4 border-[#8b7355] rounded-sm shadow-[0_20px_60px_rgba(61,41,20,0.5)]">
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-4 border-b-2 border-[#d4c4a8] bg-[#faf6eb]">
              <h2 className="text-2xl font-serif font-bold text-[#3d2914] flex items-center gap-2">
                <Upload size={24} />
                上传作品
              </h2>
              <button
                onClick={() => setShowUploadDialog(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#d4c4a8] transition-colors"
              >
                <X size={20} className="text-[#8b7355]" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* 类型选择 */}
              <div>
                <label className="block text-sm font-serif font-bold text-[#3d2914] mb-2">
                  作品类型
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setUploadType('character')
                      setSelectedOriginalId('')
                    }}
                    className={`flex-1 py-3 font-serif rounded-sm transition-colors ${
                      uploadType === 'character'
                        ? 'bg-[#8b4513] text-[#f5f1e8]'
                        : 'bg-[#e8e0d0] text-[#654321] hover:bg-[#d4c4a8]'
                    }`}
                  >
                    👤 角色
                  </button>
                  <button
                    onClick={() => {
                      setUploadType('worldview')
                      setSelectedOriginalId('')
                    }}
                    className={`flex-1 py-3 font-serif rounded-sm transition-colors ${
                      uploadType === 'worldview'
                        ? 'bg-[#8b4513] text-[#f5f1e8]'
                        : 'bg-[#e8e0d0] text-[#654321] hover:bg-[#d4c4a8]'
                    }`}
                  >
                    🌍 世界观
                  </button>
                </div>
              </div>

              {/* 选择内容 */}
              <div>
                <label className="block text-sm font-serif font-bold text-[#3d2914] mb-2">
                  选择{uploadType === 'character' ? '角色' : '世界观'}
                </label>
                <select
                  value={selectedOriginalId}
                  onChange={(e) => setSelectedOriginalId(e.target.value)}
                  className="w-full bg-[#faf6eb] border-2 border-[#d4c4a8] rounded-sm px-4 py-3 font-serif text-[#3d2914] focus:outline-none focus:border-[#8b4513]"
                >
                  <option value="">请选择...</option>
                  {uploadType === 'character' 
                    ? userCharacters.map((char) => (
                        <option key={char.name} value={char.name}>
                          {char.template?.角色档案?.基本信息?.姓名 || char.name}
                        </option>
                      ))
                    : userWorldviews.map((wv) => (
                        <option key={wv.id} value={wv.id.toString()}>
                          {wv.name}
                        </option>
                      ))
                  }
                </select>
              </div>

              {/* 名称 */}
              <div>
                <label className="block text-sm font-serif font-bold text-[#3d2914] mb-2">
                  作品名称
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="给作品起个响亮的名字"
                  className="w-full bg-[#faf6eb] border-2 border-[#d4c4a8] rounded-sm px-4 py-3 font-serif text-[#3d2914] placeholder:text-[#a0826d] focus:outline-none focus:border-[#8b4513]"
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-serif font-bold text-[#3d2914] mb-2">
                  作品描述
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="简单介绍一下你的作品..."
                  rows={3}
                  className="w-full bg-[#faf6eb] border-2 border-[#d4c4a8] rounded-sm px-4 py-3 font-serif text-[#3d2914] placeholder:text-[#a0826d] focus:outline-none focus:border-[#8b4513] resize-none"
                />
              </div>

              {/* 公开选项 */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={uploadIsPublic}
                  onChange={(e) => setUploadIsPublic(e.target.checked)}
                  className="w-5 h-5 accent-[#8b4513]"
                />
                <span className="font-serif text-[#3d2914]">
                  公开作品（其他用户可以看到并下载）
                </span>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="p-3 bg-[#fee2e2] border border-[#ef4444] rounded-sm text-[#dc2626] font-serif text-sm">
                  {error}
                </div>
              )}

              {/* 按钮 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowUploadDialog(false)}
                  className="flex-1 py-3 bg-[#d4c4a8] hover:bg-[#c4b498] text-[#3d2914] font-serif font-bold rounded-sm transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !selectedOriginalId || !uploadName.trim()}
                  className={`flex-1 py-3 font-serif font-bold rounded-sm transition-colors flex items-center justify-center gap-2 ${
                    uploading || !selectedOriginalId || !uploadName.trim()
                      ? 'bg-[#a0826d] text-[#f5f1e8] cursor-not-allowed'
                      : 'bg-[#2d5016] hover:bg-[#1e350e] text-[#f5f1e8]'
                  }`}
                >
                  {uploading ? (
                    <>上传中...</>
                  ) : (
                    <>
                      <Upload size={18} />
                      确认上传
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
