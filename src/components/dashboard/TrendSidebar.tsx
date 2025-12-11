"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Calendar, ChevronLeft, ChevronRight, Flame, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import * as React from "react"
import Link from "next/link"

// URL에 프로토콜이 없으면 https:// 추가
function ensureProtocol(url: string): string {
    if (!url) return url
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
    }
    return `https://${url}`
}

interface TrendTopic {
    id: string
    type: 'season' | 'realtime'
    title: string
    description: string | null
    reference_url: string | null
    event_date: string | null
    priority: number
    is_active: boolean
    dday?: number | null
}

export function TrendSidebar() {
    const [isOpen, setIsOpen] = React.useState(true)
    const [seasonTopics, setSeasonTopics] = React.useState<TrendTopic[]>([])
    const [realtimeTopics, setRealtimeTopics] = React.useState<TrendTopic[]>([])
    const [loading, setLoading] = React.useState(false)

    // 초기 데이터 로드
    React.useEffect(() => {
        if (isOpen) {
            fetchData()
        }
    }, [isOpen])

    const fetchData = async () => {
        setLoading(true)
        try {
            // trend_topics 테이블에서 활성화된 트렌드 조회
            const res = await fetch('/api/trend-topics?active_only=true')
            if (res.ok) {
                const data = await res.json()
                const all = data.data || []
                setSeasonTopics(all.filter((t: TrendTopic) => t.type === 'season'))
                setRealtimeTopics(all.filter((t: TrendTopic) => t.type === 'realtime'))
            }
        } catch (error) {
            console.error("데이터 로딩 실패:", error)
        } finally {
            setLoading(false)
        }
    }

    const getDdayBadge = (dday: number | null | undefined) => {
        if (dday === null || dday === undefined) return null
        if (dday === 0) return <Badge className="bg-red-500 text-white text-[10px]">D-Day</Badge>
        if (dday > 0) return <Badge variant="outline" className="text-[10px]">D-{dday}</Badge>
        return <Badge variant="secondary" className="text-[10px]">D+{Math.abs(dday)}</Badge>
    }

    return (
        <div
            className={cn(
                "border-l bg-white transition-all duration-300 ease-in-out hidden xl:block h-full relative",
                isOpen ? "w-80 p-4" : "w-12"
            )}
        >
            <Button
                variant="ghost"
                size="icon"
                className="absolute -left-3 top-4 h-6 w-6 rounded-full border bg-white shadow-md z-10 hover:bg-gray-100"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>

            <div className={cn("space-y-6 h-full overflow-y-auto", !isOpen && "hidden")}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <h2 className="font-bold text-lg">기획 도우미</h2>
                    </div>
                    <Link href="/settings/trends">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                            관리
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        {/* 시즌 이슈 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <h3 className="text-sm font-semibold text-muted-foreground">다가오는 시즌 이슈</h3>
                            </div>

                            {seasonTopics.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/30 rounded-lg">
                                    등록된 시즌 이슈가 없습니다.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {seasonTopics.slice(0, 5).map((topic) => (
                                        <Card
                                            key={topic.id}
                                            className="bg-blue-50/50 border-blue-100 hover:border-blue-300 transition-colors cursor-pointer group"
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData("text/plain", topic.title)
                                                e.dataTransfer.effectAllowed = "copy"
                                            }}
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium group-hover:text-blue-600 transition-colors truncate">
                                                            {topic.title}
                                                        </p>
                                                        {topic.description && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                                {topic.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {getDdayBadge(topic.dday)}
                                                        {topic.reference_url && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    window.open(ensureProtocol(topic.reference_url!), '_blank')
                                                                }}
                                                                className="p-1 hover:bg-blue-100 rounded"
                                                            >
                                                                <ExternalLink className="h-3 w-3 text-blue-500" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 실시간 트렌드 */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Flame className="h-4 w-4 text-orange-500" />
                                <h3 className="text-sm font-semibold text-muted-foreground">실시간 트렌드 소재</h3>
                            </div>

                            {realtimeTopics.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/30 rounded-lg">
                                    등록된 트렌드가 없습니다.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {realtimeTopics.slice(0, 10).map((topic, idx) => (
                                        <div
                                            key={topic.id}
                                            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData("text/plain", topic.title)
                                                e.dataTransfer.effectAllowed = "copy"
                                            }}
                                        >
                                            {/* 순위 */}
                                            <div className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                                idx < 3
                                                    ? "bg-gradient-to-br from-orange-400 to-red-500 text-white"
                                                    : "bg-gray-100 text-gray-600"
                                            )}>
                                                {idx + 1}
                                            </div>

                                            {/* 제목 및 설명 */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate group-hover:text-orange-600 transition-colors">
                                                    {topic.title}
                                                </p>
                                                {topic.description && (
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {topic.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* 링크 */}
                                            {topic.reference_url && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        window.open(ensureProtocol(topic.reference_url!), '_blank')
                                                    }}
                                                    className="p-1 hover:bg-orange-100 rounded shrink-0"
                                                >
                                                    <ExternalLink className="h-3 w-3 text-orange-500" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 팁 */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg text-xs text-blue-800 border border-blue-100">
                            <p>💡 <strong>팁:</strong> 트렌드를 캘린더 날짜로 드래그하면 자동으로 기획안이 생성됩니다.</p>
                        </div>
                    </>
                )}
            </div>

            {!isOpen && (
                <div className="flex flex-col items-center pt-16 gap-4">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <div className="h-px w-4 bg-gray-200" />
                    <span className="text-xs text-muted-foreground bg-gray-100 rounded px-1 py-0.5 writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>기획 도우미</span>
                </div>
            )}
        </div>
    )
}
