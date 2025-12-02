export const documentTypeConfig = {
  internal_kb: { 
    label: 'Internal Knowledge Base', 
    icon: 'BookOpen', 
    color: 'blue' 
  },
  website_page: { 
    label: 'Website Page', 
    icon: 'Globe', 
    color: 'green' 
  },
  customer_kb: { 
    label: 'Customer Knowledge Base', 
    icon: 'Users', 
    color: 'purple' 
  },
  marketing_email: { 
    label: 'Marketing Email', 
    icon: 'Mail', 
    color: 'orange' 
  },
  marketing_letter: { 
    label: 'Marketing Letter', 
    icon: 'FileText', 
    color: 'gray' 
  },
  attachment: { 
    label: 'Attachment', 
    icon: 'Paperclip', 
    color: 'slate' 
  },
  ai_prompt: { 
    label: 'AI Prompt', 
    icon: 'Bot', 
    color: 'cyan' 
  },
  system_prompt: { 
    label: 'System Prompt', 
    icon: 'Terminal', 
    color: 'indigo' 
  }
} as const;

export type DocumentType = keyof typeof documentTypeConfig;

export const documentTypes = Object.keys(documentTypeConfig) as DocumentType[];

export const getDocumentTypeConfig = (type: string) => {
  return documentTypeConfig[type as DocumentType] || {
    label: 'Document',
    icon: 'File',
    color: 'gray'
  };
};