"use client"

import * as React from "react"
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns"
import { ChevronLeft, ChevronRight, Plus, Instagram, FileText, Youtube, Linkedin, Globe, Hash, Wand2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FilterBar } from "./FilterBar"
import { StatusWidget } from "./StatusWidget"
import { STATUS_COLORS } from "@/lib/mockData"
import type { ContentEvent } from "@/lib/mockData"
import { MagicPlanModal } from "./MagicPlanModal"

import { EventActionDialog } from "./EventActionDialog"
import { ContentBriefModal } from "./ContentBriefModal"
import { ConfirmDialog } from "./ConfirmDialog"
import { toast } from "sonner"

const channelIcons = {
    blog: FileText,
    instagram: Instagram,
    threads: Hash,
    youtube: Youtube,
    linkedin: Linkedin,
    facebook: Globe,
}

interface Advertiser {
    id: string
    name: string
}

export function CalendarView() {
    const [currentDate, setCurrentDate] = React.useState(new Date())
    const [selectedClient, setSelectedClient] = React.useState("all")
    const [selectedChannel, setSelectedChannel] = React.useState("all")
    const [loading, setLoading] = React.useState(false)
    const [events, setEvents] = React.useState<ContentEvent[]>([])
    const [showMagicPlan, setShowMagicPlan] = React.useState(false)
    const [showBriefModal, setShowBriefModal] = React.useState(false)
    const [selectedBriefDate, setSelectedBriefDate] = React.useState<Date>(new Date())
    const [selectedEventForBrief, setSelectedEventForBrief] = React.useState<ContentEvent | null>(null)
    const [advertisers, setAdvertisers] = React.useState<Advertiser[]>([])
    const [selectedEvent, setSelectedEvent] = React.useState<ContentEvent | null>(null)
    const [confirmConfig, setConfirmConfig] = React.useState<{
        open: boolean
        title: string
        description: string
        action: () => Promise<void>
    }>({ open: false, title: "", description: "", action: async () => { } })

    const refreshData = async () => {
        setLoading(true)
        try {
            const contentsResponse = await fetch("/api/contents")
            if (contentsResponse.ok) {
                const contentsData = await contentsResponse.json()
                const mappedEvents: ContentEvent[] = contentsData.map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    date: c.scheduled_at ? new Date(c.scheduled_at) : new Date(),
                    status: c.status === 'draft' ? 'planning' : c.status,
                    clientId: c.advertiser_id,
                    channels: c.channel ? [c.channel] : [], // TODO: handle multiple channels
                    keyMessage: c.llm_prompt // Using llm_prompt as Key Message
                }))
                setEvents(mappedEvents)
            }
        } catch (error) {
            console.error("Failed to refresh data", error)
        } finally {
            setLoading(false)
        }
    }

    // 광고주 목록 및 콘텐츠 로드
    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // 광고주 목록 가져오기
                const advResponse = await fetch("/api/advertisers")
                if (advResponse.ok) {
                    const advData = await advResponse.json()
                    setAdvertisers(advData)
                }

                // 콘텐츠(이벤트) 가져오기
                const contentsResponse = await fetch("/api/contents")
                if (contentsResponse.ok) {
                    const contentsData = await contentsResponse.json()
                    // API 데이터를 ContentEvent 형식으로 변환
                    const mappedEvents: ContentEvent[] = contentsData.map((c: any) => ({
                        id: c.id,
                        title: c.title,
                        date: c.scheduled_at ? new Date(c.scheduled_at) : new Date(),
                        status: c.status === 'draft' ? 'planning' : c.status,
                        clientId: c.advertiser_id,
                        channels: c.channel ? [c.channel] : [],
                        keyMessage: c.llm_prompt
                    }))
                    setEvents(mappedEvents)
                }
            } catch (error) {
                console.error("Failed to fetch initial data", error)
                toast.error("데이터를 불러오는데 실패했습니다.")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Handler for Magic Plan - API에서 저장 완료된 topics 받음
    const handleMagicPlanConfirm = (savedTopics: any[]) => {
        // API에서 저장된 topics를 ContentEvent 형식으로 변환하여 캘린더에 추가
        const newEvents: ContentEvent[] = savedTopics.map((topic) => ({
            id: topic.id,
            title: topic.title,
            date: new Date(topic.scheduled_date || topic.date),
            status: "planning",
            channels: topic.channels || ["blog"],
            clientId: topic.advertiser_id,
        }))

        setEvents(prev => [...prev, ...newEvents])
    }

    const handleDeleteMonth = () => {
        const monthStr = format(currentDate, "yyyy-MM")
        setConfirmConfig({
            open: true,
            title: "월간 일정 전체 삭제",
            description: `${monthStr}월의 모든 일정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
            action: async () => {
                const res = await fetch(`/api/contents?month=${monthStr}`, { method: "DELETE" })
                if (res.ok) {
                    toast.success("해당 월의 일정이 모두 삭제되었습니다.")
                    refreshData()
                } else {
                    toast.error("삭제에 실패했습니다.")
                }
            }
        })
    }

    const handleDeleteDay = (date: Date) => {
        const dateStr = format(date, "yyyy-MM-dd")
        setConfirmConfig({
            open: true,
            title: "하루 일정 전체 삭제",
            description: `${dateStr}의 모든 일정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
            action: async () => {
                const res = await fetch(`/api/contents?date=${dateStr}`, { method: "DELETE" })
                if (res.ok) {
                    toast.success("해당 일의 일정이 모두 삭제되었습니다.")
                    refreshData()
                } else {
                    toast.error("삭제에 실패했습니다.")
                }
            }
        })
    }

    const handleConfirmAction = async () => {
        setLoading(true)
        try {
            await confirmConfig.action()
            setConfirmConfig(prev => ({ ...prev, open: false }))
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const days = eachDayOfInterval({ start: startDate, end: endDate })

    // Filter Logic
    const filteredEvents = events.filter(event => {
        if (selectedClient !== "all" && event.clientId !== selectedClient) return false
        if (selectedChannel !== "all" && !event.channels.includes(selectedChannel as any)) return false
        return isSameMonth(event.date, currentDate)
    })

    const stats = {
        total: filteredEvents.length,
        pending: filteredEvents.filter(e => e.status === 'pending_approval').length,
        scheduled: filteredEvents.filter(e => e.status === 'scheduled').length,
        published: filteredEvents.filter(e => e.status === 'published').length,
    }

    return (
        <div className="flex h-full flex-col gap-6">
            <StatusWidget {...stats} />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h2 className="text-xl font-bold w-32 text-center">{format(currentDate, "yyyy년 M월")}</h2>
                        <Button variant="outline" size="icon" onClick={handleNextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <FilterBar onClientChange={setSelectedClient} onChannelChange={setSelectedChannel} />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-red-500"
                        onClick={() => handleDeleteMonth()}
                        title="이번 달 일정 전체 삭제"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => setShowMagicPlan(true)}
                        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white border-0 shadow-md"
                    >
                        <Wand2 className="mr-2 h-4 w-4" />
                        월간 자동 기획
                    </Button>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        새 일정
                    </Button>
                </div>
            </div>

            <MagicPlanModal
                open={showMagicPlan}
                onOpenChange={setShowMagicPlan}
                onConfirm={handleMagicPlanConfirm}
                advertisers={advertisers}
                currentMonth={currentDate.getMonth() + 1}
            />

            <div className="grid grid-cols-7 gap-px rounded-lg bg-gray-200 border border-gray-200 shadow-sm">
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                    <div key={day} className="bg-background py-2 text-center text-sm font-semibold">
                        {day}
                    </div>
                ))}

                {days.map((day, dayIdx) => {
                    const dayEvents = filteredEvents.filter(e => isSameDay(e.date, day))
                    const isCurrentMonth = isSameMonth(day, currentDate)

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "relative min-h-[120px] bg-background p-2 text-left transition-colors border-t border-l border-gray-100 hover:bg-accent/10 group",
                                !isCurrentMonth && "bg-gray-50/50 text-muted-foreground"
                            )}
                            onDoubleClick={() => {
                                setSelectedBriefDate(day)
                                setSelectedEventForBrief(null)
                                setShowBriefModal(true)
                            }}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <time
                                    dateTime={format(day, "yyyy-MM-dd")}
                                    className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                                        isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {format(day, "d")}
                                </time>
                                {dayEvents.length > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteDay(day)
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                                        title="이 날의 일정 전체 삭제"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                            <div className="space-y-1 overflow-visible">
                                {dayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedEvent(event)
                                        }}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedEventForBrief(event)
                                            setShowBriefModal(true)
                                        }}
                                        className={cn(
                                            "flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs border shadow-sm transition-all hover:opacity-90 w-full min-w-0 cursor-pointer",
                                            STATUS_COLORS[event.status]
                                        )}>
                                        <div className="flex -space-x-1 shrink-0">
                                            {event.channels.map((ch: string) => {
                                                const Icon = channelIcons[ch as keyof typeof channelIcons] || FileText
                                                return (
                                                    <div key={ch} className="bg-white rounded-full p-0.5 border relative z-0 ring-1 ring-white/50">
                                                        <Icon className="h-2 w-2 text-black" />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <span className="truncate font-medium flex-1">{event.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            <EventActionDialog
                event={selectedEvent}
                open={!!selectedEvent}
                onOpenChange={(open) => !open && setSelectedEvent(null)}
                onUpdate={(updatedEvent) => {
                    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e))
                }}
                onDelete={(deletedId) => {
                    setEvents(prev => prev.filter(e => e.id !== deletedId))
                }}
            />

            <ContentBriefModal
                open={showBriefModal}
                onOpenChange={setShowBriefModal}
                selectedDate={selectedBriefDate}
                selectedEvent={selectedEventForBrief}
                advertisers={advertisers}
            />

            <ConfirmDialog
                open={confirmConfig.open}
                onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, open }))}
                title={confirmConfig.title}
                description={confirmConfig.description}
                onConfirm={handleConfirmAction}
                loading={loading}
                confirmText="삭제하기"
            />
        </div >
    )
}
