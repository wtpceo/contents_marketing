-- =====================================================
-- 광고주 스마트 임포트 (Apify 연동) 스키마
-- AI가 외부 링크에서 정보를 크롤링하여 프로필 완성
-- =====================================================

-- 1. 외부 링크 컬럼 추가
ALTER TABLE public.advertisers
ADD COLUMN IF NOT EXISTS naver_place_url TEXT;

ALTER TABLE public.advertisers
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

ALTER TABLE public.advertisers
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- 2. AI 분석 결과 저장용 JSONB 컬럼
-- {
--   "summary": "30대 여성을 타겟으로 하는 감성 카페...",
--   "keywords": ["크로플맛집", "햇살맛집"],
--   "tone": "soft & emotional",
--   "reviews_summary": "주차가 불편하지만 커피 맛은 최고라는 평...",
--   "menu_highlights": ["시그니처 크로플", "아메리카노"],
--   "unique_selling_points": ["인테리어가 예쁨", "사진 찍기 좋음"],
--   "target_audience_insights": "20-30대 여성, 데이트 코스로 인기",
--   "content_suggestions": ["계절 메뉴 소개", "매장 인테리어 투어"],
--   "synced_at": "2025-12-08T10:30:00Z",
--   "sources": {
--     "naver": { "synced_at": "...", "reviews_count": 150 },
--     "instagram": { "synced_at": "...", "posts_analyzed": 20 },
--     "website": { "synced_at": "...", "pages_crawled": 5 }
--   }
-- }
ALTER TABLE public.advertisers
ADD COLUMN IF NOT EXISTS advanced_profile JSONB DEFAULT '{}';

-- 3. 동기화 상태 추적
ALTER TABLE public.advertisers
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'none'; -- 'none' | 'syncing' | 'completed' | 'failed'

ALTER TABLE public.advertisers
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_advertisers_advanced_profile ON public.advertisers USING GIN (advanced_profile);

-- 5. 코멘트 추가
COMMENT ON COLUMN public.advertisers.naver_place_url IS '네이버 플레이스 URL';
COMMENT ON COLUMN public.advertisers.instagram_url IS '인스타그램 프로필 URL';
COMMENT ON COLUMN public.advertisers.website_url IS '공식 홈페이지 URL';
COMMENT ON COLUMN public.advertisers.advanced_profile IS 'AI 분석 결과 (크롤링 데이터 요약)';
COMMENT ON COLUMN public.advertisers.sync_status IS '동기화 상태: none, syncing, completed, failed';
COMMENT ON COLUMN public.advertisers.last_synced_at IS '마지막 동기화 시간';
