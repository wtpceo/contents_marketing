import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: 마케팅 이벤트 조회
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // YYYY-MM 형식
  const category = searchParams.get('category')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const upcoming = searchParams.get('upcoming') // 다가오는 이벤트 (일수)

  let query = supabase
    .from('marketing_events')
    .select('*')

  // 특정 월 필터
  if (month) {
    const [year, mon] = month.split('-')
    const start = `${year}-${mon}-01`
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
    const end = `${year}-${mon}-${lastDay}`
    query = query.gte('event_date', start).lte('event_date', end)
  }

  // 날짜 범위 필터
  if (startDate) {
    query = query.gte('event_date', startDate)
  }
  if (endDate) {
    query = query.lte('event_date', endDate)
  }

  // 다가오는 N일 내 이벤트
  if (upcoming) {
    const days = parseInt(upcoming)
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    const future = futureDate.toISOString().split('T')[0]
    query = query.gte('event_date', today).lte('event_date', future)
  }

  // 카테고리 필터
  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
    .order('event_date', { ascending: true })
    .order('importance_level', { ascending: false })

  if (error) {
    console.error('marketing-events error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 프론트엔드 형식에 맞게 변환
  const formattedData = (data || []).map(event => ({
    id: event.id,
    title: event.title,
    date: event.event_date,
    category: event.category,
    is_holiday: event.category === 'holiday',
    description: event.description,
    importance: event.importance_level,
  }))

  return NextResponse.json(formattedData)
}
