"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function MockPreviewContent({ content, token }: { content: any, token: string }) {
    return (
        <div className="max-w-3xl mx-auto py-10 px-4">
            <div className="border border-gray-200 rounded-lg p-8 shadow-sm">
                <div className="mb-6 border-b pb-6">
                    <h1 className="text-2xl font-bold mb-2">{content?.title || "미리보기 콘텐츠"}</h1>
                    <div className="flex gap-2">
                        <Badge>{content?.channel || "Blog"}</Badge>
                        <span className="text-sm text-gray-500">작성일: {new Date().toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: content?.body || "<p>내용이 없습니다.</p>" }} />

                <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                    <Button variant="outline">수정 요청</Button>
                    <Button>승인하기</Button>
                </div>
            </div>
        </div>
    )
}
