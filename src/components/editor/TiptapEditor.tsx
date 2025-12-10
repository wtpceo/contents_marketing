"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from '@/components/ui/button'
import { Bold, Italic, List, ListOrdered, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'

interface TiptapEditorProps {
    initialContent?: string
    value?: string
    onChange?: (content: string) => void
}

export function TiptapEditor({ initialContent, value, onChange }: TiptapEditorProps) {
    const lastValueRef = useRef<string | undefined>(value)

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: '내용을 작성하세요...',
            }),
        ],
        content: initialContent || value || '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-6',
            },
        },
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML())
        }
    })

    // Update content if value changes externally (e.g. from LLM gen)
    useEffect(() => {
        if (editor && value !== undefined && value !== lastValueRef.current) {
            console.log('[TiptapEditor] value 변경 감지, 에디터 업데이트:', value?.substring(0, 100))
            editor.commands.setContent(value, false)
            lastValueRef.current = value
        }
    }, [value, editor])

    if (!editor) {
        return null
    }

    return (
        <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-1 border-b bg-gray-50 p-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn(editor.isActive('bold') && 'bg-muted')}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn(editor.isActive('italic') && 'bg-muted')}
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn(editor.isActive('bulletList') && 'bg-muted')}
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn(editor.isActive('orderedList') && 'bg-muted')}
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <Button variant="ghost" size="sm">
                    <ImageIcon className="h-4 w-4" />
                </Button>
            </div>
            <EditorContent editor={editor} className="flex-1 overflow-auto bg-white" />
        </div>
    )
}
