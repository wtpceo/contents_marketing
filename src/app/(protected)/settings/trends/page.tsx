'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  Flame,
  ExternalLink,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface TrendTopic {
  id: string
  type: 'season' | 'realtime'
  title: string
  description: string | null
  reference_url: string | null
  event_date: string | null
  priority: number
  is_active: boolean
  created_at: string
  dday?: number | null
}

// 드래그 가능한 카드 컴포넌트
function SortableCard({
  item,
  onEdit,
  onDelete,
  onToggleActive
}: {
  item: TrendTopic
  onEdit: (item: TrendTopic) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, active: boolean) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-white border rounded-lg shadow-sm ${
        !item.is_active ? 'opacity-50' : ''
      } ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
    >
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* 순위 뱃지 */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
        {item.priority}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{item.title}</p>
          {item.type === 'season' && item.dday !== null && item.dday !== undefined && (
            <Badge variant="outline" className="text-xs shrink-0">
              {item.dday === 0 ? 'D-Day' : item.dday > 0 ? `D-${item.dday}` : `D+${Math.abs(item.dday)}`}
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
        )}
      </div>

      {/* 액션 버튼들 */}
      <div className="flex items-center gap-1 shrink-0">
        {item.reference_url && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(item.reference_url!, '_blank')}
            className="h-8 w-8"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleActive(item.id, !item.is_active)}
          className="h-8 w-8"
        >
          {item.is_active ? (
            <Eye className="h-4 w-4 text-green-600" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(item)}
          className="h-8 w-8"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(item.id)}
          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function TrendsSettingsPage() {
  const [seasonTopics, setSeasonTopics] = useState<TrendTopic[]>([])
  const [realtimeTopics, setRealtimeTopics] = useState<TrendTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TrendTopic | null>(null)
  const [formData, setFormData] = useState({
    type: 'realtime' as 'season' | 'realtime',
    title: '',
    description: '',
    reference_url: '',
    event_date: '',
    is_active: true
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 데이터 로드
  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/trend-topics?active_only=false')
      if (response.ok) {
        const result = await response.json()
        const all = result.data || []
        setSeasonTopics(all.filter((t: TrendTopic) => t.type === 'season'))
        setRealtimeTopics(all.filter((t: TrendTopic) => t.type === 'realtime'))
      }
    } catch (error) {
      console.error('트렌드 로딩 실패:', error)
      toast.error('트렌드 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopics()
  }, [])

  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent, type: 'season' | 'realtime') => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const items = type === 'season' ? seasonTopics : realtimeTopics
      const setItems = type === 'season' ? setSeasonTopics : setRealtimeTopics

      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        priority: idx + 1
      }))

      setItems(newItems)

      // 서버에 순서 저장
      try {
        await fetch('/api/trend-topics', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: newItems.map(item => ({ id: item.id, priority: item.priority }))
          })
        })
        toast.success('순서가 저장되었습니다.')
      } catch (error) {
        toast.error('순서 저장에 실패했습니다.')
        fetchTopics() // 롤백
      }
    }
  }

  // 모달 열기
  const openCreateModal = (type: 'season' | 'realtime') => {
    setEditingItem(null)
    setFormData({
      type,
      title: '',
      description: '',
      reference_url: '',
      event_date: '',
      is_active: true
    })
    setIsModalOpen(true)
  }

  const openEditModal = (item: TrendTopic) => {
    setEditingItem(item)
    setFormData({
      type: item.type,
      title: item.title,
      description: item.description || '',
      reference_url: item.reference_url || '',
      event_date: item.event_date || '',
      is_active: item.is_active
    })
    setIsModalOpen(true)
  }

  // 저장
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const url = editingItem
        ? `/api/trend-topics/${editingItem.id}`
        : '/api/trend-topics'
      const method = editingItem ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title,
          description: formData.description || null,
          reference_url: formData.reference_url || null,
          event_date: formData.event_date || null,
          is_active: formData.is_active
        })
      })

      if (response.ok) {
        toast.success(editingItem ? '수정되었습니다.' : '등록되었습니다.')
        setIsModalOpen(false)
        fetchTopics()
      } else {
        toast.error('저장에 실패했습니다.')
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/trend-topics/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('삭제되었습니다.')
        fetchTopics()
      } else {
        toast.error('삭제에 실패했습니다.')
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.')
    }
  }

  // 활성화 토글
  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const response = await fetch(`/api/trend-topics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: active })
      })
      if (response.ok) {
        toast.success(active ? '노출 활성화됨' : '노출 비활성화됨')
        fetchTopics()
      }
    } catch (error) {
      toast.error('변경에 실패했습니다.')
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

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">트렌드 관리</h1>
            <p className="text-muted-foreground">기획 도우미에 노출될 시즌 이슈와 실시간 트렌드를 관리합니다.</p>
          </div>
        </div>

        {/* 2단 분리형 보드 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 섹션 1: 시즌 이슈 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <CardTitle>시즌 이슈</CardTitle>
                </div>
                <Button size="sm" onClick={() => openCreateModal('season')}>
                  <Plus className="h-4 w-4 mr-1" />
                  추가
                </Button>
              </div>
              <CardDescription>
                다가오는 날짜 기반 이벤트 (D-Day 자동 계산)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {seasonTopics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 시즌 이슈가 없습니다.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, 'season')}
                >
                  <SortableContext
                    items={seasonTopics.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {seasonTopics.map((item) => (
                        <SortableCard
                          key={item.id}
                          item={item}
                          onEdit={openEditModal}
                          onDelete={handleDelete}
                          onToggleActive={handleToggleActive}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>

          {/* 섹션 2: 실시간 트렌드 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <CardTitle>실시간 트렌드</CardTitle>
                </div>
                <Button size="sm" onClick={() => openCreateModal('realtime')}>
                  <Plus className="h-4 w-4 mr-1" />
                  추가
                </Button>
              </div>
              <CardDescription>
                인기 키워드 및 이슈 (드래그로 순서 조정)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {realtimeTopics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 트렌드가 없습니다.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, 'realtime')}
                >
                  <SortableContext
                    items={realtimeTopics.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {realtimeTopics.map((item) => (
                        <SortableCard
                          key={item.id}
                          item={item}
                          onEdit={openEditModal}
                          onDelete={handleDelete}
                          onToggleActive={handleToggleActive}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 등록/수정 모달 */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? '트렌드 수정' : '새 트렌드 등록'}
              </DialogTitle>
              <DialogDescription>
                기획 도우미에 노출될 트렌드 정보를 입력하세요.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* 구분 */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={formData.type === 'season'}
                    onChange={() => setFormData(prev => ({ ...prev, type: 'season' }))}
                    className="w-4 h-4"
                  />
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span>시즌 이슈</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={formData.type === 'realtime'}
                    onChange={() => setFormData(prev => ({ ...prev, type: 'realtime' }))}
                    className="w-4 h-4"
                  />
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span>실시간 트렌드</span>
                </label>
              </div>

              {/* 제목 */}
              <div className="space-y-2">
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  placeholder="예: 흑백요리사 패러디, 겨울방학 특강"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* 설명 */}
              <div className="space-y-2">
                <Label htmlFor="description">설명 (마케터 팁)</Label>
                <Textarea
                  id="description"
                  placeholder="예: 학부모 공략 포인트, 요리/경쟁 관련 밈"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* 날짜 (시즌 이슈용) */}
              {formData.type === 'season' && (
                <div className="space-y-2">
                  <Label htmlFor="event_date">이벤트 날짜</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                  />
                </div>
              )}

              {/* 관련 링크 */}
              <div className="space-y-2">
                <Label htmlFor="reference_url">관련 링크 (선택)</Label>
                <Input
                  id="reference_url"
                  placeholder="https://..."
                  value={formData.reference_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_url: e.target.value }))}
                />
              </div>

              {/* 노출 여부 */}
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">사용자에게 노출</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
