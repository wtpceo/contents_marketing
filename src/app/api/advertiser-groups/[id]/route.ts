import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/advertiser-groups/[id]
 * 특정 그룹 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('advertiser_groups')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '그룹을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/advertiser-groups/[id]
 * 그룹 수정
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, filter_conditions } = body

  // 소유권 확인
  const { data: existing } = await supabase
    .from('advertiser_groups')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: '그룹을 찾을 수 없습니다.' }, { status: 404 })
  }

  const updateData: Record<string, any> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (filter_conditions !== undefined) updateData.filter_conditions = filter_conditions

  const { data, error } = await supabase
    .from('advertiser_groups')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Advertiser group update error:', error)
    return NextResponse.json({ error: '그룹 수정에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/advertiser-groups/[id]
 * 그룹 삭제 (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { error } = await supabase
    .from('advertiser_groups')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Advertiser group delete error:', error)
    return NextResponse.json({ error: '그룹 삭제에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
