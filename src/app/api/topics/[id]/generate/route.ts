import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// 채널별 가이드라인
const CHANNEL_GUIDES = {
  blog: {
    name: '블로그',
    format: '서론-본론-결론 구조의 SEO 최적화 글. 소제목(##) 활용, 1500-2000자 분량.',
  },
  instagram: {
    name: '인스타그램',
    format: '감성적인 캡션 + 해시태그 15개 + 이미지 가이드. 캡션은 2200자 이내, 이모지 활용.',
  },
  threads: {
    name: '스레드',
    format: '짧고 임팩트 있는 3-4줄 텍스트. 대화체, 공감 유도. 280자 이내.',
  },
}

const TONE_GUIDES: Record<string, string> = {
  professional: '전문적이고 신뢰감 있는 톤',
  friendly: '친근하고 편안한 톤',
  emotional: '감성적이고 공감을 이끌어내는 톤',
  witty: '위트 있고 재치 있는 톤',
  formal: '격식있고 공식적인 톤',
  casual: '캐주얼하고 일상적인 톤',
}

// POST: 기획안에서 OSMU 콘텐츠 생성
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: topicId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // 기획안 조회
  const { data: topic, error: topicError } = await supabase
    .from('topics')
    .select(`
      *,
      advertisers (
        id,
        name,
        industry,
        tone,
        forbidden_words,
        brand_keywords,
        target_audience
      )
    `)
    .eq('id', topicId)
    .eq('user_id', user.id)
    .single()

  if (topicError || !topic) {
    return NextResponse.json({ error: '기획안을 찾을 수 없습니다.' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adv = topic.advertisers as any
  const channels = topic.channels || ['blog']

  // 톤 설명
  const toneDescriptions = adv?.tone
    ?.map((t: string) => TONE_GUIDES[t])
    .filter(Boolean)
    .join(', ') || '자연스러운 톤'

  // 금지어
  const forbiddenWordsStr = adv?.forbidden_words?.length > 0
    ? `\n\n[금지어]: ${adv.forbidden_words.join(', ')}`
    : ''

  // 브랜드 키워드
  const brandKeywordsStr = adv?.brand_keywords?.length > 0
    ? `\n[브랜드 키워드]: ${adv.brand_keywords.join(', ')}`
    : ''

  // 채널별 요구사항
  const channelRequirements = channels.map((ch: string) => {
    const guide = CHANNEL_GUIDES[ch as keyof typeof CHANNEL_GUIDES]
    if (!guide) return null
    return `### ${guide.name} (${ch})\n형식: ${guide.format}`
  }).filter(Boolean).join('\n\n')

  const systemPrompt = `당신은 ${adv?.industry || '일반'} 업종의 콘텐츠 마케팅 전문가입니다.
${adv?.name || '브랜드'} 콘텐츠를 작성합니다.

타겟: ${adv?.target_audience || '일반 대중'}
톤앤매너: ${toneDescriptions}
${forbiddenWordsStr}
${brandKeywordsStr}

반드시 JSON 형식으로만 응답하세요.`

  const userPrompt = `주제: ${topic.title}
${topic.description ? `설명: ${topic.description}` : ''}

생성할 채널:
${channelRequirements}

JSON 응답 형식:
{
  ${channels.map((ch: string) => {
    if (ch === 'blog') return `"blog": { "title": "제목", "body": "본문(마크다운)" }`
    if (ch === 'instagram') return `"instagram": { "caption": "캡션", "hashtags": ["태그1", ...], "image_guide": "이미지 설명" }`
    if (ch === 'threads') return `"threads": { "text": "스레드 텍스트" }`
    return ''
  }).filter(Boolean).join(',\n  ')}
}`

  try {
    // 상태 업데이트: generating
    await supabase
      .from('topics')
      .update({ status: 'generating' })
      .eq('id', topicId)

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
      await supabase.from('topics').update({ status: 'planning' }).eq('id', topicId)
      return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 })
    }

    // 각 채널별 contents 저장
    const savedContents = []

    for (const channel of channels) {
      const channelData = generatedContent[channel]
      if (!channelData) continue

      let title = topic.title
      let contentBody = ''

      if (channel === 'blog') {
        title = channelData.title || topic.title
        contentBody = channelData.body || ''
      } else if (channel === 'instagram') {
        contentBody = JSON.stringify({
          caption: channelData.caption,
          hashtags: channelData.hashtags,
          image_guide: channelData.image_guide,
        })
      } else if (channel === 'threads') {
        contentBody = channelData.text || ''
      }

      const { data: content, error: contentError } = await supabase
        .from('contents')
        .insert({
          user_id: user.id,
          advertiser_id: topic.advertiser_id,
          topic_id: topicId,
          title,
          body: contentBody,
          channel: channel === 'blog' ? 'blog_naver' : channel,
          scheduled_at: topic.scheduled_date,
          status: 'draft',
          llm_prompt: topic.title,
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

    // 상태 업데이트: completed
    await supabase
      .from('topics')
      .update({ status: 'completed' })
      .eq('id', topicId)

    return NextResponse.json({
      topic_id: topicId,
      generated: generatedContent,
      contents: savedContents,
      usage: completion.usage,
    })

  } catch (error) {
    console.error('OSMU Generate Error:', error)
    await supabase.from('topics').update({ status: 'planning' }).eq('id', topicId)
    return NextResponse.json({ error: 'AI 콘텐츠 생성 실패' }, { status: 500 })
  }
}
