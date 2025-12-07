import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: 매직 플랜 일괄 적용 (contents 테이블에 저장)
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { topics } = body

  // topics: Array<{ date, title, description?, channels, advertiser_id }>

  if (!topics || !Array.isArray(topics) || topics.length === 0) {
    return NextResponse.json(
      { error: '저장할 기획안이 없습니다.' },
      { status: 400 }
    )
  }

  // 광고주 검증 (첫 번째 항목 기준)
  const advertiserId = topics[0].advertiser_id
  if (!advertiserId) {
    return NextResponse.json(
      { error: '광고주 정보가 필요합니다.' },
      { status: 400 }
    )
  }

  const { data: advertiser, error: advError } = await supabase
    .from('advertisers')
    .select('id')
    .eq('id', advertiserId)
    .eq('user_id', user.id)
    .single()

  if (advError || !advertiser) {
    return NextResponse.json({ error: '광고주를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 각 채널별로 contents 생성 (OSMU)
  const insertData: any[] = []

  for (const topic of topics) {
    const channels = topic.channels || ['blog']

    for (const channel of channels) {
      insertData.push({
        user_id: user.id,
        advertiser_id: topic.advertiser_id,
        title: topic.title,
        body: topic.description || '',
        channel: channel === 'blog' ? 'blog_naver' : channel,
        scheduled_at: topic.date ? `${topic.date}T09:00:00Z` : null,
        status: 'draft',
        llm_prompt: `[매직플랜] ${topic.title}`,
      })
    }
  }

  // Bulk Insert to contents
  const { data: insertedContents, error: insertError } = await supabase
    .from('contents')
    .insert(insertData)
    .select()

  if (insertError) {
    console.error('Bulk Insert Error:', insertError)
    return NextResponse.json(
      { error: `저장 실패: ${insertError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    count: insertedContents?.length || 0,
    contents: insertedContents,
  }, { status: 201 })
}
