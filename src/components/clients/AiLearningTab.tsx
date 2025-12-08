import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Sparkles, Link as LinkIcon, CheckCircle2, AlertCircle, Trophy, Users, Star, Lightbulb, RefreshCw, Database, Palette, MapPin, Clock, Phone, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AiLearningTabProps {
    clientId: string
    advancedProfile?: any
    onUpdate?: (updatedProfile: any) => void
    onRefresh?: () => void
}

const LOADING_MESSAGES = [
    "AI가 네이버 플레이스 리뷰를 읽고 있습니다...",
    "고객들의 방문 후기를 분석 중입니다...",
    "인스타그램의 시각적 무드를 파악하고 있습니다...",
    "브랜드의 핵심 키워드를 추출하는 중입니다...",
    "마케팅 페르소나를 생성하고 있습니다...",
    "데이터를 종합하여 상세 리포트를 작성 중입니다..."
]

export function AiLearningTab({ clientId, advancedProfile, onUpdate, onRefresh }: AiLearningTabProps) {
    const [naverUrl, setNaverUrl] = useState('')
    const [instaUrl, setInstaUrl] = useState('')
    const [homeUrl, setHomeUrl] = useState('')

    // 리브랜딩 모드 상태
    const [rebrandingMode, setRebrandingMode] = useState(false)
    const [benchmarkUrl, setBenchmarkUrl] = useState('')

    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [progressMessage, setProgressMessage] = useState(LOADING_MESSAGES[0])
    const [msgIndex, setMsgIndex] = useState(0)

    // Message Rotation Effect
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isAnalyzing) {
            interval = setInterval(() => {
                setMsgIndex(prev => {
                    const next = (prev + 1) % LOADING_MESSAGES.length
                    setProgressMessage(LOADING_MESSAGES[next])
                    return next
                })
            }, 3000)
        } else {
            setMsgIndex(0)
        }
        return () => clearInterval(interval)
    }, [isAnalyzing])

    const handlePaste = async (setter: (val: string) => void) => {
        try {
            const text = await navigator.clipboard.readText()
            setter(text)
            toast.success("클립보드에서 붙여넣었습니다.")
        } catch (err) {
            toast.error("클립보드 접근 권한이 필요합니다.")
        }
    }

    const pollStatus = async () => {
        const MAX_ATTEMPTS = 200 // 10 minutes with 3s interval
        let attempts = 0

        const check = async () => {
            if (attempts >= MAX_ATTEMPTS) {
                setIsAnalyzing(false)
                toast.error("시간이 초과되었습니다.", { description: "나중에 다시 확인해주세요." })
                return
            }
            attempts++

            try {
                const res = await fetch(`/api/advertisers/sync?advertiser_id=${clientId}`)
                const data = await res.json()

                if (data.status === 'completed') {
                    setIsAnalyzing(false)
                    toast.success("광고주 분석이 완료되었습니다!")

                    // Refresh parent data
                    if (onRefresh) onRefresh()

                    // Also update local profile if provided directly
                    if (data.advanced_profile && onUpdate) onUpdate(data.advanced_profile)

                } else if (data.status === 'failed') {
                    setIsAnalyzing(false)
                    toast.error("분석에 실패했습니다.", { description: data.error })
                } else {
                    // Continue polling
                    setTimeout(check, 3000)
                }
            } catch (e) {
                console.error("Polling Error:", e)
                // Don't stop on single network error, maybe wait and retry?
                // For simplicity, continue
                setTimeout(check, 3000)
            }
        }

        check()
    }

    const handleAnalyze = async () => {
        // 리브랜딩 모드에서는 벤치마킹 URL이 필수
        if (rebrandingMode && !benchmarkUrl) {
            toast.error("리브랜딩 모드에서는 벤치마킹 URL이 필요합니다.")
            return
        }

        // 일반 모드에서는 최소 하나의 URL 필요
        if (!rebrandingMode && !naverUrl && !instaUrl && !homeUrl) {
            toast.error("최소 하나의 링크를 입력해주세요.")
            return
        }

        setIsAnalyzing(true)
        try {
            // 1. Trigger Sync with rebranding options
            const response = await fetch('/api/advertisers/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    advertiser_id: clientId,
                    naver_url: naverUrl,
                    insta_url: instaUrl,
                    home_url: homeUrl,
                    rebranding_mode: rebrandingMode,
                    benchmark_url: benchmarkUrl
                })
            })

            const text = await response.text();
            console.log("Sync API Response:", response.status, text);

            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error("JSON Parse Error:", e)
                throw new Error("서버 응답이 올바르지 않습니다.")
            }

            if (!response.ok) {
                let detailMsg = ""
                if (data.details && Array.isArray(data.details)) {
                    detailMsg = data.details.map((d: string) => `• ${d}`).join('\n')
                }
                const combinedMsg = (data.error || "요청 실패") + (detailMsg ? `\n\n${detailMsg}` : "")
                throw new Error(combinedMsg)
            }

            toast.info("분석이 시작되었습니다.", { description: "잠시만 기다려주세요..." })

            // 2. Start Polling
            pollStatus()

        } catch (error) {
            console.error("Analysis Error:", error)
            toast.error("분석 실패", {
                description: error instanceof Error ? error.message : "알 수 없는 오류",
                duration: 8000, // Longer duration to read details
            })
            setIsAnalyzing(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card className="border-purple-100 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-white pb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <CardTitle className="text-purple-900">AI 스마트 임포트</CardTitle>
                    </div>
                    <CardDescription className="text-purple-700/80">
                        운영 중인 채널의 링크만 입력하세요. AI가 고객 리뷰와 브랜드 분위기를 자동으로 학습합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {/* Input Group */}
                    <div className="grid gap-5">
                        <div className="space-y-2">
                            <Label className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span className="text-green-600 font-bold">N</span> 네이버 플레이스
                                </span>
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="예: https://map.naver.com/p/entry/place/12345678"
                                    value={naverUrl}
                                    onChange={(e) => setNaverUrl(e.target.value)}
                                    className="bg-white"
                                />
                                <Button variant="outline" onClick={() => handlePaste(setNaverUrl)}>붙여넣기</Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span className="text-pink-600 font-bold">Instagram</span> 인스타그램
                                </span>
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="https://instagram.com/..."
                                    value={instaUrl}
                                    onChange={(e) => setInstaUrl(e.target.value)}
                                    className="bg-white"
                                />
                                <Button variant="outline" onClick={() => handlePaste(setInstaUrl)}>붙여넣기</Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4" /> 홈페이지/블로그
                                </span>
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="https://..."
                                    value={homeUrl}
                                    onChange={(e) => setHomeUrl(e.target.value)}
                                    className="bg-white"
                                />
                                <Button variant="outline" onClick={() => handlePaste(setHomeUrl)}>붙여넣기</Button>
                            </div>
                        </div>
                    </div>

                    {/* Rebranding Mode Section */}
                    <div className="pt-4 border-t border-dashed border-purple-200">
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="rebrandingMode"
                                checked={rebrandingMode}
                                onCheckedChange={(checked) => setRebrandingMode(checked === true)}
                                className="mt-0.5"
                            />
                            <div className="flex-1">
                                <Label
                                    htmlFor="rebrandingMode"
                                    className="cursor-pointer flex items-center gap-2 font-medium text-purple-800"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    리브랜딩 모드
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    기존 스타일(톤앤매너, 키워드, 감성)을 무시하고 벤치마킹 대상의 스타일로 새로 설정합니다.
                                    <br />
                                    <span className="text-purple-600 font-medium">팩트 데이터(메뉴, 가격, 주소 등)는 그대로 유지됩니다.</span>
                                </p>
                            </div>
                        </div>

                        {/* Benchmark URL Input - shown when rebranding mode is on */}
                        {rebrandingMode && (
                            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label className="flex items-center gap-2 mb-2 text-purple-800">
                                    <Sparkles className="h-4 w-4" />
                                    워너비 브랜드 URL
                                </Label>
                                <p className="text-xs text-purple-600 mb-3">
                                    벤치마킹하고 싶은 브랜드의 인스타그램이나 블로그 URL을 입력하세요.
                                    해당 브랜드의 톤앤매너와 콘텐츠 스타일을 학습합니다.
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="예: https://instagram.com/benchmark_brand"
                                        value={benchmarkUrl}
                                        onChange={(e) => setBenchmarkUrl(e.target.value)}
                                        className="bg-white border-purple-200 focus:border-purple-400"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => handlePaste(setBenchmarkUrl)}
                                        className="border-purple-200 hover:bg-purple-100"
                                    >
                                        붙여넣기
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Button & Progress */}
                    <div className="pt-4 border-t">
                        {isAnalyzing ? (
                            <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-100 animate-pulse">
                                <div className="flex items-center justify-center gap-3 text-purple-700">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="font-semibold text-sm">{progressMessage}</span>
                                </div>
                                <div className="h-1.5 w-full bg-purple-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 transition-all duration-1000 ease-in-out"
                                        style={{ width: `${((msgIndex + 1) / LOADING_MESSAGES.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <Button
                                size="lg"
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-md h-12"
                                onClick={handleAnalyze}
                            >
                                <Sparkles className="mr-2 h-5 w-5" />
                                데이터 가져오기 및 분석 시작
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Result Display - Fact/Style 분리 구조 */}
            {advancedProfile && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <h3 className="font-bold text-lg">AI 학습 데이터</h3>
                        </div>
                        {advancedProfile.meta?.is_rebranded && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                리브랜딩됨
                            </Badge>
                        )}
                    </div>

                    {/* Meta Info */}
                    {advancedProfile.meta && (
                        <div className="text-xs text-muted-foreground flex items-center gap-4">
                            {advancedProfile.meta.synced_at && (
                                <span>마지막 동기화: {new Date(advancedProfile.meta.synced_at).toLocaleString('ko-KR')}</span>
                            )}
                            {advancedProfile.meta.sync_count > 0 && (
                                <span>동기화 횟수: {advancedProfile.meta.sync_count}회</span>
                            )}
                            {advancedProfile.meta.rebranding_source && (
                                <span className="text-purple-600">벤치마킹: {advancedProfile.meta.rebranding_source}</span>
                            )}
                        </div>
                    )}

                    {/* ==================== FACT DATA SECTION ==================== */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                            <Database className="h-5 w-5 text-slate-600" />
                            <h4 className="font-semibold text-slate-800">팩트 데이터</h4>
                            <Badge variant="outline" className="text-xs bg-slate-50 border-slate-200 text-slate-600 ml-2">
                                변경 불가
                            </Badge>
                        </div>

                        {advancedProfile.facts ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Business Info Card */}
                                <Card className="border-l-4 border-l-slate-400">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-slate-500" />
                                            기본 정보
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        {advancedProfile.facts.business_name && (
                                            <div>
                                                <span className="text-muted-foreground">상호명:</span>
                                                <span className="ml-2 font-medium">{advancedProfile.facts.business_name}</span>
                                            </div>
                                        )}
                                        {advancedProfile.facts.category && (
                                            <div>
                                                <span className="text-muted-foreground">업종:</span>
                                                <span className="ml-2">{advancedProfile.facts.category}</span>
                                            </div>
                                        )}
                                        {advancedProfile.facts.address && (
                                            <div>
                                                <span className="text-muted-foreground">주소:</span>
                                                <span className="ml-2">{advancedProfile.facts.address}</span>
                                            </div>
                                        )}
                                        {advancedProfile.facts.contact && (
                                            <div className="flex items-center gap-1">
                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-muted-foreground">연락처:</span>
                                                <span className="ml-1">{advancedProfile.facts.contact}</span>
                                            </div>
                                        )}
                                        {advancedProfile.facts.business_hours && (
                                            <div className="flex items-start gap-1">
                                                <Clock className="h-3 w-3 text-muted-foreground mt-0.5" />
                                                <span className="text-muted-foreground">영업시간:</span>
                                                <span className="ml-1">{advancedProfile.facts.business_hours}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Rating & Reviews */}
                                {(advancedProfile.facts.rating || advancedProfile.facts.review_count) && (
                                    <Card className="border-l-4 border-l-amber-400">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Star className="h-4 w-4 text-amber-500" />
                                                평점 & 리뷰
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center gap-4">
                                                {advancedProfile.facts.rating && (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                                                        <span className="text-2xl font-bold text-amber-600">{advancedProfile.facts.rating}</span>
                                                    </div>
                                                )}
                                                {advancedProfile.facts.review_count > 0 && (
                                                    <span className="text-sm text-muted-foreground">
                                                        리뷰 {advancedProfile.facts.review_count.toLocaleString()}개
                                                    </span>
                                                )}
                                            </div>
                                            {advancedProfile.facts.review_highlights?.length > 0 && (
                                                <div>
                                                    <span className="text-xs text-muted-foreground block mb-2">리뷰 하이라이트</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {advancedProfile.facts.review_highlights.slice(0, 5).map((h: string, i: number) => (
                                                            <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Menu/Products */}
                                {advancedProfile.facts.menus?.length > 0 && (
                                    <Card className="col-span-2">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">메뉴/상품</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid gap-2 md:grid-cols-3">
                                                {advancedProfile.facts.menus.slice(0, 9).map((menu: { name: string; price?: string }, i: number) => (
                                                    <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded text-sm">
                                                        <span>{menu.name}</span>
                                                        {menu.price && <span className="text-muted-foreground">{menu.price}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Facilities & Features */}
                                {(advancedProfile.facts.facilities?.length > 0 || advancedProfile.facts.unique_features?.length > 0) && (
                                    <Card className="col-span-2">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Trophy className="h-4 w-4 text-amber-500" />
                                                시설 & 특징
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {advancedProfile.facts.facilities?.length > 0 && (
                                                <div>
                                                    <span className="text-xs text-muted-foreground block mb-2">편의시설</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {advancedProfile.facts.facilities.map((f: string, i: number) => (
                                                            <Badge key={i} variant="outline" className="bg-slate-50">{f}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {advancedProfile.facts.unique_features?.length > 0 && (
                                                <div>
                                                    <span className="text-xs text-muted-foreground block mb-2">차별화 특징</span>
                                                    <ul className="space-y-1">
                                                        {advancedProfile.facts.unique_features.map((f: string, i: number) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                                <span className="text-amber-500 mt-0.5">•</span>
                                                                <span>{f}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            /* Legacy Data Display - 기존 포맷 지원 */
                            <div className="grid gap-4 md:grid-cols-2">
                                {advancedProfile.summary && (
                                    <Card className="col-span-2 border-l-4 border-l-slate-400">
                                        <CardHeader><CardTitle className="text-base">브랜드 요약</CardTitle></CardHeader>
                                        <CardContent>
                                            <p className="text-sm leading-relaxed text-gray-700">{advancedProfile.summary}</p>
                                        </CardContent>
                                    </Card>
                                )}
                                {advancedProfile.unique_selling_points?.length > 0 && (
                                    <Card className="border-l-4 border-l-amber-500">
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Trophy className="h-4 w-4 text-amber-500" />차별화 포인트
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {advancedProfile.unique_selling_points.map((point: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                        <span className="text-amber-500 mt-0.5 font-bold">•</span>
                                                        <span>{point}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}
                                {advancedProfile.menu_highlights?.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Star className="h-4 w-4 text-yellow-500" />추천 메뉴/서비스
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {advancedProfile.menu_highlights.map((item: string, i: number) => (
                                                    <Badge key={i} variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">{item}</Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ==================== STYLE DATA SECTION ==================== */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-purple-200">
                            <Palette className="h-5 w-5 text-purple-600" />
                            <h4 className="font-semibold text-purple-800">스타일 데이터</h4>
                            <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-600 ml-2">
                                리브랜딩 시 변경 가능
                            </Badge>
                        </div>

                        {advancedProfile.style ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Tone & Writing Style */}
                                <Card className="border-l-4 border-l-purple-400">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-purple-500" />
                                            톤앤매너
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {advancedProfile.style.tone && (
                                            <div>
                                                <span className="text-xs text-muted-foreground block mb-2">감지된 톤</span>
                                                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                                                    {advancedProfile.style.tone}
                                                </Badge>
                                            </div>
                                        )}
                                        {advancedProfile.style.writing_style && (
                                            <div>
                                                <span className="text-xs text-muted-foreground block mb-2">글쓰기 스타일</span>
                                                <p className="text-sm text-gray-700">{advancedProfile.style.writing_style}</p>
                                            </div>
                                        )}
                                        {advancedProfile.style.brand_personality && (
                                            <div>
                                                <span className="text-xs text-muted-foreground block mb-2">브랜드 성격</span>
                                                <p className="text-sm text-gray-700">{advancedProfile.style.brand_personality}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Target Audience */}
                                {advancedProfile.style.target_audience && (
                                    <Card className="border-l-4 border-l-blue-400">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Users className="h-4 w-4 text-blue-500" />
                                                타겟 고객
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-gray-700 leading-relaxed">{advancedProfile.style.target_audience}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Keywords & Hashtags */}
                                <Card className="col-span-2">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">키워드 & 해시태그</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {advancedProfile.style.keywords?.length > 0 && (
                                            <div>
                                                <span className="text-xs text-muted-foreground block mb-2">핵심 키워드</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {advancedProfile.style.keywords.map((k: string, i: number) => (
                                                        <Badge key={i} variant="secondary">{k}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {advancedProfile.style.emotional_keywords?.length > 0 && (
                                            <div>
                                                <span className="text-xs text-muted-foreground block mb-2">감성 키워드</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {advancedProfile.style.emotional_keywords.map((k: string, i: number) => (
                                                        <Badge key={i} variant="outline" className="bg-pink-50 border-pink-200 text-pink-700">{k}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {advancedProfile.style.hashtags?.length > 0 && (
                                            <div>
                                                <span className="text-xs text-muted-foreground block mb-2">추천 해시태그</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {advancedProfile.style.hashtags.map((h: string, i: number) => (
                                                        <Badge key={i} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                                                            {h.startsWith('#') ? h : `#${h}`}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Visual Style & Emoji */}
                                {(advancedProfile.style.visual_style || advancedProfile.style.emoji_usage) && (
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base">비주얼 스타일</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3 text-sm">
                                            {advancedProfile.style.visual_style && (
                                                <div>
                                                    <span className="text-muted-foreground">이미지 스타일:</span>
                                                    <span className="ml-2">{advancedProfile.style.visual_style}</span>
                                                </div>
                                            )}
                                            {advancedProfile.style.emoji_usage && (
                                                <div>
                                                    <span className="text-muted-foreground">이모지 사용:</span>
                                                    <span className="ml-2">{advancedProfile.style.emoji_usage}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Content Suggestions */}
                                {advancedProfile.style.content_suggestions?.length > 0 && (
                                    <Card className="col-span-2 border-l-4 border-l-indigo-500">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Lightbulb className="h-4 w-4 text-indigo-500" />
                                                AI 추천 콘텐츠 주제
                                            </CardTitle>
                                            <CardDescription>이 주제들로 콘텐츠를 생성하면 더 좋은 반응을 얻을 수 있어요</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid gap-2 md:grid-cols-2">
                                                {advancedProfile.style.content_suggestions.map((suggestion: string, i: number) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700 hover:bg-indigo-100 transition-colors">
                                                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-indigo-200 text-indigo-700 rounded-full font-bold text-xs">
                                                            {i + 1}
                                                        </span>
                                                        <span>{suggestion}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            /* Legacy Style Data Display */
                            <div className="grid gap-4 md:grid-cols-2">
                                {advancedProfile.tone && (
                                    <Card>
                                        <CardHeader><CardTitle className="text-base">톤앤매너 & 키워드</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <span className="text-xs text-muted-foreground block mb-2">감지된 톤앤매너</span>
                                                <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">{advancedProfile.tone}</Badge>
                                            </div>
                                            {advancedProfile.keywords?.length > 0 && (
                                                <div>
                                                    <span className="text-xs text-muted-foreground block mb-2">핵심 키워드</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {advancedProfile.keywords.map((k: string, i: number) => (
                                                            <Badge key={i} variant="secondary">{k}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                                {advancedProfile.target_audience_insights && (
                                    <Card className="border-l-4 border-l-blue-500">
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Users className="h-4 w-4 text-blue-500" />타겟 고객 인사이트
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-gray-700 leading-relaxed">{advancedProfile.target_audience_insights}</p>
                                        </CardContent>
                                    </Card>
                                )}
                                {advancedProfile.content_suggestions?.length > 0 && (
                                    <Card className="col-span-2 border-l-4 border-l-indigo-500">
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Lightbulb className="h-4 w-4 text-indigo-500" />AI 추천 콘텐츠 주제
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid gap-2 md:grid-cols-2">
                                                {advancedProfile.content_suggestions.map((suggestion: string, i: number) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">
                                                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-indigo-200 text-indigo-700 rounded-full font-bold text-xs">{i + 1}</span>
                                                        <span>{suggestion}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
