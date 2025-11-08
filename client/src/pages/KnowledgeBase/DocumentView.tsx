import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import { marked } from 'marked';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Tag, 
  Clock, 
  Edit3,
  FileText,
  ExternalLink,
  Activity,
  GitBranch
} from 'lucide-react';
import { BookOpen as BookOpenIcon, Globe as GlobeIcon, Users as UsersIcon, Mail as MailIcon, FileText as FileTextIcon, Paperclip as PaperclipIcon, File as FileIcon } from 'lucide-react';

type DocumentType = 'internal_kb' | 'website_page' | 'customer_kb' | 'marketing_email' | 'marketing_letter' | 'attachment';

const documentTypeConfig = {
  internal_kb: { label: 'Internal Knowledge Base', icon: BookOpenIcon, color: 'blue' },
  website_page: { label: 'Website Page', icon: GlobeIcon, color: 'green' },
  customer_kb: { label: 'Customer Knowledge Base', icon: UsersIcon, color: 'purple' },
  marketing_email: { label: 'Marketing Email', icon: MailIcon, color: 'orange' },
  marketing_letter: { label: 'Marketing Letter', icon: FileTextIcon, color: 'gray' },
  attachment: { label: 'Attachment', icon: PaperclipIcon, color: 'slate' }
} as const;

const getDocumentTypeConfig = (type: string) => {
  return documentTypeConfig[type as DocumentType] || {
    label: 'Document',
    icon: FileIcon,
    color: 'gray'
  };
};
import type { KnowledgeDocument } from '@shared/schema';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentActivityTab } from '@/components/document-activity/DocumentActivityTab';
import { DocumentVersionTab } from '@/components/document-activity/DocumentVersionTab';

interface ExtendedKnowledgeDocument extends KnowledgeDocument {
  category?: {
    id: number;
    name: string;
  };
  author?: {
    id: number;
    fullName: string;
  };
  documentType: string;
  externalUrl?: string;
  versionNumber?: number;
}

export default function DocumentView() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Fetch document
  const { data: document, isLoading, error } = useQuery<ExtendedKnowledgeDocument>({
    queryKey: [`/api/knowledge-base/documents/${id}`],
    enabled: !!id
  });

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Unknown';
    const date = typeof dateString === 'string' ? dateString : dateString.toISOString();
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (documentType: string) => {
    const config = getDocumentTypeConfig(documentType as DocumentType);
    const IconComponent = config.icon;
    return <IconComponent className="h-5 w-5" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'default';
      case 'draft': return 'secondary';
      case 'archived': return 'outline';
      default: return 'outline';
    }
  };

  const canEdit = document && (
    currentUser?.role === 'super_admin' || 
    currentUser?.role === 'admin' ||
    document.authorId === currentUser?.id
  );

  // Convert Markdown to HTML if needed
  const processedContent = useMemo(() => {
    if (!document?.content) return 'No content available.';
    
    const content = document.content;
    
    // Check if content looks like Markdown (has # headers or other markdown patterns)
    const isMarkdown = content.includes('\n#') || content.startsWith('#') || 
                      content.includes('\n##') || content.includes('\n-') ||
                      content.includes('\n*') || content.includes('\n>');
    
    // If it's Markdown, convert to HTML
    if (isMarkdown) {
      try {
        return marked(content) as string;
      } catch (error) {
        console.error('Error parsing markdown:', error);
        return content;
      }
    }
    
    // Otherwise, assume it's already HTML
    return content;
  }, [document?.content]);

  // Handle anchor link navigation
  useEffect(() => {
    const handleAnchorClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const id = target.getAttribute('href')?.substring(1);
        if (id) {
          const element = window.document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    };

    const contentDiv = window.document.querySelector('[data-testid="document-content"]');
    if (contentDiv) {
      contentDiv.addEventListener('click', handleAnchorClick);
      return () => contentDiv.removeEventListener('click', handleAnchorClick);
    }
  }, [processedContent]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Document Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The document you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link href="/helpdesk/knowledge">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Knowledge Base
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="document-view">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/strategy/knowledge-base">
            <Button variant="ghost" size="sm" data-testid="back-button">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Knowledge Base
            </Button>
          </Link>
          {canEdit && (
            <Link href={`/knowledge-base/documents/${id}/edit`}>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[12px]" data-testid="edit-button">
                <Edit3 className="h-3 w-3 mr-1" />
                Edit Document
              </Button>
            </Link>
          )}
        </div>

        {/* Document Header */}
        <div className="space-y-4">
          {/* Title and Type */}
          <div className="flex items-start gap-3">
            {getTypeIcon(document.documentType)}
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2" data-testid="document-title">
                {document.title}
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(document.status)}>
                  {document.status}
                </Badge>
                <Badge variant="outline">
                  {getDocumentTypeConfig(document.documentType as DocumentType).label}
                </Badge>
                {document.category && (
                  <Badge variant="outline">
                    <Tag className="h-3 w-3 mr-1" />
                    {document.category.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            {document.author && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>By {document.author.fullName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Updated {formatDate(document.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Created {formatDate(document.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Document Content */}
      <Card>
        <CardContent className="p-8">
          {document.summary && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-muted-foreground">{document.summary}</p>
            </div>
          )}
          
          <div 
            className="document-prose"
            dangerouslySetInnerHTML={{ __html: processedContent }}
            data-testid="document-content"
          />
        </CardContent>
      </Card>

      {/* Additional Information */}
      {(document.externalUrl || document.tags) && (
        <Card className="mt-6">
          <CardHeader>
            <h3 className="font-semibold">Additional Information</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {document.externalUrl && (
                <div>
                  <h4 className="font-medium mb-2">External Link</h4>
                  <a 
                    href={document.externalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                    data-testid="external-link"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {document.externalUrl}
                  </a>
                </div>
              )}
              
              {document.tags && document.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Notice */}
      {document.status === 'draft' && (
        <Card className="mt-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Draft Document</span>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              This document is in draft status and may not be complete or reviewed.
            </p>
          </CardContent>
        </Card>
      )}

      {document.status === 'archived' && (
        <Card className="mt-6 border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Archived Document</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              This document has been archived and may contain outdated information.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Document Activity & Version Tabs */}
      <Tabs defaultValue="activity" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Version History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="activity" className="mt-4">
          <DocumentActivityTab documentId={parseInt(id || '0')} />
        </TabsContent>
        
        <TabsContent value="versions" className="mt-4">
          <DocumentVersionTab 
            documentId={parseInt(id || '0')} 
            currentDocument={{
              id: document.id,
              title: document.title,
              content: document.content ?? undefined,
              versionNumber: document.versionNumber
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}