-- =====================================================
-- OSMU 멀티채널 지원을 위한 DB 스키마 변경
-- =====================================================

-- 1. contents 테이블에 channel_data JSONB 컬럼 추가
-- 채널별 콘텐츠를 저장하는 구조
-- {
--   "blog": { "title": "...", "html_body": "..." },
--   "instagram": { "images": [...], "caption": "...", "hashtags": [...] },
--   "threads": { "threads_text": ["...", "..."] }
-- }

ALTER TABLE public.contents
ADD COLUMN IF NOT EXISTS channel_data JSONB DEFAULT '{}';

-- 2. selected_channels 배열 컬럼 추가 (선택된 채널들)
ALTER TABLE public.contents
ADD COLUMN IF NOT EXISTS selected_channels TEXT[] DEFAULT ARRAY['blog_naver'];

-- 3. 인덱스 추가 (JSONB 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_contents_channel_data ON public.contents USING GIN (channel_data);
CREATE INDEX IF NOT EXISTS idx_contents_selected_channels ON public.contents USING GIN (selected_channels);

-- 4. 코멘트 추가
COMMENT ON COLUMN public.contents.channel_data IS 'OSMU: 채널별 콘텐츠 데이터 (blog, instagram, threads)';
COMMENT ON COLUMN public.contents.selected_channels IS 'OSMU: 선택된 채널 목록';
