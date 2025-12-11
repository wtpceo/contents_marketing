'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, CheckCheck, X, FileText, ThumbsUp, MessageSquare, Package, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Notification {
  id: string
  type: 'approve' | 'revision' | 'bulk_complete' | 'report_ready' | 'content_created'
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
  advertiser?: { id: string; name: string } | null
  content?: { id: string; title: string } | null
}

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  approve: ThumbsUp,
  revision: MessageSquare,
  bulk_complete: Package,
  report_ready: BarChart3,
  content_created: FileText,
}

const NOTIFICATION_COLORS: Record<string, string> = {
  approve: 'bg-green-100 text-green-600',
  revision: 'bg-blue-100 text-blue-600',
  bulk_complete: 'bg-purple-100 text-purple-600',
  report_ready: 'bg-amber-100 text-amber-600',
  content_created: 'bg-indigo-100 text-indigo-600',
}

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return date.toLocaleDateString('ko-KR')
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=20')
      if (response.ok) {
        const result = await response.json()
        setNotifications(result.data || [])
        setUnreadCount(result.unreadCount || 0)
      }
    } catch (error) {
      console.error('알림 로딩 실패:', error)
    }
  }, [])

  // 초기 로딩 및 1분 간격 폴링
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // 1분 간격
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // 팝오버 열릴 때 새로고침
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds })
      })

      setNotifications(prev =>
        prev.map(n =>
          notificationIds.includes(n.id) ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error)
    }
  }

  const markAllAsRead = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true })
      })

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('전체 읽음 처리 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead([notification.id])
    }
    if (notification.link) {
      window.location.href = notification.link
    }
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="알림"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={isLoading}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              모두 읽음
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">새로운 알림이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type] || Bell
                const colorClass = NOTIFICATION_COLORS[notification.type] || 'bg-gray-100 text-gray-600'

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'flex gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50',
                      !notification.is_read && 'bg-blue-50/50'
                    )}
                  >
                    <div className={cn('rounded-full p-2 h-fit', colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          'text-sm line-clamp-1',
                          !notification.is_read && 'font-semibold'
                        )}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
              onClick={() => {
                window.location.href = '/notifications'
                setIsOpen(false)
              }}
            >
              모든 알림 보기
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
