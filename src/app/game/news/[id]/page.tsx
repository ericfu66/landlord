import NewsDetailClient from './NewsDetailClient'

export default async function NewsDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <NewsDetailClient newsId={id} />
}
