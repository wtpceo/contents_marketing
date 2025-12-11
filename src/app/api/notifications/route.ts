import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 알림 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('notifications')
      .select(`
        *,
        advertiser:advertisers!related_advertiser_id(id, name),
        content:contents!related_content_id(id, title)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('알림 조회 오류:', error)
      return NextResponse.json({ error: '알림을 불러오는데 실패했습니다.' }, { status: 500 })
    }

    // 읽지 않은 알림 개수
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return NextResponse.json({
      data: data || [],
      unreadCount: unreadCount || 0
    })

  } catch (error) {
    console.error('알림 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 알림 생성 (서버에서 호출)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { user_id, type, title, message, link, related_advertiser_id, related_content_id, metadata } = body

    if (!user_id || !type || !title || !message) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        link,
        related_advertiser_id,
        related_content_id,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('알림 생성 오류:', error)
      return NextResponse.json({ error: '알림 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ data })

  } catch (error) {
    console.error('알림 생성 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 알림 읽음 처리
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { notification_ids, mark_all } = body

    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)

    if (mark_all) {
      query = query.eq('is_read', false)
    } else if (notification_ids && notification_ids.length > 0) {
      query = query.in('id', notification_ids)
    } else {
      return NextResponse.json({ error: '알림 ID 또는 mark_all 옵션이 필요합니다.' }, { status: 400 })
    }

    const { error } = await query

    if (error) {
      console.error('알림 읽음 처리 오류:', error)
      return NextResponse.json({ error: '알림 읽음 처리에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('알림 읽음 처리 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
