-- =====================================================
-- WCE OSMU (One Source Multi Use) Schema Migration
-- 기획 → OSMU 생성 → 제작 워크플로우 지원
-- =====================================================

-- =====================================================
-- 1. channel_type ENUM 확장 (threads 추가)
-- =====================================================

-- 기존 channel_type에 threads 추가
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'threads';

-- =====================================================
-- 2. topic_status ENUM 생성
-- =====================================================

DO $$ BEGIN
  CREATE TYPE topic_status AS ENUM (
    'planning',    -- 기획중 (캘린더에 배치만 됨)
    'approved',    -- 컨펌 완료 (콘텐츠 생성 대기)
    'generating',  -- AI 콘텐츠 생성 중
    'completed',   -- OSMU 생성 완료
    'cancelled'    -- 취소됨
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 3. topics 테이블 (기획안)
-- =====================================================

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,

  -- 기획 정보
  title TEXT NOT NULL,                    -- 주제/제목
  description TEXT,                       -- 추가 설명
  scheduled_date DATE NOT NULL,           -- 예정 날짜

  -- OSMU 설정
  channels TEXT[] DEFAULT '{"blog"}',     -- 생성할 채널 목록 ["blog", "instagram", "threads"]

  -- 출처 정보 (트렌드/시즌에서 가져온 경우)
  source TEXT DEFAULT 'manual',           -- 'manual' | 'trend' | 'season'
  source_data JSONB,                      -- 원본 트렌드/시즌 데이터

  -- 상태
  status topic_status DEFAULT 'planning' NOT NULL,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 4. contents 테이블에 topic_id 추가
-- =====================================================

-- topic_id 컬럼 추가 (기획안과 연결)
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;

-- =====================================================
-- 5. advertisers 테이블 확장
-- =====================================================

-- enabled_channels: 광고주별 활성화된 채널
ALTER TABLE advertisers
  ADD COLUMN IF NOT EXISTS enabled_channels TEXT[] DEFAULT '{"blog_naver"}';

-- location: 위치 정보
ALTER TABLE advertisers
  ADD COLUMN IF NOT EXISTS location TEXT;

-- competitors: 경쟁사 정보
ALTER TABLE advertisers
  ADD COLUMN IF NOT EXISTS competitors TEXT;

-- detailed_info: 상세 특징 (LLM용)
ALTER TABLE advertisers
  ADD COLUMN IF NOT EXISTS detailed_info TEXT;

-- =====================================================
-- 6. INDEXES
-- =====================================================

-- topics 조회 최적화
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_advertiser_id ON topics(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_topics_scheduled_date ON topics(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);

-- 캘린더 뷰 최적화 (년/월별 조회)
CREATE INDEX IF NOT EXISTS idx_topics_calendar ON topics(user_id, scheduled_date);

-- contents와 topic 연결 최적화
CREATE INDEX IF NOT EXISTS idx_contents_topic_id ON contents(topic_id);

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- topics updated_at 트리거
DROP TRIGGER IF EXISTS update_topics_updated_at ON topics;
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON topics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- RLS 활성화
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Topics 정책
DROP POLICY IF EXISTS "Users can view own topics" ON topics;
CREATE POLICY "Users can view own topics"
  ON topics FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own topics" ON topics;
CREATE POLICY "Users can insert own topics"
  ON topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own topics" ON topics;
CREATE POLICY "Users can update own topics"
  ON topics FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own topics" ON topics;
CREATE POLICY "Users can delete own topics"
  ON topics FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 9. 완료 메시지
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'OSMU Schema Migration 완료!';
  RAISE NOTICE '- topics 테이블 생성';
  RAISE NOTICE '- contents.topic_id 추가';
  RAISE NOTICE '- advertisers 확장 (enabled_channels, location, competitors, detailed_info)';
  RAISE NOTICE '- channel_type에 threads 추가';
END $$;
