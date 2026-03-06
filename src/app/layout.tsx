import type { Metadata, Viewport } from 'next'
import { Noto_Serif_SC, Playfair_Display, ZCOOL_KuaiLe, Ma_Shan_Zheng } from 'next/font/google'
import './globals.css'

const notoSerifSC = Noto_Serif_SC({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  preload: true,
  display: 'swap',
  variable: '--font-noto-serif',
})

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  preload: true,
  display: 'swap',
  variable: '--font-playfair',
})

const zcoolKuaiLe = ZCOOL_KuaiLe({
  weight: '400',
  subsets: ['latin'],
  preload: false,
  display: 'swap',
  variable: '--font-zcool',
})

const maShanZheng = Ma_Shan_Zheng({
  weight: '400',
  subsets: ['latin'],
  preload: false,
  display: 'swap',
  variable: '--font-mashan',
})

export const metadata: Metadata = {
  title: '房东模拟器',
  description: 'AI驱动的Galgame房东模拟器',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a12',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={`${notoSerifSC.variable} ${playfairDisplay.variable} ${zcoolKuaiLe.variable} ${maShanZheng.variable}`}>
      <body className={notoSerifSC.className}>{children}</body>
    </html>
  )
}
