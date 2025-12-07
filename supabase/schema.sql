-- =====================================================
-- WCE (Wisdom Content Engine) Database Schema
-- Supabase PostgreSQL
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- 콘텐츠 상태
CREATE TYPE content_status AS ENUM (
  'draft',           -- 초안/기획중
  'pending_confirm', -- 컨펌 대기
  'revision',        -- 수정 요청
  'approved',        -- 승인 완료
  'scheduled',       -- 배포 예약
  'published',       -- 배포 완료
  'error'            -- 오류
);

-- 채널 타입
CREATE TYPE channel_type AS ENUM (
  'blog_naver',      -- 네이버 블로그
  'blog_tistory',    -- 티스토리
  'instagram',       -- 인스타그램
  'facebook',        -- 페이스북
  'youtube',         -- 유튜브
  'linkedin'         -- 링크드인
);

-- 톤앤매너 타입
CREATE TYPE tone_type AS ENUM (
  'professional',    -- 전문적
  'friendly',        -- 친근한
  'emotional',       -- 감성적
  'witty',           -- 위트있는
  'formal',          -- 격식체
  'casual'           -- 캐주얼
);

-- 알림 타입
CREATE TYPE notification_type AS ENUM (
  'confirm_request',
  'confirm_response',
  'publish_success',
  'publish_error'
);

-- 알림 상태
CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'failed'
);

-- =====================================================
-- TABLES
-- =====================================================

-- 1. 사용자 프로필 (Supabase Auth와 연동)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. 광고주 (1 마케터 : N 광고주)
CREATE TABLE advertisers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,                          -- 업종
  target_audience TEXT,                   -- 타겟 고객
  tone tone_type[] DEFAULT '{}',          -- 톤앤매너 (다중 선택)
  forbidden_words TEXT[] DEFAULT '{}',    -- 금지어 목록
  brand_keywords TEXT[] DEFAULT '{}',     -- 브랜드 키워드
  contact_name TEXT,                      -- 담당자 이름
  contact_phone TEXT,                     -- 담당자 연락처 (알림톡용)
  contact_email TEXT,                     -- 담당자 이메일
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. 콘텐츠
CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,                              -- 본문 (HTML 또는 Markdown)
  channel channel_type NOT NULL,
  status content_status DEFAULT 'draft' NOT NULL,
  scheduled_at TIMESTAMPTZ,               -- 배포 예약 시간
  published_at TIMESTAMPTZ,               -- 실제 배포 시간
  published_url TEXT,                     -- 배포된 URL
  preview_token UUID DEFAULT uuid_generate_v4(), -- 미리보기 링크용 토큰
  keywords TEXT[] DEFAULT '{}',           -- LLM 생성용 키워드
  llm_prompt TEXT,                        -- 사용된 프롬프트
  images TEXT[] DEFAULT '{}',             -- 이미지 URL 목록
  confirm_requested_at TIMESTAMPTZ,
  confirm_responded_at TIMESTAMPTZ,
  confirm_message TEXT,                   -- 광고주 피드백
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. 트렌드/뉴스
CREATE TABLE trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  source_name TEXT,
  category TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. 알림 로그
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  recipient_phone TEXT,
  recipient_email TEXT,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  status notification_status DEFAULT 'pending' NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

-- 광고주 조회 최적화
CREATE INDEX idx_advertisers_user_id ON advertisers(user_id);
CREATE INDEX idx_advertisers_is_active ON advertisers(is_active);

-- 콘텐츠 조회 최적화
CREATE INDEX idx_contents_user_id ON contents(user_id);
CREATE INDEX idx_contents_advertiser_id ON contents(advertiser_id);
CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_scheduled_at ON contents(scheduled_at);
CREATE INDEX idx_contents_channel ON contents(channel);
CREATE INDEX idx_contents_preview_token ON contents(preview_token);

-- 캘린더 뷰 최적화 (년/월별 조회)
CREATE INDEX idx_contents_calendar ON contents(user_id, scheduled_at);

-- 알림 조회 최적화
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_content_id ON notifications(content_id);
CREATE INDEX idx_notifications_status ON notifications(status);

-- 트렌드 조회 최적화
CREATE INDEX idx_trends_category ON trends(category);
CREATE INDEX idx_trends_fetched_at ON trends(fetched_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- profiles updated_at 트리거
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- advertisers updated_at 트리거
CREATE TRIGGER update_advertisers_updated_at
  BEFORE UPDATE ON advertisers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- contents updated_at 트리거
CREATE TRIGGER update_contents_updated_at
  BEFORE UPDATE ON contents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;

-- Profiles 정책
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Advertisers 정책
CREATE POLICY "Users can view own advertisers"
  ON advertisers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own advertisers"
  ON advertisers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own advertisers"
  ON advertisers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own advertisers"
  ON advertisers FOR DELETE
  USING (auth.uid() = user_id);

-- Contents 정책
CREATE POLICY "Users can view own contents"
  ON contents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contents"
  ON contents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contents"
  ON contents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contents"
  ON contents FOR DELETE
  USING (auth.uid() = user_id);

-- 미리보기 토큰으로 콘텐츠 조회 (광고주 컨펌용 - 비로그인 접근)
CREATE POLICY "Anyone can view content with preview token"
  ON contents FOR SELECT
  USING (preview_token IS NOT NULL);

-- Notifications 정책
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trends 정책 (모든 인증 사용자 조회 가능)
CREATE POLICY "Authenticated users can view trends"
  ON trends FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- AUTH TRIGGER: 회원가입 시 profiles 자동 생성
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STORAGE BUCKET 설정 (SQL Editor에서 실행)
-- =====================================================

-- Storage 버킷은 Supabase Dashboard에서 생성하거나
-- 아래 주석 해제 후 실행 (supabase_admin 권한 필요)

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('content-images', 'content-images', true);

-- Storage 정책
-- CREATE POLICY "Users can upload images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'content-images' AND auth.role() = 'authenticated');

-- CREATE POLICY "Anyone can view images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'content-images');

-- CREATE POLICY "Users can delete own images"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'content-images' AND auth.uid()::text = (storage.foldername(name))[1]);
