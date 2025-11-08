import { BookOpen, Globe, Users, Mail, FileText, Paperclip, File } from 'lucide-react';

export type DocumentType = 'internal_kb' | 'website_page' | 'customer_kb' | 'marketing_email' | 'marketing_letter' | 'attachment';

export const documentTypeConfig = {
  internal_kb: { 
    label: 'Internal Knowledge Base', 
    icon: BookOpen, 
    color: 'blue' 
  },
  website_page: { 
    label: 'Website Page', 
    icon: Globe, 
    color: 'green' 
  },
  customer_kb: { 
    label: 'Customer Knowledge Base', 
    icon: Users, 
    color: 'purple' 
  },
  marketing_email: { 
    label: 'Marketing Email', 
    icon: Mail, 
    color: 'orange' 
  },
  marketing_letter: { 
    label: 'Marketing Letter', 
    icon: FileText, 
    color: 'gray' 
  },
  attachment: { 
    label: 'Attachment', 
    icon: Paperclip, 
    color: 'slate' 
  }
} as const;

export const documentTypes = Object.keys(documentTypeConfig) as DocumentType[];

export const getDocumentTypeConfig = (type: string) => {
  return documentTypeConfig[type as DocumentType] || {
    label: 'Document',
    icon: File,
    color: 'gray'
  };
};