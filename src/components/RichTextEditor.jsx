import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Bold, Heading2, Image as ImageIcon, Italic, Link as LinkIcon, List, ListOrdered, Maximize2, Minimize2, Quote, RotateCcw, Unlink } from 'lucide-react';

function ToolbarButton({ active = false, disabled = false, onClick, title, children }) {
  return (
    <button
      type="button"
      className={active ? 'editor-toolbar__button active' : 'editor-toolbar__button'}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, onUploadImage, disabled = false }) {
  const fileInputRef = useRef(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const normalizedValue = useMemo(() => (String(value ?? '').trim() ? value : '<p></p>'), [value]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          rel: 'noreferrer',
          target: '_blank',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
    ],
    content: normalizedValue,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (editor.getHTML() !== normalizedValue) {
      editor.commands.setContent(normalizedValue, false);
    }
  }, [editor, normalizedValue]);

  async function handleInsertImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !editor || !onUploadImage) {
      return;
    }

    setIsUploadingImage(true);

    try {
      const url = await onUploadImage(file);
      if (url) {
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      }
    } finally {
      setIsUploadingImage(false);
    }
  }

  function promptForLink() {
    if (!editor) {
      return;
    }

    const previousUrl = editor.getAttributes('link').href ?? '';
    const url = window.prompt('Enter link URL', previousUrl);

    if (url === null) {
      return;
    }

    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  return (
    <div className={[
      'rich-text-editor',
      disabled ? 'is-disabled' : '',
      isFullscreen ? 'is-fullscreen' : '',
    ].filter(Boolean).join(' ')}>
      <div className="editor-toolbar" role="toolbar" aria-label="Story body formatting tools">
        <ToolbarButton
          title="Paragraph"
          onClick={() => editor?.chain().focus().setParagraph().run()}
          active={editor?.isActive('paragraph')}
          disabled={!editor || disabled}
        >
          P
        </ToolbarButton>
        <ToolbarButton
          title="Heading"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive('heading', { level: 2 })}
          disabled={!editor || disabled}
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive('bold')}
          disabled={!editor || disabled}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive('italic')}
          disabled={!editor || disabled}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive('bulletList')}
          disabled={!editor || disabled}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive('orderedList')}
          disabled={!editor || disabled}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Quote"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive('blockquote')}
          disabled={!editor || disabled}
        >
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Add link"
          onClick={promptForLink}
          active={editor?.isActive('link')}
          disabled={!editor || disabled}
        >
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Remove link"
          onClick={() => editor?.chain().focus().extendMarkRange('link').unsetLink().run()}
          disabled={!editor || disabled || !editor?.isActive('link')}
        >
          <Unlink size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Insert image"
          onClick={() => fileInputRef.current?.click()}
          disabled={!editor || disabled || isUploadingImage}
        >
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Clear formatting"
          onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
          disabled={!editor || disabled}
        >
          <RotateCcw size={16} />
        </ToolbarButton>
        <ToolbarButton
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          onClick={() => setIsFullscreen((v) => !v)}
          disabled={!editor}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </ToolbarButton>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleInsertImage}
        disabled={disabled || isUploadingImage}
      />
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}