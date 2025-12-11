'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, FileText, ExternalLink, Copy, Check, Calendar, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'

interface ReportTabProps {
  clientId: string
  clientName: string
}

interface ContentItem {
  id: string
  title: string
  channel: string
  selected_channels?: string[]
  status: string
  scheduled_at: string
  metadata?: {
    published_urls?: Record<string, string>
  }
}

export function ReportTab({ clientId, clientName }: ReportTabProps) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [marketerComment, setMarketerComment] = useState('다음 달도 최선을 다하겠습니다.')
  const [contents, setContents] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // 년도 옵션 생성
  const yearOptions = []
  const currentYear = new Date().getFullYear()
  for (let y = currentYear; y >= currentYear - 2; y--) {
    yearOptions.push(y)
  }

  // 월 옵션
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  // 콘텐츠 통계 로드
  const fetchContents = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/reports?advertiser_id=${clientId}&year=${year}&month=${month}`
      )
      if (response.ok) {
        const data = await response.json()
        setContents(data.contents || [])
      }
    } catch (error) {
      console.error('콘텐츠 통계 로딩 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContents()
  }, [clientId, year, month])

  // 채널별 집계
  const channelStats: Record<string, number> = {}
  contents.forEach(content => {
    const channels = content.selected_channels || [content.channel]
    channels.forEach((ch: string) => {
      const normalizedChannel = ch.startsWith('blog') ? '블로그' :
        ch === 'instagram' ? '인스타그램' :
        ch === 'threads' ? '스레드' :
        ch === 'youtube' ? '유튜브' : ch
      channelStats[normalizedChannel] = (channelStats[normalizedChannel] || 0) + 1
    })
  })

  // 리포트 생성
  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiser_id: clientId,
          year,
          month,
          marketer_comment: marketerComment
        })
      })

      if (response.ok) {
        const data = await response.json()
        // 리포트 데이터를 base64로 인코딩하여 URL에 포함
        const encodedData = btoa(JSON.stringify(data.report_data))
        const fullUrl = `${window.location.origin}${data.report_url}?data=${encodedData}`
        setReportUrl(fullUrl)
        toast.success('리포트가 생성되었습니다!')
      } else {
        toast.error('리포트 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('리포트 생성 오류:', error)
      toast.error('오류가 발생했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  // URL 복사
  const handleCopyUrl = async () => {
    if (!reportUrl) return
    try {
      await navigator.clipboard.writeText(reportUrl)
      setCopied(true)
      toast.success('링크가 복사되었습니다!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('복사에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      {/* 기간 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            월간 성과 리포트
          </CardTitle>
          <CardDescription>
            광고주에게 공유할 월간 마케팅 활동 리포트를 생성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>년도</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>월</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>{m}월</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {year}년 {month}월 발행 콘텐츠
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 미리보기 */}
      <Card>
        <CardHeader>
          <CardTitle>발행 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{year}년 {month}월에 발행된(published) 콘텐츠가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 요약 */}
              <div className="flex items-center justify-center gap-8 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                <div className="text-center">
                  <p className="text-4xl font-bold text-indigo-600">{contents.length}</p>
                  <p className="text-sm text-muted-foreground">총 발행 건수</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="flex gap-4">
                  {Object.entries(channelStats).map(([channel, count]) => (
                    <div key={channel} className="text-center">
                      <p className="text-xl font-semibold">{count}</p>
                      <p className="text-xs text-muted-foreground">{channel}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 콘텐츠 목록 */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {contents.map((content) => (
                  <div
                    key={content.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="text-xs text-muted-foreground w-16 shrink-0">
                      {new Date(content.scheduled_at).toLocaleDateString('ko-KR', {
                        month: 'numeric',
                        day: 'numeric'
                      })}
                    </div>
                    <p className="text-sm flex-1 truncate">{content.title}</p>
                    {content.metadata?.published_urls && (
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 마케터 코멘트 */}
      <Card>
        <CardHeader>
          <CardTitle>담당자 코멘트</CardTitle>
          <CardDescription>
            리포트 하단에 표시될 메시지입니다. (선택사항)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="광고주에게 전달할 메시지를 입력하세요..."
            value={marketerComment}
            onChange={(e) => setMarketerComment(e.target.value)}
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* 리포트 생성 버튼 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerateReport}
              disabled={generating || contents.length === 0}
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  리포트 생성
                </>
              )}
            </Button>

            {reportUrl && (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={reportUrl}
                  className="flex-1 px-3 py-2 text-sm bg-muted rounded-md truncate"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(reportUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {contents.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              발행된 콘텐츠가 있어야 리포트를 생성할 수 있습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
