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
    selected_channels, // OSMU 멀티채널 지원
    channel_data,      // OSMU 채널별 콘텐츠 데이터
  } = body

  if (!advertiser_id || !title || !channel) {
    return NextResponse.json(
      { error: '광고주, 제목, 채널은 필수입니다.' },
      { status: 400 }
    )
  }

  // 채널 값 매핑 (프론트엔드 → DB ENUM)
  const channelMap: Record<string, string> = {
    'blog': 'blog_naver',
    'instagram': 'instagram',
    'threads': 'threads',
    'blog_naver': 'blog_naver',
  }
  const mappedChannel = channelMap[channel] || channel

  const { data, error } = await supabase
    .from('contents')
    .insert({
      user_id: user.id,
      advertiser_id,
      title,
      body: contentBody || '',
      channel: mappedChannel,
      scheduled_at,
      keywords: keywords || [],
      llm_prompt,
      images: images || [],
      status: 'draft',
      selected_channels: selected_channels || [channel], // OSMU: 선택된 채널 목록
      channel_data: channel_data || {},                   // OSMU: 채널별 콘텐츠 데이터
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// DELETE: 콘텐츠 일괄 삭제 (Bulk Delete)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('ids') // 쉼표로 구분된 ID 목록
  const date = searchParams.get('date') // 특정 날짜 (YYYY-MM-DD)
  const month = searchParams.get('month') // 특정 월 (YYYY-MM)

  // 방법 1: ID 목록으로 삭제
  if (ids) {
    const idArray = ids.split(',').filter(id => id.trim())

    if (idArray.length === 0) {
      return NextResponse.json({ error: '삭제할 ID가 없습니다.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('contents')
      .delete()
      .eq('user_id', user.id)
      .in('id', idArray)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: idArray.length })
  }

  // 방법 2: 특정 날짜의 모든 콘텐츠 삭제
  if (date) {
    const startOfDay = `${date}T00:00:00Z`
    const endOfDay = `${date}T23:59:59Z`

    const { data: toDelete, error: fetchError } = await supabase
      .from('contents')
      .select('id')
      .eq('user_id', user.id)
      .gte('scheduled_at', startOfDay)
      .lte('scheduled_at', endOfDay)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!toDelete || toDelete.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 })
    }

    const { error } = await supabase
      .from('contents')
      .delete()
      .eq('user_id', user.id)
      .in('id', toDelete.map(c => c.id))

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: toDelete.length })
  }

  // 방법 3: 특정 월의 모든 콘텐츠 삭제
  if (month) {
    const [year, mon] = month.split('-')
    const startOfMonth = `${year}-${mon}-01T00:00:00Z`
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
    const endOfMonth = `${year}-${mon}-${lastDay}T23:59:59Z`

    const { data: toDelete, error: fetchError } = await supabase
      .from('contents')
      .select('id')
      .eq('user_id', user.id)
      .gte('scheduled_at', startOfMonth)
      .lte('scheduled_at', endOfMonth)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!toDelete || toDelete.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 })
    }

    const { error } = await supabase
      .from('contents')
      .delete()
      .eq('user_id', user.id)
      .in('id', toDelete.map(c => c.id))

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: toDelete.length })
  }

  return NextResponse.json(
    { error: 'ids, date, 또는 month 파라미터가 필요합니다.' },
    { status: 400 }
  )
}
