import { createClient } from './client'

const BUCKET_NAME = 'content-images'

export interface UploadResult {
  url: string
  path: string
}

/**
 * 이미지 파일 업로드
 * @param file - 업로드할 파일
 * @param folder - 저장할 폴더 (예: 'advertisers', 'contents')
 * @returns 업로드된 파일의 public URL
 */
export async function uploadImage(
  file: File,
  folder: string = 'general'
): Promise<UploadResult> {
  const supabase = createClient()

  // 파일명 생성 (timestamp + random string + 원본 확장자)
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`이미지 업로드 실패: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return {
    url: urlData.publicUrl,
    path: filePath,
  }
}

/**
 * 이미지 삭제
 * @param path - 삭제할 파일 경로
 */
export async function deleteImage(path: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) {
    throw new Error(`이미지 삭제 실패: ${error.message}`)
  }
}

/**
 * 여러 이미지 업로드
 * @param files - 업로드할 파일 배열
 * @param folder - 저장할 폴더
 * @returns 업로드된 파일들의 URL 배열
 */
export async function uploadMultipleImages(
  files: File[],
  folder: string = 'general'
): Promise<UploadResult[]> {
  const results = await Promise.all(
    files.map((file) => uploadImage(file, folder))
  )
  return results
}

/**
 * Public URL 생성
 * @param path - 파일 경로
 * @returns Public URL
 */
export function getPublicUrl(path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return data.publicUrl
}
