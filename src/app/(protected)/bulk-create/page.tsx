"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Factory, FileText, Loader2, Sparkles, Flame, FolderOpen, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AppLayout } from "@/components/layout/AppLayout"
import { AdvertiserFilterBar, FilterConditions } from "@/components/bulk/AdvertiserFilterBar"

interface Template {
    id: string
    title: string
    category: string
    platform: string
    content_structure: string
    description: string | null
    variables: string[]
    isPublic?: boolean
    usage_count?: number
}

interface Advertiser {
    id: string
    name: string
    industry: string | null
    location?: string | null
    advanced_profile: {
        basic_info?: { location?: string; phone?: string }
        service_info?: { main_products?: string[]; unique_selling_points?: string[] }
    } | null
}

// 카테고리를 그룹으로 매핑
const getCategoryGroup = (category: string): string => {
    const academyCategories = ["수학학원", "영어학원", "국어학원", "영수학원", "종합학원", "태권도학원", "피아노학원", "미술학원", "코딩학원", "입시학원"]
    const hospitalCategories = ["치과", "피부과", "성형외과", "내과", "정형외과", "한의원", "안과", "소아과", "동물병원"]
    const foodCategories = ["한식", "중식", "일식", "양식", "카페", "베이커리", "분식", "고기집"]
    const beautyCategories = ["헬스장", "필라테스", "요가", "네일샵", "헤어샵", "피부관리샵"]

    if (academyCategories.includes(category)) return "학원"
    if (hospitalCategories.includes(category)) return "병원"
    if (foodCategories.includes(category)) return "맛집"
    if (beautyCategories.includes(category)) return "뷰티/헬스"
    return "기타"
}

const CATEGORY_GROUP_COLORS: Record<string, string> = {
    "학원": "bg-blue-100 text-blue-700",
    "병원": "bg-green-100 text-green-700",
    "맛집": "bg-orange-100 text-orange-700",
    "뷰티/헬스": "bg-pink-100 text-pink-700",
    "기타": "bg-gray-100 text-gray-700",
}

// 변수명을 한글로 표시
const VARIABLE_LABELS: Record<string, string> = {
    'company_name': '업체명',
    'name': '업체명',
    'location': '지역',
    'phone': '전화번호',
    'usp': '강점',
    'menu': '메뉴/서비스',
    'target': '타겟 고객',
    'keyword': '키워드',
}

export default function BulkCreatePage() {
    const router = useRouter()
    const [publicTemplates, setPublicTemplates] = React.useState<Template[]>([])
    const [privateTemplates, setPrivateTemplates] = React.useState<Template[]>([])
    const [advertisers, setAdvertisers] = React.useState<Advertiser[]>([])
    const [totalAdvertisers, setTotalAdvertisers] = React.useState(0)
    const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null)
    const [selectedAdvertisers, setSelectedAdvertisers] = React.useState<Set<string>>(new Set())
    const [selectionMode, setSelectionMode] = React.useState<'page' | 'all'>('page')
    const [excludeIds, setExcludeIds] = React.useState<Set<string>>(new Set())
    const [filters, setFilters] = React.useState<FilterConditions>({})
    const [loading, setLoading] = React.useState(true)
    const [generating, setGenerating] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState("public")

    // 템플릿 로드
    React.useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await fetch("/api/templates?scope=all")
                if (res.ok) {
                    const allTemplates = await res.json()
                    setPublicTemplates(allTemplates.filter((t: Template) => t.isPublic))
                    setPrivateTemplates(allTemplates.filter((t: Template) => !t.isPublic))
                }
            } catch (error) {
                console.error("Failed to fetch templates:", error)
            }
        }
        fetchTemplates()
    }, [])

    // 광고주 로드 (필터 변경 시)
    React.useEffect(() => {
        const fetchAdvertisers = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                if (filters.search) params.append('search', filters.search)
                if (filters.category) params.append('category', filters.category)
                if (filters.location) params.append('location', filters.location)
                params.append('all', 'true') // 페이지네이션 없이 전체 조회

                const res = await fetch(`/api/advertisers?${params.toString()}`)
                if (res.ok) {
                    const result = await res.json()
                    setAdvertisers(result.data || [])
                    setTotalAdvertisers(result.meta?.total || result.data?.length || 0)
                }
            } catch (error) {
                console.error("Failed to fetch advertisers:", error)
                toast.error("광고주 목록을 불러오는데 실패했습니다.")
            } finally {
                setLoading(false)
            }
        }
        fetchAdvertisers()
        // 필터 변경 시 선택 초기화
        setSelectedAdvertisers(new Set())
        setSelectionMode('page')
        setExcludeIds(new Set())
    }, [filters])

    const toggleAdvertiser = (id: string) => {
        if (selectionMode === 'all') {
            // 전체 선택 모드에서는 제외 목록 관리
            const newExclude = new Set(excludeIds)
            if (newExclude.has(id)) {
                newExclude.delete(id)
            } else {
                newExclude.add(id)
            }
            setExcludeIds(newExclude)
        } else {
            // 개별 선택 모드
            const newSet = new Set(selectedAdvertisers)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            setSelectedAdvertisers(newSet)
        }
    }

    const toggleCurrentPage = () => {
        if (selectionMode === 'all') {
            // 전체 선택 모드 해제
            setSelectionMode('page')
            setSelectedAdvertisers(new Set())
            setExcludeIds(new Set())
        } else {
            // 현재 표시된 광고주 전체 선택/해제
            const allIds = new Set(advertisers.map(a => a.id))
            if (selectedAdvertisers.size === advertisers.length) {
                setSelectedAdvertisers(new Set())
            } else {
                setSelectedAdvertisers(allIds)
            }
        }
    }

    const selectAllFiltered = () => {
        setSelectionMode('all')
        setExcludeIds(new Set())
        toast.success(`검색 결과 ${totalAdvertisers}개 광고주가 모두 선택되었습니다.`)
    }

    // 실제 선택된 광고주 수 계산
    const getSelectedCount = (): number => {
        if (selectionMode === 'all') {
            return totalAdvertisers - excludeIds.size
        }
        return selectedAdvertisers.size
    }

    // 광고주가 선택되어 있는지 확인
    const isSelected = (id: string): boolean => {
        if (selectionMode === 'all') {
            return !excludeIds.has(id)
        }
        return selectedAdvertisers.has(id)
    }

    // 선택된 광고주 중 누락된 변수가 있는 광고주 체크
    const getAdvertisersMissingVariables = (): Map<string, string[]> => {
        if (!selectedTemplate) return new Map()

        const missingMap = new Map<string, string[]>()
        const templateVars = selectedTemplate.variables || []

        const checkList = selectionMode === 'all'
            ? advertisers.filter(a => !excludeIds.has(a.id))
            : advertisers.filter(a => selectedAdvertisers.has(a.id))

        for (const adv of checkList) {
            const missing: string[] = []
            for (const v of templateVars) {
                const varName = v.toLowerCase()
                if (varName === 'location' && !adv.advanced_profile?.basic_info?.location) {
                    missing.push(v)
                } else if (varName === 'phone' && !adv.advanced_profile?.basic_info?.phone) {
                    missing.push(v)
                } else if (varName === 'usp' && (!adv.advanced_profile?.service_info?.unique_selling_points || adv.advanced_profile.service_info.unique_selling_points.length === 0)) {
                    missing.push(v)
                } else if (varName === 'menu' && (!adv.advanced_profile?.service_info?.main_products || adv.advanced_profile.service_info.main_products.length === 0)) {
                    missing.push(v)
                }
            }

            if (missing.length > 0) {
                missingMap.set(adv.id, missing)
            }
        }

        return missingMap
    }

    const handleGenerate = async () => {
        if (!selectedTemplate) {
            toast.error("템플릿을 선택해주세요.")
            return
        }

        const selectedCount = getSelectedCount()
        if (selectedCount === 0) {
            toast.error("광고주를 1개 이상 선택해주세요.")
            return
        }

        setGenerating(true)

        try {
            // 선택된 광고주 ID 목록 생성
            let advertiserIds: string[]
            if (selectionMode === 'all') {
                advertiserIds = advertisers.filter(a => !excludeIds.has(a.id)).map(a => a.id)
            } else {
                advertiserIds = Array.from(selectedAdvertisers)
            }

            const res = await fetch("/api/contents/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    template_id: selectedTemplate.id,
                    advertiser_ids: advertiserIds,
                    use_ai_correction: true,
                }),
            })

            const data = await res.json()

            if (res.ok) {
                toast.success(
                    `${data.success_count}개의 콘텐츠가 생성되었습니다!`,
                    { duration: 5000 }
                )
                if (data.failed_ids?.length > 0) {
                    toast.warning(`${data.failed_ids.length}개 광고주는 생성에 실패했습니다.`)
                }
                router.push("/dashboard")
            } else {
                toast.error(data.error || "콘텐츠 생성에 실패했습니다.")
            }
        } catch (error) {
            console.error("Bulk generate error:", error)
            toast.error("콘텐츠 생성 중 오류가 발생했습니다.")
        } finally {
            setGenerating(false)
        }
    }

    const missingVarsMap = getAdvertisersMissingVariables()
    const selectedCount = getSelectedCount()

    const renderTemplateCard = (template: Template) => (
        <div
            key={template.id}
            onClick={() => setSelectedTemplate(template)}
            className={cn(
                "p-4 border rounded-lg cursor-pointer transition-all",
                selectedTemplate?.id === template.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:border-gray-300 hover:bg-gray-50"
            )}
        >
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium">{template.title}</h3>
                        {template.isPublic && (
                            <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded font-medium">
                                공식
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 mt-1">
                        <span
                            className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                CATEGORY_GROUP_COLORS[getCategoryGroup(template.category)] || CATEGORY_GROUP_COLORS["기타"]
                            )}
                        >
                            {template.category}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {template.platform === "blog" ? "블로그" : template.platform === "instagram" ? "인스타그램" : template.platform}
                        </span>
                        {template.usage_count && template.usage_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                                {template.usage_count}회 사용
                            </span>
                        )}
                    </div>
                </div>
                {selectedTemplate?.id === template.id && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}
            </div>
            {template.description && (
                <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-muted-foreground mr-1">사용 변수:</span>
                {template.variables.map((v) => (
                    <span key={v} className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                        {VARIABLE_LABELS[v.toLowerCase()] || v}
                    </span>
                ))}
            </div>
        </div>
    )

    return (
        <AppLayout>
        <div className="p-8 max-w-7xl mx-auto">
            {/* 헤더 */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                    <Factory className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">대량 생산 워크스페이스</h1>
                    <p className="text-muted-foreground">템플릿 선택 → 광고주 다중 선택 → 일괄 생성</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Step 1: 템플릿 선택 (탭 구분) */}
                <div className="bg-white border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center font-semibold">
                            1
                        </div>
                        <h2 className="font-semibold text-lg">템플릿 선택</h2>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="public" className="flex items-center gap-2">
                                <Flame className="w-4 h-4" />
                                위플 공식 템플릿
                                {publicTemplates.length > 0 && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                                        {publicTemplates.length}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="private" className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" />
                                내 템플릿
                                {privateTemplates.length > 0 && (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                        {privateTemplates.length}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="public" className="mt-0">
                            {publicTemplates.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                    <Flame className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-muted-foreground">아직 공식 템플릿이 없습니다</p>
                                    <p className="text-xs text-muted-foreground mt-1">관리자가 등록한 고퀄리티 템플릿이 여기에 표시됩니다</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {publicTemplates.map(renderTemplateCard)}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="private" className="mt-0">
                            {privateTemplates.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                    <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-muted-foreground mb-3">등록된 내 템플릿이 없습니다</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push("/settings/templates")}
                                    >
                                        템플릿 만들러 가기
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {privateTemplates.map(renderTemplateCard)}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Step 2: 광고주 선택 (스마트 타겟팅) */}
                <div className="bg-white border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center font-semibold">
                            2
                        </div>
                        <h2 className="font-semibold text-lg">광고주 선택</h2>
                        <span className="text-sm text-primary font-medium ml-auto">
                            {selectedCount}개 선택됨
                        </span>
                    </div>

                    {/* 선택된 템플릿의 필수 변수 안내 */}
                    {selectedTemplate && selectedTemplate.variables.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-blue-800">
                                이 템플릿은 광고주의 <strong>{selectedTemplate.variables.map(v => VARIABLE_LABELS[v.toLowerCase()] || v).join(', ')}</strong> 데이터가 필요합니다.
                            </p>
                        </div>
                    )}

                    {/* 스마트 필터 바 */}
                    <AdvertiserFilterBar
                        filters={filters}
                        onFiltersChange={setFilters}
                        totalCount={totalAdvertisers}
                        selectedCount={selectedCount}
                    />

                    {/* 데이터 테이블 */}
                    <div className="mt-4 border rounded-lg overflow-hidden">
                        {/* 테이블 헤더 */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b text-sm font-medium text-muted-foreground">
                            <Checkbox
                                checked={selectionMode === 'all' || (selectedAdvertisers.size === advertisers.length && advertisers.length > 0)}
                                onCheckedChange={toggleCurrentPage}
                            />
                            <span className="flex-1">광고주명</span>
                            <span className="w-24 text-center">업종</span>
                            <span className="w-20 text-center">지역</span>
                            <span className="w-24 text-center">데이터 상태</span>
                        </div>

                        {/* 전체 선택 안내 (Gmail 스타일) */}
                        {selectedAdvertisers.size === advertisers.length && advertisers.length > 0 && selectionMode === 'page' && totalAdvertisers > advertisers.length && (
                            <div className="px-4 py-2 bg-blue-50 text-sm text-blue-800 border-b">
                                현재 페이지의 {advertisers.length}개가 선택되었습니다.{' '}
                                <button
                                    onClick={selectAllFiltered}
                                    className="text-blue-600 hover:underline font-medium"
                                >
                                    검색 결과 {totalAdvertisers}개 모두 선택하기
                                </button>
                            </div>
                        )}

                        {selectionMode === 'all' && (
                            <div className="px-4 py-2 bg-green-50 text-sm text-green-800 border-b">
                                검색 결과 {totalAdvertisers}개 광고주가 모두 선택되었습니다.
                                {excludeIds.size > 0 && ` (${excludeIds.size}개 제외됨)`}
                            </div>
                        )}

                        {/* 테이블 바디 */}
                        <div className="max-h-[350px] overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : advertisers.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>검색 결과가 없습니다</p>
                                </div>
                            ) : (
                                advertisers.map((advertiser) => {
                                    const missingVars = missingVarsMap.get(advertiser.id)
                                    const hasAllData = !missingVars || missingVars.length === 0
                                    const selected = isSelected(advertiser.id)
                                    const advLocation = advertiser.location || advertiser.advanced_profile?.basic_info?.location

                                    return (
                                        <div
                                            key={advertiser.id}
                                            onClick={() => toggleAdvertiser(advertiser.id)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-colors",
                                                selected ? "bg-primary/5" : "hover:bg-gray-50",
                                                missingVars && missingVars.length > 0 && selected && "bg-amber-50"
                                            )}
                                        >
                                            <Checkbox
                                                checked={selected}
                                                onCheckedChange={() => toggleAdvertiser(advertiser.id)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium truncate block">{advertiser.name}</span>
                                            </div>
                                            <span className="w-24 text-center text-sm text-muted-foreground truncate">
                                                {advertiser.industry || '-'}
                                            </span>
                                            <span className="w-20 text-center text-sm text-muted-foreground truncate">
                                                {advLocation || '-'}
                                            </span>
                                            <div className="w-24 flex justify-center">
                                                {selectedTemplate ? (
                                                    hasAllData ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-green-600" title="필수 데이터 완료">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="inline-flex items-center gap-1 text-xs text-amber-600"
                                                            title={`누락: ${missingVars?.map(v => VARIABLE_LABELS[v.toLowerCase()] || v).join(', ')}`}
                                                        >
                                                            <AlertTriangle className="w-4 h-4" />
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 3: 실행 (플로팅 스타일) */}
            <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-sm flex items-center justify-center font-semibold">
                            3
                        </div>
                        <div>
                            <h2 className="font-semibold text-lg">콘텐츠 생성</h2>
                            <p className="text-sm text-muted-foreground">
                                {selectedTemplate
                                    ? `"${selectedTemplate.title}" 템플릿으로 `
                                    : "템플릿 선택 후 "}
                                {selectedCount > 0
                                    ? `${selectedCount}개 광고주의 콘텐츠를 생성합니다`
                                    : "광고주를 선택해주세요"}
                            </p>
                            {missingVarsMap.size > 0 && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {missingVarsMap.size}개 광고주의 일부 데이터가 누락되어 있습니다 (기본값으로 대체됨)
                                </p>
                            )}
                        </div>
                    </div>

                    <Button
                        size="lg"
                        onClick={handleGenerate}
                        disabled={!selectedTemplate || selectedCount === 0 || generating}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                생성 중...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                {selectedCount}개 콘텐츠 일괄 생성
                            </>
                        )}
                    </Button>
                </div>

                {generating && (
                    <div className="mt-4">
                        <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse w-full" />
                        </div>
                        <p className="text-sm text-center text-muted-foreground mt-2">
                            스마트 치환 + AI 문법 보정으로 콘텐츠를 생성하고 있습니다...
                        </p>
                    </div>
                )}
            </div>
        </div>
        </AppLayout>
    )
}
