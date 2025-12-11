import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/[id]
 * 특정 템플릿 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/templates/[id]
 * 템플릿 수정
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { title, category, platform, content_structure, description, is_active } = body

  // 소유권 확인
  const { data: existing } = await supabase
    .from('templates')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 업데이트할 필드 구성
  const updateData: Record<string, any> = {}
  if (title !== undefined) updateData.title = title
  if (category !== undefined) updateData.category = category
  if (platform !== undefined) updateData.platform = platform
  if (content_structure !== undefined) {
    updateData.content_structure = content_structure
    // 변수 재추출
    const variableRegex = /\{\{(\w+)\}\}/g
    const variables: string[] = []
    let match
    while ((match = variableRegex.exec(content_structure)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1])
      }
    }
    updateData.variables = variables
  }
  if (description !== undefined) updateData.description = description
  if (is_active !== undefined) updateData.is_active = is_active
  if (body.visibility !== undefined) updateData.visibility = body.visibility

  const { data, error } = await supabase
    .from('templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Template update error:', error)
    return NextResponse.json({ error: '템플릿 수정에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/templates/[id]
 * 템플릿 삭제 (soft delete - is_active = false)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // soft delete
  const { error } = await supabase
    .from('templates')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Template delete error:', error)
    return NextResponse.json({ error: '템플릿 삭제에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
