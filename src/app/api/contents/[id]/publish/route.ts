import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: 콘텐츠 배포 완료 처리
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { published_url, channel } = body

    // 콘텐츠 정보 조회
    const { data: content, error: fetchError } = await supabase
      .from('contents')
      .select('*, advertisers(id, name)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !content) {
      return NextResponse.json({ error: '콘텐츠를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 상태를 published로 변경
    const updateData: Record<string, unknown> = {
      status: 'published',
      updated_at: new Date().toISOString(),
    }

    // published_url이 있으면 저장 (metadata에 채널별로 저장)
    if (published_url) {
      const existingMetadata = content.metadata || {}
      updateData.metadata = {
        ...existingMetadata,
        published_urls: {
          ...(existingMetadata.published_urls || {}),
          [channel || 'default']: published_url
        },
        published_at: new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('contents')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Publish error:', error)
      return NextResponse.json({ error: '배포 완료 처리에 실패했습니다.' }, { status: 500 })
    }

    // activity_logs에 배포 완료 기록 (테이블이 있으면)
    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        advertiser_id: content.advertiser_id,
        action_type: 'content_published',
        description: `콘텐츠 "${content.title}" 배포 완료`,
        metadata: {
          content_id: id,
          channel,
          published_url
        }
      })
    } catch (logError) {
      console.warn('Activity log insert failed:', logError)
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Publish API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
