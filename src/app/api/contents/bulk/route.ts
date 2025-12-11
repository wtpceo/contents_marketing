import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// 지연 초기화로 빌드 타임 에러 방지
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

interface AdvertiserProfile {
  id: string
  name: string
  industry: string | null
  advanced_profile: {
    basic_info?: {
      location?: string
      phone?: string
    }
    service_info?: {
      main_products?: string[]
      unique_selling_points?: string[]
      target_customers?: string[]
      keywords?: string[]
    }
  } | null
}

/**
 * 1차 단순 치환 (Hard Replacement)
 * {{변수}} 자리를 실제 값으로 1:1 교체
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template

  // 표준 변수 매핑
  const variableMap: Record<string, string> = {
    'company_name': variables.company_name || variables.name || '',
    'name': variables.name || variables.company_name || '',
    'location': variables.location || '',
    'phone': variables.phone || '',
    'usp': variables.usp || '',
    'menu': variables.menu || '',
    'target': variables.target || '',
    'keyword': variables.keyword || '',
  }

  // 모든 변수 치환
  for (const [key, value] of Object.entries(variableMap)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value)
  }

  return result
}

/**
 * 2차 문맥 보정 (AI Post-Processing)
 * GPT-4o-mini를 사용하여 한국어 조사만 교정 (비용 최소화)
 */
async function correctGrammar(text: string): Promise<string> {
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `다음 텍스트에서 단어 치환으로 인해 어색해진 한국어 조사(은/는/이/가/을/를/와/과/로/으로 등)만 자연스럽게 수정해서 원문 그대로 반환해. 내용은 절대 바꾸지 마.

텍스트:
${text}`
      }],
      temperature: 0.1, // 창의성 최소화
      max_tokens: 2000,
    })

    return completion.choices[0]?.message?.content?.trim() || text
  } catch (error) {
    console.error('Grammar correction error:', error)
    return text // 실패 시 원본 반환
  }
}

/**
 * POST /api/contents/bulk
 * 템플릿 기반 대량 콘텐츠 생성 (스마트 치환 방식)
 *
 * Request Body:
 * {
 *   "template_id": "uuid",
 *   "advertiser_ids": ["uuid1", "uuid2", ...],
 *   "use_ai_correction": true  // AI 문법 보정 사용 여부 (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { template_id, advertiser_ids, use_ai_correction = true } = body

  if (!template_id || !advertiser_ids || !Array.isArray(advertiser_ids) || advertiser_ids.length === 0) {
    return NextResponse.json(
      { error: 'template_id와 advertiser_ids 배열이 필요합니다.' },
      { status: 400 }
    )
  }

  // 템플릿 조회 (공용 템플릿도 사용 가능)
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .select('*')
    .eq('id', template_id)
    .eq('is_active', true)
    .single()

  // 템플릿이 없거나, 개인 템플릿인데 본인 소유가 아닌 경우 체크
  if (templateError || !template) {
    return NextResponse.json({ error: '템플릿을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 개인 템플릿인 경우 소유권 확인
  if (template.visibility !== 'public' && template.user_id !== user.id) {
    return NextResponse.json({ error: '접근 권한이 없는 템플릿입니다.' }, { status: 403 })
  }

  // 광고주 정보 조회
  const { data: advertisers, error: advError } = await supabase
    .from('advertisers')
    .select('id, name, industry, advanced_profile')
    .eq('user_id', user.id)
    .in('id', advertiser_ids) as { data: AdvertiserProfile[] | null, error: any }

  if (advError || !advertisers || advertisers.length === 0) {
    return NextResponse.json({ error: '광고주 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const successfulContents: any[] = []
  const failedIds: string[] = []
  const missingVariables: Record<string, string[]> = {} // 누락된 변수 추적

  // 각 광고주에 대해 콘텐츠 생성
  for (const advertiser of advertisers) {
    try {
      // 변수 맵핑
      const variables: Record<string, string> = {
        company_name: advertiser.name,
        name: advertiser.name,
        location: advertiser.advanced_profile?.basic_info?.location || '',
        phone: advertiser.advanced_profile?.basic_info?.phone || '',
        menu: advertiser.advanced_profile?.service_info?.main_products?.join(', ') || '',
        usp: advertiser.advanced_profile?.service_info?.unique_selling_points?.join(', ') || '',
        target: advertiser.advanced_profile?.service_info?.target_customers?.join(', ') || '',
        keyword: advertiser.advanced_profile?.service_info?.keywords?.join(', ') || '',
      }

      // 누락된 변수 체크
      const missing: string[] = []
      const templateVars = template.variables || []
      for (const v of templateVars) {
        const varName = v.toLowerCase().replace('company_name', 'name')
        if (!variables[varName] && !variables[v]) {
          missing.push(v)
        }
      }
      if (missing.length > 0) {
        missingVariables[advertiser.id] = missing
      }

      // Step 1: 1차 단순 치환 (Hard Replacement)
      let generatedContent = replaceVariables(template.content_structure, variables)

      // Step 2: 2차 문법 보정 (AI Post-Processing) - 옵션
      if (use_ai_correction) {
        generatedContent = await correctGrammar(generatedContent)
      }

      // 제목 생성
      const title = `${advertiser.name} - ${template.title}`

      // contents 테이블에 저장
      const { data: content, error: insertError } = await supabase
        .from('contents')
        .insert({
          user_id: user.id,
          advertiser_id: advertiser.id,
          title,
          body: generatedContent,
          channel: template.platform,
          status: 'draft',
          llm_prompt: `템플릿: ${template.title} (스마트 치환${use_ai_correction ? ' + AI 문법 보정' : ''})`,
          scheduled_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        console.error(`Content insert error for ${advertiser.id}:`, insertError)
        failedIds.push(advertiser.id)
        continue
      }

      successfulContents.push(content)

    } catch (error) {
      console.error(`Error generating content for ${advertiser.id}:`, error)
      failedIds.push(advertiser.id)
    }
  }

  // 템플릿 사용 횟수 증가
  if (successfulContents.length > 0) {
    await supabase
      .from('templates')
      .update({ usage_count: (template.usage_count || 0) + successfulContents.length })
      .eq('id', template_id)
  }

  return NextResponse.json({
    success_count: successfulContents.length,
    failed_ids: failedIds,
    missing_variables: missingVariables, // 누락된 변수 정보
    contents: successfulContents,
  })
}
