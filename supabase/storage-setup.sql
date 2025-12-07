-- =====================================================
-- Supabase Storage 버킷 설정
-- Supabase Dashboard > SQL Editor에서 실행
-- =====================================================

-- 1. Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-images',
  'content-images',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage 정책: 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content-images');

-- 3. Storage 정책: 모든 사용자가 이미지 조회 가능 (public bucket)
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'content-images');

-- 4. Storage 정책: 인증된 사용자는 자신이 업로드한 이미지 수정 가능
CREATE POLICY "Authenticated users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'content-images');

-- 5. Storage 정책: 인증된 사용자는 자신이 업로드한 이미지 삭제 가능
CREATE POLICY "Authenticated users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'content-images');
