-- advertiser_groups 테이블 생성
-- 광고주 그룹(세그먼트) 관리: 필터 조건을 저장하여 동적으로 광고주 추출
CREATE TABLE advertiser_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  filter_conditions JSONB NOT NULL DEFAULT '{}',
  -- 예: {"category": "수학학원", "location": "서울", "tags": ["겨울특강"]}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_advertiser_groups_user_id ON advertiser_groups(user_id);
CREATE INDEX idx_advertiser_groups_filter ON advertiser_groups USING GIN(filter_conditions);

-- RLS 활성화
ALTER TABLE advertiser_groups ENABLE ROW LEVEL SECURITY;

-- 사용자 본인의 그룹만 관리 가능
CREATE POLICY "Users can manage their own advertiser groups"
  ON advertiser_groups FOR ALL
  USING (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_advertiser_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER advertiser_groups_updated_at_trigger
  BEFORE UPDATE ON advertiser_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_advertiser_groups_updated_at();

-- =============================================
-- advertisers 테이블에 tags 컬럼 추가 (마이그레이션용)
-- =============================================
-- ALTER TABLE advertisers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
-- CREATE INDEX IF NOT EXISTS idx_advertisers_tags ON advertisers USING GIN(tags);
-- CREATE INDEX IF NOT EXISTS idx_advertisers_industry ON advertisers(industry);
