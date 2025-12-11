"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, Factory, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateContentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateContentModal({ open, onOpenChange }: CreateContentModalProps) {
    const router = useRouter()

    const handleCustomMode = () => {
        onOpenChange(false)
        router.push("/editor/new")
    }

    const handleTemplateFactory = () => {
        onOpenChange(false)
        router.push("/bulk-create")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-xl font-bold">콘텐츠 제작 방식 선택</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        목적에 맞는 제작 방식을 선택하세요
                    </p>
                </DialogHeader>

                <div className="p-6 pt-4 grid gap-4">
                    {/* 맞춤 창작 모드 */}
                    <button
                        onClick={handleCustomMode}
                        className={cn(
                            "group relative flex items-start gap-4 p-5 rounded-xl border-2 border-transparent",
                            "bg-gradient-to-br from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100",
                            "hover:border-purple-300 transition-all duration-200 text-left"
                        )}
                    >
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-200">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">🅰️ 맞춤 창작</h3>
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                                    Custom Mode
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                특정 광고주를 위한 독창적인 기획이 필요할 때
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                                AI 에디터로 맞춤형 콘텐츠를 직접 기획하고 작성합니다
                            </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all self-center" />
                    </button>

                    {/* 템플릿 대량 생산 모드 */}
                    <button
                        onClick={handleTemplateFactory}
                        className={cn(
                            "group relative flex items-start gap-4 p-5 rounded-xl border-2 border-transparent",
                            "bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100",
                            "hover:border-amber-300 transition-all duration-200 text-left"
                        )}
                    >
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                            <Factory className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">🅱️ 템플릿 대량 생산</h3>
                                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                                    Template Factory
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                검증된 템플릿으로 여러 광고주의 콘텐츠를 한 번에 찍어낼 때
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                                템플릿 선택 → 광고주 다중 선택 → 일괄 생성
                            </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all self-center" />
                    </button>
                </div>

                <div className="px-6 pb-6">
                    <p className="text-xs text-center text-muted-foreground">
                        💡 템플릿은 <span className="font-medium">설정 &gt; 템플릿 관리</span>에서 미리 등록할 수 있습니다
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
