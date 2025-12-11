'use client'

import { useState } from 'react'
import { Copy, Download, Check, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PublishingHelperProps {
  contentId: string
  advertiserName: string
  channel: 'blog' | 'instagram' | 'threads'
  title: string
  body: string // HTML 또는 텍스트
  hashtags?: string[]
  images?: { prompt: string; url: string | null }[]
  onPublished?: () => void
}

export function PublishingHelper({
  contentId,
  advertiserName,
  channel,
  title,
  body,
  hashtags = [],
  images = [],
  onPublished
}: PublishingHelperProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)

  // HTML을 순수 텍스트로 변환
  const htmlToPlainText = (html: string) => {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
  }

  // 클립보드에 텍스트 복사
  const handleCopyText = async () => {
    try {
      let textToCopy = ''

      if (channel === 'blog') {
        // 블로그: 제목 + 본문
        textToCopy = `${title}\n\n${htmlToPlainText(body)}`
      } else if (channel === 'instagram') {
        // 인스타그램: 캡션 + 해시태그
        textToCopy = body
        if (hashtags.length > 0) {
          textToCopy += '\n\n' + hashtags.map(tag => `#${tag.replace('#', '')}`).join(' ')
        }
      } else if (channel === 'threads') {
        // 스레드: 본문
        textToCopy = body
      }

      await navigator.clipboard.writeText(textToCopy)
      setIsCopied(true)
      toast.success('본문이 클립보드에 복사되었습니다!')

      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('복사 실패:', error)
      toast.error('복사에 실패했습니다. 브라우저 설정을 확인해주세요.')
    }
  }

  // 이미지 다운로드
  const handleDownloadImages = async () => {
    const validImages = images.filter(img => img.url)
    if (validImages.length === 0) {
      toast.error('다운로드할 이미지가 없습니다.')
      return
    }

    setIsDownloading(true)

    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

      for (let i = 0; i < validImages.length; i++) {
        const img = validImages[i]
        if (!img.url) continue

        // 이미지 fetch 및 blob 변환
        const response = await fetch(img.url)
        const blob = await response.blob()

        // 파일명 생성: 20251211_광고주명_01.png
        const fileName = `${today}_${advertiserName}_${String(i + 1).padStart(2, '0')}.png`

        // 다운로드 트리거
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        // 여러 파일 다운로드 시 딜레이
        if (i < validImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      toast.success(`${validImages.length}개의 이미지가 다운로드되었습니다!`)
    } catch (error) {
      console.error('이미지 다운로드 실패:', error)
      toast.error('이미지 다운로드에 실패했습니다.')
    } finally {
      setIsDownloading(false)
    }
  }

  // 복사 + 다운로드 동시 실행
  const handleCopyAndDownload = async () => {
    await handleCopyText()
    if (images.length > 0) {
      await handleDownloadImages()
    }
  }

  // 배포 완료 처리
  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      const response = await fetch(`/api/contents/${contentId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          published_url: publishedUrl || null,
          channel
        })
      })

      if (response.ok) {
        toast.success('배포 완료 처리되었습니다!')
        setShowPublishDialog(false)
        onPublished?.()
      } else {
        toast.error('배포 완료 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('배포 완료 처리 실패:', error)
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsPublishing(false)
    }
  }

  const channelLabel = {
    blog: '블로그',
    instagram: '인스타그램',
    threads: '스레드'
  }[channel]

  const hasImages = images.filter(img => img.url).length > 0

  return (
    <>
      <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            🟢 배포 준비 완료
          </p>
          <p className="text-xs text-green-600">
            광고주 승인이 완료되었습니다. {channelLabel}에 업로드해주세요.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAndDownload}
            className="bg-white"
          >
            {isCopied ? (
              <Check className="h-4 w-4 mr-1.5 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 mr-1.5" />
            )}
            {hasImages ? '복사 및 다운로드' : '복사'}
          </Button>

          {hasImages && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadImages}
              disabled={isDownloading}
              className="bg-white"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              이미지만
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setShowPublishDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1.5" />
            배포 완료
          </Button>
        </div>
      </div>

      {/* 배포 완료 다이얼로그 */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>배포 완료 확인</DialogTitle>
            <DialogDescription>
              {channelLabel}에 콘텐츠를 업로드하셨나요?
              게시물 URL을 입력하면 리포트에서 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">게시물 URL (선택)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={publishedUrl}
                  onChange={(e) => setPublishedUrl(e.target.value)}
                />
                {publishedUrl && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(publishedUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                실제 업로드한 게시물의 URL을 입력해주세요. (선택사항)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1.5" />
              )}
              배포 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
