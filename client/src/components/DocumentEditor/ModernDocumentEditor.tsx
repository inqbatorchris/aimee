import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ImageUploadDialog } from '@/components/document-editor/ImageUploadDialog';
import { EnhancedRichTextEditor } from './EnhancedRichTextEditor';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Quote, 
  Link, 
  Image, 
  Video,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Undo,
  Redo
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DOMPurify from 'dompurify';

interface ModernDocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  useEnhancedEditor?: boolean;
  onSave?: () => void;
  autoSaveInterval?: number;
}

export function ModernDocumentEditor({ 
  content, 
  onChange, 
  placeholder = "Start writing...",
  useEnhancedEditor = true,
  onSave,
  autoSaveInterval = 30000
}: ModernDocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);

  // Handle image click for selection
  const handleImageClick = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    const img = e.target as HTMLImageElement;
    setSelectedImage(img);
    
    // Add selection border
    if (editorRef.current) {
      editorRef.current.querySelectorAll('img').forEach(image => {
        image.style.outline = 'none';
      });
      img.style.outline = '2px solid #3b82f6';
    }
  }, []);

  // Add click listeners to images for resizing
  const addImageClickListeners = useCallback(() => {
    if (!editorRef.current) return;
    
    const images = editorRef.current.querySelectorAll('img');
    images.forEach(img => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', handleImageClick);
    });
  }, [handleImageClick]);

  // Update editor content when content prop changes
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      // Sanitize content to prevent XSS attacks
      const sanitized = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                       'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'pre', 'code', 'div', 
                       'span', 'iframe', 'b', 'i'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 
                       'rel', 'width', 'height', 'frameborder', 'allowfullscreen'],
        ALLOW_DATA_ATTR: false
      });
      editorRef.current.innerHTML = sanitized;
      // Add click listeners to images
      setTimeout(() => addImageClickListeners(), 100);
    }
  }, [content, addImageClickListeners]);

  // Handle clicking outside to deselect image
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedImage && !selectedImage.contains(e.target as Node)) {
        selectedImage.style.outline = 'none';
        setSelectedImage(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedImage]);

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onChange(newContent);
      // Re-add click listeners after content changes
      setTimeout(() => addImageClickListeners(), 100);
    }
  }, [onChange, addImageClickListeners]);

  // Execute document command
  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  }, [handleContentChange]);

  // Format buttons configuration
  const formatButtons = [
    { command: 'bold', icon: Bold, title: 'Bold' },
    { command: 'italic', icon: Italic, title: 'Italic' },
    { command: 'underline', icon: Underline, title: 'Underline' },
  ];

  const listButtons = [
    { command: 'insertUnorderedList', icon: List, title: 'Bullet List' },
    { command: 'insertOrderedList', icon: ListOrdered, title: 'Numbered List' },
  ];

  const alignButtons = [
    { command: 'justifyLeft', icon: AlignLeft, title: 'Align Left' },
    { command: 'justifyCenter', icon: AlignCenter, title: 'Align Center' },
    { command: 'justifyRight', icon: AlignRight, title: 'Align Right' },
  ];

  // Handle heading selection
  const insertHeading = (level: number) => {
    executeCommand('formatBlock', `h${level}`);
  };

  // Handle link insertion
  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  // Handle image insertion from dialog
  const handleInsertImage = (url: string, alt?: string) => {
    if (editorRef.current) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = alt || '';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '16px auto';
      img.style.cursor = 'pointer';
      
      // Add click listener
      img.addEventListener('click', handleImageClick);
      
      // Insert at current cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.insertNode(img);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editorRef.current.appendChild(img);
      }
      
      handleContentChange();
    }
  };

  // Resize selected image
  const resizeImage = (size: 'small' | 'medium' | 'large' | 'full') => {
    if (!selectedImage) return;
    
    const sizes = {
      small: '25%',
      medium: '50%',
      large: '75%',
      full: '100%'
    };
    
    selectedImage.style.maxWidth = sizes[size];
    selectedImage.style.width = sizes[size];
    handleContentChange();
  };

  // Handle video insertion (embed)
  const insertVideo = () => {
    const url = prompt('Enter video URL (YouTube, Vimeo, etc.):');
    if (url) {
      // Convert to embed URL if possible
      let embedUrl = url;
      
      // YouTube
      if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
      // Vimeo
      else if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
        embedUrl = `https://player.vimeo.com/video/${videoId}`;
      }

      const iframe = `<div class="video-embed" style="position: relative; padding-bottom: 56.25%; height: 0; margin: 16px 0;"><iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen></iframe></div>`;
      
      if (editorRef.current) {
        document.execCommand('insertHTML', false, iframe);
        handleContentChange();
      }
    }
  };

  // Handle quote insertion
  const insertQuote = () => {
    executeCommand('formatBlock', 'blockquote');
  };

  // Handle code block insertion
  const insertCodeBlock = () => {
    const code = prompt('Enter code:');
    if (code) {
      const codeBlock = `<pre style="background: #f5f5f5; padding: 16px; border-radius: 4px; overflow-x: auto; margin: 16px 0;"><code>${code}</code></pre>`;
      document.execCommand('insertHTML', false, codeBlock);
      handleContentChange();
    }
  };

  // Handle key shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          executeCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          executeCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          executeCommand('underline');
          break;
        case 'z':
          e.preventDefault();
          executeCommand('undo');
          break;
        case 'y':
          e.preventDefault();
          executeCommand('redo');
          break;
      }
    }
  };

  // Handle paste to clean up formatting
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleContentChange();
  };

  // Use enhanced editor if enabled
  if (useEnhancedEditor) {
    return (
      <EnhancedRichTextEditor
        content={content}
        onChange={onChange}
        placeholder={placeholder}
        onSave={onSave}
        autoSaveInterval={autoSaveInterval}
      />
    );
  }

  // Fallback to basic editor
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="bg-card border-b border-border p-2 flex items-center gap-1 flex-wrap">
        {/* Headings */}
        <select
          className="text-xs border border-border rounded px-2 py-1 bg-background"
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'p') {
              executeCommand('formatBlock', 'p');
            } else {
              insertHeading(parseInt(value));
            }
            e.target.value = 'p'; // Reset to paragraph
          }}
        >
          <option value="p">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
        </select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Format buttons */}
        {formatButtons.map((button) => (
          <Button
            key={button.command}
            variant="ghost"
            size="sm"
            onClick={() => executeCommand(button.command)}
            title={button.title}
            className="h-8 w-8 p-0"
          >
            <button.icon className="h-4 w-4" />
          </Button>
        ))}

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* List buttons */}
        {listButtons.map((button) => (
          <Button
            key={button.command}
            variant="ghost"
            size="sm"
            onClick={() => executeCommand(button.command)}
            title={button.title}
            className="h-8 w-8 p-0"
          >
            <button.icon className="h-4 w-4" />
          </Button>
        ))}

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment buttons */}
        {alignButtons.map((button) => (
          <Button
            key={button.command}
            variant="ghost"
            size="sm"
            onClick={() => executeCommand(button.command)}
            title={button.title}
            className="h-8 w-8 p-0"
          >
            <button.icon className="h-4 w-4" />
          </Button>
        ))}

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Special content buttons */}
        <Button
          variant="ghost"
          size="sm"
          onClick={insertQuote}
          title="Quote"
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={insertCodeBlock}
          title="Code Block"
          className="h-8 w-8 p-0"
        >
          <Code className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={insertLink}
          title="Insert Link"
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowImageDialog(true)}
          title="Insert Image"
          className="h-8 w-8 p-0"
        >
          <Image className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={insertVideo}
          title="Insert Video"
          className="h-8 w-8 p-0"
        >
          <Video className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('undo')}
          title="Undo"
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('redo')}
          title="Redo"
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>

        {/* Image resize controls */}
        {selectedImage && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <span className="text-xs text-muted-foreground px-2">Image Size:</span>
            <Button
              variant={selectedImage.style.width === '25%' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => resizeImage('small')}
              title="Small (25%)"
              className="h-8 px-2 text-xs"
            >
              Small
            </Button>
            <Button
              variant={selectedImage.style.width === '50%' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => resizeImage('medium')}
              title="Medium (50%)"
              className="h-8 px-2 text-xs"
            >
              Medium
            </Button>
            <Button
              variant={selectedImage.style.width === '75%' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => resizeImage('large')}
              title="Large (75%)"
              className="h-8 px-2 text-xs"
            >
              Large
            </Button>
            <Button
              variant={selectedImage.style.width === '100%' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => resizeImage('full')}
              title="Full Width (100%)"
              className="h-8 px-2 text-xs"
            >
              Full
            </Button>
          </>
        )}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className={`min-h-[400px] p-6 focus:outline-none overflow-y-auto prose prose-sm max-w-none ${
          isEditorFocused ? 'ring-2 ring-ring ring-offset-2' : ''
        }`}
        style={{
          lineHeight: '1.6',
          fontSize: '14px',
        }}
        onInput={handleContentChange}
        onFocus={() => setIsEditorFocused(true)}
        onBlur={() => setIsEditorFocused(false)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        [contenteditable] h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.5em 0;
        }
        
        [contenteditable] h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.4em 0;
        }
        
        [contenteditable] h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 0.3em 0;
        }
        
        [contenteditable] h4 {
          font-size: 1.1em;
          font-weight: bold;
          margin: 0.3em 0;
        }
        
        [contenteditable] blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          background: #f9fafb;
          padding: 1em;
          border-radius: 4px;
        }
        
        [contenteditable] ul, [contenteditable] ol {
          margin: 1em 0;
          padding-left: 2em;
        }
        
        [contenteditable] li {
          margin: 0.5em 0;
        }
        
        [contenteditable] a {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
          border-radius: 4px;
        }
        
        [contenteditable] .video-embed {
          margin: 1em 0;
        }
      `}</style>
      
      {/* Image Upload Dialog */}
      <ImageUploadDialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onImageSelected={handleInsertImage}
        title="Insert Image"
      />
    </div>
  );
}