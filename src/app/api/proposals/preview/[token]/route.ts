import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/proposals/preview/[token]
 * 토큰으로 제안서 및 해당 월의 기획안 조회 (로그인 불필요)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  if (!token) {
    return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 })
  }

  // 제안서 조회 (RLS 우회를 위해 service role 사용 필요할 수 있음)
  // 현재는 "Anyone can view proposals by token" 정책으로 허용
  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .select(`
      id,
      advertiser_id,
      target_month,
      title,
      description,
      status,
      created_at,
      expires_at,
      advertiser:advertisers(id, name, industry, logo_url)
    `)
    .eq('token', token)
    .single()

  if (proposalError || !proposal) {
    console.error('Proposal fetch error:', proposalError)
    return NextResponse.json(
      { error: '유효하지 않은 링크입니다.' },
      { status: 404 }
    )
  }

  // 만료 확인
  if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
    return NextResponse.json(
      { error: '만료된 링크입니다.' },
      { status: 410 }
    )
  }

  // 해당 월의 topics 조회
  const [year, month] = proposal.target_month.split('-').map(Number)
  const startDate = `${proposal.target_month}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${proposal.target_month}-${lastDay}`

  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select(`
      id,
      title,
      description,
      scheduled_date,
      channels,
      status,
      planning_intent,
      source,
      source_data
    `)
    .eq('advertiser_id', proposal.advertiser_id)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true })

  if (topicsError) {
    console.error('Topics fetch error:', topicsError)
  }

  // 채널 한글명 매핑
  const channelNames: Record<string, string> = {
    blog: '블로그',
    blog_naver: '네이버 블로그',
    instagram: '인스타그램',
    threads: '스레드',
  }

  let formattedTopics: Array<{
    id: string
    date: string
    title: string
    description: string
    channels: string[]
    channel_names: string[]
    status: string
    planning_intent: string
  }> = []

  // topics가 있으면 topics 사용
  if (topics && topics.length > 0) {
    formattedTopics = topics.map(topic => ({
      id: topic.id,
      date: topic.scheduled_date,
      title: topic.title,
      description: topic.description || '',
      channels: topic.channels || ['blog'],
      channel_names: (topic.channels || ['blog']).map((c: string) => channelNames[c] || c),
      status: topic.status,
      planning_intent: topic.planning_intent
        || topic.description
        || extractIntentFromSource(topic.source, topic.source_data),
    }))
  } else {
    // topics가 없으면 contents에서 조회
    const { data: contents, error: contentsError } = await supabase
      .from('contents')
      .select(`
        id,
        title,
        body,
        channel,
        scheduled_at,
        status,
        llm_prompt
      `)
      .eq('advertiser_id', proposal.advertiser_id)
      .gte('scheduled_at', `${startDate}T00:00:00`)
      .lte('scheduled_at', `${endDate}T23:59:59`)
      .order('scheduled_at', { ascending: true })

    if (contentsError) {
      console.error('Contents fetch error:', contentsError)
      return NextResponse.json(
        { error: '기획안 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // contents를 날짜별로 그룹화 (같은 날짜의 여러 채널 콘텐츠를 하나로)
    const contentsByDate = new Map<string, typeof contents[0][]>()

    for (const content of contents || []) {
      const dateKey = content.scheduled_at?.split('T')[0] || ''
      if (!contentsByDate.has(dateKey)) {
        contentsByDate.set(dateKey, [])
      }
      contentsByDate.get(dateKey)!.push(content)
    }

    // 그룹화된 콘텐츠를 formattedTopics 형식으로 변환
    for (const [date, dayContents] of contentsByDate) {
      const firstContent = dayContents[0]
      const channels = dayContents.map(c => c.channel)

      formattedTopics.push({
        id: firstContent.id,
        date: date,
        title: firstContent.title,
        description: firstContent.body || '',
        channels: channels,
        channel_names: channels.map(c => channelNames[c] || c),
        status: firstContent.status === 'draft' ? 'planning' : firstContent.status,
        planning_intent: extractIntentFromPrompt(firstContent.llm_prompt) || firstContent.body || '',
      })
    }

    // 날짜순 정렬
    formattedTopics.sort((a, b) => a.date.localeCompare(b.date))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const advertiser = proposal.advertiser as any

  return NextResponse.json({
    proposal: {
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      target_month: proposal.target_month,
      status: proposal.status,
      created_at: proposal.created_at,
    },
    advertiser: {
      id: advertiser?.id,
      name: advertiser?.name,
      industry: advertiser?.industry,
      logo_url: advertiser?.logo_url,
    },
    topics: formattedTopics,
    summary: {
      total_count: formattedTopics.length,
      channels_count: countByChannels(formattedTopics),
      month_label: `${year}년 ${month}월`,
    },
  })
}

/**
 * POST /api/proposals/preview/[token]
 * 광고주가 제안서에 응답 (승인/반려)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  const body = await request.json()
  const { action, feedback } = body // action: 'approve' | 'reject'

  if (!token) {
    return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 })
  }

  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { error: 'action은 approve 또는 reject여야 합니다.' },
      { status: 400 }
    )
  }

  // 제안서 조회
  const { data: proposal, error: fetchError } = await supabase
    .from('proposals')
    .select('id, status, advertiser_id')
    .eq('token', token)
    .single()

  if (fetchError || !proposal) {
    return NextResponse.json(
      { error: '유효하지 않은 링크입니다.' },
      { status: 404 }
    )
  }

  // 이미 처리된 제안서인지 확인
  if (proposal.status !== 'pending') {
    return NextResponse.json(
      { error: '이미 처리된 제안서입니다.', status: proposal.status },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()
  const updateData = action === 'approve'
    ? { status: 'approved', approved_at: now, feedback }
    : { status: 'rejected', rejected_at: now, feedback }

  // 제안서 상태 업데이트
  const { data: updated, error: updateError } = await supabase
    .from('proposals')
    .update(updateData)
    .eq('id', proposal.id)
    .select()
    .single()

  if (updateError) {
    console.error('Proposal update error:', updateError)
    return NextResponse.json(
      { error: '응답 처리에 실패했습니다.' },
      { status: 500 }
    )
  }

  // 승인 시 해당 월의 모든 topics 상태를 approved로 변경
  if (action === 'approve') {
    const { data: proposalData } = await supabase
      .from('proposals')
      .select('target_month, advertiser_id')
      .eq('id', proposal.id)
      .single()

    if (proposalData) {
      const [year, month] = proposalData.target_month.split('-').map(Number)
      const startDate = `${proposalData.target_month}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${proposalData.target_month}-${lastDay}`

      await supabase
        .from('topics')
        .update({ status: 'approved' })
        .eq('advertiser_id', proposalData.advertiser_id)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .eq('status', 'planning')
    }
  }

  return NextResponse.json({
    success: true,
    status: updated.status,
    message: action === 'approve'
      ? '기획안이 승인되었습니다. 감사합니다!'
      : '피드백이 전달되었습니다.',
  })
}

// 헬퍼 함수: source_data에서 기획 의도 추출
function extractIntentFromSource(source: string | null, sourceData: Record<string, unknown> | null): string {
  if (!sourceData) return ''

  // trend에서 가져온 경우
  if (source === 'trend' && sourceData.description) {
    return `트렌드 키워드 "${sourceData.keyword || ''}"를 반영한 시의성 있는 콘텐츠입니다.`
  }

  // season에서 가져온 경우
  if (source === 'season' && sourceData.issue) {
    return `${sourceData.issue}에 맞춘 시즌 콘텐츠입니다.`
  }

  // magic-plan에서 생성된 경우
  if (sourceData.description) {
    return sourceData.description as string
  }

  return ''
}

// 헬퍼 함수: 채널별 카운트
function countByChannels(topics: Array<{ channels: string[] }>): Record<string, number> {
  const counts: Record<string, number> = {}

  topics.forEach(topic => {
    (topic.channels || []).forEach(channel => {
      counts[channel] = (counts[channel] || 0) + 1
    })
  })

  return counts
}

// 헬퍼 함수: llm_prompt에서 기획 의도 추출
function extractIntentFromPrompt(prompt: string | null): string {
  if (!prompt) return ''

  // [매직플랜] 접두사 제거
  const cleanPrompt = prompt.replace(/^\[매직플랜\]\s*/, '')

  // 간단한 기획 의도 생성
  if (cleanPrompt.length > 0) {
    return `이 주제로 브랜드 인지도 향상과 고객 관심을 유도합니다.`
  }

  return ''
}
