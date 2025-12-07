import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST: 컨펌 요청 발송
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }


  const { data: content, error: contentError } = await supabase
    .from('contents')
    .select(`
      *,
      advertisers (
        id,
        name,
        contact_name,
        contact_phone,
        contact_email
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (contentError || !content) {
    return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다.' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const advertiser = (content as any).advertisers

  if (!advertiser?.contact_phone) {
    return NextResponse.json(
      { error: '광고주 담당자 연락처가 없습니다.' },
      { status: 400 }
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewUrl = `${baseUrl}/preview/${(content as any).preview_token}`


  const { error: updateError } = await supabase
    .from('contents')
    .update({
      status: 'pending_confirm',
      confirm_requested_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notificationMessage = `[${advertiser.name}] 콘텐츠 컨펌 요청
${advertiser.contact_name || '담당자'}님, 새로운 콘텐츠가 등록되었습니다.
제목: ${(content as any).title}
아래 링크에서 확인 후 승인/수정 요청해주세요.
${previewUrl}`


  await supabase.from('notifications').insert({
    user_id: user.id,
    content_id: id,
    type: 'confirm_request',
    recipient_phone: advertiser.contact_phone,
    recipient_email: advertiser.contact_email,
    message: notificationMessage,
    status: 'pending',
  })

  return NextResponse.json({
    success: true,
    preview_url: previewUrl,
    message: '컨펌 요청이 발송되었습니다.',
  })
}
