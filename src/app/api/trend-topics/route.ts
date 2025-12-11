import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: 트렌드 토픽 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'season' | 'realtime' | null (전체)
    const activeOnly = searchParams.get('active_only') !== 'false' // 기본 true

    let query = supabase
      .from('trend_topics')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('트렌드 토픽 조회 오류:', error)
      return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 })
    }

    // D-Day 계산 추가
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const enrichedData = data?.map(item => {
      let dday = null
      if (item.event_date) {
        const eventDate = new Date(item.event_date)
        eventDate.setHours(0, 0, 0, 0)
        dday = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }
      return { ...item, dday }
    })

    return NextResponse.json({
      data: enrichedData || [],
      total: enrichedData?.length || 0
    })

  } catch (error) {
    console.error('트렌드 토픽 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST: 새 트렌드 토픽 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, description, reference_url, event_date, priority, is_active } = body

    if (!type || !title) {
      return NextResponse.json({ error: 'type과 title은 필수입니다.' }, { status: 400 })
    }

    if (!['season', 'realtime'].includes(type)) {
      return NextResponse.json({ error: 'type은 season 또는 realtime이어야 합니다.' }, { status: 400 })
    }

    // priority가 없으면 해당 타입의 마지막 순서 + 1
    let finalPriority = priority
    if (finalPriority === undefined || finalPriority === null) {
      const { data: maxPriorityData } = await supabase
        .from('trend_topics')
        .select('priority')
        .eq('type', type)
        .order('priority', { ascending: false })
        .limit(1)
        .single()

      finalPriority = (maxPriorityData?.priority || 0) + 1
    }

    const { data, error } = await supabase
      .from('trend_topics')
      .insert({
        type,
        title,
        description: description || null,
        reference_url: reference_url || null,
        event_date: event_date || null,
        priority: finalPriority,
        is_active: is_active !== false,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('트렌드 토픽 생성 오류:', error)
      return NextResponse.json({ error: '생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ data })

  } catch (error) {
    console.error('트렌드 토픽 생성 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// PUT: 순서 일괄 업데이트 (드래그앤드롭)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { items } = body // [{ id: string, priority: number }]

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'items 배열이 필요합니다.' }, { status: 400 })
    }

    // 각 아이템의 priority 업데이트
    const updates = items.map(async (item: { id: string; priority: number }) => {
      return supabase
        .from('trend_topics')
        .update({ priority: item.priority, updated_at: new Date().toISOString() })
        .eq('id', item.id)
    })

    await Promise.all(updates)

    return NextResponse.json({ success: true, updated: items.length })

  } catch (error) {
    console.error('트렌드 토픽 순서 업데이트 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
