"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sparkles, RefreshCw, Info } from "lucide-react"
import type { ContentEvent } from "@/lib/mockData"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface LLMPanelProps {
    event?: ContentEvent
    advertisers?: any[]
    onGenerate: (content: string) => void
    onAdvertiserSelect?: (advertiserId: string) => void
}

export function LLMPanel({ event, advertisers = [], onGenerate, onAdvertiserSelect }: LLMPanelProps) {
    const [prompt, setPrompt] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string>("")

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
            const response = await fetch("/api/llm/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    advertiser_id: selectedAdvertiserId,
                    keywords: prompt.split(",").map(k => k.trim()).filter(Boolean),
                    channel: "blog_naver", // 기본값, 추후 선택 가능하게 확장
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
                    <h2 className="font-semibold text-lg">AI 도구함</h2>
                    <p className="text-xs text-muted-foreground">키워드만 넣으면 글이 완성됩니다.</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* 1. Advertiser Selection */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">아직 광고주를 선택하지 않았습니다</Label>
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
                                <span className="text-muted-foreground font-medium mb-1 block w-full">적용된 톤앤매너:</span>
                                {selectedAdvertiser.tone && selectedAdvertiser.tone.length > 0 ? (
                                    selectedAdvertiser.tone.map((t: string, i: number) => (
                                        <Badge key={i} variant="outline" className="bg-white">{t}</Badge>
                                    ))
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </div>
                            {selectedAdvertiser.forbidden_words && selectedAdvertiser.forbidden_words.length > 0 && (
                                <div className="pt-2 border-t mt-2">
                                    <span className="text-red-500 font-medium mb-1 block">🚫 금지어 필터링 중:</span>
                                    <p className="text-muted-foreground">
                                        {selectedAdvertiser.forbidden_words.join(", ")}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Prompt Input */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">주제 / 키워드</Label>
                    <Textarea
                        placeholder="예: 여름 시즌 정기 세일 이벤트 홍보 (30% 할인)"
                        className="h-[200px] resize-none focus-visible:ring-purple-500"
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
                            AI가 글을 쓰고 있어요...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            AI 초안 생성하기
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
                    구체적인 타겟(예: 30대 직장인)과 제공하려는 혜택을 명확히 적으면 더 좋은 반응을 얻을 수 있습니다.
                </p>
            </div>
        </div>
    )
}
