import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Minus,
  Trash2,
  TableIcon,
  Columns3,
  Rows3,
  Merge,
  Split
} from 'lucide-react';

interface TableControlsProps {
  editor: Editor;
}

export function TableControls({ editor }: TableControlsProps) {
  const ControlButton = ({ 
    onClick, 
    disabled = false, 
    children, 
    title,
    variant = "ghost" 
  }: {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
    variant?: "ghost" | "destructive" | "outline" | "secondary" | "default";
  }) => (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-7 px-2 text-xs"
    >
      {children}
    </Button>
  );

  return (
    <div className="table-controls absolute top-0 right-0 m-2 bg-card border border-border rounded-lg p-1 shadow-lg flex items-center gap-1 z-10">
      <div className="flex items-center gap-0.5">
        <ControlButton
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          title="Add column before"
        >
          <Columns3 className="h-3 w-3 mr-1" />
          <Plus className="h-3 w-3" />
          Before
        </ControlButton>
        
        <ControlButton
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title="Add column after"
        >
          <Columns3 className="h-3 w-3 mr-1" />
          <Plus className="h-3 w-3" />
          After
        </ControlButton>
        
        <ControlButton
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title="Delete column"
          variant="destructive"
        >
          <Columns3 className="h-3 w-3 mr-1" />
          <Minus className="h-3 w-3" />
        </ControlButton>
      </div>

      <div className="w-px h-5 bg-border" />

      <div className="flex items-center gap-0.5">
        <ControlButton
          onClick={() => editor.chain().focus().addRowBefore().run()}
          title="Add row before"
        >
          <Rows3 className="h-3 w-3 mr-1" />
          <Plus className="h-3 w-3" />
          Before
        </ControlButton>
        
        <ControlButton
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title="Add row after"
        >
          <Rows3 className="h-3 w-3 mr-1" />
          <Plus className="h-3 w-3" />
          After
        </ControlButton>
        
        <ControlButton
          onClick={() => editor.chain().focus().deleteRow().run()}
          title="Delete row"
          variant="destructive"
        >
          <Rows3 className="h-3 w-3 mr-1" />
          <Minus className="h-3 w-3" />
        </ControlButton>
      </div>

      <div className="w-px h-5 bg-border" />

      <div className="flex items-center gap-0.5">
        <ControlButton
          onClick={() => editor.chain().focus().mergeCells().run()}
          title="Merge cells"
        >
          <Merge className="h-3 w-3 mr-1" />
          Merge
        </ControlButton>
        
        <ControlButton
          onClick={() => editor.chain().focus().splitCell().run()}
          title="Split cell"
        >
          <Split className="h-3 w-3 mr-1" />
          Split
        </ControlButton>
        
        <ControlButton
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          title="Toggle header row"
        >
          <TableIcon className="h-3 w-3 mr-1" />
          Header
        </ControlButton>
      </div>

      <div className="w-px h-5 bg-border" />

      <ControlButton
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Delete table"
        variant="destructive"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Delete Table
      </ControlButton>
    </div>
  );
}