import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: 광고주 목록 조회
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }


  const { data, error } = await supabase
    .from('advertisers')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
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
