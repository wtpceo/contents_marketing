import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 시즌 이슈 데이터 (월별) - 마케팅 캘린더 DB가 없을 경우 폴백용
const SEASONAL_ISSUES: Record<number, Array<{ title: string; description: string; dday?: number }>> = {
  1: [
    { title: '새해 목표 & 다짐', description: '신년 계획 수립 콘텐츠' },
    { title: '설 연휴 가이드', description: '명절 관련 콘텐츠' },
  ],
  2: [
    { title: '발렌타인데이', description: '연인/사랑 관련 콘텐츠' },
    { title: '졸업/입학 시즌', description: '새출발 응원 콘텐츠' },
  ],
  3: [
    { title: '화이트데이', description: '선물/이벤트 콘텐츠' },
    { title: '봄맞이 정리', description: '시즌 전환 콘텐츠' },
  ],
  4: [
    { title: '벚꽃 시즌', description: '봄 나들이 콘텐츠' },
    { title: '식목일/지구의 날', description: '친환경 콘텐츠' },
  ],
  5: [
    { title: '어린이날/어버이날', description: '가정의 달 콘텐츠' },
    { title: '스승의 날', description: '감사 콘텐츠' },
  ],
  6: [
    { title: '여름 준비', description: '휴가/다이어트 콘텐츠' },
    { title: '현충일', description: '추모/역사 콘텐츠' },
  ],
  7: [
    { title: '여름 휴가', description: '휴가지/피서 콘텐츠' },
    { title: '장마철 대비', description: '실내 활동 콘텐츠' },
  ],
  8: [
    { title: '광복절', description: '역사/애국 콘텐츠' },
    { title: '개학 시즌', description: '학교/학습 콘텐츠' },
  ],
  9: [
    { title: '추석', description: '명절 관련 콘텐츠' },
    { title: '가을 시즌', description: '시즌 전환 콘텐츠' },
  ],
  10: [
    { title: '핼러윈', description: '이벤트/파티 콘텐츠' },
    { title: '단풍 시즌', description: '가을 나들이 콘텐츠' },
  ],
  11: [
    { title: '빼빼로데이', description: '시즌 이벤트 콘텐츠' },
    { title: '블랙프라이데이', description: '세일/쇼핑 콘텐츠' },
  ],
  12: [
    { title: '크리스마스', description: '연말 이벤트 콘텐츠' },
    { title: '연말 결산', description: '올해 정리 콘텐츠' },
    { title: '송년회', description: '모임/파티 콘텐츠' },
  ],
}

// GET: 트렌드 및 시즌 이슈 조회
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const advertiserId = searchParams.get('advertiser_id')
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const source = searchParams.get('source') // 'google', 'naver', 'manual'
  const limit = parseInt(searchParams.get('limit') || '20')

  // 1. DB에서 실시간 트렌드 조회 (최근 24시간)
  const cutoffTime = new Date()
  cutoffTime.setHours(cutoffTime.getHours() - 24)

  let trendsQuery = supabase
    .from('trends')
    .select('*')
    .gte('fetched_at', cutoffTime.toISOString())

  if (source) {
    trendsQuery = trendsQuery.eq('source', source)
  }

  const { data: dbTrends, error: trendsError } = await trendsQuery
    .order('volume_score', { ascending: false })
    .order('fetched_at', { ascending: false })
    .limit(limit)

  // 2. DB에서 마케팅 캘린더 조회 (해당 월)
  const year = new Date().getFullYear()
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const { data: marketingEvents, error: eventsError } = await supabase
    .from('marketing_events')
    .select('*')
    .gte('event_date', startOfMonth)
    .lte('event_date', endOfMonth)
    .order('event_date', { ascending: true })
    .order('importance_level', { ascending: false })

  // 3. 시즌 이슈 구성 (DB 우선, 없으면 하드코딩된 데이터 사용)
  let seasonalIssues
  if (marketingEvents && marketingEvents.length > 0) {
    // DB에서 가져온 마케팅 이벤트를 시즌 이슈 형식으로 변환
    const today = new Date()
    seasonalIssues = marketingEvents.map(event => {
      const eventDate = new Date(event.event_date)
      const dday = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: event.id,
        title: event.title,
        description: event.description || '',
        category: event.category,
        importance: event.importance_level,
        date: event.event_date,
        dday: dday >= 0 ? dday : null,
        type: 'season',
      }
    })
  } else {
    // 폴백: 하드코딩된 시즌 이슈
    seasonalIssues = (SEASONAL_ISSUES[month] || []).map((issue, idx) => ({
      id: `fallback-${idx}`,
      ...issue,
      type: 'season',
    }))
  }

  // 4. 실시간 트렌드 구성 (DB 우선)
  let trends: any[]
  if (dbTrends && dbTrends.length > 0) {
    trends = dbTrends.map(t => ({
      id: t.id,
      title: t.keyword,
      category: t.category || t.source,
      hot: t.volume_score >= 80,
      source: t.source,
      volumeScore: t.volume_score,
      relatedKeywords: t.related_keywords,
      fetchedAt: t.fetched_at,
      type: 'trend',
    }))
  } else {
    // 폴백: 빈 배열 또는 기본 트렌드
    trends = []
  }

  // 광고주 업종에 맞는 필터링 (옵션)
  if (advertiserId) {
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('industry')
      .eq('id', advertiserId)
      .single()

    // 업종별 필터링 로직 (추후 고도화 가능)
  }

  return NextResponse.json({
    seasonal: seasonalIssues,
    trending: trends,
    month,
    dataSource: {
      trends: dbTrends && dbTrends.length > 0 ? 'database' : 'empty',
      events: marketingEvents && marketingEvents.length > 0 ? 'database' : 'fallback',
    }
  })
}

// POST: 트렌드 갱신 또는 수동 추가
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  const { action, keywords, trend_title, advertiser_id } = body

  // 액션 1: 수동 키워드 추가
  if (action === 'manual' && keywords && Array.isArray(keywords)) {
    const insertData = keywords.map((keyword: string) => ({
      keyword,
      source: 'manual',
      volume_score: 50,
      fetched_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from('trends')
      .insert(insertData)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, added: data?.length || 0 })
  }

  // 액션 2: Google 트렌드 RSS 갱신
  if (action === 'refresh') {
    try {
      const trends = await fetchGoogleTrends()

      if (trends.length === 0) {
        return NextResponse.json({ success: true, message: '새로운 트렌드가 없습니다.', added: 0 })
      }

      // 기존 24시간 이전 Google 트렌드 삭제
      const cutoff = new Date()
      cutoff.setHours(cutoff.getHours() - 24)

      await supabase
        .from('trends')
        .delete()
        .eq('source', 'google')
        .lt('fetched_at', cutoff.toISOString())

      // 새 트렌드 삽입
      const insertData = trends.map((t, idx) => ({
        keyword: t.keyword,
        source: 'google',
        volume_score: 100 - idx * 5, // 순위별 점수
        category: t.category || null,
        related_keywords: t.related || [],
        fetched_at: new Date().toISOString(),
      }))

      const { data, error } = await supabase
        .from('trends')
        .insert(insertData)
        .select()

      if (error) {
        console.error('Trends insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, added: data?.length || 0, trends: data })
    } catch (err) {
      console.error('RSS fetch error:', err)
      return NextResponse.json(
        { error: 'RSS 파싱에 실패했습니다.' },
        { status: 500 }
      )
    }
  }

  // 액션 3: 트렌드를 광고주 맞춤 주제로 변환
  if (trend_title && advertiser_id) {
    const { data: advertiser, error: advError } = await supabase
      .from('advertisers')
      .select('name, industry')
      .eq('id', advertiser_id)
      .single()

    if (advError || !advertiser) {
      return NextResponse.json({ error: '광고주를 찾을 수 없습니다.' }, { status: 404 })
    }

    const industryKeywords: Record<string, string> = {
      '음식/외식': '메뉴',
      '뷰티/패션': '스타일',
      'IT/SaaS': '서비스',
      '법률/세무': '서비스',
      '교육': '강의',
      '헬스케어': '건강',
    }

    const keyword = industryKeywords[advertiser.industry] || '이벤트'
    const transformedTitle = `${trend_title} ${keyword} 출시`

    return NextResponse.json({
      original: trend_title,
      transformed: transformedTitle,
      advertiser: advertiser.name,
      industry: advertiser.industry,
    })
  }

  return NextResponse.json({ error: 'action 파라미터가 필요합니다.' }, { status: 400 })
}

// Google Trends RSS 파싱 함수
async function fetchGoogleTrends(): Promise<Array<{ keyword: string; category?: string; related?: string[] }>> {
  try {
    const rssUrl = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=KR'
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WCE/1.0)',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Google Trends RSS fetch failed:', response.status)
      return []
    }

    const xml = await response.text()

    // 간단한 XML 파싱 (title 태그 추출)
    const trends: Array<{ keyword: string; category?: string; related?: string[] }> = []

    // <item> 블록 추출
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1]

      // <title> 추출
      const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
        || itemContent.match(/<title>(.*?)<\/title>/)

      if (titleMatch && titleMatch[1]) {
        const keyword = titleMatch[1].trim()

        // 중복 제거
        if (keyword && !trends.some(t => t.keyword === keyword)) {
          // ht:news_item_title에서 관련 키워드 추출 시도
          const relatedMatches = itemContent.match(/<ht:news_item_title><!\[CDATA\[(.*?)\]\]><\/ht:news_item_title>/g)
          const related = relatedMatches
            ?.map(m => {
              const r = m.match(/<!\[CDATA\[(.*?)\]\]>/)
              return r ? r[1] : null
            })
            .filter((r): r is string => r !== null)
            .slice(0, 3)

          trends.push({
            keyword,
            related: related || [],
          })
        }
      }
    }

    return trends.slice(0, 20) // 상위 20개만
  } catch (error) {
    console.error('fetchGoogleTrends error:', error)
    return []
  }
}
