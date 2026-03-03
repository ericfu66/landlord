import BuildPanel from '@/components/panels/BuildPanel'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '基建管理 - 房东模拟器',
  description: '管理你的房产，建造和装修房间',
}

export default function BuildingPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BuildPanel />
    </div>
  )
}
