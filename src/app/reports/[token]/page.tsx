'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Calendar, ExternalLink, FileText, Image, Video, MessageSquare } from 'lucide-react'

interface ReportData {
  advertiser: {
    id: string
    name: string
    logo_url?: string
  }
  period: {
    year: number
    month: number
    label: string
  }
  summary: {
    total_contents: number
    channel_breakdown: Record<string, number>
  }
  timeline: {
    id: string
    title: string
    scheduled_at: string
    channels: string[]
    published_url?: Record<string, string> | null
  }[]
  marketer_comment?: string
}

const CHANNEL_ICONS: Record<string, typeof FileText> = {
  '블로그': FileText,
  'blog': FileText,
  '인스타그램': Image,
  'instagram': Image,
  '스레드': MessageSquare,
  'threads': MessageSquare,
  '유튜브': Video,
  'youtube': Video,
}

const CHANNEL_COLORS: Record<string, string> = {
  '블로그': 'bg-green-100 text-green-700',
  'blog': 'bg-green-100 text-green-700',
  '인스타그램': 'bg-pink-100 text-pink-700',
  'instagram': 'bg-pink-100 text-pink-700',
  '스레드': 'bg-gray-100 text-gray-700',
  'threads': 'bg-gray-100 text-gray-700',
  '유튜브': 'bg-red-100 text-red-700',
  'youtube': 'bg-red-100 text-red-700',
}

function normalizeChannel(ch: string): string {
  if (ch.startsWith('blog')) return '블로그'
  if (ch === 'instagram') return '인스타그램'
  if (ch === 'threads') return '스레드'
  if (ch === 'youtube') return '유튜브'
  return ch
}

export default function ReportViewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // URL 쿼리에서 리포트 데이터 복원 (실제 구현에서는 DB에서 조회)
    const dataParam = searchParams.get('data')
    if (dataParam) {
      try {
        const decoded = JSON.parse(atob(dataParam))
        setReportData(decoded)
      } catch (e) {
        setError('리포트 데이터를 불러올 수 없습니다.')
      }
    } else {
      setError('리포트 데이터가 없습니다.')
    }
    setLoading(false)
  }, [searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-muted-foreground">리포트 로딩 중...</div>
      </div>
    )
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || '리포트를 찾을 수 없습니다.'}</p>
        </div>
      </div>
    )
  }

  const channelEntries = Object.entries(reportData.summary.channel_breakdown)

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* 헤더 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {reportData.advertiser.logo_url ? (
              <img
                src={reportData.advertiser.logo_url}
                alt={reportData.advertiser.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold">
                {reportData.advertiser.name[0]}
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">[위즈더플래닝]</p>
              <h1 className="font-bold text-lg">
                {reportData.period.month}월 마케팅 활동 보고서
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 요약 카드 */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span> 활동 요약
          </h2>

          <div className="text-center py-6">
            <p className="text-4xl font-bold text-indigo-600">
              {reportData.summary.total_contents}
              <span className="text-base font-normal text-muted-foreground ml-1">건</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              총 발행 콘텐츠
            </p>
          </div>

          {channelEntries.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {channelEntries.map(([channel, count]) => {
                const Icon = CHANNEL_ICONS[channel] || FileText
                const colorClass = CHANNEL_COLORS[channel] || 'bg-gray-100 text-gray-700'

                return (
                  <div
                    key={channel}
                    className={`flex items-center gap-3 p-3 rounded-xl ${colorClass.split(' ')[0]}`}
                  >
                    <div className={`p-2 rounded-lg bg-white/50`}>
                      <Icon className={`h-5 w-5 ${colorClass.split(' ')[1]}`} />
                    </div>
                    <div>
                      <p className={`font-bold text-lg ${colorClass.split(' ')[1]}`}>{count}건</p>
                      <p className="text-xs opacity-80">{channel}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 발행 히스토리 */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span> 발행 히스토리
          </h2>

          {reportData.timeline.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              이번 달 발행된 콘텐츠가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {reportData.timeline.map((item, index) => {
                const date = new Date(item.scheduled_at)
                const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`
                const hasUrl = item.published_url && Object.keys(item.published_url).length > 0

                return (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="shrink-0 w-12 text-center">
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                      </p>
                      <p className="font-bold text-lg">{formattedDate}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.channels.map((ch, idx) => {
                          const normalized = normalizeChannel(ch)
                          const colorClass = CHANNEL_COLORS[normalized] || CHANNEL_COLORS[ch] || 'bg-gray-100 text-gray-600'

                          return (
                            <span
                              key={idx}
                              className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}
                            >
                              {normalized}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    {hasUrl && (
                      <button
                        onClick={() => {
                          const url = Object.values(item.published_url!)[0]
                          if (url) window.open(url, '_blank')
                        }}
                        className="shrink-0 p-2 rounded-lg hover:bg-white text-indigo-600"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 마케터 코멘트 */}
        {reportData.marketer_comment && (
          <section className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl shadow-sm p-6 text-white">
            <h2 className="font-bold mb-2 flex items-center gap-2">
              <span>💬</span> 담당자 코멘트
            </h2>
            <p className="text-sm opacity-90 whitespace-pre-wrap">
              {reportData.marketer_comment}
            </p>
          </section>
        )}

        {/* 푸터 */}
        <footer className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            다음 달도 최선을 다하겠습니다. 🙏
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            © {new Date().getFullYear()} 위즈더플래닝
          </p>
        </footer>
      </main>
    </div>
  )
}
