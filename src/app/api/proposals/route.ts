import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

/**
 * GET /api/proposals?advertiser_id=xxx&target_month=2025-12
 * 특정 광고주의 월별 제안서 조회
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const advertiserId = searchParams.get('advertiser_id')
  const targetMonth = searchParams.get('target_month')

  if (!advertiserId) {
    return NextResponse.json({ error: 'advertiser_id가 필요합니다.' }, { status: 400 })
  }

  let query = supabase
    .from('proposals')
    .select(`
      *,
      advertiser:advertisers(id, name, industry)
    `)
    .eq('user_id', user.id)
    .eq('advertiser_id', advertiserId)

  if (targetMonth) {
    query = query.eq('target_month', targetMonth)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Proposals fetch error:', error)
    return NextResponse.json({ error: '제안서 조회에 실패했습니다.' }, { status: 500 })
  }

  // 단일 월 조회 시 첫 번째 결과 반환
  if (targetMonth) {
    return NextResponse.json(data?.[0] || null)
  }

  return NextResponse.json(data)
}

/**
 * POST /api/proposals
 * 새 제안서 생성 (기획안 링크 생성)
 *
 * Request Body:
 * {
 *   "advertiser_id": "uuid",
 *   "target_month": "2025-12",
 *   "title": "12월 콘텐츠 기획안" (optional)
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { advertiser_id, target_month, title, description } = body

  if (!advertiser_id || !target_month) {
    return NextResponse.json(
      { error: 'advertiser_id와 target_month는 필수입니다.' },
      { status: 400 }
    )
  }

  // target_month 형식 검증 (YYYY-MM)
  if (!/^\d{4}-\d{2}$/.test(target_month)) {
    return NextResponse.json(
      { error: 'target_month는 YYYY-MM 형식이어야 합니다.' },
      { status: 400 }
    )
  }

  // 광고주 소유권 확인
  const { data: advertiser, error: advError } = await supabase
    .from('advertisers')
    .select('id, name')
    .eq('id', advertiser_id)
    .eq('user_id', user.id)
    .single()

  if (advError || !advertiser) {
    return NextResponse.json({ error: '광고주를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 해당 월에 기획된 topics 또는 contents가 있는지 확인
  const startDate = `${target_month}-01`
  const [year, month] = target_month.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${target_month}-${lastDay}`

  // topics 테이블 확인
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('id')
    .eq('advertiser_id', advertiser_id)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)

  if (topicsError) {
    console.error('Topics check error:', topicsError)
  }

  // contents 테이블도 확인 (topics가 없는 경우)
  let hasContent = topics && topics.length > 0

  if (!hasContent) {
    const { data: contents, error: contentsError } = await supabase
      .from('contents')
      .select('id')
      .eq('advertiser_id', advertiser_id)
      .gte('scheduled_at', `${startDate}T00:00:00`)
      .lte('scheduled_at', `${endDate}T23:59:59`)

    if (contentsError) {
      console.error('Contents check error:', contentsError)
    }

    hasContent = contents && contents.length > 0
  }

  if (!hasContent) {
    return NextResponse.json(
      { error: '해당 월에 기획된 콘텐츠가 없습니다. 먼저 캘린더에서 콘텐츠를 기획해주세요.' },
      { status: 400 }
    )
  }

  // URL-safe 토큰 생성 (16자리)
  const token = nanoid(16)

  // 기존 제안서가 있는지 확인 (있으면 업데이트)
  const { data: existingProposal } = await supabase
    .from('proposals')
    .select('id, token')
    .eq('advertiser_id', advertiser_id)
    .eq('target_month', target_month)
    .single()

  if (existingProposal) {
    // 기존 제안서 업데이트 (토큰은 유지)
    const { data: updated, error: updateError } = await supabase
      .from('proposals')
      .update({
        title: title || `${advertiser.name} ${target_month} 콘텐츠 기획안`,
        description,
        status: 'pending', // 재공유 시 상태 초기화
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProposal.id)
      .select()
      .single()

    if (updateError) {
      console.error('Proposal update error:', updateError)
      return NextResponse.json({ error: '제안서 업데이트에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      ...updated,
      share_url: `/share/${existingProposal.token}`,
      is_new: false,
    })
  }

  // 새 제안서 생성
  const { data: proposal, error: createError } = await supabase
    .from('proposals')
    .insert({
      user_id: user.id,
      advertiser_id,
      target_month,
      token,
      title: title || `${advertiser.name} ${target_month} 콘텐츠 기획안`,
      description,
      status: 'pending',
    })
    .select()
    .single()

  if (createError) {
    console.error('Proposal create error:', createError)
    return NextResponse.json({ error: '제안서 생성에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({
    ...proposal,
    share_url: `/share/${token}`,
    is_new: true,
  })
}
