'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AiLearningTab } from '@/components/clients/AiLearningTab'
import { ReportTab } from '@/components/clients/ReportTab'

interface Advertiser {
    id: string
    name: string
    industry: string | null
    location: string | null
    contact_phone: string | null
    contact_email: string | null
    tone: string[]
    forbidden_words: string[]
    brand_keywords: string[]
    description: string | null
    competitors: string | null
    detailed_info: string | null
    advanced_profile: any
}

// 톤 영문 → 한글 변환
const toneLabels: Record<string, string> = {
    professional: "전문적인",
    friendly: "친근한",
    witty: "위트있는",
    emotional: "감성적",
    formal: "격식체",
    casual: "캐주얼",
}

export default function ClientDetailsPage() {
    const params = useParams()
    const id = params.id as string

    const [client, setClient] = useState<Advertiser | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 고급 설정 폼 상태
    const [competitors, setCompetitors] = useState('')
    const [forbiddenWords, setForbiddenWords] = useState('')
    const [detailedInfo, setDetailedInfo] = useState('')

    // 광고주 데이터 불러오기
    const fetchClient = useCallback(async (showLoading = true) => {
        if (!id) return;

        if (showLoading) setLoading(true)

        try {
            // MOCK ID check (legacy support)
            if (id.startsWith('c')) {
                // ... mock handling if needed, but we prefer DB now
            }

            const response = await fetch(`/api/advertisers/${id}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || '광고주를 찾을 수 없습니다.')
            }

            setClient(data)
            // 폼 초기값 설정
            setCompetitors(data.competitors || '')
            setForbiddenWords(data.forbidden_words?.join(', ') || '')
            setDetailedInfo(data.detailed_info || '')
        } catch (err) {
            console.error("Fetch Error:", err);
            setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
        } finally {
            if (showLoading) setLoading(false)
        }
    }, [id])

    useEffect(() => {
        fetchClient(true)
    }, [fetchClient])

    // 저장 기능
    const handleSave = async () => {
        if (!client) return

        setSaving(true)
        try {
            const response = await fetch(`/api/advertisers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    competitors,
                    forbidden_words: forbiddenWords.split(',').map(w => w.trim()).filter(Boolean),
                    detailed_info: detailedInfo,
                }),
            })

            if (!response.ok) {
                throw new Error('저장에 실패했습니다.')
            }

            const updatedClient = await response.json()
            setClient(updatedClient)
            toast.success('저장되었습니다!', {
                description: '광고주 정보가 성공적으로 업데이트되었습니다.'
            })
        } catch (err) {
            toast.error('저장에 실패했습니다.', {
                description: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </AppLayout>
        )
    }

    if (error || !client) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-full">
                    <h2 className="text-xl font-bold">광고주를 찾을 수 없습니다.</h2>
                    <p className="text-muted-foreground mt-2">{error || `ID: ${id}`}</p>
                    <p className="text-xs text-muted-foreground mt-1">서버 응답을 확인해주세요.</p>
                    <Button asChild className="mt-4">
                        <Link href="/clients">목록으로 돌아가기</Link>
                    </Button>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <div className="flex flex-col h-full space-y-6 p-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/clients">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                        <p className="text-muted-foreground">{client.industry} · {client.contact_phone || client.contact_email || '-'}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="flex gap-2 mr-4">
                            {client.tone?.map((t, i) => <Badge key={i} variant="secondary">{toneLabels[t] || t}</Badge>)}
                        </div>
                        {/* Dirty Check Logic */}
                        {(() => {
                            const isDirty =
                                (client.competitors || '') !== competitors ||
                                (client.forbidden_words?.join(', ') || '') !== forbiddenWords ||
                                (client.detailed_info || '') !== detailedInfo;

                            return (
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || !isDirty}
                                    variant={isDirty ? "default" : "secondary"}
                                    className={!isDirty ? "opacity-50" : ""}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            저장 중...
                                        </>
                                    ) : isDirty ? (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            변경사항 저장
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            저장됨
                                        </>
                                    )}
                                </Button>
                            );
                        })()}
                    </div>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList>
                        <TabsTrigger value="overview">기본 정보</TabsTrigger>
                        <TabsTrigger value="ai_learning">AI 학습 데이터</TabsTrigger>
                        <TabsTrigger value="report">리포트</TabsTrigger>
                        <TabsTrigger value="advanced">고급 설정 (수동)</TabsTrigger>
                        <TabsTrigger value="contents">콘텐츠 히스토리</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <Card>
                            <CardHeader>
                                <CardTitle>기본 정보</CardTitle>
                                <CardDescription>등록된 기본 정보입니다.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>광고주명</Label>
                                        <div className="p-3 bg-muted rounded-md mt-1">{client.name}</div>
                                    </div>
                                    <div>
                                        <Label>연락처</Label>
                                        <div className="p-3 bg-muted rounded-md mt-1">{client.contact_phone || client.contact_email || '-'}</div>
                                    </div>
                                    <div>
                                        <Label>업종</Label>
                                        <div className="p-3 bg-muted rounded-md mt-1">{client.industry || '-'}</div>
                                    </div>
                                    <div>
                                        <Label>위치</Label>
                                        <div className="p-3 bg-muted rounded-md mt-1">{client.location || '-'}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="ai_learning">
                        <AiLearningTab
                            clientId={client.id}
                            advancedProfile={client.advanced_profile}
                            onUpdate={(profile) => setClient(prev => prev ? ({ ...prev, advanced_profile: profile }) : null)}
                        />
                    </TabsContent>

                    <TabsContent value="report">
                        <ReportTab
                            clientId={client.id}
                            clientName={client.name}
                        />
                    </TabsContent>

                    <TabsContent value="advanced">
                        <Card>
                            <CardHeader>
                                <CardTitle>고급 설정</CardTitle>
                                <CardDescription>
                                    LLM이 더 정확한 콘텐츠를 생성할 수 있도록 상세 정보를 입력해주세요.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="competitors">경쟁사 정보</Label>
                                    <Textarea
                                        id="competitors"
                                        placeholder="주요 경쟁사와 그들의 특징을 입력하세요. (예: A사는 저가 전략, B사는 프리미엄 이미지)"
                                        className="min-h-[100px]"
                                        value={competitors}
                                        onChange={(e) => setCompetitors(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">경쟁사와 차별화된 소구점을 찾는데 활용됩니다.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="banned">금지 키워드</Label>
                                    <Textarea
                                        id="banned"
                                        placeholder="콘텐츠에 절대 포함되면 안 되는 단어나 표현을 쉼표로 구분하여 입력하세요."
                                        className="min-h-[80px]"
                                        value={forbiddenWords}
                                        onChange={(e) => setForbiddenWords(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">브랜드 안전성을 위해 필터링에 사용됩니다. (쉼표로 구분)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="details">상세 특징</Label>
                                    <Textarea
                                        id="details"
                                        placeholder="브랜드의 고유한 스토리, 타겟 고객의 페르소나, 강조하고 싶은 USP 등을 자유롭게 작성해주세요."
                                        className="min-h-[150px]"
                                        value={detailedInfo}
                                        onChange={(e) => setDetailedInfo(e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="contents">
                        <div className="flex items-center justify-center p-8 border border-dashed rounded-lg text-muted-foreground">
                            콘텐츠 히스토리 준비 중...
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    )
}
