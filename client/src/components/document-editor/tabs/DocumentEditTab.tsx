import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2 } from 'lucide-react';
import { ModernDocumentEditor } from '@/components/DocumentEditor/ModernDocumentEditor';

interface Document {
  id: number;
  title: string;
  content: string;
  category?: string;
  status: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'internal' | 'private';
  featuredImage?: string;
  tags?: string[];
}

interface DocumentEditTabProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  isLoading: boolean;
}

export function DocumentEditTab({
  title,
  content,
  onTitleChange,
  onContentChange,
  onSave,
  isLoading
}: DocumentEditTabProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with title and save button */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <Input
            id="title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter document title..."
            className="h-8 text-sm"
            autoComplete="off"
            data-form-type="other"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={!title.trim() || isSaving}
          size="sm"
          className="h-8"
          type="button"
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Save className="h-3 w-3 mr-1" />
          )}
          Save
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <ModernDocumentEditor
          content={content}
          onChange={onContentChange}
          placeholder="Start writing your document..."
          onSave={onSave}
          useEnhancedEditor={true}
          autoSaveInterval={30000}
        />
      </div>
    </div>
  );
}