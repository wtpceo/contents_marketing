"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type MonthlyStatus = 'EMPTY' | 'DRAFTING' | 'PENDING' | 'REVISION' | 'READY'

interface StatusBadgeProps {
  status: MonthlyStatus
  className?: string
}

const STATUS_CONFIG: Record<MonthlyStatus, {
  label: string
  color: string
  bgColor: string
  emoji: string
}> = {
  EMPTY: {
    label: '기획 필요',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-200',
    emoji: '🔴'
  },
  DRAFTING: {
    label: '제작 중',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-200',
    emoji: '🟠'
  },
  PENDING: {
    label: '컨펌 대기',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-200',
    emoji: '🟡'
  },
  REVISION: {
    label: '수정 요청',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-200',
    emoji: '🔵'
  },
  READY: {
    label: '배포 준비',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-200',
    emoji: '🟢'
  }
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.color,
        "font-medium border",
        className
      )}
    >
      <span className="mr-1">{config.emoji}</span>
      {config.label}
    </Badge>
  )
}

export function getStatusLabel(status: MonthlyStatus): string {
  return STATUS_CONFIG[status].label
}

export function getStatusEmoji(status: MonthlyStatus): string {
  return STATUS_CONFIG[status].emoji
}
