import type { Metadata } from 'next'
import { Noto_Serif_SC, Playfair_Display, ZCOOL_KuaiLe, Ma_Shan_Zheng } from 'next/font/google'
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

// Galgame style Chinese fonts
const zcoolKuaiLe = ZCOOL_KuaiLe({
  weight: '400',
  subsets: ['latin'],
  preload: false
})

const maShanZheng = Ma_Shan_Zheng({
  weight: '400',
  subsets: ['latin'],
  preload: false
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
      <body className={`${notoSerifSC.className} ${playfairDisplay.className} ${zcoolKuaiLe.className} ${maShanZheng.className}`}>{children}</body>
    </html>
  )
}