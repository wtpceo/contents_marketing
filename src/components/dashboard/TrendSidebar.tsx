"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Calendar, Zap, ChevronLeft, ChevronRight, RefreshCcw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import * as React from "react"
import { format } from "date-fns"
import { toast } from "sonner"

interface Trend {
    id: string
    keyword: string
    category?: string
    traffic?: string
    description?: string
}

interface SeasonalIssue {
    id: string
    title: string
    date: string
    category: string
    is_holiday: boolean
}

export function TrendSidebar() {
    // We can use local state for simplicity, or lift it up if needed.
    // Given the requirement "expand calendar area", local state resizing width works perfectly in flex layout.
    const [isOpen, setIsOpen] = React.useState(true)
    const [trends, setTrends] = React.useState<Trend[]>([])
    const [seasonalIssues, setSeasonalIssues] = React.useState<SeasonalIssue[]>([])
    const [loading, setLoading] = React.useState(false)
    const [refreshing, setRefreshing] = React.useState(false)

    // 초기 데이터 로드
    React.useEffect(() => {
        if (isOpen) {
            fetchData()
        }
    }, [isOpen]) // Open될 때 로드

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. 시즌 이슈 (마케팅 이벤트)
            const today = new Date()
            const monthStr = format(today, "yyyy-MM")
            const eventsRes = await fetch(`/api/marketing-events?month=${monthStr}&upcoming=30`)
            if (eventsRes.ok) {
                const eventsData = await eventsRes.json()
                setSeasonalIssues(eventsData)
            }

            // 2. 실시간 트렌드
            const trendsRes = await fetch(`/api/trends?month=${today.getMonth() + 1}`)
            if (trendsRes.ok) {
                const trendsData = await trendsRes.json()
                // API returns { seasonal, trending, ... }
                setTrends(trendsData.trending || [])
            }
        } catch (error) {
            console.error("데이터 로딩 실패:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            const res = await fetch('/api/trends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'refresh' })
            })

            if (res.ok) {
                toast.success("최신 트렌드를 가져왔습니다.")
                // 다시 로드
                const trendsRes = await fetch(`/api/trends?month=${new Date().getMonth() + 1}`)
                if (trendsRes.ok) {
                    const trendsData = await trendsRes.json()
                    setTrends(trendsData.trending || [])
                }
            } else {
                toast.error("갱신 실패")
            }
        } catch (error) {
            console.error(error)
            toast.error("오류가 발생했습니다.")
        } finally {
            setRefreshing(false)
        }
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
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h2 className="font-bold text-lg">기획 도우미</h2>
                </div>

                {/* Seasonal Issues */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-muted-foreground">다가오는 시즌 이슈</h3>
                        <Badge variant="secondary" className="text-xs">{new Date().getMonth() + 1}월</Badge>
                    </div>

                    {seasonalIssues.length === 0 && !loading && (
                        <div className="p-4 text-center text-xs text-muted-foreground bg-muted/30 rounded-lg">
                            예정된 이슈가 없습니다.
                        </div>
                    )}

                    {seasonalIssues.slice(0, 3).map((issue) => (
                        <Card key={issue.id} className="bg-muted/50 border-dashed hover:border-primary transition-colors cursor-pointer group">
                            <CardContent className="p-3 flex items-center gap-3">
                                <div className="bg-white p-2 rounded-full border">
                                    <Calendar className={cn("h-4 w-4", issue.is_holiday ? "text-red-500" : "text-blue-500")} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{issue.title}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(issue.date), "MM.dd")} ({issue.category})</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Real-time Trends */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-muted-foreground">실시간 트렌드 소재</h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            title="트렌드 갱신"
                        >
                            <RefreshCcw className={cn("h-3 w-3", refreshing && "animate-spin")} />
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {loading && trends.length === 0 ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            trends.slice(0, 10).map((trend) => (
                                <div
                                    key={trend.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData("text/plain", trend.keyword)
                                        e.dataTransfer.effectAllowed = "copy"
                                    }}
                                >
                                    <span className="text-sm font-medium truncate max-w-[180px]">{trend.keyword}</span>
                                    <Badge variant="outline" className="text-[10px] shrink-0">{trend.category || "Trend"}</Badge>
                                </div>
                            ))
                        )}
                        {!loading && trends.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground bg-muted/30 rounded-lg">
                                트렌드 데이터가 없습니다. <br /> 갱신 버튼을 눌러보세요.
                            </div>
                        )}
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800">
                        <p>💡 팁: 트렌드를 캘린더 날짜로 드래그하면 자동으로 기획안이 생성됩니다.</p>
                    </div>
                </div>
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
