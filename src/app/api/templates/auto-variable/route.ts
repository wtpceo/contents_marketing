import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// 지연 초기화로 빌드 타임 에러 방지
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

/**
 * POST /api/templates/auto-variable
 * 원고 텍스트를 분석하여 자동으로 변수를 추출하고 치환
 *
 * Request Body:
 * {
 *   "content": "원본 원고 텍스트"
 * }
 *
 * Response:
 * {
 *   "converted_content": "{{name}}에서 ...",
 *   "variables": ["name", "location", "phone", ...],
 *   "replacements": [
 *     { "original": "위플학원", "variable": "name" },
 *     ...
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { content } = body

  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: '원고 내용이 필요합니다.' }, { status: 400 })
  }

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 마케팅 콘텐츠 템플릿 전문가입니다.
주어진 원고에서 광고주별로 달라져야 하는 부분을 찾아 표준 변수로 치환합니다.

사용 가능한 변수:
- {{name}}: 업체명/상호명
- {{location}}: 지역/주소 (예: 강남구, 서울 강남, 부산 서면 등)
- {{phone}}: 전화번호
- {{menu}}: 대표 메뉴/상품/서비스
- {{usp}}: 강점/차별점/특징
- {{keyword}}: 핵심 키워드
- {{target}}: 타겟 고객층

규칙:
1. 업체명처럼 보이는 고유명사는 {{name}}으로 치환
2. 지역명/주소는 {{location}}으로 치환
3. 전화번호 패턴(010-xxxx-xxxx, 02-xxx-xxxx 등)은 {{phone}}으로 치환
4. 메뉴, 상품, 서비스 목록은 {{menu}}로 치환
5. "~이 강점", "~가 특징", 차별화 포인트는 {{usp}}로 치환
6. 원본 텍스트의 문장 구조와 톤은 최대한 유지
7. 확실하지 않은 부분은 치환하지 않음

반드시 아래 JSON 형식으로만 응답하세요:
{
  "converted_content": "변수가 치환된 전체 텍스트",
  "variables": ["사용된 변수명 배열"],
  "replacements": [
    {"original": "원본 텍스트", "variable": "변수명"}
  ]
}`
        },
        {
          role: 'user',
          content: `다음 원고를 분석하여 변수로 치환해주세요:\n\n${content}`
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    })

    const responseText = completion.choices[0]?.message?.content?.trim()

    if (!responseText) {
      return NextResponse.json({ error: 'AI 응답이 비어있습니다.' }, { status: 500 })
    }

    const result = JSON.parse(responseText)

    return NextResponse.json({
      converted_content: result.converted_content,
      variables: result.variables || [],
      replacements: result.replacements || [],
    })

  } catch (error) {
    console.error('Auto variable extraction error:', error)
    return NextResponse.json(
      { error: 'AI 변수 추출 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
