"use client"

import { AppLayout } from "@/components/layout/AppLayout"
import { LLMPanel } from "@/components/editor/LLMPanel"
import { TiptapEditor } from "@/components/editor/TiptapEditor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function NewEditorPage() {
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [advertisers, setAdvertisers] = useState<any[]>([])
    const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string>("")
    const [isSaving, setIsSaving] = useState(false)
    const [contentId, setContentId] = useState<string | null>(null) // 저장된 콘텐츠 ID

    // Fetch advertisers for the dropdown
    useEffect(() => {
        const fetchAdvertisers = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('advertisers')
                .select('id, name, tone, forbidden_words')
                .eq('is_active', true)
                .order('name')

            if (data) setAdvertisers(data)
        }
        fetchAdvertisers()
    }, [])

    // 임시 저장 (POST or PATCH)
    const handleSaveDraft = async () => {
        if (!title) {
            toast.error("제목을 입력해주세요.")
            return
        }
        if (!selectedAdvertiserId) {
            toast.error("광고주를 선택해주세요.")
            return
        }

        setIsSaving(true)
        try {
            if (contentId) {
                // 이미 저장된 콘텐츠 업데이트
                const response = await fetch(`/api/contents/${contentId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title,
                        body: content,
                    }),
                })
                if (!response.ok) throw new Error("저장에 실패했습니다.")
                toast.success("저장되었습니다!")
            } else {
                // 새 콘텐츠 생성
                const response = await fetch("/api/contents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        advertiser_id: selectedAdvertiserId,
                        title,
                        body: content,
                        channel: "blog_naver", // 기본값
                    }),
                })
                const data = await response.json()
                if (!response.ok) throw new Error(data.error || "저장에 실패했습니다.")
                setContentId(data.id)
                toast.success("임시 저장되었습니다!", {
                    description: "콘텐츠가 초안 상태로 저장되었습니다."
                })
            }
        } catch (error) {
            toast.error("저장에 실패했습니다.", {
                description: error instanceof Error ? error.message : "알 수 없는 오류"
            })
        } finally {
            setIsSaving(false)
        }
    }

    // 캘린더에 등록 (날짜 선택 후 저장)
    const handleSchedule = async () => {
        if (!title) {
            toast.error("제목을 입력해주세요.")
            return
        }
        if (!selectedAdvertiserId) {
            toast.error("광고주를 선택해주세요.")
            return
        }

        // 간단한 날짜 선택 (프롬프트 사용, 추후 DatePicker 컴포넌트로 교체 가능)
        const dateStr = prompt("발행 예정일을 입력하세요 (예: 2025-12-15)")
        if (!dateStr) return

        const scheduledDate = new Date(dateStr)
        if (isNaN(scheduledDate.getTime())) {
            toast.error("올바른 날짜 형식이 아닙니다.")
            return
        }

        setIsSaving(true)
        try {
            if (contentId) {
                // 기존 콘텐츠 업데이트 + 스케줄 설정
                const response = await fetch(`/api/contents/${contentId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title,
                        body: content,
                        scheduled_at: scheduledDate.toISOString(),
                        status: "scheduled",
                    }),
                })
                if (!response.ok) throw new Error("등록에 실패했습니다.")
            } else {
                // 새 콘텐츠 생성 + 스케줄 설정
                const response = await fetch("/api/contents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        advertiser_id: selectedAdvertiserId,
                        title,
                        body: content,
                        channel: "blog_naver",
                        scheduled_at: scheduledDate.toISOString(),
                        status: "scheduled",
                    }),
                })
                if (!response.ok) throw new Error("등록에 실패했습니다.")
            }
            toast.success("캘린더에 등록되었습니다!", {
                description: `${dateStr}에 발행 예정`
            })
            router.push("/dashboard")
        } catch (error) {
            toast.error("등록에 실패했습니다.", {
                description: error instanceof Error ? error.message : "알 수 없는 오류"
            })
        } finally {
            setIsSaving(false)
        }
    }

    // LLMPanel에서 광고주 선택 시 동기화
    const handleAdvertiserSelect = (advertiserId: string) => {
        setSelectedAdvertiserId(advertiserId)
    }

    return (
        <AppLayout>
            <div className="flex flex-col h-full">
                {/* Header */}
                <header className="flex h-14 items-center justify-between border-b bg-background px-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <h1 className="font-semibold text-lg">새 콘텐츠 작성</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {contentId ? "저장" : "임시 저장"}
                        </Button>
                        <Button onClick={handleSchedule} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
                            캘린더에 등록
                        </Button>
                    </div>
                </header>

                {/* Main 3:7 Layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel (30%) */}
                    <div className="w-[30%] border-r bg-muted/10">
                        <LLMPanel
                            advertisers={advertisers}
                            onGenerate={(generatedContent) => setContent(generatedContent)}
                            onAdvertiserSelect={handleAdvertiserSelect}
                        />
                    </div>

                    {/* Right Panel (70%) */}
                    <div className="flex-1 bg-gray-50/50 p-8 overflow-y-auto">
                        <div className="max-w-4xl mx-auto h-full flex flex-col gap-4">
                            <Input
                                placeholder="제목을 입력하세요"
                                className="text-2xl font-bold h-16 px-4 bg-transparent border-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <div className="flex-1 min-h-[500px] bg-white rounded-lg border shadow-sm">
                                <TiptapEditor value={content} onChange={setContent} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}
