"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Advertiser {
    id: string
    name: string
}

interface FilterBarProps {
    onClientChange: (value: string) => void
    onChannelChange: (value: string) => void
}

export function FilterBar({ onClientChange, onChannelChange }: FilterBarProps) {
    const [clients, setClients] = useState<Advertiser[]>([])

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await fetch("/api/advertisers")
                if (response.ok) {
                    const data = await response.json()
                    setClients(data)
                }
            } catch (error) {
                console.error("광고주 목록 로딩 실패:", error)
            }
        }
        fetchClients()
    }, [])

    return (
        <div className="flex gap-2">
            <Select onValueChange={onClientChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="광고주 선택" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">전체 광고주</SelectItem>
                    {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                            {client.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select onValueChange={onChannelChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="채널 선택" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">전체 채널</SelectItem>
                    <SelectItem value="blog">블로그</SelectItem>
                    <SelectItem value="instagram">인스타그램</SelectItem>
                    <SelectItem value="youtube">유튜브</SelectItem>
                    <SelectItem value="linkedin">링크드인</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
