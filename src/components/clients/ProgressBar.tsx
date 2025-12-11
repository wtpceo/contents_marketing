"use client"

import { cn } from "@/lib/utils"

interface ProgressBarProps {
  approved: number
  total: number
  className?: string
}

export function ProgressBar({ approved, total, className }: ProgressBarProps) {
  if (total === 0) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        -
      </span>
    )
  }

  const blocks = Math.min(total, 5) // 최대 5개 블록으로 표시
  const filledBlocks = Math.round((approved / total) * blocks)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-0.5">
        {Array.from({ length: blocks }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "w-2 h-4 rounded-sm",
              i < filledBlocks ? "bg-green-500" : "bg-gray-200"
            )}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        ({approved}/{total}건)
      </span>
    </div>
  )
}
