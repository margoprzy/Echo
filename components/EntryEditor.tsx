"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
} from "lucide-react";

interface EntryEditorProps {
  placeholder: string;
  onUpdate: (html: string) => void;
  reset?: number;
  initialContent?: string;
  insertText?: string | null;
  onInsertHandled?: () => void;
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex items-center justify-center w-8 h-8 rounded-[10px] transition-colors ${
        active
          ? "bg-[#7C5CBF]/25 text-[#C4A8FF]"
          : "text-white/45 hover:text-white/80 hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-1 mb-3 pb-3 border-b border-white/10">
      <ToolbarButton
        label="Pogrubienie"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Kursywa"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Przekreślenie"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </ToolbarButton>
      <span className="w-px h-5 bg-white/10 mx-1" />
      <ToolbarButton
        label="Nagłówek"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Lista punktowana"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Lista numerowana"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </ToolbarButton>
    </div>
  );
}

export default function EntryEditor({
  placeholder,
  onUpdate,
  reset,
  initialContent,
  insertText,
  onInsertHandled,
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
          "min-h-[96px] outline-none text-white/90 text-[16px] leading-relaxed prose prose-invert max-w-none",
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

  useEffect(() => {
    if (!editor || !insertText) return;
    editor.chain().focus().insertContent(insertText).run();
    onInsertHandled?.();
  }, [insertText, editor, onInsertHandled]);

  return (
    <div>
      {editor && <Toolbar editor={editor} />}
      <div className="relative" data-ph-mask onClick={() => editor?.commands.focus()}>
        {isEmpty && !isFocused && (
          <p className="absolute top-0 left-0 text-white/50 text-[14px] leading-relaxed pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
