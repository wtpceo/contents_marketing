import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 서비스 롤 키로 RLS 우회 (비로그인 접근용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  // preview_token으로 콘텐츠 조회
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

  // 이미 처리된 경우
  if (content.status !== 'pending_confirm') {
    return NextResponse.json(
      { error: '이미 처리된 콘텐츠입니다.' },
      { status: 400 }
    )
  }

  // 상태 업데이트
  const newStatus = action === 'approved' ? 'approved' : 'revision'

  const { error: updateError } = await supabaseAdmin
    .from('contents')
    .update({
      status: newStatus,
      confirm_responded_at: new Date().toISOString(),
      confirm_message: message || null,
    })
    .eq('id', content.id)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  // 알림 로그 저장
  await supabaseAdmin.from('notifications').insert({
    user_id: content.user_id,
    content_id: content.id,
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
