/**
 * Apify 크롤링 서비스
 * 네이버 플레이스, 인스타그램, 웹사이트에서 데이터 수집
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN

interface ApifyRunResult {
  success: boolean
  data: any
  error?: string
}

/**
 * Apify Actor 실행 및 결과 대기
 */
async function runApifyActor(actorId: string, input: object): Promise<ApifyRunResult> {
  if (!APIFY_API_TOKEN) {
    return { success: false, data: null, error: 'APIFY_API_TOKEN이 설정되지 않았습니다.' }
  }

  try {
    // Actor ID 포맷 변환 (username/actorname -> username~actorname)
    const validActorId = actorId.replace('/', '~')

    // Actor 실행 시작
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${validActorId}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    )

    if (!runResponse.ok) {
      const error = await runResponse.text()
      return { success: false, data: null, error: `Actor 실행 실패: ${error}` }
    }

    const runData = await runResponse.json()
    const runId = runData.data?.id

    if (!runId) {
      return { success: false, data: null, error: 'Run ID를 받지 못했습니다.' }
    }

    // 완료까지 대기 (최대 5분 - Puppeteer는 시간이 오래 걸림)
    const maxWaitTime = 300000
    const pollInterval = 5000
    let elapsed = 0

    while (elapsed < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      elapsed += pollInterval

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      )
      const statusData = await statusResponse.json()
      const status = statusData.data?.status

      if (status === 'SUCCEEDED') {
        // 결과 데이터 가져오기
        const datasetId = statusData.data?.defaultDatasetId
        if (datasetId) {
          const dataResponse = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
          )
          const items = await dataResponse.json()
          return { success: true, data: items }
        }
        return { success: true, data: [] }
      } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        return { success: false, data: null, error: `Actor 실행 실패: ${status}` }
      }
    }

    return { success: false, data: null, error: '시간 초과' }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }
  }
}


// 네이버 플레이스 크롤링 결과 타입 (모든 필드 포함)
export interface NaverPlaceData {
  // 기본 정보
  name?: string
  category?: string
  address?: string
  roadAddress?: string      // 도로명 주소
  phone?: string
  description?: string
  businessHours?: string

  // 평점 및 리뷰
  rating?: number
  reviewCount?: number
  visitorReviewCount?: number  // 방문자 리뷰 수
  blogReviewCount?: number     // 블로그 리뷰 수

  // 리뷰 상세
  reviews?: {
    text: string
    rating?: number
    date?: string
    nickname?: string
    visitCount?: number
  }[]

  // 메뉴/상품
  menu?: {
    name: string
    price?: string
    description?: string
    isPopular?: boolean
    images?: string[]
  }[]

  // 이미지
  images?: string[]
  thumbnailUrl?: string

  // 위치 정보
  latitude?: number
  longitude?: number
  mapUrl?: string
  placeUrl?: string          // 네이버 플레이스 URL

  // 편의시설 및 특징
  facilities?: string[]      // 편의시설 (주차, 와이파이 등)
  keywords?: string[]        // 태그/키워드
  options?: string[]         // 옵션 (예약, 포장 등)

  // 영업 정보
  openingStatus?: string     // 현재 영업 상태
  priceRange?: string        // 가격대

  // 기타
  bookingUrl?: string        // 예약 URL
  orderUrl?: string          // 주문 URL
  homepageUrl?: string       // 홈페이지
  blogUrl?: string           // 블로그

  // Raw 데이터 (파싱되지 않은 추가 정보)
  rawData?: any
}

/**
 * 네이버 플레이스 크롤링
 * 검색어(상호명) 기반으로 네이버 맵에서 데이터 수집
 * @param keyword 상호명 (예: "GnB어학원 고촌캠퍼스")
 */
export async function scrapeNaverPlace(keyword: string): Promise<{
  success: boolean
  data: NaverPlaceData | null
  error?: string
}> {
  if (!APIFY_API_TOKEN) {
    return {
      success: false,
      data: null,
      error: 'APIFY_API_TOKEN이 설정되지 않았습니다.'
    }
  }

  if (!keyword || keyword.trim().length < 2) {
    return {
      success: false,
      data: null,
      error: '상호명을 2글자 이상 입력해주세요.'
    }
  }

  try {
    console.log('[NaverPlace] 검색어:', keyword)

    // 네이버 맵 전용 Actor 사용 - keywords는 배열로 전달
    const result = await runApifyActor('delicious_zebu/naver-map-search-results-scraper', {
      keywords: [keyword.trim()],
    })

    console.log('[NaverPlace] Apify 원본 결과:', JSON.stringify(result, null, 2))

    if (!result.success) {
      return { success: false, data: null, error: result.error }
    }

    if (!result.data || result.data.length === 0) {
      return { success: false, data: null, error: `"${keyword}"에 대한 검색 결과가 없습니다. 정확한 상호명을 입력해주세요.` }
    }

    const item = result.data[0]
    console.log('[NaverPlace] 첫 번째 결과 키:', Object.keys(item))

    // 헬퍼 함수: 여러 필드명 중 값이 있는 것 반환
    const getField = (...keys: string[]) => {
      for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
          return item[key]
        }
      }
      return undefined
    }

    // 리뷰 파싱 (최대 30개)
    const rawReviews = getField('Reviews', 'reviews', 'VisitorReviews', 'visitorReviews') || []
    const reviews = rawReviews.slice(0, 30).map((r: any) => ({
      text: r.Content || r.ReviewTitle || r.text || r.body || r.content || r.review || '',
      rating: r.Rating || r.rating || r.score || null,
      date: r.Date || r.date || r.visitDate || r.createdAt || null,
      nickname: r.Nickname || r.nickname || r.author || r.userName || null,
      visitCount: r.VisitCount || r.visitCount || null,
    })).filter((r: any) => r.text) // 빈 리뷰 제거

    // 메뉴 파싱 (최대 30개)
    const rawMenus = getField('MenuItems', 'Menus', 'menus', 'menuItems', 'Menu', 'menu') || []
    const menu = rawMenus.slice(0, 30).map((m: any) => ({
      name: m.name || m.Name || m.menuName || m.title || '',
      price: m.price || m.Price || m.menuPrice || '',
      description: m.description || m.Description || m.menuDescription || '',
      isPopular: m.isPopular || m.IsPopular || m.popular || m.isRecommend || false,
      images: m.images || m.Images || m.imageUrls || [],
    })).filter((m: any) => m.name) // 빈 메뉴 제거

    // 이미지 파싱
    const images = getField('Images', 'images', 'ImageUrls', 'imageUrls', 'photos', 'Photos') || []
    const imageUrls = Array.isArray(images)
      ? images.map((img: any) => typeof img === 'string' ? img : (img.url || img.imageUrl || img.src || '')).filter(Boolean)
      : []

    // 편의시설 파싱
    const rawFacilities = getField('Facilities', 'facilities', 'Amenities', 'amenities', 'Options', 'options') || []
    const facilities = Array.isArray(rawFacilities)
      ? rawFacilities.map((f: any) => typeof f === 'string' ? f : (f.name || f.title || '')).filter(Boolean)
      : typeof rawFacilities === 'string' ? rawFacilities.split(',').map((s: string) => s.trim()) : []

    // 키워드/태그 파싱
    const rawKeywords = getField('Keywords', 'keywords', 'Tags', 'tags', 'Hashtags', 'hashtags') || []
    const keywords = Array.isArray(rawKeywords)
      ? rawKeywords.map((k: any) => typeof k === 'string' ? k : (k.name || k.tag || '')).filter(Boolean)
      : typeof rawKeywords === 'string' ? rawKeywords.split(',').map((s: string) => s.trim()) : []

    // 전체 데이터 구성
    const data: NaverPlaceData = {
      // 기본 정보
      name: getField('Name', 'name', 'placeName', 'PlaceName', 'title', 'Title') || '',
      category: getField('Category', 'category', 'businessCategory', 'BusinessCategory', 'type') || '',
      address: getField('Address', 'address', 'fullAddress', 'FullAddress', 'jibunAddress') || '',
      roadAddress: getField('RoadAddress', 'roadAddress', 'road_address') || '',
      phone: getField('Contact', 'Phone', 'phone', 'tel', 'Tel', 'telephone', 'phoneNumber') || '',
      description: getField('Description', 'description', 'intro', 'Intro', 'about', 'About') || '',
      businessHours: getField('BusinessHours', 'businessHours', 'openingHours', 'OpeningHours', 'operationTime', 'workingHours') || '',

      // 평점 및 리뷰
      rating: parseFloat(getField('OverallRating', 'Rating', 'rating', 'score', 'Score', 'averageRating')) || undefined,
      reviewCount: parseInt(getField('ReviewCount', 'reviewCount', 'totalReviews', 'TotalReviews')) || 0,
      visitorReviewCount: parseInt(getField('VisitorReviewCount', 'visitorReviewCount', 'visitorReviews')) || undefined,
      blogReviewCount: parseInt(getField('BlogReviewCount', 'blogReviewCount', 'blogReviews')) || undefined,

      // 리뷰 상세
      reviews,

      // 메뉴/상품
      menu,

      // 이미지
      images: imageUrls.slice(0, 20), // 최대 20개
      thumbnailUrl: getField('ThumbnailUrl', 'thumbnailUrl', 'thumbnail', 'Thumbnail', 'mainImage', 'imageUrl') || imageUrls[0] || '',

      // 위치 정보
      latitude: parseFloat(getField('Latitude', 'latitude', 'lat', 'Lat', 'y')) || undefined,
      longitude: parseFloat(getField('Longitude', 'longitude', 'lng', 'Lng', 'lon', 'x')) || undefined,
      mapUrl: getField('MapUrl', 'mapUrl', 'naverMapUrl') || '',
      placeUrl: getField('PlaceUrl', 'placeUrl', 'url', 'Url', 'link', 'Link', 'naverPlaceUrl') || '',

      // 편의시설 및 특징
      facilities,
      keywords,
      options: getField('ServiceOptions', 'serviceOptions', 'services') || [],

      // 영업 정보
      openingStatus: getField('OpeningStatus', 'openingStatus', 'isOpen', 'status', 'Status') || '',
      priceRange: getField('PriceRange', 'priceRange', 'price', 'priceLevel') || '',

      // 기타 URL
      bookingUrl: getField('BookingUrl', 'bookingUrl', 'reservationUrl', 'booking') || '',
      orderUrl: getField('OrderUrl', 'orderUrl', 'deliveryUrl', 'order') || '',
      homepageUrl: getField('HomepageUrl', 'homepageUrl', 'homepage', 'Homepage', 'website', 'Website') || '',
      blogUrl: getField('BlogUrl', 'blogUrl', 'blog', 'Blog') || '',

      // Raw 데이터 저장 (파싱되지 않은 필드 확인용)
      rawData: item,
    }

    console.log('[NaverPlace] 파싱 완료:', {
      name: data.name,
      category: data.category,
      reviewCount: data.reviewCount,
      menuCount: data.menu?.length || 0,
      imageCount: data.images?.length || 0,
      facilitiesCount: data.facilities?.length || 0,
    })

    return { success: true, data }
  } catch (error) {
    console.error('[NaverPlace] 오류:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : '네이버 플레이스 크롤링 실패',
    }
  }
}

/**
 * 인스타그램 프로필 크롤링
 * Actor: apify/instagram-scraper
 */
export async function scrapeInstagram(url: string): Promise<{
  success: boolean
  data: {
    username?: string
    fullName?: string
    bio?: string
    followersCount?: number
    postsCount?: number
    recentPosts?: { caption: string; likesCount?: number; commentsCount?: number; imageUrl?: string }[]
  } | null
  error?: string
}> {
  // 인스타그램 URL에서 username 추출
  const usernameMatch = url.match(/instagram\.com\/([^\/\?]+)/)
  if (!usernameMatch) {
    return { success: false, data: null, error: '유효한 인스타그램 URL이 아닙니다.' }
  }

  const username = usernameMatch[1]

  const result = await runApifyActor('apify/instagram-scraper', {
    directUrls: [url],
    resultsType: 'posts',
    resultsLimit: 20,
    addParentData: true,
  })

  if (!result.success) {
    return { success: false, data: null, error: result.error }
  }

  const posts = result.data || []
  const firstPost = posts[0] || {}

  return {
    success: true,
    data: {
      username,
      fullName: firstPost.ownerFullName,
      bio: firstPost.ownerBio,
      followersCount: firstPost.ownerFollowers,
      postsCount: firstPost.ownerPostsCount,
      recentPosts: posts.slice(0, 20).map((p: any) => ({
        caption: p.caption || '',
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        imageUrl: p.displayUrl,
      })),
    },
  }
}

/**
 * 웹사이트 크롤링
 * Actor: apify/website-content-crawler
 */
export async function scrapeWebsite(url: string): Promise<{
  success: boolean
  data: {
    title?: string
    texts?: string[]
    links?: string[]
    metadata?: {
      description?: string
      keywords?: string
    }
  } | null
  error?: string
}> {
  const result = await runApifyActor('apify/website-content-crawler', {
    startUrls: [{ url }],
    maxCrawlPages: 10,
    maxCrawlDepth: 2,
    proxyConfiguration: { useApifyProxy: true },
  })

  if (!result.success) {
    return { success: false, data: null, error: result.error }
  }

  const pages = result.data || []
  const allTexts: string[] = []
  let mainTitle = ''
  let mainDescription = ''

  pages.forEach((page: any) => {
    if (!mainTitle && page.title) mainTitle = page.title
    if (!mainDescription && page.metadata?.description) mainDescription = page.metadata.description
    if (page.text) allTexts.push(page.text.substring(0, 2000)) // 각 페이지 텍스트 제한
  })

  return {
    success: true,
    data: {
      title: mainTitle,
      texts: allTexts.slice(0, 5), // 최대 5페이지
      metadata: {
        description: mainDescription,
      },
    },
  }
}

/**
 * 간단한 웹 스크래핑 (Apify 없이 직접)
 * 무료 대안으로 사용
 */
export async function simpleScrape(url: string): Promise<{
  success: boolean
  data: {
    title?: string
    description?: string
    text?: string
  } | null
  error?: string
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` }
    }

    const html = await response.text()

    // 간단한 HTML 파싱
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)

    // 본문 텍스트 추출 (태그 제거)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000)

    return {
      success: true,
      data: {
        title: titleMatch?.[1]?.trim(),
        description: descriptionMatch?.[1]?.trim(),
        text: textContent,
      },
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : '스크래핑 실패',
    }
  }
}
