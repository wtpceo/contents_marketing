"use client"

import * as React from "react"
import { Search, Filter, X, FolderOpen, Save, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface FilterConditions {
    search?: string
    category?: string
    location?: string
    tags?: string[]
}

interface AdvertiserGroup {
    id: string
    name: string
    filter_conditions: FilterConditions
}

interface AdvertiserFilterBarProps {
    filters: FilterConditions
    onFiltersChange: (filters: FilterConditions) => void
    totalCount: number
    selectedCount: number
}

// 업종 카테고리 목록
const CATEGORIES = [
    { value: "all", label: "전체 업종" },
    // 학원
    { value: "수학학원", label: "수학학원" },
    { value: "영어학원", label: "영어학원" },
    { value: "국어학원", label: "국어학원" },
    { value: "종합학원", label: "종합학원" },
    { value: "태권도학원", label: "태권도학원" },
    { value: "피아노학원", label: "피아노학원" },
    { value: "미술학원", label: "미술학원" },
    { value: "코딩학원", label: "코딩학원" },
    // 병원
    { value: "치과", label: "치과" },
    { value: "피부과", label: "피부과" },
    { value: "성형외과", label: "성형외과" },
    { value: "내과", label: "내과" },
    { value: "정형외과", label: "정형외과" },
    { value: "한의원", label: "한의원" },
    { value: "동물병원", label: "동물병원" },
    // 맛집
    { value: "한식", label: "한식" },
    { value: "중식", label: "중식" },
    { value: "일식", label: "일식" },
    { value: "양식", label: "양식" },
    { value: "카페", label: "카페" },
    { value: "베이커리", label: "베이커리" },
    // 뷰티/헬스
    { value: "헬스장", label: "헬스장" },
    { value: "필라테스", label: "필라테스" },
    { value: "네일샵", label: "네일샵" },
    { value: "헤어샵", label: "헤어샵" },
    // 기타
    { value: "부동산", label: "부동산" },
    { value: "쇼핑몰", label: "쇼핑몰" },
]

// 지역 목록
const LOCATIONS = [
    { value: "all", label: "전체 지역" },
    { value: "서울", label: "서울" },
    { value: "경기", label: "경기" },
    { value: "인천", label: "인천" },
    { value: "부산", label: "부산" },
    { value: "대구", label: "대구" },
    { value: "대전", label: "대전" },
    { value: "광주", label: "광주" },
    { value: "울산", label: "울산" },
    { value: "세종", label: "세종" },
    { value: "강원", label: "강원" },
    { value: "충북", label: "충북" },
    { value: "충남", label: "충남" },
    { value: "전북", label: "전북" },
    { value: "전남", label: "전남" },
    { value: "경북", label: "경북" },
    { value: "경남", label: "경남" },
    { value: "제주", label: "제주" },
]

export function AdvertiserFilterBar({
    filters,
    onFiltersChange,
    totalCount,
    selectedCount,
}: AdvertiserFilterBarProps) {
    const [groups, setGroups] = React.useState<AdvertiserGroup[]>([])
    const [showSaveDialog, setShowSaveDialog] = React.useState(false)
    const [groupName, setGroupName] = React.useState("")
    const [saving, setSaving] = React.useState(false)

    // 그룹 목록 로드
    React.useEffect(() => {
        const fetchGroups = async () => {
            try {
                const res = await fetch("/api/advertiser-groups")
                if (res.ok) {
                    const data = await res.json()
                    setGroups(data)
                }
            } catch (error) {
                console.error("Failed to fetch groups:", error)
            }
        }
        fetchGroups()
    }, [])

    const handleSearchChange = (value: string) => {
        onFiltersChange({ ...filters, search: value || undefined })
    }

    const handleCategoryChange = (value: string) => {
        onFiltersChange({ ...filters, category: value === "all" ? undefined : value })
    }

    const handleLocationChange = (value: string) => {
        onFiltersChange({ ...filters, location: value === "all" ? undefined : value })
    }

    const handleGroupSelect = (groupId: string) => {
        if (groupId === "all") {
            onFiltersChange({})
            return
        }
        const group = groups.find(g => g.id === groupId)
        if (group) {
            onFiltersChange(group.filter_conditions)
            toast.success(`"${group.name}" 그룹이 적용되었습니다.`)
        }
    }

    const removeFilter = (key: keyof FilterConditions) => {
        const newFilters = { ...filters }
        delete newFilters[key]
        onFiltersChange(newFilters)
    }

    const clearAllFilters = () => {
        onFiltersChange({})
    }

    const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== "")

    const handleSaveGroup = async () => {
        if (!groupName.trim()) {
            toast.error("그룹 이름을 입력해주세요.")
            return
        }

        if (!hasActiveFilters) {
            toast.error("저장할 필터 조건이 없습니다.")
            return
        }

        setSaving(true)
        try {
            const res = await fetch("/api/advertiser-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: groupName,
                    filter_conditions: filters,
                }),
            })

            if (res.ok) {
                const newGroup = await res.json()
                setGroups([newGroup, ...groups])
                toast.success("그룹이 저장되었습니다.")
                setShowSaveDialog(false)
                setGroupName("")
            } else {
                const data = await res.json()
                toast.error(data.error || "그룹 저장에 실패했습니다.")
            }
        } catch (error) {
            toast.error("그룹 저장 중 오류가 발생했습니다.")
        } finally {
            setSaving(false)
        }
    }

    // 활성화된 필터 칩 목록
    const activeFilterChips = []
    if (filters.category) {
        activeFilterChips.push({ key: "category", label: `업종: ${filters.category}` })
    }
    if (filters.location) {
        activeFilterChips.push({ key: "location", label: `지역: ${filters.location}` })
    }
    if (filters.search) {
        activeFilterChips.push({ key: "search", label: `검색: ${filters.search}` })
    }

    return (
        <div className="space-y-3">
            {/* 상단 컨트롤 바 */}
            <div className="flex flex-wrap items-center gap-2">
                {/* 그룹 불러오기 */}
                <Select onValueChange={handleGroupSelect}>
                    <SelectTrigger className="w-[180px]">
                        <FolderOpen className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="그룹 불러오기" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">전체 광고주</SelectItem>
                        {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                                {group.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* 검색 */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="광고주명 검색..."
                        value={filters.search || ""}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* 업종 필터 */}
                <Select value={filters.category || "all"} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="업종" />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* 지역 필터 */}
                <Select value={filters.location || "all"} onValueChange={handleLocationChange}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="지역" />
                    </SelectTrigger>
                    <SelectContent>
                        {LOCATIONS.map((loc) => (
                            <SelectItem key={loc.value} value={loc.value}>
                                {loc.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* 그룹 저장 버튼 */}
                {hasActiveFilters && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSaveDialog(true)}
                        className="gap-1"
                    >
                        <Save className="w-4 h-4" />
                        그룹 저장
                    </Button>
                )}
            </div>

            {/* 활성 필터 칩 */}
            {activeFilterChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">적용된 필터:</span>
                    {activeFilterChips.map((chip) => (
                        <span
                            key={chip.key}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        >
                            {chip.label}
                            <button
                                onClick={() => removeFilter(chip.key as keyof FilterConditions)}
                                className="hover:bg-primary/20 rounded-full p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    <button
                        onClick={clearAllFilters}
                        className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                        전체 해제
                    </button>
                </div>
            )}

            {/* 결과 카운트 */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                    검색 결과 <strong className="text-foreground">{totalCount}</strong>개 광고주
                </span>
                {selectedCount > 0 && (
                    <span className="text-primary font-medium">
                        {selectedCount}개 선택됨
                    </span>
                )}
            </div>

            {/* 그룹 저장 다이얼로그 */}
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>필터 조건을 그룹으로 저장</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>그룹 이름</Label>
                            <Input
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="예: 서울 수학학원"
                            />
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">저장될 조건:</p>
                            <div className="flex flex-wrap gap-1">
                                {activeFilterChips.map((chip) => (
                                    <span
                                        key={chip.key}
                                        className="text-xs px-2 py-1 bg-background rounded"
                                    >
                                        {chip.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                            취소
                        </Button>
                        <Button onClick={handleSaveGroup} disabled={saving}>
                            {saving ? "저장 중..." : "저장"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
