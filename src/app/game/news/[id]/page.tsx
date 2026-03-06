import NewsDetailClient from './NewsDetailClient'

export default function NewsDetailPage({
  params
}: {
  params: { id: string }
}) {
  return <NewsDetailClient newsId={params.id} />
}