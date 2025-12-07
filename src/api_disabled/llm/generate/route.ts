import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

  // 광고주 정보 조회 (톤앤매너, 금지어 등)
  const { data: advertiser, error: advError } = await supabase
    .from('advertisers')
    .select('*')
    .eq('id', advertiser_id)
    .eq('user_id', user.id)
    .single()

  if (advError || !advertiser) {
    return NextResponse.json({ error: '광고주를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 채널별 형식 가이드
  const channelGuides: Record<string, string> = {
    blog_naver: '네이버 블로그 형식으로, SEO를 고려하여 소제목(##)을 활용하고, 자연스러운 키워드 배치와 가독성 좋은 문단 구성',
    blog_tistory: '티스토리 블로그 형식으로, 마크다운을 활용하고 깔끔한 레이아웃 구성',
    instagram: '인스타그램 피드 형식으로, 이모지를 적절히 활용하고 해시태그 10개 포함, 2200자 이내',
    facebook: '페이스북 게시물 형식으로, 친근하고 대화형 톤으로 작성',
    youtube: '유튜브 영상 스크립트 형식으로, 인트로/본문/아웃트로 구조',
    linkedin: '링크드인 게시물 형식으로, 전문적이고 인사이트 있는 내용',
  }

  // 톤앤매너 매핑
  const toneGuides: Record<string, string> = {
    professional: '전문적이고 신뢰감 있는 톤',
    friendly: '친근하고 편안한 톤',
    emotional: '감성적이고 공감을 이끌어내는 톤',
    witty: '위트 있고 재치 있는 톤',
    formal: '격식있고 공식적인 톤',
    casual: '캐주얼하고 일상적인 톤',
  }

  const toneDescriptions = advertiser.tone
    ?.map((t: string) => toneGuides[t])
    .filter(Boolean)
    .join(', ') || '자연스러운 톤'

  const forbiddenWordsStr = advertiser.forbidden_words?.length > 0
    ? `다음 단어/표현은 절대 사용하지 마세요: ${advertiser.forbidden_words.join(', ')}`
    : ''

  const brandKeywordsStr = advertiser.brand_keywords?.length > 0
    ? `다음 브랜드 키워드를 자연스럽게 포함하세요: ${advertiser.brand_keywords.join(', ')}`
    : ''

  const systemPrompt = `당신은 ${advertiser.industry || '일반'} 업종의 콘텐츠 마케팅 전문가입니다.
${advertiser.name} 브랜드의 콘텐츠를 작성합니다.

타겟 고객: ${advertiser.target_audience || '일반 대중'}
톤앤매너: ${toneDescriptions}
${forbiddenWordsStr}
${brandKeywordsStr}

${channelGuides[channel] || '일반 마케팅 콘텐츠 형식'}으로 작성해주세요.`

  const userPrompt = `다음 키워드를 기반으로 콘텐츠를 작성해주세요:
키워드: ${keywords.join(', ')}

${additional_instructions ? `추가 지시사항: ${additional_instructions}` : ''}

매력적인 제목과 함께 완성도 높은 본문을 작성해주세요.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const generatedContent = completion.choices[0]?.message?.content || ''

    // 제목과 본문 분리 (첫 번째 줄을 제목으로)
    const lines = generatedContent.split('\n').filter(line => line.trim())
    let title = lines[0] || '제목 없음'
    let contentBody = lines.slice(1).join('\n').trim()

    // 제목에서 마크다운 헤딩 기호 제거
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
