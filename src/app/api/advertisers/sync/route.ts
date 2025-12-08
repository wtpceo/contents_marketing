import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  scrapeNaverPlace,
  scrapeInstagram,
  scrapeWebsite,
  simpleScrape,
} from '@/lib/apify/client'
import { analyzeAndRefine, AdvancedProfile, FactData, toLegacyProfile } from '@/lib/apify/analyzer'

/**
 * POST /api/advertisers/sync
 * 광고주 외부 링크에서 데이터를 크롤링하고 AI로 분석하여 프로필 업데이트
 *
 * Request Body:
 * {
 *   "advertiser_id": "uuid",
 *   "naver_url": "https://naver.me/xxx",
 *   "instagram_url": "https://instagram.com/xxx",
 *   "website_url": "https://example.com",
 *   "rebranding_mode": false,           // 리브랜딩 모드
 *   "benchmark_url": "https://instagram.com/benchmark_brand"  // 벤치마킹 URL
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const body = await request.json()
  // 프론트엔드 필드명 호환 (insta_url, home_url도 지원)
  const {
    advertiser_id,
    naver_url,
    instagram_url,
    insta_url,      // 프론트엔드 호환
    website_url,
    home_url,       // 프론트엔드 호환
    rebranding_mode = false,  // 리브랜딩 모드
    benchmark_url,            // 벤치마킹(워너비) URL
  } = body

  // 실제 사용할 URL (둘 중 하나라도 있으면 사용)
  const finalInstagramUrl = instagram_url || insta_url
  const finalWebsiteUrl = website_url || home_url

  if (!advertiser_id) {
    return NextResponse.json({ error: 'advertiser_id는 필수입니다.' }, { status: 400 })
  }

  // 리브랜딩 모드에서는 벤치마킹 URL이 필수
  if (rebranding_mode && !benchmark_url) {
    return NextResponse.json(
      { error: '리브랜딩 모드에서는 벤치마킹 URL이 필요합니다.' },
      { status: 400 }
    )
  }

  // 최소 하나의 URL이 있어야 함 (리브랜딩 모드가 아닌 경우)
  if (!rebranding_mode && !naver_url && !finalInstagramUrl && !finalWebsiteUrl) {
    return NextResponse.json(
      { error: '최소 하나의 URL을 입력해주세요.' },
      { status: 400 }
    )
  }

  // 광고주 조회 및 소유권 확인
  const { data: advertiser, error: advError } = await supabase
    .from('advertisers')
    .select('*')
    .eq('id', advertiser_id)
    .eq('user_id', user.id)
    .single()

  if (advError || !advertiser) {
    return NextResponse.json({ error: '광고주를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 동기화 상태 업데이트: syncing
  await supabase
    .from('advertisers')
    .update({
      sync_status: 'syncing',
      naver_place_url: naver_url || advertiser.naver_place_url,
      instagram_url: finalInstagramUrl || advertiser.instagram_url,
      website_url: finalWebsiteUrl || advertiser.website_url,
    })
    .eq('id', advertiser_id);

  // 백그라운드 작업 시작 (Fire-and-forget)
  (async () => {
    try {
      // 크롤링 데이터 수집
      const crawledData: {
        naver?: any
        instagram?: any
        website?: any
      } = {}

      // 벤치마킹 데이터 (리브랜딩 모드용)
      let benchmarkData: { instagram?: any } = {}

      const errors: string[] = []
      const crawlPromises: Promise<void>[] = []

      // 1. 네이버 플레이스 크롤링
      if (naver_url) {
        crawlPromises.push((async () => {
          console.log('[Sync] 네이버 플레이스 크롤링 시작:', naver_url)

          if (process.env.APIFY_API_TOKEN) {
            const naverResult = await scrapeNaverPlace(naver_url)
            if (naverResult.success && naverResult.data) {
              crawledData.naver = naverResult.data
            } else {
              errors.push(`네이버: ${naverResult.error}`)
            }
          } else {
            const simpleResult = await simpleScrape(naver_url)
            if (simpleResult.success && simpleResult.data) {
              crawledData.naver = {
                name: simpleResult.data.title,
                description: simpleResult.data.description || simpleResult.data.text?.substring(0, 500),
              }
            }
          }
        })())
      }

      // 2. 인스타그램 크롤링 (내 계정)
      if (finalInstagramUrl && !rebranding_mode) {
        crawlPromises.push((async () => {
          console.log('[Sync] 인스타그램 크롤링 시작:', finalInstagramUrl)

          if (process.env.APIFY_API_TOKEN) {
            const instaResult = await scrapeInstagram(finalInstagramUrl)
            if (instaResult.success && instaResult.data) {
              crawledData.instagram = instaResult.data
            } else {
              errors.push(`인스타그램: ${instaResult.error}`)
            }
          } else {
            errors.push('인스타그램 크롤링에는 Apify API가 필요합니다.')
          }
        })())
      }

      // 3. 웹사이트 크롤링
      if (finalWebsiteUrl) {
        crawlPromises.push((async () => {
          console.log('[Sync] 웹사이트 크롤링 시작:', finalWebsiteUrl)

          if (process.env.APIFY_API_TOKEN) {
            const webResult = await scrapeWebsite(finalWebsiteUrl)
            if (webResult.success && webResult.data) {
              crawledData.website = webResult.data
            } else {
              errors.push(`웹사이트: ${webResult.error}`)
            }
          } else {
            const simpleResult = await simpleScrape(finalWebsiteUrl)
            if (simpleResult.success && simpleResult.data) {
              crawledData.website = {
                title: simpleResult.data.title,
                description: simpleResult.data.description,
                texts: simpleResult.data.text ? [simpleResult.data.text] : [],
              }
            }
          }
        })())
      }

      // 4. 벤치마킹 URL 크롤링 (리브랜딩 모드)
      if (rebranding_mode && benchmark_url) {
        crawlPromises.push((async () => {
          console.log('[Sync] 벤치마킹 크롤링 시작:', benchmark_url)

          if (process.env.APIFY_API_TOKEN) {
            // 인스타그램 URL인 경우
            if (benchmark_url.includes('instagram.com')) {
              const benchResult = await scrapeInstagram(benchmark_url)
              if (benchResult.success && benchResult.data) {
                benchmarkData.instagram = benchResult.data
              } else {
                errors.push(`벤치마킹: ${benchResult.error}`)
              }
            }
            // 블로그/웹사이트인 경우
            else {
              const benchResult = await scrapeWebsite(benchmark_url)
              if (benchResult.success && benchResult.data) {
                // 웹사이트 데이터를 인스타그램 형식에 맞게 변환
                benchmarkData.instagram = {
                  bio: benchResult.data.metadata?.description || benchResult.data.title,
                  recentPosts: benchResult.data.texts?.map(text => ({
                    caption: text.substring(0, 500)
                  })) || []
                }
              } else {
                errors.push(`벤치마킹: ${benchResult.error}`)
              }
            }
          } else {
            errors.push('벤치마킹 크롤링에는 Apify API가 필요합니다.')
          }
        })())
      }

      // 모든 크롤링 병렬 실행
      await Promise.all(crawlPromises)

      // 리브랜딩 모드: Fact 데이터가 없고 벤치마킹 데이터도 없으면 실패
      if (rebranding_mode) {
        if (!benchmarkData.instagram) {
          await supabase
            .from('advertisers')
            .update({ sync_status: 'failed' })
            .eq('id', advertiser_id)

          console.error('[Sync] 벤치마킹 데이터 수집 실패:', errors)
          return
        }
      } else {
        // 일반 모드: 크롤링된 데이터가 없으면 실패
        if (!crawledData.naver && !crawledData.instagram && !crawledData.website) {
          await supabase
            .from('advertisers')
            .update({ sync_status: 'failed' })
            .eq('id', advertiser_id)

          console.error('[Sync] 데이터 수집 실패:', errors)
          return
        }
      }

      // 5. AI 분석 및 정제
      console.log('[Sync] AI 분석 시작 (리브랜딩 모드:', rebranding_mode, ')')

      // 기존 프로필에서 Fact 데이터 추출 (리브랜딩 시 유지)
      const existingProfile = advertiser.advanced_profile || {}
      const existingFacts: FactData | undefined = rebranding_mode && existingProfile.facts
        ? existingProfile.facts
        : undefined

      const analysisResult = await analyzeAndRefine(
        advertiser.name,
        advertiser.industry,
        crawledData,
        {
          rebrandingMode: rebranding_mode,
          benchmarkData: benchmarkData,
          benchmarkUrl: benchmark_url,
          existingFacts: existingFacts,
        }
      )

      if (!analysisResult.success || !analysisResult.profile) {
        await supabase
          .from('advertisers')
          .update({ sync_status: 'failed' })
          .eq('id', advertiser_id)

        console.error('[Sync] AI 분석 실패:', analysisResult.error)
        return
      }

      // 6. 프로필 병합 로직
      const newProfile = analysisResult.profile

      // 기존 프로필과 새 프로필 병합
      const mergeArrays = (existing: string[] = [], incoming: string[] = []): string[] => {
        const combined = [...existing, ...incoming]
        return [...new Set(combined)] // 중복 제거
      }

      // Fact 데이터 병합 (리브랜딩 모드에서는 기존 Fact 유지)
      const mergedFacts = rebranding_mode && existingProfile.facts
        ? existingProfile.facts
        : {
          ...newProfile.facts,
          // 기존 Fact와 새 Fact 병합 (배열 필드)
          menus: newProfile.facts.menus?.length > 0
            ? newProfile.facts.menus
            : existingProfile.facts?.menus || [],
          facilities: mergeArrays(
            existingProfile.facts?.facilities,
            newProfile.facts.facilities
          ).slice(0, 10),
          review_highlights: mergeArrays(
            existingProfile.facts?.review_highlights,
            newProfile.facts.review_highlights
          ).slice(0, 10),
          unique_features: mergeArrays(
            existingProfile.facts?.unique_features,
            newProfile.facts.unique_features
          ).slice(0, 10),
        }

      // Style 데이터는 항상 새 것으로 (리브랜딩 모드에서는 벤치마킹 스타일)
      const mergedStyle = {
        ...newProfile.style,
        // 키워드/해시태그는 축적 (리브랜딩 모드가 아닌 경우)
        keywords: rebranding_mode
          ? newProfile.style.keywords
          : mergeArrays(existingProfile.style?.keywords, newProfile.style.keywords).slice(0, 20),
        hashtags: rebranding_mode
          ? newProfile.style.hashtags
          : mergeArrays(existingProfile.style?.hashtags, newProfile.style.hashtags).slice(0, 15),
        content_suggestions: mergeArrays(
          existingProfile.style?.content_suggestions,
          newProfile.style.content_suggestions
        ).slice(0, 10),
      }

      const mergedProfile: AdvancedProfile = {
        facts: mergedFacts,
        style: mergedStyle,
        meta: {
          synced_at: new Date().toISOString(),
          sync_count: (existingProfile.meta?.sync_count || 0) + 1,
          is_rebranded: rebranding_mode,
          rebranding_source: rebranding_mode ? benchmark_url : existingProfile.meta?.rebranding_source,
          sources: newProfile.meta.sources,
        },
      }

      // 레거시 필드를 위한 변환
      const legacyProfile = toLegacyProfile(mergedProfile)

      // 7. DB 업데이트
      const { error: updateError } = await supabase
        .from('advertisers')
        .update({
          advanced_profile: mergedProfile,
          sync_status: 'completed',
          last_synced_at: new Date().toISOString(),
          // 레거시 필드 업데이트
          brand_keywords: mergedStyle.keywords?.slice(0, 10),
          target_audience: mergedStyle.target_audience || advertiser.target_audience,
          detailed_info: legacyProfile.summary || advertiser.detailed_info,
        })
        .eq('id', advertiser_id)

      if (updateError) {
        console.error('[Sync] DB 업데이트 실패:', updateError)
      } else {
        console.log('[Sync] 동기화 완료:', advertiser_id, rebranding_mode ? '(리브랜딩)' : '')
      }

    } catch (error) {
      console.error('[Sync] 오류:', error)
      await supabase
        .from('advertisers')
        .update({ sync_status: 'failed' })
        .eq('id', advertiser_id)
    }
  })();

  return NextResponse.json({
    success: true,
    status: 'processing',
    message: rebranding_mode
      ? '리브랜딩 분석이 시작되었습니다. 스타일이 새로 설정됩니다.'
      : '분석이 시작되었습니다. 잠시만 기다려주세요.'
  })
}

/**
 * GET /api/advertisers/sync?advertiser_id=xxx
 * 동기화 상태 조회
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const advertiserId = searchParams.get('advertiser_id')

  if (!advertiserId) {
    return NextResponse.json({ error: 'advertiser_id가 필요합니다.' }, { status: 400 })
  }

  const { data: advertiser, error } = await supabase
    .from('advertisers')
    .select('id, name, sync_status, last_synced_at, advanced_profile')
    .eq('id', advertiserId)
    .eq('user_id', user.id)
    .single()

  if (error || !advertiser) {
    return NextResponse.json({ error: '광고주를 찾을 수 없습니다.' }, { status: 404 })
  }

  const profile = advertiser.advanced_profile || {}

  return NextResponse.json({
    id: advertiser.id,
    name: advertiser.name,
    status: advertiser.sync_status,  // 프론트엔드 호환 (status)
    sync_status: advertiser.sync_status,
    last_synced_at: advertiser.last_synced_at,
    has_profile: !!profile && Object.keys(profile).length > 0,
    is_rebranded: profile.meta?.is_rebranded || false,
    rebranding_source: profile.meta?.rebranding_source,
    profile: profile,
    advanced_profile: profile, // 프론트엔드 호환
    // Fact/Style 분리 데이터
    facts: profile.facts,
    style: profile.style,
  })
}
