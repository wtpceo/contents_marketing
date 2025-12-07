'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Advertiser {
  id: string
  name: string
  logo_url: string | null
}

interface Content {
  id: string
  title: string
  body: string | null
  channel: string
  status: string
  images: string[]
  scheduled_at: string | null
  advertisers: Advertiser
}

interface PreviewContentProps {
  content: Content
  token: string
}

export default function PreviewContent({ content, token }: PreviewContentProps) {
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [action, setAction] = useState<'approved' | 'revision' | null>(null)

  const handleSubmit = async (type: 'approved' | 'revision') => {
    setIsSubmitting(true)
    setAction(type)

    try {
      const response = await fetch(`/api/preview/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type,
          message: feedback,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const channelLabels: Record<string, string> = {
    blog_naver: '네이버 블로그',
    blog_tistory: '티스토리',
    instagram: '인스타그램',
    facebook: '페이스북',
    youtube: '유튜브',
    linkedin: '링크드인',
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            action === 'approved' ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            {action === 'approved' ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {action === 'approved' ? '승인 완료!' : '수정 요청 완료!'}
          </h2>
          <p className="mt-2 text-gray-600">
            {action === 'approved'
              ? '콘텐츠가 승인되었습니다. 예약된 시간에 배포됩니다.'
              : '수정 요청이 전달되었습니다. 담당자가 확인 후 연락드리겠습니다.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {content.advertisers?.logo_url && (
              <Image
                src={content.advertisers.logo_url}
                alt={content.advertisers.name}
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
            <div>
              <p className="text-sm text-gray-500">콘텐츠 미리보기</p>
              <p className="font-medium text-gray-900">{content.advertisers?.name}</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            {channelLabels[content.channel] || content.channel}
          </span>
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* 이미지 */}
          {content.images && content.images.length > 0 && (
            <div className="relative aspect-video bg-gray-100">
              <Image
                src={content.images[0]}
                alt={content.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* 제목 및 본문 */}
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {content.title}
            </h1>

            {content.scheduled_at && (
              <p className="text-sm text-gray-500 mb-4">
                예약 배포: {new Date(content.scheduled_at).toLocaleString('ko-KR')}
              </p>
            )}

            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: content.body || '' }}
            />
          </div>
        </article>

        {/* 승인/수정 요청 폼 */}
        {content.status === 'pending_confirm' && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              콘텐츠 검토
            </h2>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="피드백이나 수정 요청 사항을 입력해주세요 (선택)"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => handleSubmit('approved')}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting && action === 'approved' ? '처리 중...' : '승인'}
              </button>
              <button
                onClick={() => handleSubmit('revision')}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting && action === 'revision' ? '처리 중...' : '수정 요청'}
              </button>
            </div>
          </div>
        )}

        {/* 이미 처리된 경우 */}
        {content.status !== 'pending_confirm' && (
          <div className="mt-8 bg-gray-100 rounded-lg p-6 text-center">
            <p className="text-gray-600">
              이 콘텐츠는 이미 처리되었습니다.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
