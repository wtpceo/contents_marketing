-- =====================================================
-- WCE Proposals (기획안 공유) Schema Migration
-- 광고주에게 월간 기획안을 공유하기 위한 제안서 관리
-- =====================================================

-- =====================================================
-- 1. proposal_status ENUM 생성
-- =====================================================

DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM (
    'pending',     -- 대기중 (광고주 확인 전)
    'approved',    -- 승인됨
    'rejected'     -- 반려됨
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. proposals 테이블 (제안서/기획안 공유)
-- =====================================================

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,

  -- 기획안 정보
  target_month TEXT NOT NULL,              -- '2025-12' 형식
  title TEXT,                              -- 제안서 제목 (옵션)
  description TEXT,                        -- 추가 설명 (옵션)

  -- 공유 토큰
  token TEXT NOT NULL UNIQUE,              -- URL-safe unique string

  -- 상태
  status proposal_status DEFAULT 'pending' NOT NULL,

  -- 광고주 응답
  approved_at TIMESTAMPTZ,                 -- 승인 일시
  rejected_at TIMESTAMPTZ,                 -- 반려 일시
  feedback TEXT,                           -- 광고주 피드백

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,                  -- 링크 만료 일시 (옵션)

  -- 유니크 제약조건: 광고주당 월별 하나의 제안서
  UNIQUE(advertiser_id, target_month)
);

-- =====================================================
-- 3. topics 테이블에 planning_intent 컬럼 추가
-- =====================================================

-- planning_intent: 기획 의도 (광고주에게 보여줄 전략적 설명)
ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS planning_intent TEXT;

-- =====================================================
-- 4. INDEXES
-- =====================================================

-- proposals 조회 최적화
CREATE INDEX IF NOT EXISTS idx_proposals_user_id ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_advertiser_id ON proposals(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_proposals_token ON proposals(token);
CREATE INDEX IF NOT EXISTS idx_proposals_target_month ON proposals(target_month);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- proposals updated_at 트리거
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- RLS 활성화
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- 마케터(소유자)는 자신의 proposals 관리 가능
DROP POLICY IF EXISTS "Users can view own proposals" ON proposals;
CREATE POLICY "Users can view own proposals"
  ON proposals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own proposals" ON proposals;
CREATE POLICY "Users can insert own proposals"
  ON proposals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
CREATE POLICY "Users can update own proposals"
  ON proposals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own proposals" ON proposals;
CREATE POLICY "Users can delete own proposals"
  ON proposals FOR DELETE
  USING (auth.uid() = user_id);

-- 토큰으로 공개 조회 허용 (로그인 불필요)
DROP POLICY IF EXISTS "Anyone can view proposals by token" ON proposals;
CREATE POLICY "Anyone can view proposals by token"
  ON proposals FOR SELECT
  USING (true);  -- 토큰 검증은 API에서 처리

-- =====================================================
-- 7. 완료 메시지
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Proposals Schema Migration 완료!';
  RAISE NOTICE '- proposals 테이블 생성';
  RAISE NOTICE '- topics.planning_intent 컬럼 추가';
END $$;
