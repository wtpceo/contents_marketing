import { AppLayout } from "@/components/layout/AppLayout"
import { CalendarView } from "@/components/dashboard/CalendarView"
import { TrendSidebar } from "@/components/dashboard/TrendSidebar"

export default function DashboardPage() {
    return (
        <AppLayout>
            <div className="flex flex-col h-full">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px]">
                    <h1 className="text-lg font-semibold">콘텐츠 캘린더</h1>
                </header>
                <div className="flex-1 overflow-hidden flex">
                    <div className="flex-1 overflow-auto p-6">
                        <CalendarView />
                    </div>
                    <TrendSidebar />
                </div>
            </div>
        </AppLayout>
    )
}
