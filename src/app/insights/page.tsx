"use client"

import { AppLayout } from "@/components/layout/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, ArrowUpRight, ExternalLink } from "lucide-react"

const TRENDS = [
    { id: 1, keyword: "2025 마케팅 트렌드", category: "Marketing", growth: "+125%" },
    { id: 2, keyword: "생성형 AI 활용법", category: "Tech", growth: "+89%" },
    { id: 3, keyword: "숏폼 콘텐츠 전략", category: "Social", growth: "+62%" },
    { id: 4, keyword: "친환경 패키징", category: "ESG", growth: "+45%" },
]

const NEWS = [
    { id: 1, title: "인스타그램, 새로운 릴스 알고리즘 발표", source: "Social Media Today", date: "2시간 전" },
    { id: 2, title: "MZ세대가 주목하는 올겨울 패션 트렌드 5", source: "Fashion Biz", date: "4시간 전" },
    { id: 3, title: "구글, 검색 광고 효율화 가이드라인 업데이트", source: "Search Engine Land", date: "1일 전" },
]

export default function InsightsPage() {
    return (
        <AppLayout>
            <div className="flex flex-col h-full">
                <header className="flex h-14 items-center border-b bg-muted/40 px-6 lg:h-[60px]">
                    <h1 className="text-lg font-semibold">인사이트 & 트렌드</h1>
                </header>
                <div className="flex-1 overflow-auto p-6 space-y-6">

                    {/* Trending Keywords */}
                    <section>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-red-500" />
                            급상승 키워드
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {TRENDS.map(trend => (
                                <Card key={trend.id} className="bg-gradient-to-br from-white to-red-50/50 border-red-100">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="secondary" className="bg-white">{trend.category}</Badge>
                                            <span className="text-red-500 font-bold text-sm flex items-center">
                                                {trend.growth}
                                                <ArrowUpRight className="h-3 w-3 ml-0.5" />
                                            </span>
                                        </div>
                                        <CardTitle className="text-base mt-2">{trend.keyword}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                                            이 소재로 만들기
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Industry News */}
                    <section>
                        <h2 className="text-lg font-semibold mb-4">산업 뉴스</h2>
                        <Card>
                            <CardContent className="p-0">
                                <div className="divide-y">
                                    {NEWS.map(news => (
                                        <div key={news.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                            <div>
                                                <h3 className="font-medium hover:underline cursor-pointer">{news.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {news.source} • {news.date}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="icon">
                                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                </div>
            </div>
        </AppLayout>
    )
}
