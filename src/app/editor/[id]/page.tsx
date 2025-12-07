"use client"

import { AppLayout } from "@/components/layout/AppLayout"
import { LLMPanel } from "@/components/editor/LLMPanel"
import { TiptapEditor } from "@/components/editor/TiptapEditor"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Send, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface ContentData {
    id: string
    title: string
    body: string
    channel: string
    scheduled_at: string
    status: string
    llm_prompt: string
    keywords: string[]
    advertisers: {
        id: string
        name: string
        logo_url?: string
        industry?: string
        target_audience?: string
        tone?: string[]
        brand_keywords?: string[]
        forbidden_words?: string[]
        detailed_info?: string
        competitors?: string[]
    }
}

export default function EditorPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string

    const [contentData, setContentData] = useState<ContentData | null>(null)
    const [content, setContent] = useState("")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 콘텐츠 데이터 로드
    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await fetch(`/api/contents/${id}`)
                if (!response.ok) {
                    throw new Error('콘텐츠를 찾을 수 없습니다.')
                }
                const data = await response.json()
                setContentData(data)
                setContent(data.body || '')
            } catch (err) {
                console.error('Content fetch error:', err)
                setError(err instanceof Error ? err.message : '콘텐츠 로딩 실패')
            } finally {
                setLoading(false)
            }
        }

        if (id) {
            fetchContent()
        }
    }, [id])

    if (loading) {
        return (
            <AppLayout>
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">콘텐츠 불러오는 중...</span>
                </div>
            </AppLayout>
        )
    }

    if (error || !contentData) {
        return (
            <AppLayout>
                <div className="flex h-full flex-col items-center justify-center gap-4">
                    <p className="text-muted-foreground">{error || '콘텐츠를 찾을 수 없습니다.'}</p>
                    <Link href="/dashboard">
                        <Button variant="outline">대시보드로 돌아가기</Button>
                    </Link>
                </div>
            </AppLayout>
        )
    }

    // LLMPanel에 전달할 event 객체 구성
    const event = {
        id: contentData.id,
        title: contentData.title,
        channels: contentData.keywords || [contentData.channel],
        clientId: contentData.advertisers?.id,
        clientName: contentData.advertisers?.name,
        llmPrompt: contentData.llm_prompt,
        advertiser: contentData.advertisers,
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const response = await fetch(`/api/contents/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ body: content })
            })

            if (!response.ok) {
                throw new Error('저장 실패')
            }

            toast.success('임시 저장되었습니다.')
        } catch (err) {
            console.error('Save error:', err)
            toast.error('저장에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    const handleRequestConfirm = async () => {
        const confirmed = window.confirm("광고주에게 컨펌 요청을 보내시겠습니까?")
        if (confirmed) {
            try {
                // 먼저 저장
                await fetch(`/api/contents/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ body: content, status: 'pending' })
                })

                // 컨펌 요청 API 호출
                const response = await fetch(`/api/contents/${id}/confirm`, {
                    method: 'POST',
                })

                if (response.ok) {
                    const data = await response.json()
                    toast.success(`컨펌 요청 완료! 미리보기 링크가 생성되었습니다.`)
                    // 미리보기 링크 복사 또는 표시
                } else {
                    toast.error('컨펌 요청에 실패했습니다.')
                }
            } catch (err) {
                console.error('Confirm request error:', err)
                toast.error('오류가 발생했습니다.')
            }
        }
    }

    return (
        <AppLayout>
            <div className="flex flex-col h-full">
                {/* Header */}
                <header className="flex h-14 items-center justify-between border-b bg-background px-6">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h1 className="font-semibold text-sm">{contentData.title}</h1>
                                <Badge variant="outline" className="text-xs uppercase">
                                    {contentData.channel === 'blog_naver' ? 'Blog' : contentData.channel}
                                </Badge>
                                {contentData.advertisers && (
                                    <Badge variant="secondary" className="text-xs">
                                        {contentData.advertisers.name}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {contentData.scheduled_at ? `예정일: ${new Date(contentData.scheduled_at).toLocaleDateString('ko-KR')}` : ''}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            임시 저장
                        </Button>
                        <Button onClick={handleRequestConfirm}>
                            <Send className="mr-2 h-4 w-4" />
                            컨펌 요청
                        </Button>
                    </div>
                </header>

                {/* Main Workspace */}
                <div className="flex flex-1 overflow-hidden">
                    <LLMPanel
                        event={event}
                        advertisers={contentData.advertisers ? [contentData.advertisers] : []}
                        onGenerate={setContent}
                    />
                    <div className="flex-1 bg-gray-50/50 p-8 overflow-y-auto">
                        <div className="max-w-3xl mx-auto h-full">
                            <TiptapEditor value={content} onChange={setContent} />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}
