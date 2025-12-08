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

    // 완료까지 대기 (최대 2분)
    const maxWaitTime = 120000
    const pollInterval = 3000
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

async function resolveRedirect(url: string): Promise<string> {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    return response.url
  } catch (e) {
    return url
  }
}

/**
 * 네이버 플레이스 크롤링
 * Actor: apify/naver-map-scraper (예시 - 실제 Actor ID로 교체 필요)
 */
export async function scrapeNaverPlace(url: string): Promise<{
  success: boolean
  data: {
    name?: string
    category?: string
    address?: string
    phone?: string
    description?: string
    reviews?: { text: string; rating?: number }[]
    menu?: { name: string; price?: string }[]
    images?: string[]
    businessHours?: string
    rating?: number
    reviewCount?: number
  } | null
  error?: string
}> {
  // 1. 단축 URL 처리 (naver.me)
  let targetUrl = url
  if (url.includes('naver.me')) {
    targetUrl = await resolveRedirect(url)
  }

  // 2. URL 유효성 검사 및 ID 추출
  // https://map.naver.com/p/entry/place/12345678...
  const placeIdMatch = targetUrl.match(/place\/(\d+)/) || targetUrl.match(/restaurant\/(\d+)/)
  if (!placeIdMatch) {
    return {
      success: false,
      data: null,
      error: '유효한 네이버 플레이스 URL이 아닙니다. (예: https://map.naver.com/p/entry/place/번호...)'
    }
  }

  const placeId = placeIdMatch[1]

  // Web Scraper Actor 사용 (범용)
  // 실제 프로덕션에서는 네이버 전용 Actor 사용 권장
  const result = await runApifyActor('apify/web-scraper', {
    startUrls: [{ url: targetUrl }],
    pageFunction: `async function pageFunction(context) {
      const { $, request } = context;

      // 네이버 플레이스 페이지 파싱
      const name = $('span.GHAhO').text() || $('h2.place_name').text();
      const category = $('span.lnJFt').text();
      const address = $('span.LDgIH').text();
      const description = $('div.T8RFa').text();
      const rating = $('span.PXMot em').text();

      // 리뷰 수집
      const reviews = [];
      $('li.pui__X35jYm').each((i, el) => {
        if (i < 30) {
          reviews.push({
            text: $(el).find('a.pui__xtsQN-').text(),
            rating: parseFloat($(el).find('span.pui__IKs9t').text()) || null
          });
        }
      });

      // 메뉴 수집
      const menu = [];
      $('li.E2jtL').each((i, el) => {
        menu.push({
          name: $(el).find('span.lPzHi').text(),
          price: $(el).find('div.GXS1X em').text()
        });
      });

      return {
        url: request.url,
        name,
        category,
        address,
        description,
        rating: parseFloat(rating) || null,
        reviews,
        menu
      };
    }`,
    proxyConfiguration: { useApifyProxy: true },
    maxConcurrency: 1,
  })

  if (!result.success) {
    return { success: false, data: null, error: result.error }
  }

  const item = result.data?.[0] || {}
  return {
    success: true,
    data: {
      name: item.name,
      category: item.category,
      address: item.address,
      description: item.description,
      reviews: item.reviews || [],
      menu: item.menu || [],
      rating: item.rating,
      reviewCount: item.reviews?.length || 0,
    },
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
