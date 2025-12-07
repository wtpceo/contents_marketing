'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wand2, Activity, BarChart3, Globe } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleSocialLogin = async (provider: 'google' | 'kakao' | 'naver') => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* Left: Brand Section */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xl font-bold">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white">
              <Wand2 className="w-5 h-5" />
            </div>
            WizThePlanning
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-bold leading-tight mb-6">
            콘텐츠 마케팅을<br />
            <span className="text-primary">더 쉽고, 더 강력하게</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            AI 기반 콘텐츠 생성부터 채널 배포, 성과 분석까지.<br />
            위즈더플래닝과 함께 마케팅의 차원을 높이세요.
          </p>

          <div className="flex gap-4">
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 w-32">
              <BarChart3 className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">데이터 분석</span>
            </div>
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 w-32">
              <Activity className="w-6 h-6 text-purple-400" />
              <span className="text-sm font-medium">성과 추적</span>
            </div>
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 w-32">
              <Globe className="w-6 h-6 text-blue-400" />
              <span className="text-sm font-medium">글로벌 배포</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-gray-500">
          © 2025 WizThePlanning. All rights reserved.
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">로그인</h2>
            <p className="mt-2 text-sm text-gray-600">
              서비스 이용을 위해 계정에 로그인해주세요.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                <Activity className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">비밀번호</Label>
                <Link href="#" className="text-xs text-primary hover:underline">
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base bg-slate-900 hover:bg-slate-800"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* 소셜 로그인 버튼 */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="w-full flex items-center justify-center gap-3 h-11 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Google로 계속하기</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('kakao')}
              className="w-full flex items-center justify-center gap-3 h-11 px-4 rounded-lg hover:brightness-95 transition-all"
              style={{ backgroundColor: '#FEE500' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000000">
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.86 5.33 4.64 6.74-.14.53-.92 3.31-.95 3.53 0 0-.02.17.09.24.11.07.24.02.24.02.32-.04 3.68-2.41 4.26-2.81.57.08 1.15.13 1.72.13 5.52 0 10-3.58 10-8 0-4.42-4.48-8-10-8z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">카카오로 계속하기</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('naver')}
              className="w-full flex items-center justify-center gap-3 h-11 px-4 rounded-lg text-white hover:brightness-95 transition-all"
              style={{ backgroundColor: '#03C75A' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
              </svg>
              <span className="text-sm font-medium">네이버로 계속하기</span>
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            아직 계정이 없으신가요?{' '}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
