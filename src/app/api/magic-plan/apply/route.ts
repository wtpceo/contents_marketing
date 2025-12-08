import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: 매직 플랜 일괄 적용 (topics + contents 테이블에 저장)
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { topics } = body

  // topics: Array<{ date, title, description?, planning_intent?, channels, advertiser_id }>

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

  // 1. topics 테이블에 기획안 저장 (제안서/공유용)
  const topicsInsertData = topics.map(topic => ({
    user_id: user.id,
    advertiser_id: topic.advertiser_id,
    title: topic.title,
    description: topic.description || '',
    scheduled_date: topic.date,
    channels: topic.channels || ['blog'],
    source: 'manual', // magic-plan에서 생성
    source_data: { from: 'magic_plan' },
    planning_intent: topic.planning_intent || '',
    status: 'planning',
  }))

  const { data: insertedTopics, error: topicsError } = await supabase
    .from('topics')
    .insert(topicsInsertData)
    .select()

  if (topicsError) {
    console.error('Topics Insert Error:', topicsError)
    return NextResponse.json(
      { error: `기획안 저장 실패: ${topicsError.message}` },
      { status: 500 }
    )
  }

  // 2. contents 테이블에 각 채널별로 콘텐츠 생성 (OSMU)
  const contentsInsertData: any[] = []

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i]
    const savedTopic = insertedTopics?.[i]
    const channels = topic.channels || ['blog']

    for (const channel of channels) {
      contentsInsertData.push({
        user_id: user.id,
        advertiser_id: topic.advertiser_id,
        topic_id: savedTopic?.id, // topics와 연결
        title: topic.title,
        body: topic.description || '',
        channel: channel === 'blog' ? 'blog_naver' : channel,
        scheduled_at: topic.date ? `${topic.date}T09:00:00Z` : null,
        status: 'draft',
        llm_prompt: `[매직플랜] ${topic.title}`,
      })
    }
  }

  const { data: insertedContents, error: contentsError } = await supabase
    .from('contents')
    .insert(contentsInsertData)
    .select()

  if (contentsError) {
    console.error('Contents Insert Error:', contentsError)
    // topics는 이미 저장됨, 부분 성공 응답
    return NextResponse.json({
      success: true,
      partial: true,
      topics_count: insertedTopics?.length || 0,
      contents_count: 0,
      error: `콘텐츠 저장 실패: ${contentsError.message}`,
      topics: insertedTopics,
    }, { status: 201 })
  }

  return NextResponse.json({
    success: true,
    topics_count: insertedTopics?.length || 0,
    contents_count: insertedContents?.length || 0,
    topics: insertedTopics,
    contents: insertedContents,
  }, { status: 201 })
}
