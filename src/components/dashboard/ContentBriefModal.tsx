"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Advertiser {
    id: string
    name: string
}

interface ContentBriefModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedDate?: Date
    selectedEvent?: any // 기존 이벤트 수정 시
    advertisers: Advertiser[]
}

const CHANNELS = [
    { id: "blog", label: "블로그" },
    { id: "instagram", label: "인스타그램" },
    { id: "threads", label: "스레드" },
]

export function ContentBriefModal({
    open,
    onOpenChange,
    selectedDate,
    selectedEvent,
    advertisers
}: ContentBriefModalProps) {
    const router = useRouter()
    const [title, setTitle] = React.useState("")
    const [date, setDate] = React.useState("")
    const [keyMessage, setKeyMessage] = React.useState("")
    const [selectedChannels, setSelectedChannels] = React.useState<string[]>([])
    const [selectedAdvertiserId, setSelectedAdvertiserId] = React.useState<string>("")
    const [loading, setLoading] = React.useState(false)

    // 초기화
    React.useEffect(() => {
        if (open) {
            if (selectedEvent) {
                // 수정 모드
                setTitle(selectedEvent.title)
                setDate(selectedEvent.date ? format(new Date(selectedEvent.date), "yyyy-MM-dd") : "")
                setSelectedChannels(selectedEvent.channels || [])
                setKeyMessage(selectedEvent.keyMessage || "") // 기존 데이터에 있다면
                setSelectedAdvertiserId(selectedEvent.clientId || "")
            } else {
                // 생성 모드
                setTitle("")
                setDate(selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"))
                setKeyMessage("")
                setSelectedChannels(["blog"]) // 기본값
                if (advertisers.length > 0) {
                    setSelectedAdvertiserId(advertisers[0].id)
                }
            }
        }
    }, [open, selectedDate, selectedEvent, advertisers])

    const handleChannelToggle = (channelId: string) => {
        setSelectedChannels(prev =>
            prev.includes(channelId)
                ? prev.filter(c => c !== channelId)
                : [...prev, channelId]
        )
    }

    const handleSubmit = async (e?: React.SyntheticEvent) => {
        if (e) e.preventDefault()
        if (!title.trim()) {
            toast.error("주제를 입력해주세요.")
            return
        }
        if (!selectedAdvertiserId) {
            toast.error("광고주를 선택해주세요.")
            return
        }
        if (selectedChannels.length === 0) {
            toast.error("최소 1개의 채널을 선택해주세요.")
            return
        }

        setLoading(true)
        try {
            // OSMU를 위한 프롬프트 구성
            const promptContext = `
[기획 의도]
${keyMessage}

[발행 채널]
${selectedChannels.map(c => CHANNELS.find(ch => ch.id === c)?.label).join(', ')}
            `.trim()

            // 대표 채널 결정 (blog 우선)
            const primaryChannel = selectedChannels.includes('blog') ? 'blog_naver'
                : selectedChannels.includes('instagram') ? 'instagram'
                : 'threads'

            const payload = {
                advertiser_id: selectedAdvertiserId,
                title,
                scheduled_at: new Date(date).toISOString(),
                channel: primaryChannel, // 대표 채널
                llm_prompt: promptContext,
                selected_channels: selectedChannels, // OSMU 멀티채널 지원
                channel_data: {} // 초기 빈 객체
            }

            let response;
            if (selectedEvent?.id) {
                // 수정
                response = await fetch(`/api/contents/${selectedEvent.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
            } else {
                // 생성
                response = await fetch('/api/contents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
            }

            if (!response.ok) throw new Error("저잠 실패")

            const data = await response.json()

            toast.success("기획안이 생성되었습니다. 에디터로 이동합니다.")
            onOpenChange(false)

            // 에디터로 이동
            router.push(`/editor/${data.id}`)

        } catch (error) {
            console.error(error)
            toast.error("오류가 발생했습니다.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{selectedEvent ? '기획안 수정' : '새 콘텐츠 기획'}</DialogTitle>
                    <DialogDescription>
                        발행할 콘텐츠의 방향성을 설정해주세요. 에디터에서 AI가 초안을 잡아줍니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>광고주</Label>
                            <Select
                                value={selectedAdvertiserId}
                                onValueChange={setSelectedAdvertiserId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="광고주를 선택해주세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    {advertisers.map(adv => (
                                        <SelectItem key={adv.id} value={adv.id}>
                                            {adv.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="title">주제 (Title)</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="예: 12월 크리스마스 이벤트 홍보"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>발행 예정일</Label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>채널 (OSMU)</Label>
                            <div className="flex gap-4">
                                {CHANNELS.map((ch) => (
                                    <div key={ch.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={ch.id}
                                            checked={selectedChannels.includes(ch.id)}
                                            onCheckedChange={() => handleChannelToggle(ch.id)}
                                        />
                                        <label
                                            htmlFor={ch.id}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {ch.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="keyMessage">핵심 지시사항 (Key Message)</Label>
                            <Textarea
                                id="keyMessage"
                                value={keyMessage}
                                onChange={(e) => setKeyMessage(e.target.value)}
                                placeholder="AI에게 전달할 핵심 내용, 톤앤매너, 필수 포함 키워드 등을 적어주세요."
                                className="h-24 resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                        <Button type="submit" disabled={loading} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {selectedEvent ? '저장 후 에디터 열기' : '콘텐츠 생성 및 에디터 열기'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
