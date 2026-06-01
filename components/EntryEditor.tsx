"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

interface EntryEditorProps {
  placeholder: string;
  onUpdate: (html: string) => void;
  reset?: number;
  initialContent?: string;
}

export default function EntryEditor({
  placeholder,
  onUpdate,
  reset,
  initialContent,
}: EntryEditorProps) {
  const [isEmpty, setIsEmpty] = useState(!initialContent);
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        class:
          "min-h-[220px] outline-none text-white/90 text-[16px] md:text-[14px] leading-relaxed prose prose-invert max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
      setIsEmpty(editor.isEmpty);
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  // Set initialContent after first paint — Tiptap 3 + immediatelyRender:false needs this
  useEffect(() => {
    if (!editor || !initialContent) return;
    const id = requestAnimationFrame(() => {
      editor.commands.setContent(initialContent);
    });
    return () => cancelAnimationFrame(id);
  }, [editor, initialContent]);

  useEffect(() => {
    if (reset !== undefined && editor) {
      editor.commands.clearContent(true);
      setIsEmpty(true);
    }
  }, [reset, editor]);

  return (
    <div className="relative" onClick={() => editor?.commands.focus()}>
      {isEmpty && !isFocused && (
        <p className="absolute top-0 left-0 text-white/50 text-[16px] md:text-[14px] leading-relaxed pointer-events-none select-none">
          {placeholder}
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
