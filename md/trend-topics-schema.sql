-- =============================================
-- Trend Topics 테이블 스키마
-- 트렌드 콘텐츠 관제 센터용
-- =============================================

CREATE TABLE trend_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 타입: season (시즌 이슈) / realtime (실시간 트렌드)
  type VARCHAR(20) NOT NULL CHECK (type IN ('season', 'realtime')),

  -- 노출 제목
  title TEXT NOT NULL,

  -- 부가 설명 (마케터 팁)
  description TEXT,

  -- 관련 링크 (선택)
  reference_url TEXT,

  -- 시즌 이슈용 날짜 (D-Day 계산용)
  event_date DATE,

  -- 노출 순위 (1이 가장 상단, 낮을수록 높음)
  priority INTEGER DEFAULT 100,

  -- 노출 여부
  is_active BOOLEAN DEFAULT true,

  -- 등록자 (admin)
  created_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_trend_topics_type ON trend_topics(type);
CREATE INDEX idx_trend_topics_priority ON trend_topics(type, priority);
CREATE INDEX idx_trend_topics_active ON trend_topics(is_active);
CREATE INDEX idx_trend_topics_event_date ON trend_topics(event_date);

-- RLS 정책 (모든 로그인 유저 읽기 가능, 생성/수정/삭제는 인증된 유저만)
ALTER TABLE trend_topics ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 유저가 활성화된 트렌드 조회 가능
CREATE POLICY "Anyone can view active trends"
  ON trend_topics FOR SELECT
  USING (is_active = true);

-- 인증된 유저는 모든 트렌드 조회 가능 (관리용)
CREATE POLICY "Authenticated users can view all trends"
  ON trend_topics FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 인증된 유저만 트렌드 생성 가능
CREATE POLICY "Authenticated users can create trends"
  ON trend_topics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 인증된 유저만 트렌드 수정 가능
CREATE POLICY "Authenticated users can update trends"
  ON trend_topics FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- 인증된 유저만 트렌드 삭제 가능
CREATE POLICY "Authenticated users can delete trends"
  ON trend_topics FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 코멘트
COMMENT ON TABLE trend_topics IS '트렌드 토픽 관리 테이블 (시즌 이슈 + 실시간 트렌드)';
COMMENT ON COLUMN trend_topics.type IS 'season: 시즌 이슈, realtime: 실시간 트렌드';
COMMENT ON COLUMN trend_topics.priority IS '노출 순위 (1이 가장 상단)';
COMMENT ON COLUMN trend_topics.event_date IS '시즌 이슈의 경우 D-Day 계산용 날짜';

-- 샘플 데이터 (선택적)
-- INSERT INTO trend_topics (type, title, description, event_date, priority, is_active) VALUES
-- ('season', '크리스마스', '12.25 연말 분위기, 선물/파티/가족 키워드', '2025-12-25', 1, true),
-- ('season', '새해 첫날', '신년 인사, 새해 다짐, 버킷리스트', '2026-01-01', 2, true),
-- ('realtime', '흑백요리사 패러디', '넷플릭스 인기 예능, 요리/경쟁/셰프 관련 밈', NULL, 1, true),
-- ('realtime', '수능 성적 발표', '입시 시즌, 학원/교육 콘텐츠에 활용', NULL, 2, true);
