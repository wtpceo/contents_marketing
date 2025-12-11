"use client"

import * as React from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Plus, MoreVertical, Trash2, Edit, Loader2,
    LayoutGrid, List, ChevronLeft, ChevronRight,
    Calendar, Search, Send, FileText, ChevronDown, RefreshCw
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { ClientDialog } from "@/components/clients/ClientDialog"
import { StatusBadge, MonthlyStatus, getStatusEmoji, getStatusLabel } from "@/components/clients/StatusBadge"
import { ProgressBar } from "@/components/clients/ProgressBar"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AdvertiserDashboardItem {
    id: string
    name: string
    industry: string | null
    location: string | null
    contact_phone: string | null
    monthly_status: MonthlyStatus
    content_stats: {
        total: number
        draft: number
        pending: number
        revision: number
        approved: number
    }
    progress: number
    deploy_dates: string | null
    latest_activity: {
        description: string
        date: string
    } | null
}

interface DashboardMeta {
    month: string
    total: number
    byStatus: Record<MonthlyStatus, number>
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

const STATUS_TABS: { status: MonthlyStatus | 'ALL'; label: string }[] = [
    { status: 'ALL', label: '전체' },
    { status: 'EMPTY', label: '🔴 기획 필요' },
    { status: 'DRAFTING', label: '🟠 제작 중' },
    { status: 'PENDING', label: '🟡 컨펌 대기' },
    { status: 'REVISION', label: '🔵 수정 요청' },
    { status: 'READY', label: '🟢 배포 준비' },
]

export default function ClientsPage() {
    const router = useRouter()

    // 뷰 모드: list (default) | card
    const [viewMode, setViewMode] = React.useState<'list' | 'card'>('list')

    // 월 선택
    const [selectedMonth, setSelectedMonth] = React.useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })

    // 상태 필터
    const [activeStatus, setActiveStatus] = React.useState<MonthlyStatus | 'ALL'>('ALL')

    // 검색
    const [search, setSearch] = React.useState('')
    const [debouncedSearch, setDebouncedSearch] = React.useState('')

    // 데이터
    const [clients, setClients] = React.useState<AdvertiserDashboardItem[]>([])
    const [meta, setMeta] = React.useState<DashboardMeta | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    // 선택된 광고주
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

    // 검색 디바운스
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(timer)
    }, [search])

    // 데이터 로드
    const fetchDashboard = React.useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('month', selectedMonth)
            if (activeStatus !== 'ALL') params.set('status', activeStatus)
            if (debouncedSearch) params.set('search', debouncedSearch)

            const response = await fetch(`/api/advertisers/dashboard?${params}`)
            if (!response.ok) throw new Error("데이터를 불러오는데 실패했습니다.")

            const result = await response.json()
            setClients(result.data || [])
            setMeta(result.meta || null)
            setSelectedIds(new Set())
        } catch (err) {
            setError(err instanceof Error ? err.message : "오류가 발생했습니다.")
        } finally {
            setLoading(false)
        }
    }, [selectedMonth, activeStatus, debouncedSearch])

    React.useEffect(() => {
        fetchDashboard()
    }, [fetchDashboard])

    // 월 변경
    const changeMonth = (delta: number) => {
        const [year, month] = selectedMonth.split('-').map(Number)
        const newDate = new Date(year, month - 1 + delta, 1)
        setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`)
    }

    const formatMonth = (month: string) => {
        const [y, m] = month.split('-')
        return `${y}년 ${parseInt(m)}월`
    }

    // 선택 토글
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === clients.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(clients.map(c => c.id)))
        }
    }

    // 삭제
    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return
        try {
            const response = await fetch(`/api/advertisers/${id}`, { method: "DELETE" })
            if (!response.ok) throw new Error("삭제에 실패했습니다.")
            fetchDashboard()
            toast.success("광고주가 삭제되었습니다.")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.")
        }
    }

    // 대량 생산으로 이동
    const goToBulkCreate = () => {
        const ids = Array.from(selectedIds).join(',')
        router.push(`/bulk-create?advertiser_ids=${ids}`)
    }

    // 컨펌 요청 발송 (TODO: 실제 API 연동 필요)
    const sendConfirmRequest = async () => {
        // 제작 중 상태인 광고주만 필터
        const draftingClients = clients.filter(
            c => selectedIds.has(c.id) && c.monthly_status === 'DRAFTING'
        )
        if (draftingClients.length === 0) {
            toast.error("'제작 중' 상태의 광고주만 컨펌 요청을 보낼 수 있습니다.")
            return
        }
        toast.success(`${draftingClients.length}명에게 컨펌 요청을 발송합니다. (기능 준비 중)`)
    }

    // 상태 변경 (콘텐츠 상태를 일괄 변경하여 월별 상태 전환)
    const changeStatus = async (advertiserId: string, newContentStatus: string) => {
        try {
            const response = await fetch('/api/contents/bulk-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    advertiser_id: advertiserId,
                    month: selectedMonth,
                    status: newContentStatus
                })
            })
            if (!response.ok) throw new Error("상태 변경에 실패했습니다.")

            const result = await response.json()
            toast.success(`${result.updated_count}개 콘텐츠 상태가 변경되었습니다.`)
            fetchDashboard()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "상태 변경에 실패했습니다.")
        }
    }

    // 선택된 광고주들의 상태 일괄 변경
    const bulkChangeStatus = async (newContentStatus: string) => {
        if (selectedIds.size === 0) return

        const statusLabel: Record<string, string> = {
            draft: '제작 중',
            pending: '컨펌 대기',
            revision: '수정 요청',
            approved: '승인 완료'
        }

        try {
            let totalUpdated = 0
            for (const advertiserId of selectedIds) {
                const response = await fetch('/api/contents/bulk-status', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        advertiser_id: advertiserId,
                        month: selectedMonth,
                        status: newContentStatus
                    })
                })
                if (response.ok) {
                    const result = await response.json()
                    totalUpdated += result.updated_count
                }
            }

            toast.success(`${selectedIds.size}명의 광고주, 총 ${totalUpdated}개 콘텐츠가 '${statusLabel[newContentStatus]}'(으)로 변경되었습니다.`)
            setSelectedIds(new Set())
            fetchDashboard()
        } catch (err) {
            toast.error("일괄 상태 변경에 실패했습니다.")
        }
    }

    return (
        <AppLayout>
            <div className="flex flex-col h-full">
                {/* 헤더 */}
                <header className="flex h-14 items-center justify-between border-b bg-muted/40 px-6 lg:h-[60px]">
                    <h1 className="text-lg font-semibold">광고주 관리</h1>
                    <ClientDialog onSuccess={fetchDashboard}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            광고주 등록
                        </Button>
                    </ClientDialog>
                </header>

                {/* 컨트롤 바 */}
                <div className="border-b bg-background px-6 py-3 space-y-3">
                    {/* 상단 행: 뷰 모드 토글, 월 선택, 검색 */}
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* 뷰 모드 토글 */}
                        <div className="flex items-center border rounded-lg overflow-hidden">
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-none"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-4 w-4 mr-1" />
                                리스트
                            </Button>
                            <Button
                                variant={viewMode === 'card' ? 'default' : 'ghost'}
                                size="sm"
                                className="rounded-none"
                                onClick={() => setViewMode('card')}
                            >
                                <LayoutGrid className="h-4 w-4 mr-1" />
                                카드
                            </Button>
                        </div>

                        {/* 월 선택 */}
                        <div className="flex items-center gap-1 border rounded-lg px-2 py-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeMonth(-1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium min-w-[100px] text-center">
                                {formatMonth(selectedMonth)}
                            </span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changeMonth(1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* 검색 */}
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="광고주명 검색..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                    </div>

                    {/* 상태 탭 */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {STATUS_TABS.map(tab => {
                            const count = tab.status === 'ALL'
                                ? meta?.total || 0
                                : meta?.byStatus?.[tab.status] || 0

                            return (
                                <Button
                                    key={tab.status}
                                    variant={activeStatus === tab.status ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setActiveStatus(tab.status)}
                                    className="whitespace-nowrap"
                                >
                                    {tab.label} ({count})
                                </Button>
                            )
                        })}
                    </div>
                </div>

                {/* 콘텐츠 영역 */}
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-64 text-red-500">
                            {error}
                        </div>
                    ) : viewMode === 'list' ? (
                        /* 리스트 뷰 */
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={clients.length > 0 && selectedIds.size === clients.length}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>광고주 정보</TableHead>
                                        <TableHead className="w-32">이번 달 상태</TableHead>
                                        <TableHead className="w-40">진행률</TableHead>
                                        <TableHead className="w-48">최근 활동</TableHead>
                                        <TableHead className="w-32">배포일</TableHead>
                                        <TableHead className="w-24 text-right">관리</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {clients.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                                광고주가 없습니다.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        clients.map(client => (
                                            <TableRow
                                                key={client.id}
                                                className={cn(
                                                    "cursor-pointer hover:bg-muted/50",
                                                    client.monthly_status === 'REVISION' && "bg-blue-50"
                                                )}
                                                onClick={() => router.push(`/clients/${client.id}`)}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selectedIds.has(client.id)}
                                                        onCheckedChange={() => toggleSelect(client.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <span className="font-medium">{client.name}</span>
                                                        {client.industry && (
                                                            <Badge variant="secondary" className="ml-2 text-xs">
                                                                {client.industry}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {client.location && (
                                                        <span className="text-xs text-muted-foreground">{client.location}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    {client.monthly_status === 'EMPTY' ? (
                                                        <StatusBadge status={client.monthly_status} />
                                                    ) : (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                                                                    <StatusBadge status={client.monthly_status} />
                                                                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="start">
                                                                <DropdownMenuLabel>상태 변경</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => changeStatus(client.id, 'draft')}>
                                                                    🟠 제작 중
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => changeStatus(client.id, 'pending')}>
                                                                    🟡 컨펌 대기
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => changeStatus(client.id, 'revision')}>
                                                                    🔵 수정 요청
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => changeStatus(client.id, 'approved')}>
                                                                    🟢 배포 준비
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <ProgressBar
                                                        approved={client.content_stats.approved}
                                                        total={client.content_stats.total}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {client.latest_activity ? (
                                                        <span className="text-xs text-muted-foreground">
                                                            {client.latest_activity.date} {client.latest_activity.description}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">
                                                        {client.deploy_dates || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            title="캘린더"
                                                            onClick={() => router.push(`/dashboard?advertiser=${client.id}`)}
                                                        >
                                                            <Calendar className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive"
                                                            title="삭제"
                                                            onClick={() => handleDelete(client.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        /* 카드 뷰 */
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {clients.map(client => (
                                <Link href={`/clients/${client.id}`} key={client.id} className="block group">
                                    <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                            <div className="space-y-1">
                                                <CardTitle className="text-base group-hover:text-primary transition-colors">
                                                    {client.name}
                                                </CardTitle>
                                                <CardDescription>
                                                    {client.contact_phone || '-'}
                                                </CardDescription>
                                            </div>
                                            <StatusBadge status={client.monthly_status} />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {client.industry && <Badge variant="secondary">{client.industry}</Badge>}
                                                {client.location && <Badge variant="outline">{client.location}</Badge>}
                                            </div>
                                            <div className="mt-3">
                                                <ProgressBar
                                                    approved={client.content_stats.approved}
                                                    total={client.content_stats.total}
                                                />
                                            </div>
                                        </CardContent>
                                        <CardFooter className="flex justify-between border-t p-4 bg-muted/20">
                                            <span className="text-xs text-muted-foreground">
                                                {client.latest_activity?.description || '활동 없음'}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-destructive hover:text-destructive"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(client.id); }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </Link>
                            ))}

                            {/* 새 광고주 추가 카드 */}
                            <ClientDialog onSuccess={fetchDashboard}>
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

                {/* 플로팅 Bulk Action 바 */}
                {selectedIds.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4 z-50">
                        <span className="text-sm font-medium">
                            {selectedIds.size}명 선택됨
                        </span>
                        <div className="h-6 w-px bg-border" />
                        <Button size="sm" onClick={goToBulkCreate}>
                            <FileText className="h-4 w-4 mr-2" />
                            템플릿 적용
                        </Button>
                        <Button size="sm" variant="outline" onClick={sendConfirmRequest}>
                            <Send className="h-4 w-4 mr-2" />
                            컨펌 요청 발송
                        </Button>

                        {/* 일괄 상태 변경 드롭다운 */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    상태 변경
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>일괄 상태 변경</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => bulkChangeStatus('draft')}>
                                    🟠 제작 중으로 변경
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => bulkChangeStatus('pending')}>
                                    🟡 컨펌 대기로 변경
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => bulkChangeStatus('revision')}>
                                    🔵 수정 요청으로 변경
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => bulkChangeStatus('approved')}>
                                    🟢 배포 준비로 변경
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            선택 해제
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
