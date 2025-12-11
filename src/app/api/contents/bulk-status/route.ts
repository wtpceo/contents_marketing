import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PUT /api/contents/bulk-status
 * 특정 광고주의 월별 콘텐츠 상태 일괄 변경
 *
 * Request Body:
 * {
 *   "advertiser_id": "uuid",
 *   "month": "2025-12",
 *   "status": "draft" | "pending" | "revision" | "approved"
 * }
 *
 * 또는 콘텐츠 ID 목록으로 직접 변경:
 * {
 *   "content_ids": ["uuid1", "uuid2"],
 *   "status": "draft" | "pending" | "revision" | "approved"
 * }
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { advertiser_id, month, content_ids, status } = body

  // 유효한 상태값 검증
  const validStatuses = ['draft', 'pending', 'revision', 'approved']
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `유효하지 않은 상태입니다. (${validStatuses.join(', ')})` },
      { status: 400 }
    )
  }

  let query = supabase
    .from('contents')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  // 방법 1: 콘텐츠 ID 목록으로 변경
  if (content_ids && Array.isArray(content_ids) && content_ids.length > 0) {
    const { data, error } = await query
      .in('id', content_ids)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated_count: data?.length || 0,
      status
    })
  }

  // 방법 2: 광고주 + 월로 변경
  if (advertiser_id && month) {
    const [year, mon] = month.split('-').map(Number)
    const startOfMonth = new Date(year, mon - 1, 1).toISOString()
    const endOfMonth = new Date(year, mon, 0, 23, 59, 59).toISOString()

    const { data, error } = await query
      .eq('advertiser_id', advertiser_id)
      .gte('scheduled_at', startOfMonth)
      .lte('scheduled_at', endOfMonth)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 활동 로그 기록
    const statusLabels: Record<string, string> = {
      draft: '제작 중',
      pending: '컨펌 대기',
      revision: '수정 요청',
      approved: '승인 완료'
    }

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      advertiser_id,
      action_type: 'status_changed',
      description: `상태를 '${statusLabels[status]}'(으)로 변경`,
      metadata: { month, status, count: data?.length || 0 }
    })

    return NextResponse.json({
      success: true,
      updated_count: data?.length || 0,
      status
    })
  }

  return NextResponse.json(
    { error: 'advertiser_id와 month, 또는 content_ids가 필요합니다.' },
    { status: 400 }
  )
}
