import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface Document {
  id: number;
  title: string;
  content: string;
  category?: string;
  status: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'internal' | 'private';
  featuredImage?: string;
  tags?: string[];
  estimatedReadingTime?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  author?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface DocumentPreviewTabProps {
  document?: Document;
  isLoading: boolean;
}

export function DocumentPreviewTab({ document, isLoading }: DocumentPreviewTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No document to preview</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Featured Image */}
        {document.featuredImage && (
          <div className="relative h-64 w-full rounded-lg overflow-hidden">
            <img
              src={document.featuredImage}
              alt={document.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{document.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {document.author && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{document.author.fullName}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {document.publishedAt 
                  ? format(new Date(document.publishedAt), 'MMM d, yyyy')
                  : document.updatedAt 
                    ? format(new Date(document.updatedAt), 'MMM d, yyyy')
                    : 'No date available'}
              </span>
            </div>

            {document.estimatedReadingTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{document.estimatedReadingTime} min read</span>
              </div>
            )}
          </div>

          {/* Tags and Category */}
          <div className="flex flex-wrap gap-2">
            {document.category && (
              <Badge variant="secondary">{document.category}</Badge>
            )}
            {document.tags?.map((tag) => (
              <Badge key={tag} variant="outline">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Content */}
        <Card className="p-6">
          <div 
            className="document-prose max-w-none"
            dangerouslySetInnerHTML={{ __html: document.content }}
          />
        </Card>
      </div>
    </div>
  );
}