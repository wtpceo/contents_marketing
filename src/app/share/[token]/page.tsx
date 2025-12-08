"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"
import {
  Calendar,
  FileText,
  Instagram,
  Hash,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  MessageSquare,
  Lightbulb
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Topic {
  id: string
  date: string
  title: string
  description: string
  channels: string[]
  channel_names: string[]
  status: string
  planning_intent: string
}

interface ProposalData {
  proposal: {
    id: string
    title: string
    description: string
    target_month: string
    status: string
    created_at: string
  }
  advertiser: {
    id: string
    name: string
    industry: string
    logo_url: string | null
  }
  topics: Topic[]
  summary: {
    total_count: number
    channels_count: Record<string, number>
    month_label: string
  }
}

const channelConfig: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  blog: { icon: FileText, color: "text-green-700", bg: "bg-green-100" },
  blog_naver: { icon: FileText, color: "text-green-700", bg: "bg-green-100" },
  instagram: { icon: Instagram, color: "text-pink-700", bg: "bg-pink-100" },
  threads: { icon: Hash, color: "text-gray-700", bg: "bg-gray-100" },
}

export default function SharePage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ProposalData | null>(null)

  useEffect(() => {
    if (!token) return

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/proposals/preview/${token}`)
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || "데이터를 불러올 수 없습니다.")
        }
        const result = await res.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token])

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">기획안을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">접근할 수 없습니다</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { proposal, advertiser, topics, summary } = data

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-purple-100 px-4 py-4 safe-area-top">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            {advertiser.logo_url ? (
              <img
                src={advertiser.logo_url}
                alt={advertiser.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-purple-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                {advertiser.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-gray-900">{advertiser.name}</h1>
              <p className="text-xs text-gray-500">{advertiser.industry}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-lg mx-auto">
        {/* Intro Section */}
        <section className="mb-6">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <Calendar className="h-8 w-8 mb-3 opacity-80" />
            <h2 className="text-xl font-bold mb-2">
              {summary.month_label} 콘텐츠 기획안
            </h2>
            <p className="text-purple-100 text-sm">
              {advertiser.name}님을 위해 준비한 {summary.total_count}개의 콘텐츠 기획입니다.
            </p>
          </div>
        </section>

        {/* Process Info Section */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  현재 단계: 주제 선정
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  본 기획안은 <span className="font-medium">콘텐츠 주제 선정 단계</span>입니다.
                  주제가 확정되면, 실제 콘텐츠 본문이 작성된 후 한 번 더 컨펌 요청을 드릴 예정입니다.
                </p>
              </div>
            </div>
            {/* Progress Indicator */}
            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <span className="text-xs font-medium text-blue-700">주제 선정</span>
              </div>
              <div className="flex-1 h-0.5 bg-blue-200 rounded"></div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xs font-bold">2</span>
                </div>
                <span className="text-xs text-gray-400">본문 컨펌</span>
              </div>
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="mb-6">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex-shrink-0 bg-white rounded-xl px-4 py-3 shadow-sm border border-purple-100">
              <p className="text-2xl font-bold text-purple-600">{summary.total_count}</p>
              <p className="text-xs text-gray-500">전체 콘텐츠</p>
            </div>
            {Object.entries(summary.channels_count).map(([channel, count]) => {
              const config = channelConfig[channel] || channelConfig.blog
              const Icon = config.icon
              return (
                <div key={channel} className="flex-shrink-0 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", config.color)} />
                    <p className="text-2xl font-bold text-gray-800">{count}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {channel === 'blog' || channel === 'blog_naver' ? '블로그' :
                     channel === 'instagram' ? '인스타그램' :
                     channel === 'threads' ? '스레드' : channel}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Topics List */}
        <section className="space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-600" />
            콘텐츠 상세
          </h3>

          {topics.map((topic, index) => (
            <TopicCard key={topic.id} topic={topic} index={index + 1} />
          ))}
        </section>

        {/* Footer Actions - 추후 승인/반려 기능용 공간 확보 */}
        <section className="mt-10 pt-6 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-4">
              기획안에 대한 피드백이 있으시면<br />담당자에게 연락해 주세요.
            </p>
            {/* 추후 승인/반려 버튼 추가 예정 */}
            {/*
            <div className="flex gap-3 justify-center">
              <button className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-medium">
                <CheckCircle2 className="h-5 w-5" />
                승인하기
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium">
                <XCircle className="h-5 w-5" />
                피드백 남기기
              </button>
            </div>
            */}
          </div>
        </section>

        {/* Powered By */}
        <footer className="mt-8 text-center pb-8">
          <p className="text-xs text-gray-400">
            Powered by WCE Content Marketing
          </p>
        </footer>
      </main>
    </div>
  )
}

// Topic Card Component
function TopicCard({ topic, index }: { topic: Topic; index: number }) {
  const date = parseISO(topic.date)
  const formattedDate = format(date, "M월 d일 (EEE)", { locale: ko })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
            #{index}
          </span>
          <span className="text-sm font-medium text-gray-700">{formattedDate}</span>
        </div>
        <div className="flex gap-1">
          {topic.channels.map((channel) => {
            const config = channelConfig[channel] || channelConfig.blog
            const Icon = config.icon
            return (
              <span
                key={channel}
                className={cn("p-1.5 rounded-lg", config.bg)}
                title={topic.channel_names[topic.channels.indexOf(channel)]}
              >
                <Icon className={cn("h-3.5 w-3.5", config.color)} />
              </span>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-bold text-gray-900 text-lg mb-3 leading-snug">
          {topic.title}
        </h4>

        {/* 기획 의도 (Why) Section */}
        {topic.planning_intent && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-100">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-1">
                  이 콘텐츠가 왜 필요한가요?
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">
                  {topic.planning_intent}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {topic.description && !topic.planning_intent && (
          <p className="text-sm text-gray-600 leading-relaxed">
            {topic.description}
          </p>
        )}
      </div>
    </div>
  )
}
