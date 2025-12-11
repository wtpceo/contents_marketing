-- templates 테이블 생성
CREATE TABLE templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- '수학학원', '치과', '카페' 등 세분화된 카테고리
  platform VARCHAR(20) NOT NULL DEFAULT 'blog', -- 'blog', 'instagram', 'threads'
  content_structure TEXT NOT NULL, -- 템플릿 본문 ({{변수}} 포함)
  description TEXT, -- 템플릿 설명
  variables JSONB DEFAULT '[]', -- 사용된 변수 목록 예: ["company_name", "location", "phone", "usp", "menu"]
  visibility VARCHAR(20) NOT NULL DEFAULT 'private', -- 'private': 본인만, 'public': 모든 유저 (관리자 등록)
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0, -- 사용 횟수 통계
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_platform ON templates(platform);
CREATE INDEX idx_templates_visibility ON templates(visibility);

-- RLS 활성화
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 사용자 본인의 템플릿 관리 가능
CREATE POLICY "Users can manage their own templates"
  ON templates FOR ALL
  USING (auth.uid() = user_id);

-- 공용 템플릿은 모든 인증된 사용자가 읽기 가능
CREATE POLICY "Public templates are readable by all authenticated users"
  ON templates FOR SELECT
  USING (visibility = 'public' AND is_active = true);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER templates_updated_at_trigger
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();

-- =============================================
-- 기존 테이블에 visibility 컬럼 추가 (마이그레이션용)
-- =============================================
-- ALTER TABLE templates ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'private';
-- CREATE INDEX IF NOT EXISTS idx_templates_visibility ON templates(visibility);
--
-- -- 공용 템플릿 읽기 정책 추가
-- CREATE POLICY "Public templates are readable by all authenticated users"
--   ON templates FOR SELECT
--   USING (visibility = 'public' AND is_active = true);
