import { Sidebar } from "./Sidebar"
import { NotificationCenter } from "./NotificationCenter"

export function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* 상단 헤더 */}
                <header className="h-14 border-b border-border bg-white/50 backdrop-blur-xl flex items-center justify-end px-6 gap-4">
                    <NotificationCenter />
                </header>
                {/* 메인 콘텐츠 */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
