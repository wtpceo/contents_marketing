export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// 콘텐츠 상태 타입
export type ContentStatus =
  | 'draft'           // 초안/기획중
  | 'pending_confirm' // 컨펌 대기
  | 'revision'        // 수정 요청
  | 'approved'        // 승인 완료
  | 'scheduled'       // 배포 예약
  | 'published'       // 배포 완료
  | 'error'           // 오류

// 채널 타입
export type ChannelType =
  | 'blog_naver'      // 네이버 블로그
  | 'blog_tistory'    // 티스토리
  | 'instagram'       // 인스타그램
  | 'facebook'        // 페이스북
  | 'youtube'         // 유튜브
  | 'linkedin'        // 링크드인

// 톤앤매너 타입
export type ToneType =
  | 'professional'    // 전문적
  | 'friendly'        // 친근한
  | 'emotional'       // 감성적
  | 'witty'           // 위트있는
  | 'formal'          // 격식체
  | 'casual'          // 캐주얼

export interface Database {
  public: {
    Tables: {
      // 사용자 프로필 (Supabase Auth와 연동)
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company_name: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }

      // 광고주 (1 마케터 : N 광고주)
      advertisers: {
        Row: {
          id: string
          user_id: string
          name: string
          industry: string | null           // 업종
          target_audience: string | null    // 타겟 고객
          tone: ToneType[]                  // 톤앤매너 (다중 선택)
          forbidden_words: string[]         // 금지어 목록
          brand_keywords: string[]          // 브랜드 키워드
          contact_name: string | null       // 담당자 이름
          contact_phone: string | null      // 담당자 연락처 (알림톡용)
          contact_email: string | null      // 담당자 이메일
          logo_url: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          industry?: string | null
          target_audience?: string | null
          tone?: ToneType[]
          forbidden_words?: string[]
          brand_keywords?: string[]
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          logo_url?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          industry?: string | null
          target_audience?: string | null
          tone?: ToneType[]
          forbidden_words?: string[]
          brand_keywords?: string[]
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          logo_url?: string | null
          description?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }

      // 콘텐츠
      contents: {
        Row: {
          id: string
          user_id: string
          advertiser_id: string
          title: string
          body: string | null               // 본문 (HTML 또는 Markdown)
          channel: ChannelType
          status: ContentStatus
          scheduled_at: string | null       // 배포 예약 시간
          published_at: string | null       // 실제 배포 시간
          published_url: string | null      // 배포된 URL
          preview_token: string | null      // 미리보기 링크용 토큰
          keywords: string[]                // LLM 생성용 키워드
          llm_prompt: string | null         // 사용된 프롬프트
          images: string[]                  // 이미지 URL 목록
          confirm_requested_at: string | null
          confirm_responded_at: string | null
          confirm_message: string | null    // 광고주 피드백
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          advertiser_id: string
          title: string
          body?: string | null
          channel: ChannelType
          status?: ContentStatus
          scheduled_at?: string | null
          published_at?: string | null
          published_url?: string | null
          preview_token?: string | null
          keywords?: string[]
          llm_prompt?: string | null
          images?: string[]
          confirm_requested_at?: string | null
          confirm_responded_at?: string | null
          confirm_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          body?: string | null
          channel?: ChannelType
          status?: ContentStatus
          scheduled_at?: string | null
          published_at?: string | null
          published_url?: string | null
          preview_token?: string | null
          keywords?: string[]
          llm_prompt?: string | null
          images?: string[]
          confirm_requested_at?: string | null
          confirm_responded_at?: string | null
          confirm_message?: string | null
          updated_at?: string
        }
      }

      // 트렌드/뉴스 (추후 연동)
      trends: {
        Row: {
          id: string
          title: string
          summary: string | null
          source_url: string | null
          source_name: string | null
          category: string | null
          published_at: string | null
          fetched_at: string
        }
        Insert: {
          id?: string
          title: string
          summary?: string | null
          source_url?: string | null
          source_name?: string | null
          category?: string | null
          published_at?: string | null
          fetched_at?: string
        }
        Update: {
          title?: string
          summary?: string | null
          source_url?: string | null
          source_name?: string | null
          category?: string | null
          published_at?: string | null
        }
      }

      // 알림 로그
      notifications: {
        Row: {
          id: string
          user_id: string
          content_id: string | null
          type: 'confirm_request' | 'confirm_response' | 'publish_success' | 'publish_error'
          recipient_phone: string | null
          recipient_email: string | null
          message: string
          sent_at: string | null
          status: 'pending' | 'sent' | 'failed'
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id?: string | null
          type: 'confirm_request' | 'confirm_response' | 'publish_success' | 'publish_error'
          recipient_phone?: string | null
          recipient_email?: string | null
          message: string
          sent_at?: string | null
          status?: 'pending' | 'sent' | 'failed'
          error_message?: string | null
          created_at?: string
        }
        Update: {
          sent_at?: string | null
          status?: 'pending' | 'sent' | 'failed'
          error_message?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      content_status: ContentStatus
      channel_type: ChannelType
      tone_type: ToneType
    }
  }
}

// 편의 타입
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Advertiser = Database['public']['Tables']['advertisers']['Row']
export type Content = Database['public']['Tables']['contents']['Row']
export type Trend = Database['public']['Tables']['trends']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
