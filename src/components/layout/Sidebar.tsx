'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, FileText, BarChart3, Settings, LogOut, Factory } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { CreateContentModal } from '@/components/dashboard/CreateContentModal'

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '광고주 관리', href: '/clients', icon: Users },
  { name: '콘텐츠 에디터', href: '/editor/new', icon: FileText },
  { name: '대량 생산', href: '/bulk-create', icon: Factory },
  { name: '인사이트', href: '/insights', icon: BarChart3 },
  { name: '설정', href: '/settings', icon: Settings },
]

interface UserProfile {
  email: string
  full_name: string | null
}

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser({
          email: user.email || '',
          full_name: user.user_metadata?.full_name || null,
        })
      }
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-white/50 backdrop-blur-xl">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard">
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            위플 콘텐츠마케팅 <span className="text-xs font-normal text-muted-foreground">MVP</span>
          </h1>
        </Link>
      </div>

      <div className="p-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg py-2.5 font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-xl leading-none">+</span> 새 콘텐츠
        </button>
      </div>

      <CreateContentModal open={showCreateModal} onOpenChange={setShowCreateModal} />

      <nav className="flex-1 space-y-1 px-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 p-2 rounded-lg">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 border-2 border-white ring-1 ring-border shadow-sm flex items-center justify-center text-white font-semibold text-sm">
            {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-semibold text-foreground truncate">
              {user?.full_name || '마케터'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || '로딩 중...'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
