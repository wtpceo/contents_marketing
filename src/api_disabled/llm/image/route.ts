import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// POST: DALL-E 이미지 생성
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { prompt, size = '1024x1024', style = 'vivid' } = body

  if (!prompt) {
    return NextResponse.json({ error: '이미지 설명은 필수입니다.' }, { status: 400 })
  }

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size as '1024x1024' | '1792x1024' | '1024x1792',
      style: style as 'vivid' | 'natural',
      response_format: 'url',
    })

    const imageUrl = response.data[0]?.url

    if (!imageUrl) {
      throw new Error('이미지 URL을 받지 못했습니다.')
    }

    return NextResponse.json({
      url: imageUrl,
      revised_prompt: response.data[0]?.revised_prompt,
    })
  } catch (error) {
    console.error('DALL-E API Error:', error)
    return NextResponse.json(
      { error: '이미지 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
