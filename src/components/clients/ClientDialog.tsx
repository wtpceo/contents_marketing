"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

import { useState, useEffect } from "react"
import { Sparkles, ArrowRight } from "lucide-react"

interface ClientDialogProps {
    children: React.ReactNode
    onSuccess?: () => void
}

export function ClientDialog({ children, onSuccess }: ClientDialogProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<"guide" | "form">("guide")
    const [formData, setFormData] = useState({
        name: "",
        industry: "",
        location: "",
        contact: "",
    })
    const [selectedTones, setSelectedTones] = useState<string[]>([])

    // 톤앤매너 옵션
    const toneOptions = [
        { value: "professional", label: "전문적인" },
        { value: "friendly", label: "친근한" },
        { value: "witty", label: "위트있는" },
        { value: "emotional", label: "감성적" },
        { value: "formal", label: "격식체" },
        { value: "casual", label: "캐주얼" },
    ]

    const toggleTone = (value: string) => {
        setSelectedTones(prev =>
            prev.includes(value)
                ? prev.filter(t => t !== value)
                : [...prev, value]
        )
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }))
    }

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            setError("광고주명은 필수입니다.")
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/advertisers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: formData.name,
                    industry: formData.industry,
                    location: formData.location,
                    contact_phone: formData.contact,
                    tone: selectedTones,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "등록에 실패했습니다.")
            }

            // 성공 시 다이얼로그 닫기 및 초기화
            setOpen(false)
            setStep("guide")
            setFormData({ name: "", industry: "", location: "", contact: "" })
            setSelectedTones([])

            // 콜백 호출 또는 페이지 새로고침
            if (onSuccess) {
                onSuccess()
            } else {
                window.location.reload()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "등록에 실패했습니다.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {step === "guide" ? (
                    <div className="flex flex-col items-center text-center py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <DialogHeader>
                            <DialogTitle className="sr-only">AI 최적화 가이드</DialogTitle>
                        </DialogHeader>
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold tracking-tight">잠깐! 더 완벽한 글을 원하시나요?</h3>
                            <p className="text-muted-foreground text-sm px-4">
                                입력된 정보가 구체적일수록 <br />
                                <span className="font-semibold text-primary">AI가 우리 브랜드에 딱 맞는</span> 콘텐츠를 생산합니다.<br />
                                <br />
                                빈칸 없이 꼼꼼히 작성해주시면<br />
                                놀라운 퀄리티를 경험하실 수 있어요! ✨
                            </p>
                        </div>
                        <Button onClick={() => setStep("form")} className="w-full bg-gradient-to-r from-primary to-purple-600">
                            네, 확인했습니다 <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>새 광고주 등록</DialogTitle>
                            <DialogDescription>
                                광고주의 기본 정보와 LLM 생성을 위한 설정을 입력하세요.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    광고주명
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="예: 위즈더플래닝"
                                    className="col-span-3"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="industry" className="text-right">
                                    업종
                                </Label>
                                <Input
                                    id="industry"
                                    placeholder="예: 식당, 미용실, IT 기업"
                                    className="col-span-3"
                                    value={formData.industry}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="location" className="text-right">
                                    위치
                                </Label>
                                <Input
                                    id="location"
                                    placeholder="예: 서울시 강남구"
                                    className="col-span-3"
                                    value={formData.location}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="contact" className="text-right">
                                    연락처
                                </Label>
                                <Input
                                    id="contact"
                                    placeholder="예: 010-1234-5678"
                                    className="col-span-3"
                                    value={formData.contact}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right pt-2">
                                    톤앤매너
                                </Label>
                                <div className="col-span-3 flex flex-wrap gap-2">
                                    {toneOptions.map((tone) => (
                                        <button
                                            key={tone.value}
                                            type="button"
                                            onClick={() => toggleTone(tone.value)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                                selectedTones.includes(tone.value)
                                                    ? "bg-primary text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                        >
                                            {tone.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {error && (
                            <div className="text-red-500 text-sm px-4">{error}</div>
                        )}
                        <DialogFooter>
                            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                                {isLoading ? "등록 중..." : "등록하기"}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
