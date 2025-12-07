import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: 대시보드 통계
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

  // 해당 월의 시작/끝 날짜
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

  // 이번 달 콘텐츠 조회
  const { data: monthContents, error: contentsError } = await supabase
    .from('contents')
    .select('id, status, channel')
    .eq('user_id', user.id)
    .gte('scheduled_at', startDate)
    .lte('scheduled_at', endDate)

  if (contentsError) {
    return NextResponse.json({ error: contentsError.message }, { status: 500 })
  }

  // 상태별 카운트
  const stats = {
    total: monthContents?.length || 0,
    draft: 0,
    pending_confirm: 0,
    revision: 0,
    approved: 0,
    scheduled: 0,
    published: 0,
    error: 0,
  }

  // 채널별 카운트
  const channelStats: Record<string, number> = {}

  monthContents?.forEach((content) => {
    // 상태별 집계
    if (content.status in stats) {
      stats[content.status as keyof typeof stats]++
    }

    // 채널별 집계
    channelStats[content.channel] = (channelStats[content.channel] || 0) + 1
  })

  // 광고주 수
  const { count: advertiserCount } = await supabase
    .from('advertisers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  return NextResponse.json({
    month: { year, month },
    stats,
    channelStats,
    advertiserCount: advertiserCount || 0,
  })
}
