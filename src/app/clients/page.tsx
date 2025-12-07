"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, MoreVertical, Trash2, Edit, Loader2 } from "lucide-react"
import { ClientDialog } from "@/components/clients/ClientDialog"
import Link from "next/link"

interface Advertiser {
    id: string
    name: string
    industry: string | null
    location: string | null
    contact_phone: string | null
    contact_email: string | null
    tone: string[]
    is_active: boolean
    created_at: string
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

export default function ClientsPage() {
    const [clients, setClients] = useState<Advertiser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchClients = async () => {
        try {
            const response = await fetch("/api/advertisers")
            if (!response.ok) {
                throw new Error("데이터를 불러오는데 실패했습니다.")
            }
            const data = await response.json()
            setClients(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return

        try {
            const response = await fetch(`/api/advertisers/${id}`, {
                method: "DELETE",
            })
            if (!response.ok) {
                throw new Error("삭제에 실패했습니다.")
            }
            // 목록 새로고침
            fetchClients()
        } catch (err) {
            alert(err instanceof Error ? err.message : "삭제에 실패했습니다.")
        }
    }

    useEffect(() => {
        fetchClients()
    }, [])
    return (
        <AppLayout>
            <div className="flex flex-col h-full">
                <header className="flex h-14 items-center justify-between border-b bg-muted/40 px-6 lg:h-[60px]">
                    <h1 className="text-lg font-semibold">광고주 관리</h1>
                    <ClientDialog>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            광고주 등록
                        </Button>
                    </ClientDialog>
                </header>
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-64 text-red-500">
                            {error}
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {clients.map(client => (
                                <Link href={`/clients/${client.id}`} key={client.id} className="block group">
                                    <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                            <div className="space-y-1">
                                                <CardTitle className="text-base group-hover:text-primary transition-colors">{client.name}</CardTitle>
                                                {/* Assuming 'contact' field exists or is derived from phone/email */}
                                                <CardDescription>{client.contact_phone || client.contact_email || "-"}</CardDescription>
                                            </div>
                                            <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8 text-muted-foreground">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {/* Assuming industry is always present as per snippet, but keeping original conditional for safety */}
                                                {client.industry && <Badge variant="secondary">{client.industry}</Badge>}
                                                {/* Location badge removed as per snippet, but keeping original conditional for safety */}
                                                {client.location && <Badge variant="outline">{client.location}</Badge>}
                                                {client.tone?.map((t, i) => (
                                                    <Badge key={i} variant="outline">{toneLabels[t] || t}</Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                        <CardFooter className="flex justify-end gap-2 border-t p-4 bg-muted/20">
                                            <Button variant="ghost" size="sm" className="h-8">
                                                <Edit className="mr-2 h-3.5 w-3.5" />
                                                수정
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-destructive hover:text-destructive"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(client.id); }} // Prevent navigation on delete click
                                            >
                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                삭제
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </Link>
                            ))}

                            {/* Add New Placeholder Card */}
                            <ClientDialog>
                                <button className="flex h-[200px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                        <Plus className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground">새 광고주 등록하기</span>
                                </button>
                            </ClientDialog>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    )
}
