'use client'

import React, { useState } from 'react'
import { GroupChatSummary } from '@/types/group-chat'

interface SummaryManagerProps {
  summaries: GroupChatSummary[]
  onRestart: () => Promise<void>
  onSaveSelection: (ids: number[]) => Promise<void>
}

export default function SummaryManager({ summaries, onRestart, onSaveSelection }: SummaryManagerProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>(() => 
    summaries.filter((item) => item.selected && item.id).map((item) => item.id as number)
  )
  const [isRestarting, setIsRestarting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 当summaries变化时更新本地状态
  React.useEffect(() => {
    setSelectedIds(summaries.filter((item) => item.selected && item.id).map((item) => item.id as number))
  }, [summaries])

  const handleToggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleRestart = async () => {
    setIsRestarting(true)
    try {
      await onRestart()
    } finally {
      setIsRestarting(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSaveSelection(selectedIds)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">📋 总结管理</h3>
        <button
          type="button"
          className="rounded-md bg-slate-700 px-2 py-1 text-xs text-white hover:bg-slate-600 disabled:opacity-60 transition-colors"
          onClick={handleRestart}
          disabled={isRestarting}
        >
          {isRestarting ? '处理中...' : '重启对话'}
        </button>
      </div>

      {summaries.length === 0 ? (
        <div className="text-xs text-slate-500 py-2">
          暂无历史总结，聊天记录会自动积累
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-40 overflow-auto">
            {summaries.map((item) => (
              <label 
                key={item.id} 
                className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer hover:bg-slate-800/50 p-1.5 rounded transition-colors"
              >
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(item.id || 0)}
                  onChange={() => item.id && handleToggle(item.id)}
                  className="mt-0.5 accent-amber-500"
                />
                <div className="flex-1">
                  <div className="text-slate-400 text-[10px] mb-0.5">
                    消息范围 #{item.messageRange}
                  </div>
                  <div className="text-slate-200 leading-relaxed">
                    {item.summaryContent}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <button
            type="button"
            className="w-full rounded-md bg-amber-500 px-2 py-1.5 text-xs text-black font-medium hover:bg-amber-400 disabled:opacity-60 transition-colors"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存选择'}
          </button>
        </>
      )}
      
      <div className="text-[10px] text-slate-500">
        提示：重启对话会将历史消息生成AI总结，并清空上下文窗口
      </div>
    </div>
  )
}
