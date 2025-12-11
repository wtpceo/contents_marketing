-- =============================================
-- Activity Logs 테이블 스키마
-- 광고주 관리 시스템의 활동 로그 기록용
-- =============================================

CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  advertiser_id UUID REFERENCES advertisers(id) ON DELETE CASCADE,
  content_id UUID REFERENCES contents(id) ON DELETE SET NULL,

  -- 액션 타입: content_created, content_sent, content_approved, revision_requested, bulk_created
  action_type VARCHAR(50) NOT NULL,

  -- 액션 설명 (한글)
  description TEXT NOT NULL,

  -- 추가 메타데이터 (JSON)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_advertiser_id ON activity_logs(advertiser_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);

-- RLS 정책
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 코멘트
COMMENT ON TABLE activity_logs IS '사용자 활동 로그 테이블';
COMMENT ON COLUMN activity_logs.action_type IS 'content_created, content_sent, content_approved, revision_requested, bulk_created';
