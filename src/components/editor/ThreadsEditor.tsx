"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, X, GripVertical, MessageCircle } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface ThreadsEditorProps {
    content: string
    onChange: (content: string) => void
}

export function ThreadsEditor({ content, onChange }: ThreadsEditorProps) {
    // Threads는 여러 개의 연결된 텍스트 카드(스레드)로 구성됨
    // 초기 컨텐츠를 첫 번째 스레드로 간주
    const [threads, setThreads] = useState<string[]>(content ? [content] : [""])

    const handleUpdateThread = (index: number, value: string) => {
        const newThreads = [...threads]
        newThreads[index] = value
        setThreads(newThreads)
        // 부모에게는 전체 텍스트를 합쳐서 전달 (임시)
        onChange(newThreads.join("\n\n---\n\n"))
    }

    const handleAddThread = () => {
        setThreads([...threads, ""])
    }

    const handleRemoveThread = (index: number) => {
        if (threads.length === 1) return
        const newThreads = threads.filter((_, i) => i !== index)
        setThreads(newThreads)
        onChange(newThreads.join("\n\n---\n\n"))
    }

    return (
        <div className="max-w-xl mx-auto py-6 space-y-8">
            <div className="space-y-4">
                {threads.map((thread, idx) => (
                    <div key={idx} className="relative group flex gap-4">
                        <div className="flex flex-col items-center pt-2">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                <span className="font-semibold text-gray-500 text-sm">You</span>
                            </div>
                            {idx < threads.length - 1 && (
                                <div className="w-0.5 grow bg-gray-200 my-2" />
                            )}
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>Thread {idx + 1}</span>
                                {threads.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500"
                                        onClick={() => handleRemoveThread(idx)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                            <Textarea
                                value={thread}
                                onChange={(e) => handleUpdateThread(idx, e.target.value)}
                                placeholder={idx === 0 ? "스레드를 시작하세요..." : "내용을 추가하세요..."}
                                className="min-h-[120px] resize-none bg-transparent border-gray-200 focus:border-black transition-colors text-base"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="pl-14">
                <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-black"
                    onClick={handleAddThread}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    스레드 추가하기
                </Button>
            </div>
        </div>
    )
}
