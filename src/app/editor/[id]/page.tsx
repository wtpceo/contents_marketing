"use client"

import { AppLayout } from "@/components/layout/AppLayout"
import { LLMPanel } from "@/components/editor/LLMPanel"
import { TiptapEditor } from "@/components/editor/TiptapEditor"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InstagramEditor } from "@/components/editor/InstagramEditor"
import { ThreadsEditor } from "@/components/editor/ThreadsEditor"
import { ArrowLeft, Save, Send, Loader2, Trash2, RefreshCw } from "lucide-react"
import { PublishingHelper } from "@/components/editor/PublishingHelper"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

interface ChannelData {
    blog?: {
        title: string
        html_body: string
    }
    instagram?: {
        images: { prompt: string; url: string | null }[]
        caption: string
        hashtags: string[]
    }
    threads?: {
        threads_text: string[]
    }
}

interface ContentData {
    id: string
    title: string
    body: string
    channel: string
    scheduled_at: string
    status: string
    llm_prompt: string
    keywords: string[]
    channel_data: ChannelData | null
    selected_channels: string[] | null
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

    const [advertisers, setAdvertisers] = useState<any[]>([])
    const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string>("")
    const [contentData, setContentData] = useState<ContentData | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("blog")

    // 채널별 콘텐츠 상태
    const [contentMap, setContentMap] = useState<{
        blog: string
        instagram: string
        threads: string
    }>({
        blog: '',
        instagram: '',
        threads: ''
    })

    // 인스타그램 추가 데이터
    const [instagramMeta, setInstagramMeta] = useState<{
        hashtags: string[]
        images: { prompt: string; url: string | null }[]
    }>({ hashtags: [], images: [] })

    // 콘텐츠 데이터 로드
    useEffect(() => {
        const fetchContent = async () => {
            try {
                // Fetch advertisers first (or parallel)
                const advResponse = await fetch("/api/advertisers?all=true")
                if (advResponse.ok) {
                    const advResult = await advResponse.json()
                    // API가 { data: [], meta: {} } 형식으로 반환
                    setAdvertisers(advResult.data || [])
                }

                const response = await fetch(`/api/contents/${id}`)
                if (!response.ok) {
                    throw new Error('콘텐츠를 찾을 수 없습니다.')
                }
                const data: ContentData = await response.json()
                setContentData(data)

                // channel_data가 있으면 각 채널별 상태 초기화
                if (data.channel_data) {
                    setContentMap({
                        blog: data.channel_data.blog?.html_body || data.body || '',
                        instagram: data.channel_data.instagram?.caption || '',
                        threads: data.channel_data.threads?.threads_text?.join('\n\n---\n\n') || ''
                    })

                    if (data.channel_data.instagram) {
                        setInstagramMeta({
                            hashtags: data.channel_data.instagram.hashtags || [],
                            images: data.channel_data.instagram.images || []
                        })
                    }
                } else {
                    // channel_data가 없으면 기존 body를 블로그로
                    setContentMap({
                        blog: data.body || '',
                        instagram: '',
                        threads: ''
                    })
                }

                if (data.advertisers?.id) {
                    setSelectedAdvertiserId(data.advertisers.id)
                }

                // 선택된 채널이 있으면 첫 번째 채널을 활성 탭으로
                if (data.selected_channels && data.selected_channels.length > 0) {
                    setActiveTab(data.selected_channels[0])
                }
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

    // 채널별 콘텐츠 변경 핸들러
    const handleContentChange = useCallback((channel: 'blog' | 'instagram' | 'threads', value: string) => {
        setContentMap(prev => ({
            ...prev,
            [channel]: value
        }))
    }, [])

    // LLM 생성 결과 처리 (OSMU)
    const handleOSMUGenerate = useCallback((generatedData: any) => {
        // 채널 정규화 함수
        const normalizeChannel = (ch: string) => {
            if (ch.startsWith('blog')) return 'blog'
            return ch
        }
        const normalizedTab = normalizeChannel(activeTab)

        console.log('[handleOSMUGenerate] 받은 데이터:', generatedData)
        console.log('[handleOSMUGenerate] activeTab:', activeTab, '-> normalized:', normalizedTab)

        // generate-osmu API 응답 처리
        if (generatedData.channel_data) {
            setContentMap(prev => {
                const newContentMap = { ...prev }

                if (generatedData.channel_data.blog) {
                    newContentMap.blog = generatedData.channel_data.blog.html_body || ''
                }
                if (generatedData.channel_data.instagram) {
                    newContentMap.instagram = generatedData.channel_data.instagram.caption || ''
                }
                if (generatedData.channel_data.threads) {
                    newContentMap.threads = generatedData.channel_data.threads.threads_text?.join('\n\n---\n\n') || ''
                }

                console.log('[handleOSMUGenerate] 새 contentMap:', newContentMap)
                return newContentMap
            })

            if (generatedData.channel_data.instagram) {
                setInstagramMeta({
                    hashtags: generatedData.channel_data.instagram.hashtags || [],
                    images: generatedData.channel_data.instagram.images || []
                })
            }
            toast.success('OSMU 콘텐츠가 생성되었습니다!')
        } else if (typeof generatedData === 'string') {
            console.log('[handleOSMUGenerate] 문자열 데이터, normalizedTab:', normalizedTab)
            setContentMap(prev => {
                const newMap = { ...prev }
                if (normalizedTab === 'instagram') {
                    newMap.instagram = generatedData
                } else if (normalizedTab === 'threads') {
                    newMap.threads = generatedData
                } else {
                    // blog, blog_naver, blog_tistory 등 모두 blog로 처리
                    newMap.blog = generatedData
                }
                console.log('[handleOSMUGenerate] 업데이트된 contentMap:', newMap)
                return newMap
            })
            toast.success('AI 초안이 생성되었습니다!')
        }
    }, [activeTab])

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
        channels: (contentData.selected_channels || contentData.keywords || [contentData.channel]) as any,
        clientId: contentData.advertisers?.id,
        clientName: contentData.advertisers?.name,
        llmPrompt: contentData.llm_prompt,
        advertiser: contentData.advertisers,
        date: contentData.scheduled_at ? new Date(contentData.scheduled_at) : new Date(),
        status: contentData.status as any,
    }

    // 선택된 채널 (없으면 기본 블로그)
    // blog_naver, blog_tistory 등을 blog로 정규화
    const normalizeChannel = (ch: string) => {
        if (ch.startsWith('blog')) return 'blog'
        return ch
    }
    const rawChannels = contentData.selected_channels || [contentData.channel] || ['blog']
    const selectedChannels = rawChannels.map(normalizeChannel).filter((v, i, a) => a.indexOf(v) === i)
    const hasMultipleChannels = selectedChannels.length > 1

    // activeTab도 정규화된 채널 이름 사용
    const normalizedActiveTab = normalizeChannel(activeTab)

    const handleSave = async () => {
        setSaving(true)
        try {
            // channel_data 구조로 저장
            const channelData: ChannelData = {}

            if (selectedChannels.includes('blog')) {
                channelData.blog = {
                    title: contentData.title,
                    html_body: contentMap.blog
                }
            }

            if (selectedChannels.includes('instagram')) {
                channelData.instagram = {
                    images: instagramMeta.images,
                    caption: contentMap.instagram,
                    hashtags: instagramMeta.hashtags
                }
            }

            if (selectedChannels.includes('threads')) {
                channelData.threads = {
                    threads_text: contentMap.threads.split('\n\n---\n\n').filter(Boolean)
                }
            }

            const response = await fetch(`/api/contents/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    body: contentMap.blog, // 대표 본문은 블로그 내용 유지
                    channel_data: channelData,
                    advertiser_id: selectedAdvertiserId
                })
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
                const channelData: ChannelData = {}

                if (selectedChannels.includes('blog')) {
                    channelData.blog = {
                        title: contentData.title,
                        html_body: contentMap.blog
                    }
                }

                if (selectedChannels.includes('instagram')) {
                    channelData.instagram = {
                        images: instagramMeta.images,
                        caption: contentMap.instagram,
                        hashtags: instagramMeta.hashtags
                    }
                }

                if (selectedChannels.includes('threads')) {
                    channelData.threads = {
                        threads_text: contentMap.threads.split('\n\n---\n\n').filter(Boolean)
                    }
                }

                await fetch(`/api/contents/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        body: contentMap.blog,
                        channel_data: channelData,
                        status: 'pending'
                    })
                })

                // 컨펌 요청 API 호출
                const response = await fetch(`/api/contents/${id}/confirm`, {
                    method: 'POST',
                })

                if (response.ok) {
                    toast.success(`컨펌 요청 완료! 미리보기 링크가 생성되었습니다.`)
                } else {
                    toast.error('컨펌 요청에 실패했습니다.')
                }
            } catch (err) {
                console.error('Confirm request error:', err)
                toast.error('오류가 발생했습니다.')
            }
        }
    }

    const handleDelete = async () => {
        if (!window.confirm("정말로 이 콘텐츠를 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.")) {
            return
        }

        try {
            const response = await fetch(`/api/contents/${id}`, { method: 'DELETE' })
            if (response.ok) {
                toast.success("삭제되었습니다.")
                router.push('/dashboard')
            } else {
                toast.error("삭제 실패")
            }
        } catch (error) {
            console.error(error)
            toast.error("오류가 발생했습니다.")
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
                                {contentData.advertisers && (
                                    <Badge variant="secondary" className="text-xs">
                                        {contentData.advertisers.name}
                                    </Badge>
                                )}
                                {hasMultipleChannels && (
                                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                        OSMU {selectedChannels.length}채널
                                    </Badge>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {contentData.scheduled_at ? `예정일: ${new Date(contentData.scheduled_at).toLocaleDateString('ko-KR')}` : ''}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500 mr-2" onClick={handleDelete} title="삭제">
                            <Trash2 className="h-4 w-4" />
                        </Button>
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
                    {/* Left Panel: 30% */}
                    <LLMPanel
                        event={event}
                        advertisers={advertisers}
                        onGenerate={handleOSMUGenerate}
                        onAdvertiserSelect={setSelectedAdvertiserId}
                        activeChannel={activeTab}
                    />

                    {/* Right Panel: 70% Variable Tabs */}
                    <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
                        <Tabs value={normalizedActiveTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="border-b bg-white px-4 shrink-0">
                                <TabsList className="h-12 bg-transparent">
                                    {selectedChannels.includes('blog') && (
                                        <TabsTrigger value="blog" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none h-full px-6">
                                            📝 블로그
                                        </TabsTrigger>
                                    )}
                                    {selectedChannels.includes('instagram') && (
                                        <TabsTrigger value="instagram" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none h-full px-6">
                                            📸 인스타그램
                                        </TabsTrigger>
                                    )}
                                    {selectedChannels.includes('threads') && (
                                        <TabsTrigger value="threads" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none h-full px-6">
                                            🧵 스레드
                                        </TabsTrigger>
                                    )}
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 pb-20">
                                {selectedChannels.includes('blog') && (
                                    <TabsContent value="blog" className="min-h-full m-0">
                                        <div className="max-w-3xl mx-auto min-h-full bg-white rounded-xl shadow-sm border p-8">
                                            <TiptapEditor
                                                value={contentMap.blog}
                                                onChange={(v) => handleContentChange('blog', v)}
                                            />
                                        </div>
                                    </TabsContent>
                                )}

                                {selectedChannels.includes('instagram') && (
                                    <TabsContent value="instagram" className="min-h-full m-0">
                                        <div className="min-h-full bg-white rounded-xl shadow-sm border p-6">
                                            <InstagramEditor
                                                content={contentMap.instagram}
                                                onChange={(v) => handleContentChange('instagram', v)}
                                            />
                                        </div>
                                    </TabsContent>
                                )}

                                {selectedChannels.includes('threads') && (
                                    <TabsContent value="threads" className="min-h-full m-0">
                                        <div className="min-h-full bg-white rounded-xl shadow-sm border p-6">
                                            <ThreadsEditor
                                                content={contentMap.threads}
                                                onChange={(v) => handleContentChange('threads', v)}
                                            />
                                        </div>
                                    </TabsContent>
                                )}
                            </div>
                        </Tabs>

                        {/* 배포 보조 도구: approved(Ready) 상태일 때만 표시 */}
                        {contentData.status === 'approved' && (
                            <div className="shrink-0 border-t bg-white p-4">
                                <PublishingHelper
                                    contentId={contentData.id}
                                    advertiserName={contentData.advertisers?.name || '광고주'}
                                    channel={normalizedActiveTab as 'blog' | 'instagram' | 'threads'}
                                    title={contentData.title}
                                    body={normalizedActiveTab === 'blog' ? contentMap.blog :
                                          normalizedActiveTab === 'instagram' ? contentMap.instagram :
                                          contentMap.threads}
                                    hashtags={instagramMeta.hashtags}
                                    images={instagramMeta.images}
                                    onPublished={() => {
                                        // 배포 완료 후 페이지 새로고침
                                        window.location.reload()
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}
