-- =============================================
-- Notifications 테이블 스키마
-- 내부 알림 센터용
-- =============================================

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- 알림 타입: approve, revision, bulk_complete, report_ready, content_created
  type VARCHAR(50) NOT NULL,

  -- 알림 제목 (짧은 요약)
  title VARCHAR(255) NOT NULL,

  -- 알림 메시지 (상세 내용)
  message TEXT NOT NULL,

  -- 이동 링크
  link VARCHAR(500),

  -- 관련 엔티티 ID (광고주, 콘텐츠 등)
  related_advertiser_id UUID REFERENCES advertisers(id) ON DELETE SET NULL,
  related_content_id UUID REFERENCES contents(id) ON DELETE SET NULL,

  -- 읽음 여부
  is_read BOOLEAN DEFAULT false,

  -- 메타데이터 (추가 정보)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- RLS 정책
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 시스템이 알림을 생성할 수 있도록 허용 (service role 사용)
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 코멘트
COMMENT ON TABLE notifications IS '사용자 알림 테이블';
COMMENT ON COLUMN notifications.type IS 'approve, revision, bulk_complete, report_ready, content_created';
