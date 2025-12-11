import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// 지연 초기화로 빌드 타임 에러 방지
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// POST: LLM 콘텐츠 초안 생성
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { advertiser_id, keywords, channel, additional_instructions } = body

  if (!advertiser_id || !keywords || keywords.length === 0) {
    return NextResponse.json(
      { error: '광고주와 키워드는 필수입니다.' },
      { status: 400 }
    )
  }


  const { data: advertiser, error: advError } = await supabase
    .from('advertisers')
    .select('*')
    .eq('id', advertiser_id)
    .eq('user_id', user.id)
    .single()

  if (advError || !advertiser) {
    return NextResponse.json({ error: '광고주를 찾을 수 없습니다.' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adv = advertiser as any

  // AI 학습 데이터 (advanced_profile) 가져오기
  const advancedProfile = adv.advanced_profile
  const facts = advancedProfile?.facts || {}
  const style = advancedProfile?.style || {}

  const channelGuides: Record<string, string> = {
    blog_naver: `네이버 블로그 SEO 최적화 형식으로 작성해주세요.
- 분량: 1500~2000자
- 구성: 서론-본론-결론 구조, 소제목(##)으로 섹션 구분
- 가독성: 문단은 3-4줄로 짧게, 핵심 정보는 굵게 강조
- SEO: 메인 키워드를 제목, 첫 문단, 소제목에 자연스럽게 배치
- 금지: 이모티콘, 이모지, 특수문자 장식, 불필요한 인사말/마무리 멘트 사용 금지
- 톤: 정보 전달에 집중, 광고주 컨펌용 깔끔한 원고`,
    blog_tistory: `티스토리 블로그 형식으로 작성해주세요.
- 분량: 1500~2000자
- 구성: 마크다운 활용, 깔끔한 레이아웃
- 금지: 이모티콘, 이모지 사용 금지`,
    instagram: '인스타그램 피드 형식으로, 이모지를 적절히 활용하고 해시태그 10개 포함, 2200자 이내',
    facebook: '페이스북 게시물 형식으로, 친근하고 대화형 톤으로 작성',
    youtube: '유튜브 영상 스크립트 형식으로, 인트로/본문/아웃트로 구조',
    linkedin: '링크드인 게시물 형식으로, 전문적이고 인사이트 있는 내용',
  }

  const toneGuides: Record<string, string> = {
    professional: '전문적이고 신뢰감 있는 톤',
    friendly: '친근하고 편안한 톤',
    emotional: '감성적이고 공감을 이끌어내는 톤',
    witty: '위트 있고 재치 있는 톤',
    formal: '격식있고 공식적인 톤',
    casual: '캐주얼하고 일상적인 톤',
  }

  // 톤 설정: AI 학습 스타일 우선, 없으면 기본 설정 사용
  const toneDescriptions = style.tone
    ? style.tone
    : (adv.tone?.map((t: string) => toneGuides[t]).filter(Boolean).join(', ') || '자연스러운 톤')

  const forbiddenWordsStr = adv.forbidden_words?.length > 0
    ? `다음 단어/표현은 절대 사용하지 마세요: ${adv.forbidden_words.join(', ')}`
    : ''

  // 브랜드 키워드: AI 학습 키워드 + 기본 키워드 병합
  const allKeywords = [
    ...(style.keywords || []),
    ...(adv.brand_keywords || [])
  ].filter((v, i, a) => a.indexOf(v) === i) // 중복 제거

  const brandKeywordsStr = allKeywords.length > 0
    ? `다음 브랜드 키워드를 자연스럽게 포함하세요: ${allKeywords.slice(0, 15).join(', ')}`
    : ''

  // === AI 학습 데이터 기반 상세 컨텍스트 구성 ===
  let businessContext = ''
  let styleContext = ''

  // 팩트 데이터 컨텍스트
  if (facts.business_name || facts.category) {
    businessContext = `
=== 비즈니스 정보 ===
상호명: ${facts.business_name || adv.name}
업종: ${facts.category || adv.industry || '일반'}
${facts.address ? `위치: ${facts.address}` : ''}
${facts.business_hours ? `영업시간: ${facts.business_hours}` : ''}
${facts.contact ? `연락처: ${facts.contact}` : ''}
${facts.rating ? `평점: ${facts.rating}점 (리뷰 ${facts.review_count || 0}개)` : ''}
${facts.unique_features?.length > 0 ? `차별화 포인트: ${facts.unique_features.join(', ')}` : ''}
${facts.review_highlights?.length > 0 ? `고객들이 좋아하는 점: ${facts.review_highlights.join(', ')}` : ''}
${facts.menus?.length > 0 ? `대표 메뉴/상품: ${facts.menus.slice(0, 5).map((m: any) => m.name).join(', ')}` : ''}
${facts.facilities?.length > 0 ? `시설 정보: ${facts.facilities.join(', ')}` : ''}`
  }

  // 스타일 데이터 컨텍스트 (블로그는 이모지 제외)
  const isBlogChannel = channel?.startsWith('blog')
  if (style.tone || style.writing_style) {
    styleContext = `
=== 콘텐츠 스타일 가이드 ===
톤앤매너: ${style.tone || '자연스러운 톤'}
${style.writing_style ? `글쓰기 스타일: ${style.writing_style}` : ''}
${style.brand_personality ? `브랜드 성격: ${style.brand_personality}` : ''}
${!isBlogChannel && style.emoji_usage ? `이모지 사용: ${style.emoji_usage}` : ''}
${style.emotional_keywords?.length > 0 ? `감성 키워드: ${style.emotional_keywords.join(', ')}` : ''}`
  }

  // 타겟 고객 정보
  const targetAudience = style.target_audience || adv.target_audience || '일반 대중'

  const systemPrompt = `당신은 ${facts.category || adv.industry || '일반'} 업종의 콘텐츠 마케팅 전문가입니다.
${facts.business_name || adv.name} 브랜드의 콘텐츠를 작성합니다.
${businessContext}
${styleContext}

타겟 고객: ${targetAudience}
${forbiddenWordsStr}
${brandKeywordsStr}

${channelGuides[channel] || '일반 마케팅 콘텐츠 형식'}으로 작성해주세요.

중요: 위의 스타일 가이드를 충실히 따르고, 비즈니스의 실제 정보(위치, 메뉴, 차별화 포인트 등)를 자연스럽게 녹여내세요.`

  // 주제에서 [매직플랜] 등 불필요한 태그 제거
  const cleanTopic = keywords.join(', ').replace(/\[.*?\]/g, '').trim()

  const userPrompt = isBlogChannel
    ? `다음 주제로 블로그 글을 작성해주세요:
주제: ${cleanTopic}

${additional_instructions ? `추가 요청: ${additional_instructions}` : ''}

작성 규칙:
1. 첫 줄에 SEO 최적화된 제목 작성 (키워드 포함)
2. 본문 1500~2000자, 소제목 3-4개로 구성
3. 마크다운 문법(**, ##, - 등) 사용 금지, 일반 텍스트로만 작성
4. 소제목은 별도 줄에 작성하고 앞뒤로 빈 줄 추가
5. 문단 사이에 빈 줄을 넣어 가독성 확보
6. 이모티콘, 이모지, 특수문자 장식 절대 사용 금지
7. "안녕하세요", "감사합니다" 등 인사말 제외
8. 광고주 컨펌용 깔끔한 원고로 작성`
    : `다음 키워드를 기반으로 콘텐츠를 작성해주세요:
키워드: ${keywords.join(', ')}

${additional_instructions ? `추가 지시사항: ${additional_instructions}` : ''}

매력적인 제목과 함께 완성도 높은 본문을 작성해주세요.
${style.hashtags?.length > 0 && (channel === 'instagram' || channel === 'threads') ? `\n추천 해시태그 참고: ${style.hashtags.slice(0, 10).map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}` : ''}`

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: isBlogChannel ? 3000 : 2000,  // 블로그는 1500~2000자 분량 확보
    })

    const generatedContent = completion.choices[0]?.message?.content || ''
    const lines = generatedContent.split('\n').filter(line => line.trim())
    let title = lines[0] || '제목 없음'
    const contentBody = lines.slice(1).join('\n').trim()

    title = title.replace(/^#+\s*/, '').replace(/^\*+\s*/, '').trim()

    return NextResponse.json({
      title,
      body: contentBody,
      prompt: userPrompt,
      usage: completion.usage,
    })
  } catch (error) {
    console.error('OpenAI API Error:', error)
    return NextResponse.json(
      { error: 'AI 콘텐츠 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
