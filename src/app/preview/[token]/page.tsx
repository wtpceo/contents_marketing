import { notFound } from 'next/navigation'
import MockPreviewContent from './mock-preview-content'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function PreviewPage({ params }: PageProps) {
  const { token } = await params

  // Mock content for preview
  const content = {
    title: "2025년 마케팅 트렌드 분석",
    body: "<p>2025년 마케팅의 핵심은 <strong>AI 자동화</strong>와 <strong>초개인화</strong>입니다. 고객의 행동 데이터를 실시간으로 분석하여...</p>",
    channel: "Blog",
    status: "pending_confirm",
    scheduled_at: new Date().toISOString()
  }

  if (!content) {
    notFound()
  }

  return <MockPreviewContent content={content} token={token} />
}
