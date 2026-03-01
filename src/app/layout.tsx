import type { Metadata } from 'next'
import { Noto_Serif_SC, Playfair_Display } from 'next/font/google'
import './globals.css'

const notoSerifSC = Noto_Serif_SC({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  preload: true
})

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  preload: true
})

export const metadata: Metadata = {
  title: '房东模拟器',
  description: 'AI驱动的Galgame房东模拟器',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSerifSC.className} ${playfairDisplay.className}`}>{children}</body>
    </html>
  )
}