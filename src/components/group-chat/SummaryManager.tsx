'use client'

import React from 'react'
import { GroupChatSummary } from '@/types/group-chat'

interface SummaryManagerProps {
  summaries: GroupChatSummary[]
  onRestart: () => Promise<void>
  onSaveSelection: (ids: number[]) => Promise<void>
}

export default function SummaryManager({ summaries, onRestart, onSaveSelection }: SummaryManagerProps) {
  const selectedIds = summaries.filter((item) => item.selected && item.id).map((item) => item.id as number)

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">总结管理</h3>
        <button
          type="button"
          className="rounded-md bg-slate-700 px-2 py-1 text-xs text-white"
          onClick={onRestart}
        >
          重启对话
        </button>
      </div>

      <div className="space-y-2 max-h-40 overflow-auto">
        {summaries.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-xs text-slate-200">
            <input type="checkbox" checked={item.selected} readOnly />
            <span>{item.summaryContent}</span>
          </label>
        ))}
      </div>

      <button
        type="button"
        className="rounded-md bg-amber-500 px-2 py-1 text-xs text-black font-medium"
        onClick={() => onSaveSelection(selectedIds)}
      >
        保存选择
      </button>
    </div>
  )
}
