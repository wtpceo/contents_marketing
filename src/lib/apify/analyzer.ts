/**
 * 크롤링 데이터 분석 및 정제 서비스
 * OpenAI를 사용하여 Raw Data를 Fact/Style로 분리하여 변환
 *
 * Fact Data: 변경 불가 - 메뉴, 가격, 주소, 영업시간 등 객관적 정보
 * Style Data: 변경 가능 - 톤앤매너, 키워드, 감성 등 (리브랜딩 시 대체 가능)
 */

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

import type { NaverPlaceData } from './client'

interface CrawledData {
  naver?: NaverPlaceData  // 확장된 네이버 플레이스 데이터
  instagram?: {
    username?: string
    fullName?: string
    bio?: string
    followersCount?: number
    postsCount?: number
    recentPosts?: { caption: string; likesCount?: number; commentsCount?: number }[]
  }
  website?: {
    title?: string
    description?: string
    texts?: string[]
  }
}

// Fact Data 인터페이스 (변경 불가 - 객관적 정보)
export interface FactData {
  business_name: string              // 상호명
  category: string                   // 업종/카테고리
  address: string                    // 주소
  road_address?: string              // 도로명 주소
  business_hours: string             // 영업시간
  menus: { name: string; price?: string; description?: string; isPopular?: boolean }[]  // 메뉴/상품 목록
  facilities: string[]               // 시설 정보 (주차, 노키즈존 등)
  contact: string                    // 연락처
  rating: number | null              // 평점
  review_count: number               // 리뷰 수
  visitor_review_count?: number      // 방문자 리뷰 수
  blog_review_count?: number         // 블로그 리뷰 수
  review_highlights: string[]        // 리뷰에서 추출한 객관적 장점
  unique_features: string[]          // 팩트 기반 차별화 포인트

  // 새로 추가된 필드들
  images?: string[]                  // 업체 이미지 URL
  thumbnail_url?: string             // 대표 이미지
  latitude?: number                  // 위도
  longitude?: number                 // 경도
  place_url?: string                 // 네이버 플레이스 URL
  map_url?: string                   // 지도 URL
  homepage_url?: string              // 홈페이지
  blog_url?: string                  // 블로그
  booking_url?: string               // 예약 URL
  keywords?: string[]                // 태그/키워드
  price_range?: string               // 가격대
  opening_status?: string            // 현재 영업 상태
}

// Style Data 인터페이스 (변경 가능 - 리브랜딩 시 대체)
export interface StyleData {
  tone: string                       // 톤앤매너 (예: "친근하고 감성적인")
  writing_style: string              // 글쓰기 스타일 설명
  keywords: string[]                 // 마케팅 키워드
  emotional_keywords: string[]       // 감성 키워드
  hashtags: string[]                 // 추천 해시태그
  emoji_usage: string                // 이모지 사용 패턴
  visual_style: string               // 비주얼 스타일 가이드
  target_audience: string            // 타겟 고객 인사이트
  content_suggestions: string[]      // 콘텐츠 주제 제안
  brand_personality: string          // 브랜드 퍼스낼리티
}

// 통합 프로필 인터페이스
export interface AdvancedProfile {
  facts: FactData
  style: StyleData
  meta: {
    synced_at: string
    sync_count: number
    is_rebranded: boolean
    rebranding_source?: string       // 리브랜딩 시 벤치마킹한 URL
    sources: {
      naver?: { synced_at: string; reviews_count: number; images_count?: number; menu_count?: number }
      instagram?: { synced_at: string; posts_analyzed: number }
      website?: { synced_at: string; pages_crawled: number }
    }
  }
}

// 레거시 호환을 위한 플랫 프로필 (기존 코드와 호환)
export interface LegacyProfile {
  summary: string
  keywords: string[]
  tone: string
  reviews_summary: string
  menu_highlights: string[]
  unique_selling_points: string[]
  target_audience_insights: string
  content_suggestions: string[]
  instagram_style?: string
  synced_at: string
  sources: AdvancedProfile['meta']['sources']
}

/**
 * 크롤링 데이터를 Fact/Style로 분리하여 분석
 */
export async function analyzeAndRefine(
  advertiserName: string,
  industry: string | null,
  crawledData: CrawledData,
  options?: {
    rebrandingMode?: boolean
    benchmarkData?: CrawledData  // 리브랜딩 시 벤치마킹 대상 데이터
    benchmarkUrl?: string
    existingFacts?: FactData     // 리브랜딩 시 기존 Fact 유지
  }
): Promise<{ success: boolean; profile: AdvancedProfile | null; error?: string }> {

  const sources: AdvancedProfile['meta']['sources'] = {}

  // 분석할 데이터 구성
  const dataForAnalysis: string[] = []

  if (crawledData.naver) {
    const naver = crawledData.naver
    sources.naver = {
      synced_at: new Date().toISOString(),
      reviews_count: naver.reviews?.length || 0,
      images_count: naver.images?.length || 0,
      menu_count: naver.menu?.length || 0,
    }

    dataForAnalysis.push(`
=== 네이버 플레이스 정보 ===
상호명: ${naver.name || '알 수 없음'}
카테고리: ${naver.category || '알 수 없음'}
주소: ${naver.address || '알 수 없음'}
${naver.roadAddress ? `도로명 주소: ${naver.roadAddress}` : ''}
연락처: ${naver.phone || '정보 없음'}
평점: ${naver.rating || '없음'} (총 리뷰 ${naver.reviewCount || 0}개, 방문자 리뷰 ${naver.visitorReviewCount || 0}개, 블로그 리뷰 ${naver.blogReviewCount || 0}개)
영업시간: ${naver.businessHours || '정보 없음'}
${naver.openingStatus ? `현재 영업 상태: ${naver.openingStatus}` : ''}
${naver.priceRange ? `가격대: ${naver.priceRange}` : ''}
소개: ${naver.description || '없음'}

${naver.facilities && naver.facilities.length > 0 ? `편의시설: ${naver.facilities.join(', ')}` : ''}
${naver.keywords && naver.keywords.length > 0 ? `태그/키워드: ${naver.keywords.join(', ')}` : ''}

메뉴/상품 (${naver.menu?.length || 0}개):
${naver.menu?.slice(0, 20).map(m => `- ${m.name} ${m.price || ''} ${m.isPopular ? '⭐인기' : ''} ${m.description ? `(${m.description})` : ''}`).join('\n') || '정보 없음'}

${naver.images && naver.images.length > 0 ? `이미지: ${naver.images.length}개 수집됨` : ''}
${naver.placeUrl ? `네이버 플레이스 URL: ${naver.placeUrl}` : ''}
${naver.homepageUrl ? `홈페이지: ${naver.homepageUrl}` : ''}
${naver.blogUrl ? `블로그: ${naver.blogUrl}` : ''}
${naver.bookingUrl ? `예약 URL: ${naver.bookingUrl}` : ''}

고객 리뷰 (${naver.reviews?.length || 0}개 중 최대 30개 분석):
${naver.reviews?.slice(0, 30).map(r => `- "${r.text}" ${r.rating ? `(${r.rating}점)` : ''} ${r.nickname ? `- ${r.nickname}` : ''} ${r.date ? `(${r.date})` : ''}`).join('\n') || '리뷰 없음'}
`)
  }

  if (crawledData.instagram) {
    const insta = crawledData.instagram
    sources.instagram = {
      synced_at: new Date().toISOString(),
      posts_analyzed: insta.recentPosts?.length || 0,
    }

    dataForAnalysis.push(`
=== 인스타그램 정보 ===
계정: @${insta.username || '알 수 없음'}
이름: ${insta.fullName || '알 수 없음'}
바이오: ${insta.bio || '없음'}
팔로워: ${insta.followersCount?.toLocaleString() || '알 수 없음'}
게시물 수: ${insta.postsCount || '알 수 없음'}

최근 게시물 캡션 (최대 20개):
${insta.recentPosts?.slice(0, 20).map((p, i) =>
      `[${i + 1}] ${p.caption?.substring(0, 300) || '(캡션 없음)'} (좋아요: ${p.likesCount || 0})`
    ).join('\n\n') || '게시물 없음'}
`)
  }

  if (crawledData.website) {
    const web = crawledData.website
    sources.website = {
      synced_at: new Date().toISOString(),
      pages_crawled: web.texts?.length || 1,
    }

    dataForAnalysis.push(`
=== 웹사이트 정보 ===
제목: ${web.title || '알 수 없음'}
설명: ${web.description || '없음'}

페이지 내용:
${web.texts?.slice(0, 3).join('\n\n---\n\n') || '내용 없음'}
`)
  }

  if (dataForAnalysis.length === 0) {
    return { success: false, profile: null, error: '분석할 데이터가 없습니다.' }
  }

  // 리브랜딩 모드: 벤치마킹 데이터 추가
  let benchmarkText = ''
  if (options?.rebrandingMode && options.benchmarkData) {
    const bench = options.benchmarkData
    if (bench.instagram) {
      benchmarkText = `
=== 벤치마킹 대상 (스타일 참고용) ===
계정: @${bench.instagram.username || '알 수 없음'}
바이오: ${bench.instagram.bio || '없음'}

최근 게시물 스타일 샘플:
${bench.instagram.recentPosts?.slice(0, 10).map((p, i) =>
        `[${i + 1}] ${p.caption?.substring(0, 400) || '(캡션 없음)'}`
      ).join('\n\n') || '게시물 없음'}
`
    }
  }

  // Fact/Style 분리 프롬프트
  const systemPrompt = `당신은 B2B 콘텐츠 마케팅 전문 AI입니다.
크롤링된 비즈니스 데이터를 분석하여 **'Fact(사실)'**와 **'Style(스타일)'**을 엄격하게 분리해서 추출합니다.

## 분리 기준
- **Fact (사실)**: 변경 불가능한 객관적 정보. 메뉴, 가격, 주소, 영업시간, 시설 정보, 팩트 기반 장점.
- **Style (스타일)**: 변경 가능한 표현 방식. 톤앤매너, 글쓰기 스타일, 감성 키워드, 이모지 사용 패턴.

${options?.rebrandingMode ? `
## 리브랜딩 모드
현재 리브랜딩 모드입니다. Fact는 원본 데이터에서, Style은 벤치마킹 대상에서 추출하세요.
벤치마킹 대상의 톤앤매너, 글쓰기 스타일, 감성을 분석하여 Style에 반영하세요.
` : ''}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "facts": {
    "business_name": "상호명",
    "category": "업종/카테고리",
    "address": "주소",
    "business_hours": "영업시간 (예: 10:00-22:00, 월요일 휴무)",
    "menus": [{"name": "메뉴명", "price": "가격"}],
    "facilities": ["주차가능", "노키즈존", "반려동물 동반 가능" 등],
    "contact": "연락처",
    "rating": 4.5,
    "review_count": 120,
    "review_highlights": ["리뷰에서 추출한 객관적 장점 3-5개"],
    "unique_features": ["팩트 기반 차별화 포인트 3-5개"]
  },
  "style": {
    "tone": "톤앤매너 (예: 친근하고 감성적인 / 전문적이고 신뢰감 있는)",
    "writing_style": "글쓰기 스타일 상세 설명 (문장 길이, 어미 스타일 등)",
    "keywords": ["마케팅 키워드 10-15개"],
    "emotional_keywords": ["감성 키워드 5-7개 (위로, 휴식, 설렘 등)"],
    "hashtags": ["추천 해시태그 10개 (#없이)"],
    "emoji_usage": "이모지 사용 패턴 (예: 자주 사용 / 거의 사용 안함 / 포인트로만)",
    "visual_style": "비주얼 스타일 가이드 (예: warm filters, beige tone)",
    "target_audience": "타겟 고객층 분석",
    "content_suggestions": ["콘텐츠 주제 제안 5-7개"],
    "brand_personality": "브랜드 퍼스낼리티 (예: 따뜻한 이웃집 언니 같은)"
  }
}`

  const userPrompt = `다음은 "${advertiserName}" (${industry || '업종 미상'})의 온라인 데이터입니다.

${dataForAnalysis.join('\n')}
${benchmarkText}

위 데이터를 분석하여 **Fact**와 **Style**을 엄격하게 분리해서 JSON으로 추출해주세요.
${options?.rebrandingMode ? '리브랜딩 모드이므로, Style은 벤치마킹 대상의 스타일을 참고하여 추출해주세요.' : ''}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content || '{}'

    let parsed: any
    try {
      parsed = JSON.parse(responseText)
    } catch {
      return { success: false, profile: null, error: 'AI 응답 파싱 실패' }
    }

    // 네이버 원본 데이터에서 직접 가져올 수 있는 필드들
    const naverData = crawledData.naver

    // 리브랜딩 모드에서 기존 Fact 유지
    const facts: FactData = options?.existingFacts || {
      business_name: parsed.facts?.business_name || naverData?.name || advertiserName,
      category: parsed.facts?.category || naverData?.category || industry || '',
      address: parsed.facts?.address || naverData?.address || '',
      road_address: naverData?.roadAddress || '',
      business_hours: parsed.facts?.business_hours || naverData?.businessHours || '',
      menus: parsed.facts?.menus || naverData?.menu?.map(m => ({
        name: m.name,
        price: m.price,
        description: m.description,
        isPopular: m.isPopular,
      })) || [],
      facilities: parsed.facts?.facilities || naverData?.facilities || [],
      contact: parsed.facts?.contact || naverData?.phone || '',
      rating: parsed.facts?.rating ?? naverData?.rating ?? null,
      review_count: parsed.facts?.review_count || naverData?.reviewCount || 0,
      visitor_review_count: naverData?.visitorReviewCount || 0,
      blog_review_count: naverData?.blogReviewCount || 0,
      review_highlights: parsed.facts?.review_highlights || [],
      unique_features: parsed.facts?.unique_features || [],

      // 새로 추가된 필드들 (크롤링 데이터에서 직접)
      images: naverData?.images || [],
      thumbnail_url: naverData?.thumbnailUrl || '',
      latitude: naverData?.latitude || undefined,
      longitude: naverData?.longitude || undefined,
      place_url: naverData?.placeUrl || '',
      map_url: naverData?.mapUrl || '',
      homepage_url: naverData?.homepageUrl || '',
      blog_url: naverData?.blogUrl || '',
      booking_url: naverData?.bookingUrl || '',
      keywords: naverData?.keywords || [],
      price_range: naverData?.priceRange || '',
      opening_status: naverData?.openingStatus || '',
    }

    const style: StyleData = {
      tone: parsed.style?.tone || '',
      writing_style: parsed.style?.writing_style || '',
      keywords: parsed.style?.keywords || [],
      emotional_keywords: parsed.style?.emotional_keywords || [],
      hashtags: parsed.style?.hashtags || [],
      emoji_usage: parsed.style?.emoji_usage || '',
      visual_style: parsed.style?.visual_style || '',
      target_audience: parsed.style?.target_audience || '',
      content_suggestions: parsed.style?.content_suggestions || [],
      brand_personality: parsed.style?.brand_personality || '',
    }

    const profile: AdvancedProfile = {
      facts,
      style,
      meta: {
        synced_at: new Date().toISOString(),
        sync_count: 1,
        is_rebranded: options?.rebrandingMode || false,
        rebranding_source: options?.benchmarkUrl,
        sources,
      },
    }

    return { success: true, profile }
  } catch (error) {
    console.error('OpenAI API Error:', error)
    return {
      success: false,
      profile: null,
      error: error instanceof Error ? error.message : 'AI 분석 실패',
    }
  }
}

/**
 * 벤치마킹 대상 스타일만 추출 (리브랜딩용)
 */
export async function extractStyleFromBenchmark(
  benchmarkData: CrawledData
): Promise<{ success: boolean; style: StyleData | null; error?: string }> {

  const dataForAnalysis: string[] = []

  if (benchmarkData.instagram) {
    const insta = benchmarkData.instagram
    dataForAnalysis.push(`
=== 벤치마킹 대상 인스타그램 ===
계정: @${insta.username || '알 수 없음'}
바이오: ${insta.bio || '없음'}
팔로워: ${insta.followersCount?.toLocaleString() || '알 수 없음'}

최근 게시물 캡션:
${insta.recentPosts?.slice(0, 15).map((p, i) =>
      `[${i + 1}] ${p.caption?.substring(0, 400) || '(캡션 없음)'}`
    ).join('\n\n') || '게시물 없음'}
`)
  }

  if (dataForAnalysis.length === 0) {
    return { success: false, style: null, error: '분석할 벤치마킹 데이터가 없습니다.' }
  }

  const systemPrompt = `당신은 브랜드 스타일 분석 전문가입니다.
주어진 인스타그램/블로그 데이터에서 **스타일(Style)**만 추출합니다.
톤앤매너, 글쓰기 스타일, 감성 키워드, 이모지 사용 패턴 등을 분석하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "tone": "톤앤매너",
  "writing_style": "글쓰기 스타일 상세 설명",
  "keywords": ["마케팅 키워드"],
  "emotional_keywords": ["감성 키워드"],
  "hashtags": ["해시태그"],
  "emoji_usage": "이모지 사용 패턴",
  "visual_style": "비주얼 스타일 가이드",
  "target_audience": "타겟 고객층",
  "content_suggestions": ["콘텐츠 주제 제안"],
  "brand_personality": "브랜드 퍼스낼리티"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: dataForAnalysis.join('\n') },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(responseText)

    const style: StyleData = {
      tone: parsed.tone || '',
      writing_style: parsed.writing_style || '',
      keywords: parsed.keywords || [],
      emotional_keywords: parsed.emotional_keywords || [],
      hashtags: parsed.hashtags || [],
      emoji_usage: parsed.emoji_usage || '',
      visual_style: parsed.visual_style || '',
      target_audience: parsed.target_audience || '',
      content_suggestions: parsed.content_suggestions || [],
      brand_personality: parsed.brand_personality || '',
    }

    return { success: true, style }
  } catch (error) {
    console.error('Style extraction error:', error)
    return {
      success: false,
      style: null,
      error: error instanceof Error ? error.message : '스타일 추출 실패',
    }
  }
}

/**
 * AdvancedProfile을 레거시 형식으로 변환 (하위 호환성)
 */
export function toLegacyProfile(profile: AdvancedProfile): LegacyProfile {
  return {
    summary: `${profile.facts.business_name}은(는) ${profile.facts.category} 업종으로, ${profile.style.brand_personality || profile.style.tone}의 브랜드입니다.`,
    keywords: [...profile.style.keywords, ...profile.style.hashtags].slice(0, 20),
    tone: profile.style.tone,
    reviews_summary: profile.facts.review_highlights.join(', '),
    menu_highlights: profile.facts.menus.slice(0, 5).map(m => m.name),
    unique_selling_points: profile.facts.unique_features,
    target_audience_insights: profile.style.target_audience,
    content_suggestions: profile.style.content_suggestions,
    instagram_style: profile.style.visual_style,
    synced_at: profile.meta.synced_at,
    sources: profile.meta.sources,
  }
}

/**
 * 진행 상태 메시지 생성
 */
export function getProgressMessage(step: number): string {
  const messages = [
    'AI가 데이터를 수집하고 있습니다...',
    '네이버 플레이스 정보를 읽고 있습니다...',
    '고객 리뷰를 분석하고 있습니다...',
    '인스타그램 피드를 살펴보고 있습니다...',
    '웹사이트 콘텐츠를 확인하고 있습니다...',
    'Fact(사실) 데이터를 추출하고 있습니다...',
    'Style(스타일) 데이터를 분석하고 있습니다...',
    '톤앤매너와 감성 키워드를 정리하고 있습니다...',
    '최종 프로필을 생성하고 있습니다...',
  ]
  return messages[step % messages.length]
}
