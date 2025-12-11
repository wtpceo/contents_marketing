import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// 지연 초기화로 빌드 타임 에러 방지
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

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

  // 기획안 조회 (advanced_profile 포함)
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
        target_audience,
        advanced_profile
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

  // AI 학습 데이터 가져오기
  const advancedProfile = adv?.advanced_profile
  const facts = advancedProfile?.facts || {}
  const style = advancedProfile?.style || {}

  // 톤 설명: AI 학습 스타일 우선
  const toneDescriptions = style.tone
    ? style.tone
    : (adv?.tone?.map((t: string) => TONE_GUIDES[t]).filter(Boolean).join(', ') || '자연스러운 톤')

  // 금지어
  const forbiddenWordsStr = adv?.forbidden_words?.length > 0
    ? `\n\n[금지어]: ${adv.forbidden_words.join(', ')}`
    : ''

  // 브랜드 키워드: AI 학습 키워드 + 기본 키워드 병합
  const allKeywords = [
    ...(style.keywords || []),
    ...(adv?.brand_keywords || [])
  ].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)

  const brandKeywordsStr = allKeywords.length > 0
    ? `\n[브랜드 키워드]: ${allKeywords.slice(0, 15).join(', ')}`
    : ''

  // === AI 학습 데이터 기반 상세 컨텍스트 ===
  let businessContext = ''
  let styleContext = ''

  if (facts.business_name || facts.category) {
    businessContext = `
=== 비즈니스 정보 ===
상호명: ${facts.business_name || adv?.name}
업종: ${facts.category || adv?.industry || '일반'}
${facts.address ? `위치: ${facts.address}` : ''}
${facts.business_hours ? `영업시간: ${facts.business_hours}` : ''}
${facts.rating ? `평점: ${facts.rating}점 (리뷰 ${facts.review_count || 0}개)` : ''}
${facts.unique_features?.length > 0 ? `차별화 포인트: ${facts.unique_features.join(', ')}` : ''}
${facts.review_highlights?.length > 0 ? `고객들이 좋아하는 점: ${facts.review_highlights.join(', ')}` : ''}
${facts.menus?.length > 0 ? `대표 메뉴/상품: ${facts.menus.slice(0, 5).map((m: any) => m.name).join(', ')}` : ''}`
  }

  if (style.tone || style.writing_style) {
    styleContext = `
=== 콘텐츠 스타일 가이드 (이 스타일을 반드시 따라주세요) ===
톤앤매너: ${style.tone || '자연스러운 톤'}
${style.writing_style ? `글쓰기 스타일: ${style.writing_style}` : ''}
${style.brand_personality ? `브랜드 성격: ${style.brand_personality}` : ''}
${style.emoji_usage ? `이모지 사용: ${style.emoji_usage}` : ''}
${style.emotional_keywords?.length > 0 ? `감성 키워드: ${style.emotional_keywords.join(', ')}` : ''}
${style.visual_style ? `비주얼 톤: ${style.visual_style}` : ''}`
  }

  // 채널별 요구사항
  const channelRequirements = channels.map((ch: string) => {
    const guide = CHANNEL_GUIDES[ch as keyof typeof CHANNEL_GUIDES]
    if (!guide) return null

    // 인스타그램일 경우 학습된 해시태그 추가
    let extra = ''
    if (ch === 'instagram' && style.hashtags?.length > 0) {
      extra = `\n추천 해시태그 참고: ${style.hashtags.slice(0, 10).map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}`
    }

    return `### ${guide.name} (${ch})\n형식: ${guide.format}${extra}`
  }).filter(Boolean).join('\n\n')

  const targetAudience = style.target_audience || adv?.target_audience || '일반 대중'

  const systemPrompt = `당신은 ${facts.category || adv?.industry || '일반'} 업종의 콘텐츠 마케팅 전문가입니다.
${facts.business_name || adv?.name || '브랜드'} 콘텐츠를 작성합니다.
${businessContext}
${styleContext}

타겟: ${targetAudience}
톤앤매너: ${toneDescriptions}
${forbiddenWordsStr}
${brandKeywordsStr}

중요: 위의 스타일 가이드를 충실히 따르고, 비즈니스의 실제 정보를 자연스럽게 녹여내세요.

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

    const completion = await getOpenAI().chat.completions.create({
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
