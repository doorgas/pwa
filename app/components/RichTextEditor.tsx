'use client';
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter your content here...",
  height = "200px",
  disabled = false
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: !disabled,
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none p-4 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
        style: `min-height: ${height}; max-height: 400px; overflow-y: auto;`,
        placeholder: placeholder,
      },
    },
  });

  React.useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50" style={{ minHeight: height }}>
        <div className="animate-pulse">Loading rich text editor...</div>
      </div>
    );
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-2 flex flex-wrap gap-1">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('bold') ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Bold"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 4a1 1 0 011-1h3a3 3 0 013 3v.5a2.5 2.5 0 011.5 2.3v.2a3 3 0 01-3 3H6a1 1 0 01-1-1V4zm2 1v3h3a1 1 0 000-2H7zm0 5v3h3.5a1 1 0 000-2H7z" clipRule="evenodd" />
            </svg>
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('italic') ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Italic"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 1a1 1 0 011 1v1h2a1 1 0 110 2h-.5l-1 8H11a1 1 0 110 2H9a1 1 0 01-1-1v-1H6a1 1 0 110-2h.5l1-8H7a1 1 0 110-2h1V2a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor.can().chain().focus().toggleUnderline().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('underline') ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Underline"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 18h12v1H4v-1zM6 2h2v8c0 1.1.9 2 2 2s2-.9 2-2V2h2v8c0 2.21-1.79 4-4 4s-4-1.79-4-4V2z"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('strike') ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Strikethrough"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.2 9H2.8c-.4 0-.8.4-.8.8s.4.8.8.8h14.4c.4 0 .8-.4.8-.8s-.4-.8-.8-.8z"/>
              <path d="M7.1 6.4c.2-.5.6-.9 1.1-1.1.5-.3 1.1-.4 1.8-.4 1.2 0 2.1.3 2.7.8.6.5.9 1.2.9 2.1h1.5c0-1.3-.5-2.4-1.4-3.2C12.8 4 11.5 3.6 10 3.6c-1 0-1.9.2-2.6.5-.7.3-1.3.8-1.7 1.4-.4.6-.6 1.3-.6 2.1 0 .7.1 1.3.4 1.8h1.6c-.2-.5-.3-1-.3-1.5 0-.8.1-1.5.3-2.1z"/>
              <path d="M12.9 13.6c-.2.5-.6.9-1.1 1.1-.5.3-1.1.4-1.8.4-1.2 0-2.1-.3-2.7-.8-.6-.5-.9-1.2-.9-2.1H5c0 1.3.5 2.4 1.4 3.2C7.2 16 8.5 16.4 10 16.4c1 0 1.9-.2 2.6-.5.7-.3 1.3-.8 1.7-1.4.4-.6.6-1.3.6-2.1 0-.7-.1-1.3-.4-1.8h-1.6c.2.5.3 1 .3 1.5 0 .8-.1 1.5-.3 2.1z"/>
            </svg>
          </button>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-3 py-2 rounded hover:bg-gray-200 transition-colors text-sm font-medium ${
              editor.isActive('heading', { level: 1 }) ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Heading 1"
          >
            H1
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-3 py-2 rounded hover:bg-gray-200 transition-colors text-sm font-medium ${
              editor.isActive('heading', { level: 2 }) ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Heading 2"
          >
            H2
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-3 py-2 rounded hover:bg-gray-200 transition-colors text-sm font-medium ${
              editor.isActive('heading', { level: 3 }) ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Heading 3"
          >
            H3
          </button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('bulletList') ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('orderedList') ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4h1v1H3V4zm2 0h12v1H5V4zM3 8h1v1H3V8zm2 0h12v1H5V8zm-2 4h1v1H3v-1zm2 0h12v1H5v-1z"/>
            </svg>
          </button>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive({ textAlign: 'left' }) ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Align Left"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive({ textAlign: 'center' }) ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Align Center"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm-2 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive({ textAlign: 'right' }) ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Align Right"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm4 4a1 1 0 011-1h8a1 1 0 110 2H8a1 1 0 01-1-1zm-4 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm4 4a1 1 0 011-1h8a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Links and Images */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={setLink}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('link') ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Add Link"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={addImage}
            className={`p-2 rounded hover:bg-gray-200 transition-colors text-gray-700 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Add Image"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <EditorContent 
          editor={editor} 
          className={`tiptap-editor ${disabled ? 'pointer-events-none' : ''}`}
        />
        {!value && !disabled && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .tiptap-editor .ProseMirror {
          outline: none;
          padding: 1rem;
          min-height: ${height};
          max-height: 400px;
          overflow-y: auto;
        }
        
        .tiptap-editor .ProseMirror h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem 0;
          line-height: 1.2;
        }
        
        .tiptap-editor .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
          line-height: 1.3;
        }
        
        .tiptap-editor .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
          line-height: 1.4;
        }
        
        .tiptap-editor .ProseMirror p {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
        
        .tiptap-editor .ProseMirror ul,
        .tiptap-editor .ProseMirror ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .tiptap-editor .ProseMirror li {
          margin: 0.25rem 0;
        }
        
        .tiptap-editor .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }
        
        .tiptap-editor .ProseMirror a:hover {
          color: #1d4ed8;
        }
        
        .tiptap-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 0.5rem 0;
        }
        
        .tiptap-editor .ProseMirror blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6b7280;
        }
        
        .tiptap-editor .ProseMirror code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875em;
        }
        
        .tiptap-editor .ProseMirror pre {
          background-color: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 0.375rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        
        .tiptap-editor .ProseMirror pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor; 