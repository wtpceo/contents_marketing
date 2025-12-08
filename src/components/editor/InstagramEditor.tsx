"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Plus, Image as ImageIcon, GripVertical, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
// Import Templates
import { EmotionalTemplate, InformativeTemplate, SlideData } from "./instagram/templates/SlideTemplates"

interface InstagramEditorProps {
    content: string
    onChange: (content: string) => void
}

// Extend Slide to compatible with SlideData
interface Slide extends SlideData {
    id: string
    imageUrl?: string // Keep for backward compatibility or direct image upload
    text?: string     // Keep for backward compatibility
}

export function InstagramEditor({ content, onChange }: InstagramEditorProps) {
    const [slides, setSlides] = useState<Slide[]>([])
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
    const [caption, setCaption] = useState("")
    const [hashtags, setHashtags] = useState("")
    const [templateStyle, setTemplateStyle] = useState<'emotional' | 'informative' | 'viral'>('emotional')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Parse content on change
    useEffect(() => {
        if (!content) return

        try {
            const trimmed = content.trim()
            if (trimmed.startsWith('{')) {
                const parsed = JSON.parse(trimmed)
                if (parsed.slides && Array.isArray(parsed.slides)) {
                    // Map generic slides to include IDs if missing
                    const mappedSlides = parsed.slides.map((s: any, i: number) => ({
                        ...s,
                        id: s.id || `slide-${Date.now()}-${i}`,
                        imageUrl: s.backgroundImage || s.imageUrl, // Fallback
                        text: s.main_text || s.title || s.text
                    }))
                    setSlides(mappedSlides)
                }
                if (parsed.style) setTemplateStyle(parsed.style)
                if (parsed.caption) setCaption(parsed.caption) // Assuming caption might be part of structured content
                if (parsed.hashtags) setHashtags(parsed.hashtags) // Assuming hashtags might be part of structured content
            } else if (trimmed.startsWith('[')) {
                const parsed = JSON.parse(trimmed)
                const mappedSlides = parsed.map((s: any, i: number) => ({
                    ...s,
                    id: s.id || `slide-${Date.now()}-${i}`,
                    imageUrl: s.backgroundImage || s.imageUrl,
                    text: s.main_text || s.title || s.text
                }))
                setSlides(mappedSlides)
                setTemplateStyle('emotional') // Default to emotional for legacy array content
            } else {
                // Determine if it's just caption text (legacy)
                if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
                    setCaption(trimmed)
                }
            }
        } catch (e) {
            console.error("Failed to parse Instagram content", e)
            // Fallback: treat as caption if no slides were parsed
            if (!slides.length) setCaption(content)
        }
    }, [content])

    const handleAddImageClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const imageUrl = URL.createObjectURL(file)
            const newSlide: Slide = {
                id: `slide-${Date.now()}`,
                imageUrl,
                text: "",
                type: 'content', // Default type for new image uploads
                backgroundImage: imageUrl
            }
            setSlides(prev => {
                const newSlides = [...prev, newSlide]
                setCurrentSlideIndex(newSlides.length - 1) // Switch to new slide
                return newSlides
            })
        }
        // Reset input value to allow selecting same file again
        if (e.target) e.target.value = ''
    }

    const handleRemoveSlide = (index: number, e: React.MouseEvent) => {
        e.stopPropagation()
        const newSlides = slides.filter((_, i) => i !== index)
        setSlides(newSlides)
        if (currentSlideIndex >= newSlides.length) {
            setCurrentSlideIndex(Math.max(0, newSlides.length - 1))
        }
    }

    const handleTextChange = (index: number, text: string) => {
        const newSlides = [...slides]
        newSlides[index].text = text
        // Also update specific template fields for coherence implies parsing text to logic?
        // For simplicity, update main_text or title based on existing type
        if (templateStyle === 'informative') {
            newSlides[index].title = text
        } else {
            newSlides[index].main_text = text
        }

        setSlides(newSlides)
    }

    const handlePrevSlide = () => {
        if (currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1)
    }

    const handleNextSlide = () => {
        if (currentSlideIndex < slides.length - 1) setCurrentSlideIndex(currentSlideIndex + 1)
    }

    return (
        <div className="flex gap-6 min-h-full">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
            />
            {/* Left: Slide Management */}
            <div className="w-1/2 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">이미지/텍스트 편집</Label>
                    <Button variant="outline" size="sm" onClick={handleAddImageClick}>
                        <Plus className="mr-2 h-4 w-4" />
                        이미지 추가
                    </Button>
                </div>

                <div className="flex-1 rounded-lg border bg-slate-50 p-4 overflow-y-auto space-y-3 min-h-[400px]">
                    {slides.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">이미지를 추가하거나 AI 생성을 이용하세요</p>
                        </div>
                    ) : (
                        slides.map((slide, idx) => (
                            <div
                                key={slide.id}
                                className={cn(
                                    "group relative flex flex-col gap-3 bg-white p-3 rounded-md border shadow-sm cursor-pointer transition-all",
                                    currentSlideIndex === idx ? "ring-2 ring-purple-500 border-transparent" : "hover:border-purple-200"
                                )}
                                onClick={() => setCurrentSlideIndex(idx)}
                            >
                                <div className="flex items-start gap-3">
                                    <GripVertical className="h-5 w-5 text-gray-400 cursor-move mt-1" />
                                    <div className="h-16 w-16 bg-gray-100 rounded overflow-hidden shrink-0 border relative">
                                        <img
                                            src={slide.backgroundImage || slide.imageUrl || `https://source.unsplash.com/random/100x100/?${slide.image_keyword || 'abstract'}`}
                                            alt={`Slide ${idx + 1}`}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-medium">슬라이드 {idx + 1} <span className="text-xs text-gray-400">({slide.type || 'unknown'})</span></p>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                onClick={(e) => handleRemoveSlide(idx, e)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Input
                                            placeholder="텍스트 입력..."
                                            className="h-8 text-xs bg-gray-50"
                                            value={slide.text || slide.main_text || slide.title || ""}
                                            onChange={(e) => handleTextChange(idx, e.target.value)}
                                            onClick={(e) => e.stopPropagation()} // Prevent triggering slide selection
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Preview & Caption */}
            <div className="w-1/2 flex flex-col gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>캡션 (본문)</Label>
                        <Textarea
                            className="h-[150px] resize-none font-sans"
                            placeholder="문구를 작성해주세요..."
                            value={caption}
                            onChange={(e) => {
                                setCaption(e.target.value)
                                onChange(e.target.value) // Consider how to update structured content
                            }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>해시태그</Label>
                        <Input
                            placeholder="#위플 #마케팅 #꿀팁"
                            value={hashtags}
                            onChange={(e) => setHashtags(e.target.value)}
                        />
                    </div>
                </div>

                {/* Mobile Preview */}
                <div className="mt-8 border rounded-2xl overflow-hidden shadow-lg max-w-[320px] mx-auto opacity-90 origin-bottom bg-white">
                    <div className="border-b p-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                            <div className="w-full h-full rounded-full bg-white border border-transparent overflow-hidden object-cover" />
                        </div>
                        <span className="text-xs font-bold">brand_official</span>
                    </div>

                    {/* Preview Box */}
                    <div className="aspect-square bg-gray-100 relative group/preview">
                        {slides.length > 0 ? (
                            <>
                                {/* Render Template based on style */}
                                {templateStyle === 'informative' ? (
                                    <InformativeTemplate data={slides[currentSlideIndex]} className="w-full h-full" />
                                ) : (
                                    <EmotionalTemplate data={slides[currentSlideIndex]} className="w-full h-full" />
                                )}

                                {/* Navigation Arrows */}
                                {slides.length > 1 && (
                                    <>
                                        {currentSlideIndex > 0 && (
                                            <button
                                                onClick={handlePrevSlide}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow-sm hover:bg-white transition-opacity z-20"
                                            >
                                                <ChevronLeft className="h-4 w-4 text-gray-800" />
                                            </button>
                                        )}
                                        {currentSlideIndex < slides.length - 1 && (
                                            <button
                                                onClick={handleNextSlide}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow-sm hover:bg-white transition-opacity z-20"
                                            >
                                                <ChevronRight className="h-4 w-4 text-gray-800" />
                                            </button>
                                        )}

                                        {/* Pagination Dots */}
                                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
                                            {slides.map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "w-1.5 h-1.5 rounded-full transition-colors shadow-[0_0_2px_rgba(0,0,0,0.5)]",
                                                        i === currentSlideIndex ? "bg-white" : "bg-white/50"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                <ImageIcon className="h-10 w-10 mb-2" />
                                <span className="text-xs">데이터 없음</span>
                            </div>
                        )}
                    </div>

                    <div className="p-3 text-[11px] space-y-1.5 bg-white pb-6">
                        <div className="flex gap-3 mb-2">
                            {/* Mock Actions */}
                            <div className="w-5 h-5 border-2 border-black rounded-full" />
                            <div className="w-5 h-5 border-2 border-black rounded-full" />
                            <div className="w-5 h-5 border-2 border-black rounded-full" />
                        </div>
                        <div className="line-clamp-2">
                            <span className="font-bold mr-1">brand_official</span>
                            <span className="whitespace-pre-wrap">{caption || ""}</span>
                        </div>
                        <div className="text-blue-900">{hashtags}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

