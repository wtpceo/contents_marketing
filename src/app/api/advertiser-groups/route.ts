import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/advertiser-groups
 * 광고주 그룹(세그먼트) 목록 조회
 */
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('advertiser_groups')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Advertiser groups fetch error:', error)
    return NextResponse.json({ error: '그룹 목록을 불러오는데 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

/**
 * POST /api/advertiser-groups
 * 새 광고주 그룹 생성
 *
 * Request Body:
 * {
 *   "name": "서울 수학학원",
 *   "description": "서울 지역의 수학학원 광고주",
 *   "filter_conditions": {
 *     "category": "수학학원",
 *     "location": "서울",
 *     "tags": ["겨울특강"]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, filter_conditions } = body

  if (!name) {
    return NextResponse.json({ error: '그룹 이름은 필수입니다.' }, { status: 400 })
  }

  if (!filter_conditions || Object.keys(filter_conditions).length === 0) {
    return NextResponse.json({ error: '필터 조건이 필요합니다.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('advertiser_groups')
    .insert({
      user_id: user.id,
      name,
      description,
      filter_conditions,
    })
    .select()
    .single()

  if (error) {
    console.error('Advertiser group create error:', error)
    return NextResponse.json({ error: '그룹 생성에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
