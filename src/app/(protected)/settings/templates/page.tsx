"use client"

import * as React from "react"
import { Plus, FileText, Trash2, Edit2, Copy, Info, Globe, Lock, Wand2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AppLayout } from "@/components/layout/AppLayout"

interface Template {
    id: string
    title: string
    category: string
    platform: string
    content_structure: string
    description: string | null
    variables: string[]
    usage_count: number
    created_at: string
    visibility?: 'public' | 'private'
    isPublic?: boolean
}

const CATEGORIES = [
    // 학원
    { value: "수학학원", label: "수학학원", group: "학원" },
    { value: "영어학원", label: "영어학원", group: "학원" },
    { value: "국어학원", label: "국어학원", group: "학원" },
    { value: "영수학원", label: "영수학원", group: "학원" },
    { value: "종합학원", label: "종합학원", group: "학원" },
    { value: "태권도학원", label: "태권도학원", group: "학원" },
    { value: "피아노학원", label: "피아노학원", group: "학원" },
    { value: "미술학원", label: "미술학원", group: "학원" },
    { value: "코딩학원", label: "코딩학원", group: "학원" },
    { value: "입시학원", label: "입시학원", group: "학원" },
    // 병원
    { value: "치과", label: "치과", group: "병원" },
    { value: "피부과", label: "피부과", group: "병원" },
    { value: "성형외과", label: "성형외과", group: "병원" },
    { value: "내과", label: "내과", group: "병원" },
    { value: "정형외과", label: "정형외과", group: "병원" },
    { value: "한의원", label: "한의원", group: "병원" },
    { value: "안과", label: "안과", group: "병원" },
    { value: "소아과", label: "소아과", group: "병원" },
    { value: "동물병원", label: "동물병원", group: "병원" },
    // 맛집
    { value: "한식", label: "한식", group: "맛집" },
    { value: "중식", label: "중식", group: "맛집" },
    { value: "일식", label: "일식", group: "맛집" },
    { value: "양식", label: "양식", group: "맛집" },
    { value: "카페", label: "카페", group: "맛집" },
    { value: "베이커리", label: "베이커리", group: "맛집" },
    { value: "분식", label: "분식", group: "맛집" },
    { value: "고기집", label: "고기집", group: "맛집" },
    // 뷰티/헬스
    { value: "헬스장", label: "헬스장", group: "뷰티/헬스" },
    { value: "필라테스", label: "필라테스", group: "뷰티/헬스" },
    { value: "요가", label: "요가", group: "뷰티/헬스" },
    { value: "네일샵", label: "네일샵", group: "뷰티/헬스" },
    { value: "헤어샵", label: "헤어샵", group: "뷰티/헬스" },
    { value: "피부관리샵", label: "피부관리샵", group: "뷰티/헬스" },
    // 기타
    { value: "부동산", label: "부동산", group: "기타" },
    { value: "이벤트", label: "이벤트/프로모션", group: "기타" },
    { value: "쇼핑몰", label: "쇼핑몰", group: "기타" },
    { value: "숙박", label: "숙박/펜션", group: "기타" },
    { value: "기타", label: "기타", group: "기타" },
]

const CATEGORY_GROUPS = ["학원", "병원", "맛집", "뷰티/헬스", "기타"]

const PLATFORMS = [
    { value: "blog", label: "블로그" },
    { value: "instagram", label: "인스타그램" },
    { value: "threads", label: "스레드" },
]

const VARIABLE_HINTS = [
    { name: "name", description: "업체명" },
    { name: "location", description: "지역/주소" },
    { name: "menu", description: "대표 메뉴/상품" },
    { name: "phone", description: "전화번호" },
    { name: "usp", description: "강점 (Unique Selling Point)" },
    { name: "keyword", description: "핵심 키워드" },
    { name: "target", description: "타겟 고객" },
]

export default function TemplatesPage() {
    const [templates, setTemplates] = React.useState<Template[]>([])
    const [loading, setLoading] = React.useState(true)
    const [showModal, setShowModal] = React.useState(false)
    const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null)

    // Form states
    const [title, setTitle] = React.useState("")
    const [category, setCategory] = React.useState("")
    const [platform, setPlatform] = React.useState("blog")
    const [contentStructure, setContentStructure] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [isPublic, setIsPublic] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [autoConverting, setAutoConverting] = React.useState(false)

    const fetchTemplates = async () => {
        try {
            const res = await fetch("/api/templates")
            if (res.ok) {
                const data = await res.json()
                setTemplates(data)
            }
        } catch (error) {
            console.error("Failed to fetch templates:", error)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchTemplates()
    }, [])

    const resetForm = () => {
        setTitle("")
        setCategory("")
        setPlatform("blog")
        setContentStructure("")
        setDescription("")
        setIsPublic(false)
        setEditingTemplate(null)
    }

    const openCreateModal = () => {
        resetForm()
        setShowModal(true)
    }

    const openEditModal = (template: Template) => {
        setEditingTemplate(template)
        setTitle(template.title)
        setCategory(template.category)
        setPlatform(template.platform)
        setContentStructure(template.content_structure)
        setDescription(template.description || "")
        setIsPublic(template.visibility === 'public' || template.isPublic === true)
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!title || !category || !contentStructure) {
            toast.error("제목, 카테고리, 템플릿 내용은 필수입니다.")
            return
        }

        setSaving(true)
        try {
            const url = editingTemplate
                ? `/api/templates/${editingTemplate.id}`
                : "/api/templates"
            const method = editingTemplate ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    category,
                    platform,
                    content_structure: contentStructure,
                    description: description || null,
                    visibility: isPublic ? 'public' : 'private',
                }),
            })

            if (res.ok) {
                toast.success(editingTemplate ? "템플릿이 수정되었습니다." : "템플릿이 생성되었습니다.")
                setShowModal(false)
                resetForm()
                fetchTemplates()
            } else {
                const data = await res.json()
                toast.error(data.error || "저장에 실패했습니다.")
            }
        } catch (error) {
            toast.error("저장 중 오류가 발생했습니다.")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("정말 이 템플릿을 삭제하시겠습니까?")) return

        try {
            const res = await fetch(`/api/templates/${id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("템플릿이 삭제되었습니다.")
                fetchTemplates()
            } else {
                toast.error("삭제에 실패했습니다.")
            }
        } catch (error) {
            toast.error("삭제 중 오류가 발생했습니다.")
        }
    }

    const insertVariable = (varName: string) => {
        setContentStructure(prev => prev + `{{${varName}}}`)
    }

    // AI 자동 변수화 함수
    const handleAutoConvert = async () => {
        if (!contentStructure || contentStructure.trim().length === 0) {
            toast.error("변환할 원고를 먼저 입력해주세요.")
            return
        }

        setAutoConverting(true)
        try {
            const res = await fetch("/api/templates/auto-variable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: contentStructure }),
            })

            const data = await res.json()

            if (res.ok) {
                setContentStructure(data.converted_content)
                const varCount = data.variables?.length || 0
                const replaceCount = data.replacements?.length || 0
                toast.success(
                    `${replaceCount}개 항목이 ${varCount}개 변수로 변환되었습니다!`,
                    { duration: 5000 }
                )
            } else {
                toast.error(data.error || "자동 변환에 실패했습니다.")
            }
        } catch (error) {
            console.error("Auto convert error:", error)
            toast.error("자동 변환 중 오류가 발생했습니다.")
        } finally {
            setAutoConverting(false)
        }
    }

    return (
        <AppLayout>
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">템플릿 관리</h1>
                    <p className="text-muted-foreground mt-1">
                        성공한 콘텐츠 구조를 저장하고 재사용하세요
                    </p>
                </div>
                <Button onClick={openCreateModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    새 템플릿
                </Button>
            </div>

            {/* 변수 가이드 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-blue-900 mb-2">치환 변수 가이드</h3>
                        <div className="flex flex-wrap gap-2">
                            {VARIABLE_HINTS.map((v) => (
                                <span
                                    key={v.name}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-sm"
                                >
                                    <code className="text-blue-600">{`{{${v.name}}}`}</code>
                                    <span className="text-gray-500">: {v.description}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 템플릿 목록 */}
            {loading ? (
                <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
            ) : templates.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">등록된 템플릿이 없습니다</h3>
                    <p className="text-muted-foreground mb-4">첫 번째 템플릿을 만들어보세요</p>
                    <Button onClick={openCreateModal}>
                        <Plus className="w-4 h-4 mr-2" />
                        새 템플릿 만들기
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-lg">{template.title}</h3>
                                        {(template.visibility === 'public' || template.isPublic) ? (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium">
                                                <Globe className="w-3 h-3" />
                                                공식
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                                <Lock className="w-3 h-3" />
                                                비공개
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                            {template.category}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                            {PLATFORMS.find(p => p.value === template.platform)?.label}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openEditModal(template)}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDelete(template.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {template.description && (
                                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                            )}

                            <div className="text-xs text-muted-foreground mb-2">사용 변수:</div>
                            <div className="flex flex-wrap gap-1 mb-3">
                                {template.variables.map((v) => (
                                    <code
                                        key={v}
                                        className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded"
                                    >
                                        {`{{${v}}}`}
                                    </code>
                                ))}
                            </div>

                            <div className="text-xs text-muted-foreground">
                                사용 횟수: {template.usage_count}회
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 생성/수정 모달 */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTemplate ? "템플릿 수정" : "새 템플릿 만들기"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">템플릿 이름 *</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="예: 학원 신규 개원 홍보"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">카테고리 *</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="카테고리 선택" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {CATEGORY_GROUPS.map((group) => (
                                            <div key={group}>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                                                    {group}
                                                </div>
                                                {CATEGORIES.filter((c) => c.group === group).map((c) => (
                                                    <SelectItem key={c.value} value={c.value}>
                                                        {c.label}
                                                    </SelectItem>
                                                ))}
                                            </div>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="platform">플랫폼</Label>
                                <Select value={platform} onValueChange={setPlatform}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PLATFORMS.map((p) => (
                                            <SelectItem key={p.value} value={p.value}>
                                                {p.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">설명</Label>
                                <Input
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="템플릿 용도 설명"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>변수 삽입</Label>
                            <div className="flex flex-wrap gap-1">
                                {VARIABLE_HINTS.map((v) => (
                                    <Button
                                        key={v.name}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => insertVariable(v.name)}
                                        className="text-xs"
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        {`{{${v.name}}}`}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="content">템플릿 내용 *</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAutoConvert}
                                    disabled={autoConverting || !contentStructure.trim()}
                                    className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
                                >
                                    {autoConverting ? (
                                        <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            변환 중...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-3 h-3 mr-1" />
                                            AI 자동 변수화
                                        </>
                                    )}
                                </Button>
                            </div>
                            <textarea
                                id="content"
                                value={contentStructure}
                                onChange={(e) => setContentStructure(e.target.value)}
                                placeholder={`원고를 붙여넣고 'AI 자동 변수화' 버튼을 클릭하면
업체명, 지역, 전화번호 등을 자동으로 변수로 변환합니다.

예시 입력:
위플학원에서 새롭게 선보이는 특별 프로그램을 소개합니다.
강남구 지역에서 1:1 맞춤 수업으로 유명한 위플학원!
지금 바로 문의하세요: 02-1234-5678

→ AI 변환 후:
{{name}}에서 새롭게 선보이는 특별 프로그램을 소개합니다.
{{location}} 지역에서 {{usp}}로 유명한 {{name}}!
지금 바로 문의하세요: {{phone}}`}
                                className="w-full h-64 p-3 border rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-xs text-muted-foreground">
                                원고를 붙여넣고 <span className="text-violet-600 font-medium">AI 자동 변수화</span> 버튼을 클릭하거나, 직접 {`{{변수명}}`} 형태로 입력하세요
                            </p>
                        </div>

                        {/* 공개 여부 설정 */}
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                {isPublic ? (
                                    <Globe className="w-5 h-5 text-purple-600" />
                                ) : (
                                    <Lock className="w-5 h-5 text-gray-500" />
                                )}
                                <div>
                                    <Label htmlFor="visibility" className="text-sm font-medium">
                                        공식 템플릿으로 등록
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        {isPublic
                                            ? "모든 사용자가 '위플 공식 템플릿'에서 이 템플릿을 사용할 수 있습니다"
                                            : "나만 사용할 수 있는 비공개 템플릿입니다"}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                id="visibility"
                                checked={isPublic}
                                onCheckedChange={setIsPublic}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>
                            취소
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "저장 중..." : editingTemplate ? "수정" : "생성"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        </AppLayout>
    )
}
