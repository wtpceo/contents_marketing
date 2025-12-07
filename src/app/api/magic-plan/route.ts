import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

  // 광고주 정보 조회 (상세정보 포함)
  const { data: advertiser, error: advError } = await supabase
    .from('advertisers')
    .select('*, detailed_info, competitors, location, brand_keywords, forbidden_words')
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

  // LLM 프롬프트 구성
  const systemPrompt = `당신은 ${adv.industry || '일반'} 업종의 콘텐츠 마케팅 전문가입니다.
${adv.name} 브랜드의 월간 콘텐츠 기획안을 작성합니다.

## 브랜드 정보
- 업종: ${adv.industry || '일반'}
- 타겟 고객: ${adv.target_audience || '일반 대중'}
- 톤앤매너: ${toneDescriptions}
- 발행 채널: ${channelList}
${location ? `- 위치/지역: ${location}` : ''}
${brandKeywords ? `- 브랜드 키워드: ${brandKeywords}` : ''}

${detailedInfo ? `## 브랜드 상세 정보\n${detailedInfo}\n` : ''}
${competitors ? `## 경쟁사 정보\n경쟁사: ${competitors}\n위 경쟁사와 차별화되는 콘텐츠를 기획해주세요.\n` : ''}
${forbiddenWords ? `## 금지어\n다음 단어/표현은 절대 사용하지 마세요: ${forbiddenWords}\n` : ''}

반드시 JSON 형식으로만 응답하세요.`

  const userPrompt = `${targetYear}년 ${month}월 콘텐츠 기획안을 작성해주세요.

발행 일정: ${selectedDates.join(', ')} (총 ${selectedDates.length}개)

이번 달 시즌 이슈:
${seasonalIssues.map((s, i) => `${i + 1}. ${s}`).join('\n')}

요청사항:
1. 각 날짜에 맞는 콘텐츠 주제(제목)를 생성해주세요.
2. 시즌 이슈를 적절히 반영하되, 브랜드 특성에 맞게 변형해주세요.
3. ${adv.industry || '업종'} 업종에 맞는 실용적인 주제를 선정해주세요.
4. 브랜드 상세정보와 타겟 고객을 반드시 고려해주세요.
5. 매번 새롭고 창의적인 주제를 생성해주세요. 이전에 생성한 주제와 중복되지 않도록 다양한 관점에서 접근해주세요.
${competitors ? `6. 경쟁사(${competitors})와 차별화되는 독창적인 콘텐츠를 기획해주세요.` : ''}
${forbiddenWords ? `7. 금지어(${forbiddenWords})는 절대 사용하지 마세요.` : ''}
${brandKeywords ? `8. 브랜드 키워드(${brandKeywords})를 자연스럽게 반영해주세요.` : ''}

[랜덤 시드: ${Date.now()}]

JSON 응답 형식:
{
  "topics": [
    { "date": "2025-12-02", "title": "주제 제목", "description": "간단 설명" },
    ...
  ]
}`

  try {
    const completion = await openai.chat.completions.create({
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
    let generatedPlan: { topics: Array<{ date: string; title: string; description?: string }> }

    try {
      generatedPlan = JSON.parse(generatedText)
    } catch {
      return NextResponse.json(
        { error: 'AI 응답 파싱에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 채널 정보 추가
    const topicsWithChannels = (generatedPlan.topics || []).map(topic => ({
      ...topic,
      channels,
      advertiser_id,
      advertiser_name: adv.name,
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
