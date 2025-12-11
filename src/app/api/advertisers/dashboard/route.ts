import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 월별 상태 판단 로직
 * - EMPTY: 해당 월 콘텐츠 0개
 * - DRAFTING: 콘텐츠 있으나 미발송 (status=draft)
 * - PENDING: 컨펌 요청 발송됨 (status=pending)
 * - REVISION: 수정 요청 받음 (status=revision)
 * - READY: 모든 콘텐츠 승인됨 (전부 status=approved)
 */
type MonthlyStatus = 'EMPTY' | 'DRAFTING' | 'PENDING' | 'REVISION' | 'READY'

interface ContentStats {
  total: number
  draft: number
  pending: number
  revision: number
  approved: number
}

function calculateMonthlyStatus(stats: ContentStats): MonthlyStatus {
  if (stats.total === 0) return 'EMPTY'
  if (stats.revision > 0) return 'REVISION' // 긴급 - 최우선
  if (stats.total > 0 && stats.approved === stats.total) return 'READY'
  if (stats.pending > 0) return 'PENDING'
  return 'DRAFTING'
}

/**
 * GET /api/advertisers/dashboard
 * 광고주 대시보드 데이터 조회 (월별 상태 포함)
 *
 * Query Params:
 * - month: 조회할 월 (YYYY-MM 형식, default: 현재 월)
 * - status: 상태 필터 (EMPTY, DRAFTING, PENDING, REVISION, READY)
 * - search: 광고주명 검색
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7) // YYYY-MM
  const statusFilter = searchParams.get('status') as MonthlyStatus | null
  const search = searchParams.get('search')

  // 월 범위 계산
  const [year, mon] = month.split('-').map(Number)
  const startOfMonth = new Date(year, mon - 1, 1).toISOString()
  const endOfMonth = new Date(year, mon, 0, 23, 59, 59).toISOString()

  // 1. 광고주 목록 조회
  let advertiserQuery = supabase
    .from('advertisers')
    .select('id, name, industry, location, contact_phone, created_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (search) {
    advertiserQuery = advertiserQuery.ilike('name', `%${search}%`)
  }

  const { data: advertisers, error: advError } = await advertiserQuery

  if (advError) {
    return NextResponse.json({ error: advError.message }, { status: 500 })
  }

  if (!advertisers || advertisers.length === 0) {
    return NextResponse.json({
      data: [],
      meta: {
        month,
        total: 0,
        byStatus: { EMPTY: 0, DRAFTING: 0, PENDING: 0, REVISION: 0, READY: 0 }
      }
    })
  }

  // 2. 해당 월의 콘텐츠 조회 (광고주별)
  const advertiserIds = advertisers.map(a => a.id)

  const { data: contents, error: contentError } = await supabase
    .from('contents')
    .select('id, advertiser_id, status, scheduled_at, created_at')
    .eq('user_id', user.id)
    .in('advertiser_id', advertiserIds)
    .gte('scheduled_at', startOfMonth)
    .lte('scheduled_at', endOfMonth)

  if (contentError) {
    return NextResponse.json({ error: contentError.message }, { status: 500 })
  }

  // 3. 최근 활동 로그 조회
  const { data: logs } = await supabase
    .from('activity_logs')
    .select('advertiser_id, description, created_at')
    .eq('user_id', user.id)
    .in('advertiser_id', advertiserIds)
    .order('created_at', { ascending: false })
    .limit(100) // 최근 100개만

  // 광고주별 최신 로그 맵
  const latestLogMap: Record<string, { description: string; created_at: string }> = {}
  logs?.forEach(log => {
    if (log.advertiser_id && !latestLogMap[log.advertiser_id]) {
      latestLogMap[log.advertiser_id] = {
        description: log.description,
        created_at: log.created_at
      }
    }
  })

  // 4. 광고주별 콘텐츠 집계 및 상태 계산
  const contentsByAdvertiser: Record<string, ContentStats> = {}
  const contentDatesByAdvertiser: Record<string, { first: string | null; last: string | null }> = {}

  // 초기화
  advertiserIds.forEach(id => {
    contentsByAdvertiser[id] = { total: 0, draft: 0, pending: 0, revision: 0, approved: 0 }
    contentDatesByAdvertiser[id] = { first: null, last: null }
  })

  // 집계
  contents?.forEach(content => {
    const advId = content.advertiser_id
    if (!contentsByAdvertiser[advId]) return

    contentsByAdvertiser[advId].total++

    switch (content.status) {
      case 'draft':
        contentsByAdvertiser[advId].draft++
        break
      case 'pending':
        contentsByAdvertiser[advId].pending++
        break
      case 'revision':
        contentsByAdvertiser[advId].revision++
        break
      case 'approved':
        contentsByAdvertiser[advId].approved++
        break
    }

    // 배포일 범위 계산
    const scheduledDate = content.scheduled_at?.slice(0, 10)
    if (scheduledDate) {
      if (!contentDatesByAdvertiser[advId].first || scheduledDate < contentDatesByAdvertiser[advId].first!) {
        contentDatesByAdvertiser[advId].first = scheduledDate
      }
      if (!contentDatesByAdvertiser[advId].last || scheduledDate > contentDatesByAdvertiser[advId].last!) {
        contentDatesByAdvertiser[advId].last = scheduledDate
      }
    }
  })

  // 5. 결과 조합
  const statusCounts: Record<MonthlyStatus, number> = {
    EMPTY: 0, DRAFTING: 0, PENDING: 0, REVISION: 0, READY: 0
  }

  let result = advertisers.map(advertiser => {
    const stats = contentsByAdvertiser[advertiser.id]
    const monthlyStatus = calculateMonthlyStatus(stats)
    const dates = contentDatesByAdvertiser[advertiser.id]
    const latestLog = latestLogMap[advertiser.id]

    statusCounts[monthlyStatus]++

    return {
      id: advertiser.id,
      name: advertiser.name,
      industry: advertiser.industry,
      location: advertiser.location,
      contact_phone: advertiser.contact_phone,
      monthly_status: monthlyStatus,
      content_stats: stats,
      progress: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
      deploy_dates: dates.first && dates.last ? `${dates.first.slice(5)} ~ ${dates.last.slice(5)}` : null,
      latest_activity: latestLog ? {
        description: latestLog.description,
        date: new Date(latestLog.created_at).toLocaleDateString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      } : null
    }
  })

  // 상태 필터링
  if (statusFilter) {
    result = result.filter(a => a.monthly_status === statusFilter)
  }

  // REVISION 상태 최상단 정렬
  result.sort((a, b) => {
    if (a.monthly_status === 'REVISION' && b.monthly_status !== 'REVISION') return -1
    if (a.monthly_status !== 'REVISION' && b.monthly_status === 'REVISION') return 1
    return a.name.localeCompare(b.name, 'ko')
  })

  return NextResponse.json({
    data: result,
    meta: {
      month,
      total: advertisers.length,
      byStatus: statusCounts
    }
  })
}
