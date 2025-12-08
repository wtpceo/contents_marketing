import { cn } from "@/lib/utils"

export interface SlideData {
    type: 'cover' | 'content' | 'cta'
    main_text?: string // For emotional or cover title
    sub_text?: string // For emotional subtitle or cover subtitle
    title?: string // For informative title
    body?: string // For informative body
    backgroundImage?: string
    image_keyword?: string
}

interface TemplateProps {
    data: SlideData
    className?: string
}

export const EmotionalTemplate = ({ data, className }: TemplateProps) => {
    return (
        <div className={cn("relative w-full h-full overflow-hidden", className)}>
            {/* Background Image */}
            <img
                src={data.backgroundImage || `https://source.unsplash.com/random/800x800/?${data.image_keyword || 'mood'}`}
                alt="background"
                className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Centered Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <h2 className="text-white font-serif text-3xl font-bold mb-4 drop-shadow-lg leading-tight">
                    {data.main_text || data.title}
                </h2>
                {data.sub_text && (
                    <p className="text-white/90 font-serif text-lg font-light drop-shadow-md">
                        {data.sub_text}
                    </p>
                )}
            </div>
        </div>
    )
}

export const InformativeTemplate = ({ data, className }: TemplateProps) => {
    return (
        <div className={cn("relative w-full h-full bg-white flex flex-col", className)}>
            {/* Background Pattern or Image (subtle) */}
            <div className="absolute inset-0 bg-slate-50" />

            {/* Header */}
            <div className="relative z-10 bg-indigo-600 p-6 shadow-md">
                <h2 className="text-white font-bold text-xl leading-snug">
                    {data.title || data.main_text}
                </h2>
            </div>

            {/* Image Area (Middle) */}
            <div className="relative flex-1 overflow-hidden bg-gray-200">
                <img
                    src={data.backgroundImage || `https://source.unsplash.com/random/800x600/?${data.image_keyword || 'office'}`}
                    alt="content"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Body Text (Bottom) */}
            <div className="relative z-10 bg-white p-6 min-h-[30%] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {data.body || data.sub_text}
                </p>
            </div>
        </div>
    )
}
