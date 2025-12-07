"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Wand2, Calendar, Trash2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const DAYS = ["일", "월", "화", "수", "목", "금", "토"] // 일요일=0부터 시작
const PLATFORMS = ["blog", "instagram", "threads"]

// 요일 한글 → 숫자 변환 (API용)
const DAY_TO_NUM: Record<string, number> = {
    "일": 0, "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6
}

interface AutoPlanSettings {
    frequency: number
    days: string[]
    platforms: string[]
    targetMonth: number
    advertiserId: string
}

interface GeneratedTopic {
    id: string
    date: string
    title: string
    description?: string
    channels: string[]
    advertiser_id: string
}

interface MagicPlanModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (topics: any[]) => void
    advertisers: Array<{ id: string; name: string }>
    currentMonth?: number
}

export function MagicPlanModal({ open, onOpenChange, onConfirm, advertisers, currentMonth }: MagicPlanModalProps) {
    const [step, setStep] = React.useState(1)
    const [loading, setLoading] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [settings, setSettings] = React.useState<AutoPlanSettings>({
        frequency: 2,
        days: ["월", "목"],
        platforms: ["blog", "instagram"],
        targetMonth: currentMonth || new Date().getMonth() + 1,
        advertiserId: ""
    })
    const [generatedTopics, setGeneratedTopics] = React.useState<GeneratedTopic[]>([])
    const [error, setError] = React.useState<string | null>(null)

    // 모달 열릴 때 광고주 초기화
    React.useEffect(() => {
        if (open && advertisers.length > 0 && !settings.advertiserId) {
            setSettings(prev => ({ ...prev, advertiserId: advertisers[0].id }))
        }
    }, [open, advertisers])

    // GPT API 호출하여 기획안 생성
    const handleGenerate = async () => {
        if (!settings.advertiserId) {
            toast.error("광고주를 선택해주세요.")
            return
        }
        if (settings.days.length === 0) {
            toast.error("발행 요일을 선택해주세요.")
            return
        }
        if (settings.platforms.length === 0) {
            toast.error("발행 채널을 선택해주세요.")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/magic-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    advertiser_id: settings.advertiserId,
                    year: new Date().getFullYear(),
                    month: settings.targetMonth,
                    frequency: settings.frequency,
                    days_of_week: settings.days.map(d => DAY_TO_NUM[d]),
                    channels: settings.platforms,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "기획안 생성에 실패했습니다.")
            }

            // API 응답을 컴포넌트 형식으로 변환
            const topics: GeneratedTopic[] = (data.topics || []).map((t: any, idx: number) => ({
                id: `topic-${Date.now()}-${idx}`,
                date: t.date,
                title: t.title,
                description: t.description,
                channels: t.channels || settings.platforms,
                advertiser_id: settings.advertiserId,
            }))

            setGeneratedTopics(topics)
            setStep(2)
            toast.success(`${topics.length}개의 기획안이 생성되었습니다!`)

        } catch (err) {
            console.error("Magic Plan Error:", err)
            setError(err instanceof Error ? err.message : "알 수 없는 오류")
            toast.error("기획안 생성 실패", {
                description: err instanceof Error ? err.message : "다시 시도해주세요."
            })
        } finally {
            setLoading(false)
        }
    }

    // 캘린더에 적용 (DB 저장)
    const handleSave = async () => {
        if (generatedTopics.length === 0) {
            toast.error("저장할 기획안이 없습니다.")
            return
        }

        setSaving(true)

        try {
            const response = await fetch("/api/magic-plan/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topics: generatedTopics.map(t => ({
                        date: t.date,
                        title: t.title,
                        description: t.description,
                        channels: t.channels,
                        advertiser_id: t.advertiser_id,
                    })),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "저장에 실패했습니다.")
            }

            toast.success(`${data.count}개의 기획안이 캘린더에 등록되었습니다!`)
            onConfirm(data.topics || generatedTopics)
            onOpenChange(false)
            setStep(1)
            setGeneratedTopics([])

        } catch (err) {
            console.error("Save Error:", err)
            toast.error("저장 실패", {
                description: err instanceof Error ? err.message : "다시 시도해주세요."
            })
        } finally {
            setSaving(false)
        }
    }

    const toggleDay = (day: string) => {
        setSettings(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }))
    }

    const togglePlatform = (pf: string) => {
        setSettings(prev => ({
            ...prev,
            platforms: prev.platforms.includes(pf)
                ? prev.platforms.filter(p => p !== pf)
                : [...prev.platforms, pf]
        }))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-purple-500" />
                        월간 자동 기획 (Magic Plan)
                    </DialogTitle>
                    <DialogDescription>
                        AI가 시즌 이슈와 트렌드를 반영하여 한 달치 기획안을 자동으로 제안합니다.
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-6 py-4">
                        <div className="grid gap-4">
                            {/* 광고주 선택 */}
                            <div className="grid gap-2">
                                <Label>광고주 선택</Label>
                                <Select
                                    value={settings.advertiserId}
                                    onValueChange={(v) => setSettings({ ...settings, advertiserId: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="광고주를 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {advertisers.map(adv => (
                                            <SelectItem key={adv.id} value={adv.id}>
                                                {adv.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 대상 월 선택 */}
                            <div className="grid gap-2">
                                <Label>대상 월</Label>
                                <Select
                                    value={String(settings.targetMonth)}
                                    onValueChange={(v) => setSettings({ ...settings, targetMonth: parseInt(v) })}
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <SelectItem key={i + 1} value={String(i + 1)}>
                                                {i + 1}월
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>발행 빈도 (주간)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={settings.frequency}
                                        onChange={(e) => setSettings({ ...settings, frequency: parseInt(e.target.value) || 1 })}
                                        className="w-24"
                                        min={1}
                                        max={7}
                                    />
                                    <span className="text-sm text-muted-foreground">회 / 주</span>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>발행 요일</Label>
                                <div className="flex gap-2">
                                    {DAYS.map(day => (
                                        <div
                                            key={day}
                                            onClick={() => toggleDay(day)}
                                            className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center border cursor-pointer transition-colors text-sm font-medium",
                                                settings.days.includes(day)
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-background hover:bg-muted"
                                            )}
                                        >
                                            {day}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>발행 채널</Label>
                                <div className="flex gap-2">
                                    {PLATFORMS.map(pf => (
                                        <Badge
                                            key={pf}
                                            variant={settings.platforms.includes(pf) ? "default" : "outline"}
                                            className="cursor-pointer px-3 py-1 uppercase"
                                            onClick={() => togglePlatform(pf)}
                                        >
                                            {pf}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="py-12 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground animate-pulse">
                            업종 트렌드와 시즌 키워드를 분석 중입니다...
                        </p>
                    </div>
                )}

                {!loading && step === 2 && (
                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">생성된 기획안 ({generatedTopics.length}건)</h3>
                            <Button variant="outline" size="sm" onClick={() => setGeneratedTopics([...generatedTopics, {
                                id: `manual-${Date.now()}`,
                                title: "",
                                date: "",
                                channels: settings.platforms,
                                advertiser_id: settings.advertiserId
                            }])}>
                                <Plus className="h-4 w-4 mr-1" /> 추가
                            </Button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                            {generatedTopics.map((topic, idx) => (
                                <div key={topic.id} className="flex gap-2 items-start group">
                                    <Input
                                        value={topic.date}
                                        className="w-24 text-center text-xs"
                                        placeholder="날짜"
                                        readOnly // Simplified for mock
                                    />
                                    <Input
                                        value={topic.title}
                                        onChange={(e) => {
                                            const newTopics = [...generatedTopics]
                                            newTopics[idx].title = e.target.value
                                            setGeneratedTopics(newTopics)
                                        }}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => setGeneratedTopics(generatedTopics.filter(t => t.id !== topic.id))}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 1 && !loading && (
                        <Button onClick={handleGenerate} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0">
                            <Wand2 className="mr-2 h-4 w-4" />
                            AI 기획 생성 시작
                        </Button>
                    )}
                    {step === 2 && !loading && (
                        <div className="flex w-full gap-2">
                            <Button variant="outline" onClick={() => setStep(1)} className="flex-1" disabled={saving}>
                                다시 설정
                            </Button>
                            <Button onClick={handleSave} className="flex-[2]" disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        저장 중...
                                    </>
                                ) : (
                                    <>
                                        <Calendar className="mr-2 h-4 w-4" />
                                        캘린더에 적용하기
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
