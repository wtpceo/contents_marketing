import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 채널별 가이드라인
const CHANNEL_GUIDES = {
  blog: {
    name: '블로그',
    format: '서론-본론-결론 구조의 SEO 최적화 글. 소제목(##) 활용, 1500-2000자 분량.',
    outputFields: ['title', 'body'],
  },
  instagram: {
    name: '인스타그램',
    format: '감성적인 캡션 + 해시태그 15개 + 이미지 가이드(어떤 사진이 필요한지 설명). 캡션은 2200자 이내, 이모지 적절히 활용.',
    outputFields: ['caption', 'hashtags', 'image_guide'],
  },
  threads: {
    name: '스레드',
    format: '짧고 임팩트 있는 3-4줄 텍스트. 대화체, 공감 유도. 280자 이내.',
    outputFields: ['text'],
  },
}

// 톤 가이드
const TONE_GUIDES: Record<string, string> = {
  professional: '전문적이고 신뢰감 있는 톤',
  friendly: '친근하고 편안한 톤',
  emotional: '감성적이고 공감을 이끌어내는 톤',
  witty: '위트 있고 재치 있는 톤',
  formal: '격식있고 공식적인 톤',
  casual: '캐주얼하고 일상적인 톤',
}

// POST: OSMU 콘텐츠 생성 (한 번에 여러 채널)
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { advertiser_id, topic, channels, scheduled_at } = body

  // 유효성 검사
  if (!advertiser_id || !topic || !channels || channels.length === 0) {
    return NextResponse.json(
      { error: '광고주, 주제, 채널은 필수입니다.' },
      { status: 400 }
    )
  }

  // 광고주 정보 조회
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

  // 톤 설명 생성
  const toneDescriptions = adv.tone
    ?.map((t: string) => TONE_GUIDES[t])
    .filter(Boolean)
    .join(', ') || '자연스러운 톤'

  // 금지어 문자열
  const forbiddenWordsStr = adv.forbidden_words?.length > 0
    ? `\n\n[금지어 - 절대 사용 금지]: ${adv.forbidden_words.join(', ')}`
    : ''

  // 브랜드 키워드
  const brandKeywordsStr = adv.brand_keywords?.length > 0
    ? `\n[브랜드 키워드 - 자연스럽게 포함]: ${adv.brand_keywords.join(', ')}`
    : ''

  // 채널별 요구사항 구성
  const channelRequirements = channels.map((ch: string) => {
    const guide = CHANNEL_GUIDES[ch as keyof typeof CHANNEL_GUIDES]
    if (!guide) return null
    return `
### ${guide.name} (${ch})
형식: ${guide.format}
출력 필드: ${guide.outputFields.join(', ')}
`
  }).filter(Boolean).join('\n')

  // 시스템 프롬프트
  const systemPrompt = `당신은 ${adv.industry || '일반'} 업종의 콘텐츠 마케팅 전문가입니다.
${adv.name} 브랜드의 콘텐츠를 작성합니다.

타겟 고객: ${adv.target_audience || '일반 대중'}
톤앤매너: ${toneDescriptions}
${forbiddenWordsStr}
${brandKeywordsStr}

반드시 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.`

  // 사용자 프롬프트
  const userPrompt = `다음 주제로 각 채널별 콘텐츠를 생성해주세요.

주제: ${topic}

생성해야 할 채널:
${channelRequirements}

응답 형식 (JSON):
{
  ${channels.map((ch: string) => {
    const guide = CHANNEL_GUIDES[ch as keyof typeof CHANNEL_GUIDES]
    if (ch === 'blog') return `"blog": { "title": "제목", "body": "본문 (마크다운)" }`
    if (ch === 'instagram') return `"instagram": { "caption": "캡션", "hashtags": ["해시태그1", "해시태그2", ...], "image_guide": "이미지 설명" }`
    if (ch === 'threads') return `"threads": { "text": "스레드 텍스트" }`
    return ''
  }).filter(Boolean).join(',\n  ')}
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })

    const generatedText = completion.choices[0]?.message?.content || '{}'
    let generatedContent: Record<string, any>

    try {
      generatedContent = JSON.parse(generatedText)
    } catch {
      return NextResponse.json(
        { error: 'AI 응답 파싱에 실패했습니다.' },
        { status: 500 }
      )
    }

    // contents 테이블에 저장 (각 채널별로)
    const savedContents = []

    for (const channel of channels) {
      const channelData = generatedContent[channel]
      if (!channelData) continue

      let title = topic
      let contentBody = ''

      if (channel === 'blog') {
        title = channelData.title || topic
        contentBody = channelData.body || ''
      } else if (channel === 'instagram') {
        title = topic
        contentBody = JSON.stringify({
          caption: channelData.caption,
          hashtags: channelData.hashtags,
          image_guide: channelData.image_guide,
        })
      } else if (channel === 'threads') {
        title = topic
        contentBody = channelData.text || ''
      }

      const { data: content, error: contentError } = await supabase
        .from('contents')
        .insert({
          user_id: user.id,
          advertiser_id,
          title,
          body: contentBody,
          channel: channel === 'blog' ? 'blog_naver' : channel,
          scheduled_at: scheduled_at || null,
          status: 'draft',
          llm_prompt: topic,
        })
        .select()
        .single()

      if (!contentError && content) {
        savedContents.push({
          ...content,
          generated: channelData,
        })
      }
    }

    return NextResponse.json({
      topic,
      channels,
      generated: generatedContent,
      saved: savedContents,
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
