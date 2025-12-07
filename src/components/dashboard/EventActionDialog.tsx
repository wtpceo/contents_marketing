"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar as CalendarIcon, Trash2, ExternalLink, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ContentEvent } from "@/lib/mockData"
import Link from "next/link"

interface EventActionDialogProps {
    event: ContentEvent | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: (updatedEvent: ContentEvent) => void
    onDelete: (deletedEventId: string) => void
}

export function EventActionDialog({ event, open, onOpenChange, onUpdate, onDelete }: EventActionDialogProps) {
    const [title, setTitle] = React.useState("")
    const [date, setDate] = React.useState("")
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        if (event) {
            setTitle(event.title)
            setDate(event.date ? format(event.date, "yyyy-MM-dd") : "")
        }
    }, [event])

    if (!event) return null

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("제목을 입력해주세요.")
            return
        }

        setLoading(true)
        try {
            // API 호출: 수정
            const response = await fetch(`/api/contents/${event.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    scheduled_at: new Date(date).toISOString(),
                }),
            })

            if (!response.ok) throw new Error("수정에 실패했습니다.")

            const updatedEvent = {
                ...event,
                title,
                date: new Date(date),
            }

            onUpdate(updatedEvent)
            toast.success("수정되었습니다.")
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("수정 중 오류가 발생했습니다.")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("정말 삭제하시겠습니까? 복구할 수 없습니다.")) return

        setLoading(true)
        try {
            // API 호출: 삭제
            const response = await fetch(`/api/contents/${event.id}`, {
                method: "DELETE",
            })

            if (!response.ok) throw new Error("삭제에 실패했습니다.")

            onDelete(event.id)
            toast.success("삭제되었습니다.")
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("삭제 중 오류가 발생했습니다.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>콘텐츠 관리</DialogTitle>
                    <DialogDescription>
                        선택한 콘텐츠의 내용을 수정하거나 삭제합니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">제목</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="date">발행 예정일</Label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter className="sm:justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link href={`/editor/${event.id}`}>
                            <Button variant="secondary" size="sm">
                                <ExternalLink className="mr-2 h-3 w-3" />
                                에디터 열기
                            </Button>
                        </Link>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                        <Button onClick={handleSave}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            저장
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
