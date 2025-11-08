import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Youtube } from '@tiptap/extension-youtube';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { CharacterCount } from '@tiptap/extension-character-count';
import { createLowlight } from 'lowlight';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, ListChecks, Quote, Code, Link as LinkIcon,
  Image as ImageIcon, Video, Table as TableIcon, Type,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Search, Replace, Save, Hash, Minus, Plus,
  IndentDecrease, IndentIncrease, Highlighter, Palette,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  FileText, ChevronDown, Slash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableControls } from './TableControls';
import { ColorPicker } from './ColorPicker';
import { ImageUploadDialog } from '@/components/document-editor/ImageUploadDialog';
import { useToast } from '@/hooks/use-toast';
import './enhanced-editor.css';

interface EnhancedRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onSave?: () => void;
  autoSaveInterval?: number;
  className?: string;
}

export function EnhancedRichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing or use "/" for commands...',
  onSave,
  autoSaveInterval = 30000,
  className
}: EnhancedRichTextEditorProps) {
  const { toast } = useToast();
  const lowlight = createLowlight();
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedContentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        },
        codeBlock: false
      }),
      Underline,
      Superscript,
      Subscript,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg'
        }
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        nocookie: true,
        HTMLAttributes: {
          class: 'rounded-lg overflow-hidden'
        }
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Placeholder.configure({
        placeholder
      }),
      CodeBlockLowlight.configure({
        lowlight
      }),
      CharacterCount
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      
      // Update word and character count
      const text = editor.getText();
      setWordCount(text.split(/\s+/).filter(word => word.length > 0).length);
      setCharCount(editor.storage.characterCount.characters());

      // Auto-save with debounce
      if (onSave && autoSaveInterval > 0) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        
        autoSaveTimeoutRef.current = setTimeout(() => {
          if (html !== lastSavedContentRef.current) {
            onSave();
            lastSavedContentRef.current = html;
            toast({
              title: 'Auto-saved',
              description: 'Your changes have been saved automatically.',
              duration: 2000
            });
          }
        }, autoSaveInterval);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-6',
        spellcheck: 'true'
      }
    }
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Cleanup auto-save timeout
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Find and Replace
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
      }
      
      // Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSave) {
          onSave();
          toast({
            title: 'Saved',
            description: 'Your document has been saved.',
            duration: 2000
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, onSave, toast]);

  const insertLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    
    if (linkUrl === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    
    setShowLinkDialog(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const insertImage = useCallback((url: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const insertYoutubeVideo = useCallback(() => {
    if (!editor) return;
    
    const url = prompt('Enter YouTube URL:');
    if (url) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const handleFindReplace = useCallback(() => {
    if (!editor || !findText) return;
    
    // Simple find and replace implementation
    const content = editor.getHTML();
    const newContent = content.replace(new RegExp(findText, 'g'), replaceText);
    editor.commands.setContent(newContent);
    
    toast({
      title: 'Replaced',
      description: `Replaced all occurrences of "${findText}" with "${replaceText}".`,
      duration: 2000
    });
    
    setShowFindReplace(false);
    setFindText('');
    setReplaceText('');
  }, [editor, findText, replaceText, toast]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children, 
    title 
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
  }) => (
    <Button
      type="button"
      variant={isActive ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );

  return (
    <div className={cn("enhanced-editor border border-border rounded-lg overflow-hidden bg-background", className)}>
      {/* Main Toolbar */}
      <div className="toolbar bg-card border-b border-border p-2 flex items-center gap-1 flex-wrap">
        {/* Headings Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <Type className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8"
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              Paragraph
            </Button>
            {[1, 2, 3, 4, 5, 6].map(level => (
              <Button
                key={level}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8"
                onClick={() => editor.chain().focus().toggleHeading({ level: level as any }).run()}
              >
                Heading {level}
              </Button>
            ))}
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          isActive={editor.isActive('superscript')}
          title="Superscript"
        >
          <SuperscriptIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          isActive={editor.isActive('subscript')}
          title="Subscript"
        >
          <SubscriptIcon className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Colors */}
        <ColorPicker
          label="Text Color"
          icon={<Palette className="h-4 w-4" />}
          onColorChange={(color) => editor.chain().focus().setColor(color).run()}
        />
        
        <ColorPicker
          label="Highlight"
          icon={<Highlighter className="h-4 w-4" />}
          onColorChange={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
        />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Task List"
        >
          <ListChecks className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Indentation */}
        <ToolbarButton
          onClick={() => editor.chain().focus().liftListItem('listItem').run()}
          title="Decrease Indent"
        >
          <IndentDecrease className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
          title="Increase Indent"
        >
          <IndentIncrease className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Insert Elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        
        <Popover open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <PopoverTrigger asChild>
            <Button
              variant={editor.isActive('link') ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              title="Insert Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Insert Link</h4>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    insertLink();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={insertLink}>
                  Insert
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setShowLinkDialog(false);
                  }}
                >
                  Remove Link
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <ToolbarButton
          onClick={() => setShowImageDialog(true)}
          title="Insert Image"
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={insertYoutubeVideo}
          title="Insert YouTube Video"
        >
          <Video className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={insertTable}
          title="Insert Table"
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Horizontal Rule */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Find and Replace */}
        <ToolbarButton
          onClick={() => setShowFindReplace(true)}
          title="Find and Replace (Ctrl+F)"
        >
          <Search className="h-4 w-4" />
        </ToolbarButton>

        {/* Save */}
        {onSave && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <ToolbarButton
              onClick={() => {
                onSave();
                toast({
                  title: 'Saved',
                  description: 'Your document has been saved.',
                  duration: 2000
                });
              }}
              title="Save (Ctrl+S)"
            >
              <Save className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}
      </div>

      {/* Find and Replace Bar */}
      {showFindReplace && (
        <div className="bg-muted p-2 border-b border-border flex items-center gap-2">
          <Input
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="Find..."
            className="h-8 w-40"
          />
          <Input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace with..."
            className="h-8 w-40"
          />
          <Button size="sm" onClick={handleFindReplace} className="h-8">
            Replace All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowFindReplace(false);
              setFindText('');
              setReplaceText('');
            }}
            className="h-8"
          >
            Close
          </Button>
        </div>
      )}

      {/* Editor Content */}
      <div className="editor-content relative">
        <EditorContent editor={editor} />

        {/* Table Controls */}
        {editor.isActive('table') && <TableControls editor={editor} />}
      </div>

      {/* Status Bar */}
      <div className="status-bar bg-muted border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Words: {wordCount}</span>
          <span>Characters: {charCount}</span>
        </div>
        {autoSaveInterval > 0 && (
          <span className="text-green-600 dark:text-green-400">
            Auto-save enabled
          </span>
        )}
      </div>

      {/* Image Upload Dialog */}
      <ImageUploadDialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onImageSelected={insertImage}
        title="Insert Image"
      />
    </div>
  );
}