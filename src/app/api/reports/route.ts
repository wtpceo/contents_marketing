import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

// POST: 월간 리포트 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { advertiser_id, year, month, marketer_comment } = body

    if (!advertiser_id || !year || !month) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 })
    }

    // 광고주 정보 조회
    const { data: advertiser, error: advError } = await supabase
      .from('advertisers')
      .select('id, name, logo_url')
      .eq('id', advertiser_id)
      .eq('user_id', user.id)
      .single()

    if (advError || !advertiser) {
      return NextResponse.json({ error: '광고주를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 해당 월의 발행된(published) 콘텐츠 조회
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

    const { data: contents, error: contentsError } = await supabase
      .from('contents')
      .select(`
        id,
        title,
        channel,
        selected_channels,
        status,
        scheduled_at,
        metadata,
        created_at,
        updated_at
      `)
      .eq('advertiser_id', advertiser_id)
      .eq('status', 'published')
      .gte('scheduled_at', startDate)
      .lt('scheduled_at', endDate)
      .order('scheduled_at', { ascending: true })

    if (contentsError) {
      console.error('콘텐츠 조회 오류:', contentsError)
      return NextResponse.json({ error: '콘텐츠를 불러오는데 실패했습니다.' }, { status: 500 })
    }

    // 채널별 집계
    const channelStats: Record<string, number> = {}
    contents?.forEach(content => {
      const channels = content.selected_channels || [content.channel]
      channels.forEach((ch: string) => {
        const normalizedChannel = ch.startsWith('blog') ? '블로그' :
          ch === 'instagram' ? '인스타그램' :
          ch === 'threads' ? '스레드' :
          ch === 'youtube' ? '유튜브' : ch
        channelStats[normalizedChannel] = (channelStats[normalizedChannel] || 0) + 1
      })
    })

    // 리포트 데이터 구성
    const reportData = {
      advertiser: {
        id: advertiser.id,
        name: advertiser.name,
        logo_url: advertiser.logo_url
      },
      period: {
        year,
        month,
        label: `${year}년 ${month}월`
      },
      summary: {
        total_contents: contents?.length || 0,
        channel_breakdown: channelStats
      },
      timeline: contents?.map(content => ({
        id: content.id,
        title: content.title,
        scheduled_at: content.scheduled_at,
        channels: content.selected_channels || [content.channel],
        published_url: content.metadata?.published_urls || null
      })) || [],
      marketer_comment: marketer_comment || ''
    }

    // 고유 토큰 생성 (리포트 공유용)
    const reportToken = randomBytes(16).toString('hex')

    // 리포트 저장 (contents 테이블과 별도로 reports 테이블 필요 또는 metadata로 관리)
    // 여기서는 간단하게 URL에 데이터를 인코딩하여 반환
    const reportUrl = `/reports/${reportToken}`

    // 리포트 메타데이터를 광고주에 저장하거나 별도 테이블 사용
    // 간단한 구현: 로컬스토리지 대신 쿼리 파라미터 사용
    return NextResponse.json({
      success: true,
      report_token: reportToken,
      report_url: reportUrl,
      report_data: reportData
    })

  } catch (error) {
    console.error('리포트 생성 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// GET: 리포트 목록 조회 (광고주별)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const advertiserId = searchParams.get('advertiser_id')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!advertiserId) {
      return NextResponse.json({ error: '광고주 ID가 필요합니다.' }, { status: 400 })
    }

    // 광고주 정보 조회
    const { data: advertiser, error: advError } = await supabase
      .from('advertisers')
      .select('id, name, logo_url')
      .eq('id', advertiserId)
      .eq('user_id', user.id)
      .single()

    if (advError || !advertiser) {
      return NextResponse.json({ error: '광고주를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 해당 월의 콘텐츠 통계
    let query = supabase
      .from('contents')
      .select('id, title, channel, selected_channels, status, scheduled_at, metadata')
      .eq('advertiser_id', advertiserId)
      .eq('status', 'published')

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = parseInt(month) === 12
        ? `${parseInt(year) + 1}-01-01`
        : `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`

      query = query.gte('scheduled_at', startDate).lt('scheduled_at', endDate)
    }

    const { data: contents, error: contentsError } = await query.order('scheduled_at', { ascending: true })

    if (contentsError) {
      return NextResponse.json({ error: '콘텐츠를 불러오는데 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({
      advertiser,
      contents: contents || [],
      total: contents?.length || 0
    })

  } catch (error) {
    console.error('리포트 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
