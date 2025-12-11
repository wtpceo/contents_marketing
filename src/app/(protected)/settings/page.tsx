"use client"

import { useRouter } from "next/navigation"
import { FileText, ChevronRight, Flame } from "lucide-react"
import { AppLayout } from "@/components/layout/AppLayout"

const settingsMenus = [
    {
        title: "템플릿 관리",
        description: "콘텐츠 템플릿을 생성하고 관리합니다",
        href: "/settings/templates",
        icon: FileText,
    },
    {
        title: "트렌드 관리",
        description: "기획 도우미에 노출될 시즌 이슈와 실시간 트렌드를 관리합니다",
        href: "/settings/trends",
        icon: Flame,
    },
]

export default function SettingsPage() {
    const router = useRouter()

    return (
        <AppLayout>
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">설정</h1>
                <p className="text-muted-foreground mt-1">
                    서비스 설정을 관리합니다
                </p>
            </div>

            <div className="space-y-3">
                {settingsMenus.map((menu) => (
                    <div
                        key={menu.href}
                        onClick={() => router.push(menu.href)}
                        className="flex items-center justify-between p-4 bg-white border rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <menu.icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-medium">{menu.title}</h3>
                                <p className="text-sm text-muted-foreground">{menu.description}</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                ))}
            </div>
        </div>
        </AppLayout>
    )
}
