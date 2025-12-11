import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: 단일 트렌드 토픽 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('trend_topics')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '트렌드를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('트렌드 토픽 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// PATCH: 트렌드 토픽 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, description, reference_url, event_date, priority, is_active } = body

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (type !== undefined) {
      if (!['season', 'realtime'].includes(type)) {
        return NextResponse.json({ error: 'type은 season 또는 realtime이어야 합니다.' }, { status: 400 })
      }
      updates.type = type
    }
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (reference_url !== undefined) updates.reference_url = reference_url
    if (event_date !== undefined) updates.event_date = event_date
    if (priority !== undefined) updates.priority = priority
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error } = await supabase
      .from('trend_topics')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('트렌드 토픽 수정 오류:', error)
      return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('트렌드 토픽 수정 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// DELETE: 트렌드 토픽 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { error } = await supabase
      .from('trend_topics')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('트렌드 토픽 삭제 오류:', error)
      return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('트렌드 토픽 삭제 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
