import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { 
  Bold, Italic, Underline, Strikethrough,
  Link, Highlighter, Palette,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { ColorPicker } from './ColorPicker';

interface FloatingToolbarProps {
  editor: Editor;
}

export function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    title 
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <Button
      type="button"
      variant={isActive ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      title={title}
      className="h-7 w-7 p-0"
    >
      {children}
    </Button>
  );

  const setLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="floating-toolbar flex items-center gap-0.5 bg-card border border-border rounded-lg p-1 shadow-lg">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="h-3 w-3" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="h-3 w-3" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline"
      >
        <Underline className="h-3 w-3" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-3 w-3" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-0.5" />
      
      <ColorPicker
        label=""
        icon={<Palette className="h-3 w-3" />}
        onColorChange={(color) => editor.chain().focus().setColor(color).run()}
        compact
      />
      
      <ColorPicker
        label=""
        icon={<Highlighter className="h-3 w-3" />}
        onColorChange={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
        compact
      />

      <div className="w-px h-5 bg-border mx-0.5" />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft className="h-3 w-3" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter className="h-3 w-3" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight className="h-3 w-3" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-0.5" />
      
      <ToolbarButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        title="Link"
      >
        <Link className="h-3 w-3" />
      </ToolbarButton>
    </div>
  );
}