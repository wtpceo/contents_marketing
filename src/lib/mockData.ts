
export type ContentStatus = "planning" | "drafting" | "pending_approval" | "scheduled" | "published" | "error"

export const STATUS_LABELS: Record<ContentStatus, string> = {
    planning: "기획중",
    drafting: "작성중",
    pending_approval: "컨펌대기",
    scheduled: "배포예약",
    published: "배포완료",
    error: "오류",
}

export const STATUS_COLORS: Record<ContentStatus, string> = {
    planning: "bg-gray-500 text-white border-transparent hover:bg-gray-600",
    drafting: "bg-blue-500 text-white border-transparent hover:bg-blue-600",
    pending_approval: "bg-orange-500 text-white border-transparent hover:bg-orange-600",
    scheduled: "bg-purple-500 text-white border-transparent hover:bg-purple-600",
    published: "bg-green-600 text-white border-transparent hover:bg-green-700",
    error: "bg-red-500 text-white border-transparent hover:bg-red-600",
}

// 1. Updated Channel Types
export type ChannelType = "blog" | "instagram" | "threads"

// 2. Updated Event Interface (OSMU Topic)
export interface Client {
    id: string
    name: string
    industry: string
    contact: string
    tone: string[]
}

export interface ContentEvent {
    id: string
    title: string
    date: Date
    status: ContentStatus
    channels: ChannelType[] // Changed from single channel to array
    clientId: string
    description?: string // For topic description
    drafts?: Partial<Record<ChannelType, any>> // Generated content
}

export const MOCK_CLIENTS: Client[] = [
    { id: "c1", name: "테크 스타트업 A", industry: "IT/SaaS", contact: "ceo@tech.com", tone: ["전문적인", "혁신적인"] },
    { id: "c2", name: "뷰티 브랜드 B", industry: "뷰티/패션", contact: "mkt@beauty.com", tone: ["친근한", "트렌디한"] },
    { id: "c3", name: "법무법인 C", industry: "법률/세무", contact: "lawyer@law.com", tone: ["신뢰감있는", "논리적인"] },
]

export const MOCK_EVENTS: ContentEvent[] = [
    {
        id: "e1",
        title: "12월 프로모션 안내",
        date: new Date(2025, 11, 5),
        status: "published",
        channels: ["blog", "instagram"],
        clientId: "c1"
    },
    {
        id: "e2",
        title: "신제품 런칭 티저",
        date: new Date(2025, 11, 8),
        status: "pending_approval",
        channels: ["instagram", "threads"],
        clientId: "c2"
    },
    {
        id: "e3",
        title: "법률 상식 Q&A",
        date: new Date(2025, 11, 10),
        status: "planning",
        channels: ["blog"],
        clientId: "c3"
    },
    {
        id: "e4",
        title: "연말 결산 리포트",
        date: new Date(2025, 11, 15),
        status: "drafting",
        channels: ["blog", "threads"],
        clientId: "c1"
    },
    {
        id: "e5",
        title: "고객 후기 모음",
        date: new Date(2025, 11, 20),
        status: "scheduled",
        channels: ["instagram"],
        clientId: "c2"
    },
]
