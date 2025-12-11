import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/advertisers
 * 광고주 목록 조회 (필터링 및 페이지네이션 지원)
 *
 * Query Params:
 * - search: 광고주명 검색
 * - category: 업종 필터 (industry)
 * - location: 지역 필터
 * - tags: 태그 필터 (콤마 구분)
 * - page: 페이지 번호 (default: 1)
 * - limit: 페이지당 개수 (default: 50)
 * - all: 'true'면 페이지네이션 없이 전체 조회
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const category = searchParams.get('category')
  const location = searchParams.get('location')
  const tags = searchParams.get('tags')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const all = searchParams.get('all') === 'true'

  let query = supabase
    .from('advertisers')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('is_active', true)

  // 검색어 필터 (광고주명)
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  // 업종 필터
  if (category) {
    query = query.eq('industry', category)
  }

  // 지역 필터 (location 또는 advanced_profile의 location)
  if (location) {
    query = query.or(`location.ilike.%${location}%,advanced_profile->basic_info->>location.ilike.%${location}%`)
  }

  // 태그 필터 (tags 배열에서 검색)
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim())
    // tags 컬럼이 있는 경우 배열에서 검색
    query = query.contains('tags', tagList)
  }

  // 정렬
  query = query.order('created_at', { ascending: false })

  // 페이지네이션 (all이 아닐 때만)
  if (!all) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 메타 정보와 함께 반환
  return NextResponse.json({
    data: data || [],
    meta: {
      total: count || 0,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0,
    }
  })
}

// POST: 광고주 생성
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const {
    name,
    industry,
    location,           // 위치 추가
    target_audience,
    tone,
    forbidden_words,
    brand_keywords,
    contact_name,
    contact_phone,
    contact_email,
    logo_url,
    description,
  } = body

  if (!name) {
    return NextResponse.json({ error: '광고주명은 필수입니다.' }, { status: 400 })
  }


  const { data, error } = await supabase
    .from('advertisers')
    .insert({
      user_id: user.id,
      name,
      industry,
      location,           // 위치 추가
      target_audience,
      tone: tone || [],
      forbidden_words: forbidden_words || [],
      brand_keywords: brand_keywords || [],
      contact_name,
      contact_phone,
      contact_email,
      logo_url,
      description,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
