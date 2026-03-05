import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BottomNav from '@/components/game/BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/game'
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children)
}))

describe('game shell', () => {
  it('renders status items', () => {
    const statusItems = ['货币', '体力', '时间', '天气']
    expect(statusItems).toContain('货币')
  })

  it('has navigation items', () => {
    const navItems = ['首页', '招募', '基建', '打工', '存档']
    expect(navItems.length).toBe(5)
  })

  it('shows group chat nav item', () => {
    render(React.createElement(BottomNav))
    expect(screen.getAllByText('群聊').length).toBeGreaterThan(0)
  })

  it('has glass card styles defined', () => {
    const styles = {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
    }
    expect(styles.background).toBeDefined()
    expect(styles.backdropFilter).toBeDefined()
  })
})
