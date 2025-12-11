import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/templates
 * 템플릿 목록 조회
 *
 * Query params:
 * - scope: 'public' | 'private' | 'all' (default: 'all')
 *   - 'public': 위플 공식 템플릿만 조회
 *   - 'private': 내 템플릿만 조회
 *   - 'all': 공식 + 내 템플릿 모두 조회
 * - category: 카테고리 필터
 * - platform: 플랫폼 필터
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope') || 'all' // 'public', 'private', 'all'
  const category = searchParams.get('category')
  const platform = searchParams.get('platform')

  let results: any[] = []

  // 공용 템플릿 조회 (public)
  if (scope === 'public' || scope === 'all') {
    let publicQuery = supabase
      .from('templates')
      .select('*')
      .eq('visibility', 'public')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })

    if (category) {
      publicQuery = publicQuery.eq('category', category)
    }
    if (platform) {
      publicQuery = publicQuery.eq('platform', platform)
    }

    const { data: publicData, error: publicError } = await publicQuery

    if (publicError) {
      console.error('Public templates fetch error:', publicError)
    } else if (publicData) {
      // 공용 템플릿에 isPublic 플래그 추가
      results = [...results, ...publicData.map(t => ({ ...t, isPublic: true }))]
    }
  }

  // 개인 템플릿 조회 (private)
  if (scope === 'private' || scope === 'all') {
    let privateQuery = supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .or('visibility.eq.private,visibility.is.null') // private이거나 visibility가 없는 경우 (기존 데이터 호환)
      .order('created_at', { ascending: false })

    if (category) {
      privateQuery = privateQuery.eq('category', category)
    }
    if (platform) {
      privateQuery = privateQuery.eq('platform', platform)
    }

    const { data: privateData, error: privateError } = await privateQuery

    if (privateError) {
      console.error('Private templates fetch error:', privateError)
    } else if (privateData) {
      // 개인 템플릿에 isPublic 플래그 추가
      results = [...results, ...privateData.map(t => ({ ...t, isPublic: false }))]
    }
  }

  return NextResponse.json(results)
}

/**
 * POST /api/templates
 * 새 템플릿 생성
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { title, category, platform, content_structure, description, visibility } = body

  if (!title || !category || !content_structure) {
    return NextResponse.json(
      { error: 'title, category, content_structure는 필수입니다.' },
      { status: 400 }
    )
  }

  // 템플릿에서 변수 추출 ({{변수명}} 패턴)
  const variableRegex = /\{\{(\w+)\}\}/g
  const variables: string[] = []
  let match
  while ((match = variableRegex.exec(content_structure)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      user_id: user.id,
      title,
      category,
      platform: platform || 'blog',
      content_structure,
      description,
      variables,
      visibility: visibility || 'private',
    })
    .select()
    .single()

  if (error) {
    console.error('Template create error:', error)
    return NextResponse.json({ error: '템플릿 생성에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
