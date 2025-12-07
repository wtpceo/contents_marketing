import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: 콘텐츠 목록 조회 (캘린더용)
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const advertiserId = searchParams.get('advertiser_id')
  const channel = searchParams.get('channel')
  const status = searchParams.get('status')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  let query = supabase
    .from('contents')
    .select(`
      *,
      advertisers (
        id,
        name,
        logo_url
      )
    `)
    .eq('user_id', user.id)

  // 필터 적용
  if (advertiserId) {
    query = query.eq('advertiser_id', advertiserId)
  }
  if (channel) {
    query = query.eq('channel', channel)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (startDate) {
    query = query.gte('scheduled_at', startDate)
  }
  if (endDate) {
    query = query.lte('scheduled_at', endDate)
  }

  const { data, error } = await query.order('scheduled_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST: 콘텐츠 생성
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const {
    advertiser_id,
    title,
    body: contentBody,
    channel,
    scheduled_at,
    keywords,
    llm_prompt,
    images,
  } = body

  if (!advertiser_id || !title || !channel) {
    return NextResponse.json(
      { error: '광고주, 제목, 채널은 필수입니다.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('contents')
    .insert({
      user_id: user.id,
      advertiser_id,
      title,
      body: contentBody,
      channel,
      scheduled_at,
      keywords: keywords || [],
      llm_prompt,
      images: images || [],
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
