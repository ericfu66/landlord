import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GroupChatPage from '@/app/game/group-chat/page'

describe('group chat page', () => {
  it('renders group chat title and input', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)) as unknown as typeof fetch)

    render(<GroupChatPage />)
    expect(screen.getByText('公寓群聊')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('输入消息...')).toBeInTheDocument()
  })
})
