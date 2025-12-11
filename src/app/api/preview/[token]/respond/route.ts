import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 지연 초기화로 빌드 타임 에러 방지
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface RouteParams {
  params: Promise<{ token: string }>
}

// POST: 광고주 컨펌 응답 처리
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params
  const body = await request.json()
  const { action, message } = body

  if (!action || !['approved', 'revision'].includes(action)) {
    return NextResponse.json(
      { error: '유효하지 않은 액션입니다.' },
      { status: 400 }
    )
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: content, error: fetchError } = await supabaseAdmin
    .from('contents')
    .select('*')
    .eq('preview_token', token)
    .single()

  if (fetchError || !content) {
    return NextResponse.json(
      { error: '콘텐츠를 찾을 수 없습니다.' },
      { status: 404 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((content as any).status !== 'pending_confirm') {
    return NextResponse.json(
      { error: '이미 처리된 콘텐츠입니다.' },
      { status: 400 }
    )
  }

  const newStatus = action === 'approved' ? 'approved' : 'revision'

  const { error: updateError } = await supabaseAdmin
    .from('contents')
    .update({
      status: newStatus,
      confirm_responded_at: new Date().toISOString(),
      confirm_message: message || null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('id', (content as any).id)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  await supabaseAdmin.from('notifications').insert({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user_id: (content as any).user_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content_id: (content as any).id,
    type: 'confirm_response',
    message: `광고주가 콘텐츠를 ${action === 'approved' ? '승인' : '수정 요청'}했습니다.${message ? ` 메시지: ${message}` : ''}`,
    status: 'sent',
    sent_at: new Date().toISOString(),
  })

  return NextResponse.json({
    success: true,
    status: newStatus,
  })
}
