import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// 지연 초기화로 빌드 타임 에러 방지
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// 시즌 이슈 데이터 (월별)
const SEASONAL_ISSUES: Record<number, string[]> = {
  1: ['새해 목표 수립', '설 연휴 가이드', '신년 트렌드'],
  2: ['발렌타인데이', '졸업/입학 시즌', '봄맞이 준비'],
  3: ['화이트데이', '봄 시즌', '새학기'],
  4: ['벚꽃 시즌', '식목일/지구의 날', '봄 나들이'],
  5: ['어린이날', '어버이날', '가정의 달'],
  6: ['여름 준비', '현충일', '장마철'],
  7: ['여름 휴가', '피서지', '무더위 극복'],
  8: ['광복절', '개학 시즌', '가을 준비'],
  9: ['추석', '가을 시즌', '단풍'],
  10: ['핼러윈', '단풍 시즌', '가을 나들이'],
  11: ['빼빼로데이', '블랙프라이데이', '연말 준비'],
  12: ['크리스마스', '연말 결산', '송년회', '새해 계획'],
}

// POST: 매직 플랜 생성 (월간 자동 기획)
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const {
    advertiser_id,
    year,
    month,           // 1-12
    frequency,       // 주 몇 회 (예: 2)
    days_of_week,    // 요일 배열 (예: [1, 4] = 월, 목)
    channels,        // 채널 배열 (예: ["blog", "instagram"])
  } = body

  // 유효성 검사
  if (!advertiser_id || !month || !frequency || !days_of_week?.length || !channels?.length) {
    return NextResponse.json(
      { error: '광고주, 월, 빈도, 요일, 채널은 필수입니다.' },
      { status: 400 }
    )
  }

  // 광고주 정보 조회 (상세정보 + AI 수집 데이터 포함)
  const { data: advertiser, error: advError } = await supabase
    .from('advertisers')
    .select('*, detailed_info, competitors, location, brand_keywords, forbidden_words, advanced_profile')
    .eq('id', advertiser_id)
    .eq('user_id', user.id)
    .single()

  if (advError || !advertiser) {
    return NextResponse.json({ error: '광고주를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 해당 월의 발행 날짜 계산
  const targetYear = year || new Date().getFullYear()
  const targetMonth = month - 1 // JavaScript Date는 0-indexed
  const publishDates: string[] = []

  // 해당 월의 모든 날짜를 순회하며 선택된 요일에 해당하는 날짜 수집
  const firstDay = new Date(targetYear, targetMonth, 1)
  const lastDay = new Date(targetYear, targetMonth + 1, 0)

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay() // 0=일, 1=월, ..., 6=토
    if (days_of_week.includes(dayOfWeek)) {
      publishDates.push(new Date(d).toISOString().split('T')[0])
    }
  }

  // 빈도에 맞게 날짜 제한 (주 N회 기준으로)
  // 간단히: 전체 날짜 중 frequency * 4주 만큼 선택
  const maxTopics = frequency * 4
  const selectedDates = publishDates.slice(0, maxTopics)

  if (selectedDates.length === 0) {
    return NextResponse.json(
      { error: '선택한 요일에 해당하는 날짜가 없습니다.' },
      { status: 400 }
    )
  }

  // 시즌 이슈 가져오기
  const seasonalIssues = SEASONAL_ISSUES[month] || []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adv = advertiser as any

  // 톤 설명
  const toneMap: Record<string, string> = {
    professional: '전문적인', friendly: '친근한', emotional: '감성적인',
    witty: '위트있는', formal: '격식체', casual: '캐주얼한'
  }
  const toneDescriptions = adv.tone?.map((t: string) => toneMap[t] || t).join(', ') || '자연스러운'

  // 채널 설명
  const channelNames: Record<string, string> = {
    blog: '블로그', instagram: '인스타그램', threads: '스레드'
  }
  const channelList = channels.map((c: string) => channelNames[c] || c).join(', ')

  // 광고주 상세정보 파싱
  const detailedInfo = adv.detailed_info || ''
  const competitors = Array.isArray(adv.competitors) ? adv.competitors.join(', ') : (adv.competitors || '')
  const location = adv.location || ''
  const brandKeywords = Array.isArray(adv.brand_keywords) ? adv.brand_keywords.join(', ') : (adv.brand_keywords || '')
  const forbiddenWords = Array.isArray(adv.forbidden_words) ? adv.forbidden_words.join(', ') : (adv.forbidden_words || '')

  // AI 수집 데이터 (advanced_profile) 파싱
  const aiProfile = adv.advanced_profile || {}
  const aiSummary = aiProfile.summary || ''
  const aiTone = aiProfile.tone || ''
  const aiKeywords = Array.isArray(aiProfile.keywords) ? aiProfile.keywords.join(', ') : ''
  const aiContentSuggestions = Array.isArray(aiProfile.content_suggestions) ? aiProfile.content_suggestions : []
  const aiUniqueSellingPoints = Array.isArray(aiProfile.unique_selling_points) ? aiProfile.unique_selling_points : []
  const aiTargetAudience = aiProfile.target_audience_insights || ''
  const aiMenuHighlights = Array.isArray(aiProfile.menu_highlights) ? aiProfile.menu_highlights.join(', ') : ''

  // LLM 프롬프트 구성
  const systemPrompt = `당신은 ${adv.industry || '일반'} 업종의 콘텐츠 마케팅 전문가입니다.
${adv.name} 브랜드의 월간 콘텐츠 기획안을 작성합니다.

## 브랜드 정보
- 업종: ${adv.industry || '일반'}
- 타겟 고객: ${aiTargetAudience || adv.target_audience || '일반 대중'}
- 톤앤매너: ${aiTone || toneDescriptions}
- 발행 채널: ${channelList}
${location ? `- 위치/지역: ${location}` : ''}
${brandKeywords || aiKeywords ? `- 브랜드 키워드: ${brandKeywords || aiKeywords}` : ''}
${aiMenuHighlights ? `- 대표 메뉴/서비스: ${aiMenuHighlights}` : ''}

${aiSummary ? `## AI 분석 브랜드 요약\n${aiSummary}\n` : ''}
${detailedInfo ? `## 브랜드 상세 정보\n${detailedInfo}\n` : ''}
${aiUniqueSellingPoints.length > 0 ? `## 차별화 포인트 (AI 분석)\n${aiUniqueSellingPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}\n` : ''}
${competitors ? `## 경쟁사 정보\n경쟁사: ${competitors}\n위 경쟁사와 차별화되는 콘텐츠를 기획해주세요.\n` : ''}
${forbiddenWords ? `## 금지어\n다음 단어/표현은 절대 사용하지 마세요: ${forbiddenWords}\n` : ''}

반드시 JSON 형식으로만 응답하세요.`

  // AI 추천 콘텐츠 주제가 있으면 참고 자료로 포함
  const aiSuggestionsText = aiContentSuggestions.length > 0
    ? `\n## AI가 추천한 콘텐츠 주제 (참고용)\n${aiContentSuggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}\n위 주제들을 참고하여 이번 달에 맞게 변형하거나 영감을 얻어주세요.\n`
    : ''

  const userPrompt = `${targetYear}년 ${month}월 콘텐츠 기획안을 작성해주세요.

발행 일정: ${selectedDates.join(', ')} (총 ${selectedDates.length}개)

이번 달 시즌 이슈:
${seasonalIssues.map((s, i) => `${i + 1}. ${s}`).join('\n')}
${aiSuggestionsText}
요청사항:
1. 각 날짜에 맞는 콘텐츠 주제(제목)를 생성해주세요.
2. 시즌 이슈를 적절히 반영하되, 브랜드 특성에 맞게 변형해주세요.
3. ${adv.industry || '업종'} 업종에 맞는 실용적인 주제를 선정해주세요.
4. 브랜드 상세정보와 타겟 고객을 반드시 고려해주세요.
5. 매번 새롭고 창의적인 주제를 생성해주세요. 이전에 생성한 주제와 중복되지 않도록 다양한 관점에서 접근해주세요.
${aiContentSuggestions.length > 0 ? `6. AI가 추천한 콘텐츠 주제를 참고하여 브랜드에 최적화된 주제를 만들어주세요.` : ''}
${competitors ? `${aiContentSuggestions.length > 0 ? '7' : '6'}. 경쟁사(${competitors})와 차별화되는 독창적인 콘텐츠를 기획해주세요.` : ''}
${forbiddenWords ? `${aiContentSuggestions.length > 0 ? '8' : '7'}. 금지어(${forbiddenWords})는 절대 사용하지 마세요.` : ''}
${brandKeywords || aiKeywords ? `${aiContentSuggestions.length > 0 ? '9' : '8'}. 브랜드 키워드(${brandKeywords || aiKeywords})를 자연스럽게 반영해주세요.` : ''}

[랜덤 시드: ${Date.now()}]

JSON 응답 형식:
{
  "topics": [
    {
      "date": "2025-12-02",
      "title": "주제 제목",
      "description": "간단 설명",
      "planning_intent": "이 콘텐츠가 필요한 이유와 기대 효과를 1-2문장으로 설명 (예: '12월 시즌 키워드를 선점하여 검색 유입을 늘리고, 연말 방문객 증가에 대비합니다.')"
    },
    ...
  ]
}`

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.95,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const generatedText = completion.choices[0]?.message?.content || '{}'
    let generatedPlan: { topics: Array<{ date: string; title: string; description?: string; planning_intent?: string }> }

    try {
      generatedPlan = JSON.parse(generatedText)
    } catch {
      return NextResponse.json(
        { error: 'AI 응답 파싱에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 채널 정보 및 기획 의도 추가
    const topicsWithChannels = (generatedPlan.topics || []).map(topic => ({
      ...topic,
      channels,
      advertiser_id,
      advertiser_name: adv.name,
      // planning_intent가 없으면 description을 기반으로 기본값 생성
      planning_intent: topic.planning_intent || generateDefaultIntent(topic, adv.industry, seasonalIssues),
    }))

    return NextResponse.json({
      advertiser: {
        id: adv.id,
        name: adv.name,
        industry: adv.industry,
      },
      settings: {
        year: targetYear,
        month,
        frequency,
        days_of_week,
        channels,
      },
      topics: topicsWithChannels,
      usage: completion.usage,
    })

  } catch (error) {
    console.error('Magic Plan Error:', error)
    return NextResponse.json(
      { error: 'AI 기획안 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 기획 의도가 없을 때 기본값 생성
 */
function generateDefaultIntent(
  topic: { title: string; description?: string; date: string },
  industry: string | null,
  seasonalIssues: string[]
): string {
  const month = parseInt(topic.date.split('-')[1], 10)

  // 시즌 이슈와 매칭되는지 확인
  const matchedSeason = seasonalIssues.find(issue =>
    topic.title.toLowerCase().includes(issue.toLowerCase()) ||
    (topic.description && topic.description.toLowerCase().includes(issue.toLowerCase()))
  )

  if (matchedSeason) {
    return `${month}월 ${matchedSeason} 시즌에 맞춘 콘텐츠로, 시의성 있는 키워드 검색 유입을 기대할 수 있습니다.`
  }

  // 업종별 기본 기획 의도
  const industryIntents: Record<string, string> = {
    '음식점': '맛집 탐방 콘텐츠로 지역 검색 유입과 신규 고객 방문을 유도합니다.',
    '카페': '분위기 있는 공간 콘텐츠로 인스타그램 태그와 방문 후기를 유도합니다.',
    '미용/뷰티': '전문성을 어필하여 시술 예약 문의 증가를 기대합니다.',
    '병원/의료': '전문 의료 정보 제공으로 신뢰도를 높이고 예약 문의를 유도합니다.',
    '교육': '학습 관련 정보 제공으로 학부모/학생 관심을 유도합니다.',
    '쇼핑/소매': '상품 정보와 혜택을 알려 구매 전환을 유도합니다.',
  }

  if (industry && industryIntents[industry]) {
    return industryIntents[industry]
  }

  // 기본 기획 의도
  return `브랜드 인지도 향상과 고객 관심 유도를 위한 정기 콘텐츠입니다.`
}
