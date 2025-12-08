"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sparkles, RefreshCw, Info, LayoutTemplate, Heart, Zap } from "lucide-react"
import type { ContentEvent } from "@/lib/mockData"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface LLMPanelProps {
    event?: ContentEvent & {
        llmPrompt?: string
        advertiser?: any
    }
    advertisers?: any[]
    onGenerate: (content: string) => void
    onAdvertiserSelect?: (advertiserId: string) => void
    activeChannel?: string
}

export function LLMPanel({ event, advertisers = [], onGenerate, onAdvertiserSelect, activeChannel }: LLMPanelProps) {
    const [prompt, setPrompt] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string>("")
    const [visualStyle, setVisualStyle] = useState<'emotional' | 'informative' | 'viral'>('emotional')

    // Initialize from event prop
    useEffect(() => {
        if (event) {
            if (event.clientId) {
                setSelectedAdvertiserId(event.clientId)
                onAdvertiserSelect?.(event.clientId)
            }
            if (event.llmPrompt) setPrompt(event.llmPrompt)
            else if (event.title) setPrompt(event.title)
        }
    }, [event])

    const selectedAdvertiser = advertisers.find(a => a.id === selectedAdvertiserId) || (event?.advertiser?.id === selectedAdvertiserId ? event.advertiser : null)

    // 광고주 선택 시 부모에게 알림
    const handleAdvertiserChange = (value: string) => {
        setSelectedAdvertiserId(value)
        onAdvertiserSelect?.(value)
    }

    const handleGenerate = async () => {
        if (!prompt) {
            toast.error("주제/키워드를 입력해주세요.")
            return
        }
        if (!selectedAdvertiserId) {
            toast.error("광고주를 선택해주세요.")
            return
        }

        setIsGenerating(true)
        try {
            // Instagram Channel Logic
            if (activeChannel === 'instagram') {
                // Mocking the LLM behavior for specific JSON response to ensure reliability for the demo
                // In production, this would be a prompt to DALL-E/GPT-4 returning valid JSON.
                // For now, we simulate a robust response based on the prompt.

                // Simulating API delay
                await new Promise(resolve => setTimeout(resolve, 1500))

                const mockSlides = [
                    {
                        type: 'cover',
                        main_text: prompt, // Use user prompt as title
                        sub_text: visualStyle === 'emotional' ? "당신의 마음을 움직이는 이야기" : "핵심만 쏙쏙 정리했습니다",
                        image_keyword: visualStyle === 'emotional' ? 'sunset' : 'technology',
                        backgroundImage: visualStyle === 'emotional' ? 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&auto=format&fit=crop' : undefined
                    },
                    {
                        type: 'content',
                        title: "첫 번째 포인트",
                        body: "여기에 AI가 생성한 핵심 내용이 들어갑니다. 사용자의 요청에 맞춰 내용을 구성합니다.",
                        image_keyword: 'business'
                    },
                    {
                        type: 'content',
                        title: "두 번째 포인트",
                        body: "두 번째 핵심 내용입니다. 구체적인 예시와 데이터를 포함하면 좋습니다.",
                        image_keyword: 'meeting'
                    },
                    {
                        type: 'content',
                        title: "세 번째 포인트",
                        body: "마지막으로 강조할 내용입니다. 독자의 행동을 유도하는 메시지를 담으세요.",
                        image_keyword: 'success'
                    },
                    {
                        type: 'cta',
                        text: "더 많은 정보가 궁금하다면?\n프로필 링크를 확인하세요!",
                        image_keyword: 'phone',
                        main_text: "저장하고 다시 보기",
                        sub_text: "@brand_official"
                    }
                ]

                onGenerate(JSON.stringify({ style: visualStyle, slides: mockSlides }))
                toast.success("AI 인스타그램 카드뉴스가 생성되었습니다!")

            } else {
                // Default Blog Logic
                const response = await fetch("/api/llm/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        advertiser_id: selectedAdvertiserId,
                        keywords: prompt.split(",").map(k => k.trim()).filter(Boolean),
                        channel: activeChannel || "blog_naver",
                        additional_instructions: "",
                    }),
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || "AI 생성에 실패했습니다.")
                }

                // API가 title과 body를 반환
                const generatedHtml = `
<h1>${data.title}</h1>
${data.body.split('\n').map((line: string) => {
                    if (line.startsWith('##')) return `<h2>${line.replace(/^##\s*/, '')}</h2>`
                    if (line.startsWith('#')) return `<h3>${line.replace(/^#\s*/, '')}</h3>`
                    if (line.trim()) return `<p>${line}</p>`
                    return ''
                }).join('\n')}
                `.trim()

                onGenerate(generatedHtml)
                toast.success("AI 초안이 생성되었습니다!", {
                    description: `토큰 사용량: ${data.usage?.total_tokens || 0}`
                })
            }

        } catch (error) {
            console.error("LLM Generate Error:", error)
            toast.error("생성에 실패했습니다.", {
                description: error instanceof Error ? error.message : "알 수 없는 오류"
            })
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="flex h-full w-[400px] flex-col gap-6 p-6 overflow-y-auto border-r bg-white shrink-0">
            <div className="flex items-center gap-2 border-b pb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                    <h2 className="font-semibold text-lg">기획 컨트롤 패널</h2>
                    <p className="text-xs text-muted-foreground">기획 내용을 수정하고 재생성하세요.</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* 1. Advertiser Selection */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">광고주 (Client)</Label>
                    <Select value={selectedAdvertiserId} onValueChange={handleAdvertiserChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="광고주 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {advertisers.map((adv) => (
                                <SelectItem key={adv.id} value={adv.id}>
                                    {adv.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedAdvertiser && (
                        <div className="rounded-md bg-muted/50 p-3 text-xs space-y-2 border">
                            <div className="flex flex-wrap gap-1">
                                <span className="text-muted-foreground font-medium mb-1 block w-full">톤앤매너:</span>
                                {selectedAdvertiser.tone && selectedAdvertiser.tone.length > 0 ? (
                                    selectedAdvertiser.tone.map((t: string, i: number) => (
                                        <Badge key={i} variant="outline" className="bg-white">{t}</Badge>
                                    ))
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Planning Info */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">주제 (Title)</Label>
                    <Input
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="bg-white"
                    />
                </div>

                {/* Visual Style Selection (Instagram Specific) */}
                {activeChannel === 'instagram' && (
                    <div className="space-y-3 transition-all animate-in fade-in slide-in-from-top-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <LayoutTemplate className="h-4 w-4" />
                            비주얼 스타일
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setVisualStyle('emotional')}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                                    visualStyle === 'emotional'
                                        ? "border-purple-600 bg-purple-50 text-purple-700"
                                        : "border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                <Heart className="h-5 w-5 mb-1" />
                                <span className="text-xs font-medium">감성형</span>
                            </button>
                            <button
                                onClick={() => setVisualStyle('informative')}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                                    visualStyle === 'informative'
                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                        : "border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                <Info className="h-5 w-5 mb-1" />
                                <span className="text-xs font-medium">정보형</span>
                            </button>
                            <button
                                onClick={() => setVisualStyle('viral')}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                                    visualStyle === 'viral'
                                        ? "border-orange-600 bg-orange-50 text-orange-700"
                                        : "border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                <Zap className="h-5 w-5 mb-1" />
                                <span className="text-xs font-medium">바이럴</span>
                            </button>
                        </div>
                    </div>
                )}


                {/* 3. Prompt/Instruction */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">핵심 지시사항 (Prompt)</Label>
                    <Textarea
                        placeholder={activeChannel === 'instagram'
                            ? "예: 20대 여성을 위한 가을 패션 트렌드 5가지 추천해줘..."
                            : "AI에게 전달할 추가 요청사항..."}
                        className="h-[150px] resize-none focus-visible:ring-purple-500"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                </div>

                {/* 3. Generate Button */}
                <Button
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md transition-all hover:scale-[1.02]"
                    disabled={isGenerating || !prompt}
                    onClick={handleGenerate}
                >
                    {isGenerating ? (
                        <>
                            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                            {activeChannel === 'instagram' ? '카드뉴스 디자인 중...' : 'AI가 글을 쓰고 있어요...'}
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            {activeChannel === 'instagram' ? '카드뉴스 자동 생성' : 'AI 초안 생성하기'}
                        </>
                    )}
                </Button>
            </div>

            <div className="mt-auto rounded-lg bg-blue-50 p-4 text-sm text-blue-900 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                    <Info className="h-4 w-4" />
                    <p className="font-semibold">작성 팁</p>
                </div>
                <p className="opacity-90 leading-relaxed">
                    {activeChannel === 'instagram'
                        ? "원하는 스타일(감성/정보)을 선택하면 AI가 어울리는 이미지와 레이아웃을 자동으로 구성합니다."
                        : "구체적인 타겟(예: 30대 직장인)과 제공하려는 혜택을 명확히 적으면 더 좋은 반응을 얻을 수 있습니다."}
                </p>
            </div>
        </div>
    )
}
