import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: 기획안(Topic) 목록 조회
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const advertiserId = searchParams.get('advertiser_id')
  const status = searchParams.get('status')
  const month = searchParams.get('month') // YYYY-MM 형식

  let query = supabase
    .from('topics')
    .select(`
      *,
      advertisers (
        id,
        name,
        logo_url
      )
    `)
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: true })

  if (advertiserId) {
    query = query.eq('advertiser_id', advertiserId)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (month) {
    const startDate = `${month}-01`
    const endDate = `${month}-31`
    query = query.gte('scheduled_date', startDate).lte('scheduled_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST: 기획안(Topic) 생성 - 캘린더에 주제 등록
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
    description,
    scheduled_date,
    channels, // ["blog", "instagram", "threads"]
    source, // "trend" | "season" | "manual"
    source_data, // 트렌드/시즌 원본 데이터
  } = body

  if (!advertiser_id || !title || !scheduled_date) {
    return NextResponse.json(
      { error: '광고주, 제목, 날짜는 필수입니다.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('topics')
    .insert({
      user_id: user.id,
      advertiser_id,
      title,
      description,
      scheduled_date,
      channels: channels || ['blog'],
      source: source || 'manual',
      source_data,
      status: 'planning', // planning, approved, generating, completed
    })
    .select(`
      *,
      advertisers (
        id,
        name
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
