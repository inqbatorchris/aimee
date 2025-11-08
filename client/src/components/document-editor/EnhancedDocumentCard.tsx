import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MoreVertical, 
  FileText, 
  Calendar, 
  User,
  Eye,
  Edit,
  Trash2,
  UserPlus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EnhancedDocument {
  id: number;
  title: string;
  content?: string;
  description?: string;
  category?: string;
  status: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'internal' | 'private';
  tags?: string[];
  labels?: string[];
  publishedAt?: string | null;
  estimatedReadingTime?: number | null;
  featuredImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  author?: {
    id: number;
    fullName: string;
  };
}

interface EnhancedDocumentCardProps {
  document: EnhancedDocument;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  isAdmin: boolean;
}

export function EnhancedDocumentCard({
  document,
  onClick,
  onEdit,
  onDelete,
  onAssign,
  isAdmin
}: EnhancedDocumentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return '🌐';
      case 'internal':
        return '🏢';
      case 'private':
        return '🔒';
      default:
        return '📄';
    }
  };

  // Generate clean description from content if not provided
  const getTextFromHtml = (html: string) => {
    if (!html) return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const text = doc.body.textContent || '';
      return text.trim();
    } catch (e) {
      // Fallback: simple regex to strip basic HTML tags
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  };
  
  const description = (() => {
    if (document.description && !document.description.includes('<')) {
      return document.description;
    }
    const textContent = document.description 
      ? getTextFromHtml(document.description)
      : document.content 
        ? getTextFromHtml(document.content)
        : '';
    return textContent ? textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '') : 'No description available';
  })();

  return (
    <Card className="hover:shadow-sm transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-2">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 mr-2">
            <h3 className="text-xs font-medium hover:text-primary transition-colors line-clamp-1">
              {document.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {description}
            </p>
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                  <MoreVertical className="h-2.5 w-2.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}>
                  <Edit className="h-2.5 w-2.5 mr-1" />
                  Edit
                </DropdownMenuItem>
                {onAssign && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onAssign();
                  }}>
                    <UserPlus className="h-2.5 w-2.5 mr-1" />
                    Assign Training
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-2.5 w-2.5 mr-1" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Badge className={`text-xs px-1 py-0 ${getStatusColor(document.status)}`}>
              {document.status}
            </Badge>
            {document.visibility && (
              <span className="text-xs" title={document.visibility}>
                {getVisibilityIcon(document.visibility)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Calendar className="h-2.5 w-2.5" />
            {(() => {
              const dateToShow = document.publishedAt || document.updatedAt || document.createdAt;
              if (!dateToShow) return 'Recently';
              try {
                return new Date(dateToShow).toLocaleDateString('en-US', { 
                  month: 'numeric', 
                  day: 'numeric',
                  year: '2-digit'
                });
              } catch (e) {
                return 'Recently';
              }
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}