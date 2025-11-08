import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Book,
  Code,
  Database,
  FileText,
  Menu,
  Package,
  Table,
  Link,
  Layers,
  GitBranch,
  Key,
  Globe,
  RefreshCw,
  Download,
  ChevronRight,
  ChevronDown,
  Terminal,
  Settings,
  Users,
  Shield,
  Cpu,
  FileJson,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Copy,
  BookOpen,
  Braces,
  Server,
  Cloud,
  Lock,
  Building,
  Bot,
  Palette,
  Star,
  Heart,
  Trash2,
  Edit,
  Eye,
  Target,
  Calendar,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface DocumentationSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  subsections?: DocumentationSection[];
  content?: React.ReactNode;
  type?: 'page' | 'feature' | 'table' | 'api' | 'guide';
  status?: 'complete' | 'in-progress' | 'planned';
  lastUpdated?: string;
}

interface PageDocumentation {
  id: string;
  title: string;
  path: string;
  description: string;
  status: string;
  buildStatus: string;
  functions?: string[];
  metadata?: any;
  componentConfig?: any;
  visibilityRules?: any;
  isCorePage: boolean;
}

interface FeatureDocumentation {
  id: number;
  name: string;
  featureKey?: string;
  description?: string;
  category?: string;
  status?: string;
  visibilityStatus?: string;
  isEnabled: boolean;
  parentFeatureId?: number;
  overview?: string;
  databaseTables?: any;
  userDocumentation?: string;
  implementationDetails?: any;
  technicalSpecifications?: any;
  scopeDefinition?: string;
  billingImpact?: string;
  developerDocs?: any;
  settings?: any;
}

interface TableDocumentation {
  id: number;
  tableName: string;
  label: string;
  description: string;
  rowCount: number;
  fields?: any[];
  relationships?: any[];
}

interface MenuDocumentation {
  id: number;
  title: string;
  path: string;
  icon: string;
  description: string;
  pageId?: string;
  children?: MenuDocumentation[];
}

export default function DeveloperDocumentation() {
  const [selectedSection, setSelectedSection] = useState<string>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  // Fetch replit.md content for contract version and canonical topics
  const { data: replitMdContent } = useQuery({
    queryKey: ['/api/dev/replit-md'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/dev/replit-md');
        const data = await response.json();
        console.log('Fetched replit.md content:', data.content.substring(0, 200));
        return data.content;
      } catch (error) {
        console.error('Failed to fetch replit.md:', error);
        return null;
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Parse YAML front-matter from replit.md
  const parseYamlFrontMatter = (content: string | null) => {
    if (!content) return null;
    
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!yamlMatch) return null;
    
    try {
      // Simple YAML parser for our specific structure
      const yamlContent = yamlMatch[1];
      const lines = yamlContent.split('\n');
      const parsed: any = {};
      
      let currentKey = '';
      for (const line of lines) {
        if (line.includes(':') && !line.startsWith('  ')) {
          const [key, value] = line.split(':').map(s => s.trim());
          if (value) {
            parsed[key] = value;
          } else {
            currentKey = key;
            parsed[key] = [];
          }
        } else if (line.startsWith('  - ') && currentKey) {
          const value = line.substring(4);
          if (value.includes(':')) {
            const [subKey, subValue] = value.split(':').map(s => s.trim());
            parsed[currentKey].push({ [subKey]: subValue });
          } else {
            parsed[currentKey].push(value);
          }
        } else if (line.trim() && currentKey && !line.includes(':')) {
          parsed[currentKey] = line.trim();
        }
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse YAML front-matter:', error);
      return null;
    }
  };

  // Check for banned phrases in documentation
  const checkBannedPhrases = () => {
    const bannedTokens = [
      'DeveloperMode',
      'DeveloperModeContext', 
      'devModeOnly',
      'SlidePanel',
      'bg-#',
      'text-#',
      '#00BFA6'
    ];
    
    const foundBanned: string[] = [];
    const contentToCheck = replitMdContent || '';
    
    bannedTokens.forEach(token => {
      if (contentToCheck.includes(token)) {
        foundBanned.push(token);
      }
    });
    
    return foundBanned;
  };

  const contractInfo = parseYamlFrontMatter(replitMdContent);
  const bannedPhrases = checkBannedPhrases();

  // Fetch pages data
  const { data: pages } = useQuery<PageDocumentation[]>({
    queryKey: ['/api/dev/pages'],
    enabled: true,
  });

  // Fetch features data with new structured fields
  const { data: features } = useQuery<FeatureDocumentation[]>({
    queryKey: ['/api/features'],
    queryFn: async () => {
      const response = await apiRequest('/api/features');
      return response.json();
    },
    enabled: true,
  });


  // Fetch menu data
  const { data: menuData } = useQuery({
    queryKey: ['/api/menu/navigation', { organizationId: 1 }],
    queryFn: async () => {
      const response = await apiRequest('/api/menu/navigation?organizationId=1');
      return response.json();
    },
    enabled: true,
  });

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'The content has been copied to your clipboard.',
    });
  };

  const generateMarkdown = () => {
    let markdown = '# Developer Documentation\n\n';
    markdown += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    markdown += 'This is the comprehensive developer documentation for the aimee.works Platform.\n\n';
    
    // Table of Contents
    markdown += '## Table of Contents\n\n';
    markdown += '1. [Platform Overview](#platform-overview)\n';
    markdown += '2. [AI Code Agent Instructions](#ai-code-agent-instructions)\n';
    markdown += '3. [System Architecture](#system-architecture)\n';
    markdown += '4. [Pages Documentation](#pages-documentation)\n';
    markdown += '5. [Features Documentation](#features-documentation)\n';
    markdown += '6. [Database Schema](#database-schema)\n';
    markdown += '7. [API Documentation](#api-documentation)\n';
    markdown += '8. [Deployment Guide](#deployment-guide)\n\n';

    // 1. Platform Overview
    markdown += '## Platform Overview\n\n';
    markdown += '### What We Solve\n\n';
    markdown += 'aimee.works eliminates the chaos of scattered business tools by providing an integrated workspace where teams can align on objectives, track progress, manage customers, and scale efficiently.\n\n';
    
    markdown += '**Problems We Eliminate:**\n';
    markdown += '- Fragmented business technology stack and tools\n';
    markdown += '- Misaligned teams through poor communication\n\n';

    markdown += '**What We Provide:**\n';
    markdown += '- Unified business strategy and work platform that connects with existing tools or replaces them completely\n';
    markdown += '- Manage work, whether powered by humans or automated AI agents and feed the results directly back in to your strategy and reporting tools\n';
    markdown += '- Self hosted and hosted platforms are available\n\n';

    markdown += '### Core Platform Features\n\n';
    markdown += '- **🎯 Strategy & OKRs**: Goal setting, progress tracking, and strategic alignment across teams\n';
    markdown += '- **👥 Team Collaboration**: Unified workspace for communication, project management, and knowledge sharing\n';
    markdown += '- **🤖 AI-Powered Tools**: Automation, insights, and intelligent assistance across all business functions\n';
    markdown += '- **📊 Business Intelligence**: Real-time dashboards, analytics, and performance monitoring\n';
    markdown += '- **🛠️ Developer Tools**: Database explorer, page manager, and comprehensive development utilities\n';
    markdown += '- **🎨 Theme System**: Complete visual customization with real-time preview and organization branding\n\n';

    markdown += '### Quick Start Guide\n\n';
    markdown += '1. **Clone the Repository**: `git clone [repository-url]`\n';
    markdown += '2. **Install Dependencies**: `npm install`\n';
    markdown += '3. **Set Up Database**: `npm run db:push`\n';
    markdown += '4. **Start Development Server**: `npm run dev`\n\n';

    // 2. AI Code Agent Instructions  
    markdown += '## AI Code Agent Instructions\n\n';
    markdown += '### Development Philosophy\n\n';
    markdown += '**Build ON TOP of existing code, don\'t rebuild**\n';
    markdown += 'Integrate new features with existing patterns, maintain UI consistency, and leverage established components.\n\n';

    markdown += '### Integration First - Specific Patterns\n\n';
    markdown += '#### Component Integration\n\n';
    markdown += '**Always use existing Shadcn/ui components:**\n';
    markdown += '```javascript\n';
    markdown += 'import { Card, CardContent, CardHeader, CardTitle } from \'@/components/ui/card\';\n';
    markdown += 'import { Button } from \'@/components/ui/button\';\n';
    markdown += 'import { Badge } from \'@/components/ui/badge\';\n';
    markdown += '```\n\n';

    markdown += '**Follow page template patterns:**\n';
    markdown += '```javascript\n';
    markdown += 'import { DashboardTemplate } from \'@/components/templates/DashboardTemplate\';\n';
    markdown += 'import { PageTemplate, PageSection } from \'@/components/PageTemplate\';\n';
    markdown += '```\n\n';

    markdown += '#### Navigation Integration\n\n';
    markdown += '**Add pages to menu system via database:**\n';
    markdown += '```javascript\n';
    markdown += '// 1. Add to pages table through admin UI\n';
    markdown += '// 2. Link to features table for proper organization\n';
    markdown += '// 3. Configure menu_items for navigation\n';
    markdown += '// 4. Set proper unifiedStatus (\'dev\' for testing, \'live\' for production)\n';
    markdown += '```\n\n';

    markdown += '### Template-Based Theme System\n\n';
    markdown += '**Always use CSS variables for theming:**\n';
    markdown += '```css\n';
    markdown += '/* Primary brand colors */\n';
    markdown += '--primary: 172 100% 37%; /* #00BFA6 turquoise */\n';
    markdown += '--secondary: 142 44% 42%; /* #27AE60 green */\n';
    markdown += '--background: 0 0% 98%; /* Light theme background */\n';
    markdown += '--foreground: 0 0% 18%; /* Dark text */\n';
    markdown += '```\n\n';

    // 3. System Architecture
    markdown += '## System Architecture\n\n';
    markdown += '### Technology Stack\n\n';
    markdown += '**Frontend:**\n';
    markdown += '- React 18 + TypeScript + Vite\n';
    markdown += '- Tailwind CSS + Shadcn/ui components\n';
    markdown += '- TanStack React Query for state management\n';
    markdown += '- Wouter for routing\n';
    markdown += '- React Hook Form with Zod validation\n\n';

    markdown += '**Backend:**\n';
    markdown += '- Node.js + Express + TypeScript (ESM)\n';
    markdown += '- PostgreSQL with Drizzle ORM\n';
    markdown += '- JWT with role-based access control\n';
    markdown += '- Session management with PostgreSQL\n';
    markdown += '- Multi-tenant architecture\n\n';

    markdown += '**Current vs Target Architecture:**\n\n';
    markdown += '**Current State:**\n';
    markdown += '- ❌ No tenant isolation in queries\n';
    markdown += '- ❌ Single tenant architecture\n';
    markdown += '- ❌ No row-level security\n';
    markdown += '- ❌ Monolithic storage.ts\n\n';

    markdown += '**Target State:**\n';
    markdown += '- ✅ JWT authentication\n';
    markdown += '- ✅ Database connectivity\n';
    markdown += '- ✅ Theme system\n';
    markdown += '- ✅ Menu management\n';
    markdown += '- ✅ Page routing\n\n';

    // 4. Pages Documentation
    if (pages && pages.length > 0) {
      markdown += '## Pages Documentation\n\n';
      markdown += `Total Pages: ${pages.length}\n\n`;
      
      // Group pages by status
      const pagesByStatus = pages.reduce((acc: any, page) => {
        if (!acc[page.status]) acc[page.status] = [];
        acc[page.status].push(page);
        return acc;
      }, {});

      Object.entries(pagesByStatus).forEach(([status, statusPages]: [string, any]) => {
        markdown += `### ${status.charAt(0).toUpperCase() + status.slice(1)} Pages (${statusPages.length})\n\n`;
        statusPages.forEach((page: any) => {
          markdown += `#### ${page.title}\n`;
          markdown += `- **Path**: ${page.path}\n`;
          markdown += `- **Status**: ${page.status}\n`;
          markdown += `- **Build Status**: ${page.buildStatus}\n`;
          markdown += `- **Description**: ${page.description || 'No description'}\n`;
          if (page.functions && page.functions.length > 0) {
            markdown += `- **Functions**: ${page.functions.join(', ')}\n`;
          }
          if (page.isCorePage) {
            markdown += '- **Type**: Core Page\n';
          }
          markdown += '\n';
        });
      });
    }
    
    // 5. Features Documentation
    if (features && features.length > 0) {
      markdown += '## Features Documentation\n\n';
      markdown += `Total Features: ${features.length}\n\n`;
      
      // Group features by parent module
      const modules = features.filter(f => !f.parentFeatureId);
      const childFeatures: { [key: number]: any[] } = {};
      
      features.forEach(feature => {
        if (feature.parentFeatureId) {
          if (!childFeatures[feature.parentFeatureId]) {
            childFeatures[feature.parentFeatureId] = [];
          }
          childFeatures[feature.parentFeatureId].push(feature);
        }
      });

      // Export module-based features
      modules.forEach((module) => {
        markdown += `### ${module.name}\n\n`;
        
        // Module Overview
        if (module.overview) {
          markdown += `**Overview**: ${module.overview}\n\n`;
        }
        
        // Module details
        markdown += `- **Key**: ${module.featureKey}\n`;
        markdown += `- **Category**: ${module.category}\n`;
        markdown += `- **Status**: ${module.visibilityStatus || module.status}\n`;
        markdown += `- **Enabled**: ${module.isEnabled ? 'Yes' : 'No'}\n\n`;
        
        // Child features
        const children = childFeatures[module.id];
        if (children && children.length > 0) {
          markdown += '#### Child Features:\n\n';
          children.forEach((feature: any) => {
            markdown += `##### ${feature.name}\n`;
            
            // Overview
            if (feature.overview) {
              markdown += `**Overview**: ${feature.overview}\n\n`;
            }
            
            // Database Tables
            if (feature.databaseTables) {
              markdown += '**Database Tables:**\n';
              if (feature.databaseTables.primary) {
                markdown += `- Primary: ${feature.databaseTables.primary.join(', ')}\n`;
              }
              if (feature.databaseTables.supporting) {
                markdown += `- Supporting: ${feature.databaseTables.supporting.join(', ')}\n`;
              }
              markdown += '\n';
            }
            
            // User Documentation
            if (feature.userDocumentation) {
              markdown += '**User Documentation:**\n';
              markdown += `${feature.userDocumentation}\n\n`;
            }
            
            // Implementation Details
            if (feature.implementationDetails) {
              markdown += '**Implementation Details:**\n';
              if (feature.implementationDetails.api_endpoints) {
                markdown += '- API Endpoints:\n';
                feature.implementationDetails.api_endpoints.forEach((endpoint: any) => {
                  markdown += `  - ${endpoint.method} ${endpoint.path}\n`;
                });
              }
              if (feature.implementationDetails.key_components) {
                markdown += '- Key Components:\n';
                feature.implementationDetails.key_components.forEach((component: string) => {
                  markdown += `  - ${component}\n`;
                });
              }
              markdown += '\n';
            }
            
            // Technical Specifications
            if (feature.technicalSpecifications) {
              markdown += '**Technical Specifications:**\n';
              markdown += '```json\n';
              markdown += JSON.stringify(feature.technicalSpecifications, null, 2);
              markdown += '\n```\n\n';
            }
            
            markdown += '\n';
          });
        }
        markdown += '\n';
      });
    }
    
    // 6. Database Schema
    markdown += '## Database Schema\n\n';
    markdown += `Total Tables: 32\n\n`;
    markdown += 'The platform uses PostgreSQL with 32 database tables for multi-tenant operations.\n';
    markdown += 'Database schema details can be viewed in the Database Tools tab in Dev Tools.\n\n';

    // 7. API Documentation
    markdown += '## API Documentation\n\n';
    markdown += '### API Overview\n\n';
    markdown += '**Base URL**: `https://api.yourplatform.com/v1`\n\n';
    markdown += '**Authentication**: All API requests require JWT tokens:\n';
    markdown += '```\n';
    markdown += 'Authorization: Bearer YOUR_JWT_TOKEN\n';
    markdown += '```\n\n';

    markdown += '### Available Endpoints\n\n';
    markdown += '#### Customer Management\n';
    markdown += '- `GET /api/customers` - Retrieve list of customers with filtering and pagination\n';
    markdown += '- `POST /api/customers` - Create a new customer\n';
    markdown += '- `PUT /api/customers/:id` - Update customer information\n';
    markdown += '- `DELETE /api/customers/:id` - Delete a customer\n\n';

    markdown += '#### Support System\n';
    markdown += '- `GET /api/tickets` - Get support tickets\n';
    markdown += '- `POST /api/tickets` - Create a new support ticket\n';
    markdown += '- `PUT /api/tickets/:id` - Update ticket status\n\n';

    markdown += '#### Features & Configuration\n';
    markdown += '- `GET /api/features` - Get list of available features and their status\n';
    markdown += '- `POST /api/features/:id/toggle` - Enable/disable a feature\n';
    markdown += '- `GET /api/pages` - Get application pages\n';
    markdown += '- `GET /api/menu/navigation` - Get navigation menu structure\n\n';

    // 8. Deployment Guide
    markdown += '## Deployment Guide\n\n';
    markdown += '### Environment Variables\n\n';
    markdown += '```bash\n';
    markdown += 'DATABASE_URL=postgresql://user:password@host:port/database\n';
    markdown += 'JWT_SECRET=your-secret-key\n';
    markdown += 'NODE_ENV=production\n';
    markdown += 'PORT=3000\n';
    markdown += 'VITE_API_URL=https://api.yourplatform.com\n';
    markdown += '```\n\n';

    markdown += '### Deployment Steps\n\n';
    markdown += '1. **Build the application**\n';
    markdown += '   ```bash\n';
    markdown += '   npm run build\n';
    markdown += '   ```\n\n';
    
    markdown += '2. **Run database migrations**\n';
    markdown += '   ```bash\n';
    markdown += '   npm run db:push\n';
    markdown += '   ```\n\n';
    
    markdown += '3. **Start the production server**\n';
    markdown += '   ```bash\n';
    markdown += '   npm start\n';
    markdown += '   ```\n\n';

    markdown += '### Production Considerations\n\n';
    markdown += '- Set up SSL/TLS certificates\n';
    markdown += '- Configure reverse proxy (nginx/Apache)\n';
    markdown += '- Set up monitoring and logging\n';
    markdown += '- Configure backup strategies\n';
    markdown += '- Implement proper security headers\n';
    markdown += '- Set up CI/CD pipelines\n\n';

    // Footer
    markdown += '---\n\n';
    markdown += `*Documentation generated on ${new Date().toLocaleString()}*\n`;
    markdown += '*For the latest updates, regenerate this documentation from the developer tools.*\n';
    
    return markdown;
  };

  const downloadDocumentation = () => {
    const markdown = generateMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `developer-documentation-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Documentation downloaded',
      description: 'The documentation has been downloaded as a Markdown file.',
    });
  };

  // Group features by parent module
  const moduleFeatures = React.useMemo(() => {
    if (!features) return { modules: [], features: {} };
    
    const modules = features.filter(f => !f.parentFeatureId);
    const childFeatures: { [key: number]: FeatureDocumentation[] } = {};
    
    features.forEach(feature => {
      if (feature.parentFeatureId) {
        if (!childFeatures[feature.parentFeatureId]) {
          childFeatures[feature.parentFeatureId] = [];
        }
        childFeatures[feature.parentFeatureId].push(feature);
      }
    });
    
    return { modules, features: childFeatures };
  }, [features]);

  const renderOverview = () => {
    // Find Core Application Module for overview
    const coreModule = moduleFeatures.modules.find(m => m.name === 'Core Application Module');
    const strategyModule = moduleFeatures.modules.find(m => m.name === 'Strategy & Work Module');
    
    return (
    <div className="space-y-6">
      {/* Platform Overview from Database */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            aimee.works Platform Overview
          </CardTitle>
          <CardDescription>
            Real-time documentation from platform_features database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Core Application Module Overview */}
            {coreModule && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Core Application Module</h3>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <p className="text-sm mb-4">{coreModule.overview}</p>
                    
                    {coreModule.databaseTables && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Primary Database Tables:</h4>
                        <div className="flex flex-wrap gap-1">
                          {coreModule.databaseTables.primary?.map((table: string) => (
                            <Badge key={table} variant="outline" className="text-xs">
                              {table}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Strategy & Work Module Overview */}
            {strategyModule && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Strategy & Work Module</h3>
                <Card className="border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="pt-6">
                    <p className="text-sm mb-4">{strategyModule.overview}</p>
                    
                    {strategyModule.implementationDetails && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Key Components:</h4>
                        <ul className="text-xs space-y-1 ml-3">
                          {strategyModule.implementationDetails.key_components?.map((component: string, idx: number) => (
                            <li key={idx} className="list-disc">{component}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* All Platform Modules */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Platform Modules & Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {moduleFeatures.modules.map(module => (
                  <Card key={module.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{module.name}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={module.isEnabled ? 'default' : 'secondary'} className="text-xs">
                          {module.isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {module.visibilityStatus || module.status || 'draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {module.overview || module.description || 'No overview available'}
                      </p>
                      {moduleFeatures.features[module.id] && (
                        <div className="mt-2">
                          <p className="text-xs font-medium">
                            {moduleFeatures.features[module.id].length} child features
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            {/* Technical Overview */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Technical Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Pages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pages?.length || 0}</div>
                    <p className="text-sm text-muted-foreground">Total pages in system</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{features?.length || 0}</div>
                    <p className="text-sm text-muted-foreground">Active features</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Tables
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">32</div>
                    <p className="text-sm text-muted-foreground">Database tables</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold">1</span>
              </div>
              <div>
                <h4 className="font-medium">Clone the Repository</h4>
                <code className="text-sm bg-muted px-2 py-1 rounded">git clone [repository-url]</code>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold">2</span>
              </div>
              <div>
                <h4 className="font-medium">Install Dependencies</h4>
                <code className="text-sm bg-muted px-2 py-1 rounded">npm install</code>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold">3</span>
              </div>
              <div>
                <h4 className="font-medium">Set Up Database</h4>
                <code className="text-sm bg-muted px-2 py-1 rounded">npm run db:push</code>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold">4</span>
              </div>
              <div>
                <h4 className="font-medium">Start Development Server</h4>
                <code className="text-sm bg-muted px-2 py-1 rounded">npm run dev</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    );
  };

  const renderAIInstructions = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Code Agent Instructions
          </CardTitle>
          <CardDescription>
            Comprehensive guidelines for AI agents working on this codebase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Core Philosophy */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Development Philosophy</h3>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Build ON TOP of existing code, don't rebuild</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Integrate new features with existing patterns, maintain UI consistency, and leverage established components.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Integration Patterns */}
            <div>
              <h3 className="text-lg font-semibold mb-3">🔗 Integration First - Specific Patterns</h3>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Component Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Always use existing Shadcn/ui components:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';`}
                      </code>
                      <div><strong>CANONICAL: Use Sheet for all side panels:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

<Sheet open={open} onOpenChange={(open) => !open && handleClose()}>
  <SheetContent className="sm:w-[640px]">
    <SheetHeader>
      <SheetTitle>Item Details</SheetTitle>
      <SheetDescription>View and edit information</SheetDescription>
    </SheetHeader>
    {/* Content with tabs */}
  </SheetContent>
</Sheet>`}
                      </code>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Navigation Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Add pages to menu system via database:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`// 1. Add to pages table through admin UI
// 2. Link to features table for proper organization  
// 3. Configure menu_items for navigation
// 4. Set proper unifiedStatus ('dev' for testing, 'live' for production)`}
                      </code>
                      <div><strong>Use established routing:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`import { Link, useLocation } from 'wouter';
// Register in client/src/App.tsx routing`}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Theme System Details */}
            <div>
              <h3 className="text-lg font-semibold mb-3">🎨 Template-Based Theme System</h3>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">CSS Custom Properties (Required)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Always use CSS variables for theming:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`/* Primary brand colors */
--primary: 172 100% 37%; /* #00BFA6 turquoise */
--secondary: 142 44% 42%; /* #27AE60 green */
--background: 0 0% 98%; /* Light theme background */
--foreground: 0 0% 18%; /* Dark text */

/* Component-specific */
--button-primary-bg: #00BFA6;
--button-radius: 4px;
--card: 0 0% 100%; /* Pure white cards */
--border: 0 0% 88%; /* Light borders */`}
                      </code>
                      <div><strong>Apply theme through ThemeContext:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`import { useTheme } from '@/contexts/ThemeContext';
// Theme variables automatically applied to document.documentElement`}
                      </code>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Theme Editor Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Components must respond to theme changes:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`// Use HSL colors that work with CSS variables
className="bg-primary text-primary-foreground"
// NOT: className="bg-blue-500" (hardcoded colors)`}
                      </code>
                      <div><strong>Typography system integration:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`// Typography uses CSS variables from ThemeEditor
font-family: var(--primary-font); /* Default: Inter */
font-size: calc(var(--base-font-size) * var(--font-scale));
// Headings: var(--h1-size) through var(--h6-size)`}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Data Architecture */}
            <div>
              <h3 className="text-lg font-semibold mb-3">📊 Multi-Tenant Data Architecture</h3>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Drizzle ORM Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Always include organizationId for tenant isolation:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`export const yourTable = pgTable("your_table", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  // ... your fields
  unifiedStatus: unifiedStatusEnum("unified_status").default("dev"),
});`}
                      </code>
                      <div><strong>Use unified status for visibility control:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`import { isItemVisible } from '@shared/schema';
// Check visibility: isItemVisible(item.unifiedStatus, userRole)
// 'draft' = invisible, 'dev' = admin only, 'live' = all users`}
                      </code>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">TanStack Query Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Follow established query patterns:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

// For queries
const { data, isLoading } = useQuery({
  queryKey: ['/api/your-endpoint', param],
});

// For mutations with cache invalidation
const mutation = useMutation({
  mutationFn: (data) => apiRequest('/api/endpoint', { method: 'POST', body: data }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/your-endpoint'] }),
});`}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Implementation Guidelines */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Implementation Guidelines</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4 bg-green-50/50 dark:bg-green-950/20 py-2">
                  <h4 className="font-medium text-green-900 dark:text-green-100">✅ DO</h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 mt-1 space-y-1">
                    <li>• Analyze existing patterns before coding</li>
                    <li>• Reuse components from the established library</li>
                    <li>• Follow the page-driven architecture</li>
                    <li>• Implement proper error handling</li>
                    <li>• Add features to existing menus/navigation</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-red-500 pl-4 bg-red-50/50 dark:bg-red-950/20 py-2">
                  <h4 className="font-medium text-red-900 dark:text-red-100">❌ DON'T</h4>
                  <ul className="text-sm text-red-700 dark:text-red-300 mt-1 space-y-1">
                    <li>• Create completely new component libraries</li>
                    <li>• Rebuild existing functionality</li>
                    <li>• Break established design patterns</li>
                    <li>• Ignore multi-tenant considerations</li>
                    <li>• Create isolated feature silos</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Page Architecture - Two Approaches */}
            <div>
              <h3 className="text-lg font-semibold mb-3">📄 Page Architecture - Mixed Approach</h3>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Dynamic Pages (Admin/Config)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Use DynamicPageRenderer for simple admin/config pages:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`// Examples: DevTools.tsx, ThemeEditor.tsx, UserProfile.tsx
import { DynamicPageRenderer } from '@/components/DynamicPageRenderer';

const page = useQuery({queryKey: ['/api/dev/pages/page-slug']});
return <DynamicPageRenderer page={page} layoutTemplate={layoutTemplate || undefined} />;`}
                      </code>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Core Page Structure (Complex Features)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>CANONICAL Core Page Pattern (Settings.tsx, PeopleAndTeams.tsx):</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`const CorePage = () => {
  const [, setLocation] = useLocation();
  
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Page Title</h1>
          
          {/* Action buttons - responsive */}
          <div className="hidden sm:flex">
            <Button>Primary Action</Button>
          </div>
        </div>
        
        {/* Mobile search/filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Input placeholder="Search..." className="flex-1 sm:max-w-sm" />
        </div>
      </div>
      
      {/* Main Content - Grid Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Card Title</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>Description</CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};`}
                      </code>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Responsive Design Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Key responsive patterns used in core pages:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`// Container with responsive padding
"container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6"

// Mobile-first header layout
"flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"

// Responsive grid system
"grid gap-6 md:grid-cols-3" // Settings.tsx 3-card layout
"grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2" // Complex layouts

// Mobile vs desktop action buttons
"hidden sm:flex" // Desktop only
"sm:hidden" // Mobile only

// Card hover interactions
"cursor-pointer hover:shadow-lg transition-shadow"`}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Component Library Integration */}
            <div>
              <h3 className="text-lg font-semibold mb-3">🎯 Component Library Standards</h3>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Required Import Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Standard component imports (always use these):</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`// UI Components (from Shadcn/ui)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Side Panels - CANONICAL: Use Sheet (NOT SlidePanel)
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

// Icons (from Lucide React)
import { Plus, Edit, Trash, Download, Upload } from 'lucide-react';

// State Management & Auth
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';`}
                      </code>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Form Patterns (Required)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Always use React Hook Form with Zod validation:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

// Use Drizzle insert schemas for validation
import { insertYourTableSchema } from '@shared/schema';

const form = useForm({
  resolver: zodResolver(insertYourTableSchema),
  defaultValues: { organizationId: 1, unifiedStatus: 'dev' }
});`}
                      </code>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Sheet Pattern (CANONICAL)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>CANONICAL: Always use Sheet component for detail/edit views:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`// CORRECT: Use Sheet (widely used throughout codebase)
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

<Sheet open={open} onOpenChange={(open) => !open && handleClose()}>
  <SheetContent className="sm:w-[640px]">
    <SheetHeader>
      <SheetTitle>Work Item Details</SheetTitle>
      <SheetDescription>View and edit work item</SheetDescription>
    </SheetHeader>
    
    {/* Tabs for complex content */}
    <Tabs defaultValue="details" className="mt-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="details">
        {/* Content */}
      </TabsContent>
    </Tabs>
  </SheetContent>
</Sheet>

// Examples using Sheet pattern:
// TeamMembersPanel.tsx, PersonPanel.tsx, UserCreationPanel.tsx, MenuBuilder.tsx`}
                      </code>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <strong>Why Sheet is Canonical:</strong>
                        <ul className="mt-1 space-y-1">
                          <li>• Used extensively: TeamMembersPanel, PersonPanel, UserCreationPanel, MenuBuilder</li>
                          <li>• Standard shadcn/ui component with consistent behavior</li>
                          <li>• Standard width: sm:w-[640px] for consistent experience</li>
                          <li>• Built-in close handling: onOpenChange={(open) => !open && handleClose()}</li>
                          <li>• Dark overlay with slide animation</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Inline Editing Pattern</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Implement inline editing for table cells:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`// Status field inline editing
{editingField?.itemId === item.id && editingField.field === 'status' ? (
  <Select
    value={tempValue}
    onValueChange={(value) => {
      handleInlineUpdate(item.id, 'status', value);
      setEditingField(null);
    }}
    onOpenChange={(open) => {
      if (!open) setEditingField(null);
    }}
  >
    <SelectTrigger className="h-7 w-[120px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="z-[200]"> {/* Higher z-index for dropdowns */}
      {statusOptions.map(status => (
        <SelectItem key={status} value={status}>
          {status}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
) : (
  <Badge
    className="cursor-pointer"
    onClick={() => {
      setEditingField({ itemId: item.id, field: 'status' });
      setTempValue(item.status);
    }}
  >
    {item.status}
  </Badge>
)}`}
                      </code>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">URL State Management Pattern</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div><strong>Manage panel and filter state via URL:</strong></div>
                      <code className="bg-muted p-2 rounded block">
                        {`// Parse URL parameters for panel state
const [panelState, setPanelState] = useState(() => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('panel') === 'workItem' 
    ? params.get('mode') as 'create' | 'view' | 'edit' 
    : null;
  const id = params.get('id') ? parseInt(params.get('id')!) : undefined;
  return { mode, id };
});

// Update URL when opening panel
const openPanel = (mode: 'create' | 'view' | 'edit', id?: number) => {
  const params = new URLSearchParams(window.location.search);
  params.set('panel', 'workItem');
  params.set('mode', mode);
  if (id) params.set('id', id.toString());
  
  const newUrl = \`\${window.location.pathname}?\${params.toString()}\`;
  window.history.pushState({}, '', newUrl);
  setPanelState({ mode, id });
};

// Handle browser back/forward navigation
useEffect(() => {
  const handlePopState = () => {
    // Re-parse URL and update state
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);`}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Quick Reference */}
            <div>
              <h3 className="text-lg font-semibold mb-3">⚡ Quick Reference</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Key Files to Review First</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-xs font-mono">
                      <div>📋 shared/schema.ts - Data models</div>
                      <div>🎨 client/src/index.css - Theme variables</div>
                      <div>🧩 client/src/components/ui/ - Base components</div>
                      <div>📄 client/src/components/templates/ - Page templates</div>
                      <div>🗂️ client/src/pages/ - Existing pages</div>
                      <div>🔌 server/routes/ - API patterns</div>
                      <div>📚 replit.md - Project architecture</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Development Commands</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-xs font-mono">
                      <div>🚀 npm run dev - Start development</div>
                      <div>📊 npm run db:push - Update database</div>
                      <div>🔍 npm run db:studio - Database GUI</div>
                      <div>🏗️ npm run build - Production build</div>
                      <div>✅ npm start - Start production server</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderArchitecture = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            System Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Technology Stack */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Technology Stack</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Frontend
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• React 18 with TypeScript</li>
                    <li>• Vite for build tooling</li>
                    <li>• Tailwind CSS + Shadcn/ui</li>
                    <li>• TanStack Query for state management</li>
                    <li>• Wouter for routing</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Backend
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Node.js + Express</li>
                    <li>• TypeScript (ESM modules)</li>
                    <li>• PostgreSQL database</li>
                    <li>• Drizzle ORM</li>
                    <li>• JWT authentication</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Current Project Structure */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Current Project Structure</h3>
              <div className="bg-muted rounded-lg p-4">
                <pre className="text-sm">
{`├── client/                     # Frontend React application
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── ui/            # Shadcn/ui base components
│   │   │   ├── AISettings/    # AI feature components
│   │   │   ├── database-tools/# Database management tools
│   │   │   └── [various]/     # Feature-specific components
│   │   ├── pages/             # Route-based pages (organized)
│   │   │   ├── core/          # Core platform pages
│   │   │   │   ├── DevTools.tsx
│   │   │   │   ├── ThemeEditor.tsx
│   │   │   │   └── UserManagement.tsx
│   │   │   ├── dev-tools/     # Developer tool pages
│   │   │   │   ├── DevToolsDatabase.tsx
│   │   │   │   ├── DevToolsRelationships.tsx
│   │   │   │   └── DevToolsPages.tsx
│   │   │   ├── strategy/      # Strategy & Work pages
│   │   │   │   ├── Objectives.tsx     # OKR management
│   │   │   │   ├── Tasks.tsx          # Task management
│   │   │   │   ├── WorkItems.tsx      # Work items hub
│   │   │   │   ├── Work.tsx           # Work overview
│   │   │   │   └── MissionVision.tsx  # Mission/vision
│   │   │   └── [various].tsx  # Other feature pages
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities & query client
│   │   ├── contexts/          # Auth & theme contexts
│   │   └── services/          # Business logic
│   │       └── DocumentationGenerator.ts
├── server/                     # Backend Express application
│   ├── routes/                # API routes
│   │   ├── auth.ts           # Authentication
│   │   ├── dev.ts            # Developer endpoints
│   │   ├── strategy.ts       # Strategy & OKR endpoints
│   │   └── [various].ts      # Feature endpoints
│   ├── storage.ts            # Database operations
│   ├── auth.ts               # JWT middleware
│   └── index.ts              # Server entry point
├── shared/                     # Shared definitions
│   └── schema.ts              # Database schema (27 tables)
├── attached_assets/           # User uploads & images
├── docs/                      # Documentation
└── scripts/                   # Build & utility scripts`}
                </pre>
              </div>
            </div>

            {/* Target Multi-Tenant Architecture */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Target Multi-Tenant Architecture</h3>
              <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4">
                <pre className="text-sm">
{`├── client/
│   ├── src/
│   │   ├── features/          # Feature-based modules
│   │   │   ├── auth/         # Authentication module
│   │   │   ├── tenants/      # Tenant management
│   │   │   ├── users/        # User management
│   │   │   ├── billing/      # Subscription & billing
│   │   │   ├── strategy/     # OKRs & objectives
│   │   │   ├── helpdesk/     # Support system
│   │   │   ├── ai-tools/     # AI integrations
│   │   │   └── developer/    # Dev tools
│   │   ├── shared/           # Shared resources
│   │   │   ├── components/   # Common UI components
│   │   │   ├── layouts/      # App layouts
│   │   │   ├── hooks/        # Shared hooks
│   │   │   └── utils/        # Utilities
│   │   └── core/             # Core platform
│   │       ├── router/       # Routing logic
│   │       ├── providers/    # App providers
│   │       └── config/       # Configuration
├── server/
│   ├── modules/              # Backend modules
│   │   ├── auth/            # Auth module
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── routes.ts
│   │   ├── tenants/         # Tenant module
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── guards/      # Tenant isolation
│   │   │   └── routes.ts
│   │   └── [feature]/       # Other modules
│   ├── core/                # Core functionality
│   │   ├── database/        # DB connection & migrations
│   │   ├── middleware/      # Global middleware
│   │   ├── guards/          # Security guards
│   │   └── utils/           # Server utilities
│   └── infrastructure/      # Infrastructure layer
│       ├── cache/           # Redis caching
│       ├── queue/           # Job queues
│       └── storage/         # File storage
├── packages/                # Shared packages
│   ├── types/              # TypeScript types
│   ├── validators/         # Zod schemas
│   └── constants/          # Shared constants
└── services/               # Microservices (future)
    ├── notifications/      # Email/SMS service
    ├── reporting/         # Analytics service
    └── ai-engine/         # AI processing`}
                </pre>
              </div>
            </div>

            {/* Current State Analysis */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Current State Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-red-500/20 bg-red-50/50 dark:bg-red-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Areas for Improvement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1">
                      <li className="text-red-600">❌ No tenant isolation in queries</li>
                      <li className="text-red-600">❌ Single tenant architecture</li>
                      <li className="text-red-600">❌ No row-level security</li>
                      <li className="text-red-600">❌ Monolithic storage.ts</li>
                      <li className="text-red-600">❌ Limited API organization</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-yellow-500/20 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recent Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1">
                      <li className="text-yellow-600">✅ Work Items feature complete</li>
                      <li className="text-yellow-600">✅ Inline editing implemented</li>
                      <li className="text-yellow-600">✅ SlidePanel system working</li>
                      <li className="text-yellow-600">✅ Strategy pages integrated</li>
                      <li className="text-yellow-600">✅ URL state management</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">New Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1">
                      <li className="text-green-600">✅ Work Items management</li>
                      <li className="text-green-600">✅ Bulk operations</li>
                      <li className="text-green-600">✅ Advanced filtering</li>
                      <li className="text-green-600">✅ Bypass API endpoints</li>
                      <li className="text-green-600">✅ Z-index management</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* System Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">54</div>
                  <div className="text-xs text-muted-foreground">Pages</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">27</div>
                  <div className="text-xs text-muted-foreground">Database Tables</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">45+</div>
                  <div className="text-xs text-muted-foreground">UI Components</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">1</div>
                  <div className="text-xs text-muted-foreground">Tenant (Single)</div>
                </div>
              </div>
            </div>

            {/* Technical Specifications from Features */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Braces className="h-5 w-5 text-primary" />
                Technical Specifications from Features
              </h3>
              <div className="space-y-4">
                {moduleFeatures.modules.filter(m => m.technicalSpecifications).map(module => (
                  <Card key={module.id} className="border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {module.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted rounded p-3">
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(module.technicalSpecifications, null, 2)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Key Changes Required */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Key Changes Required</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Database Changes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1">
                      <li>• Add tenant_id to all tables</li>
                      <li>• Implement RLS policies</li>
                      <li>• Create tenant schemas</li>
                      <li>• Add audit columns</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Security Changes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1">
                      <li>• Tenant isolation middleware</li>
                      <li>• API rate limiting per tenant</li>
                      <li>• Data encryption at rest</li>
                      <li>• Session management</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Frontend Changes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1">
                      <li>• Feature-based modules</li>
                      <li>• Tenant context provider</li>
                      <li>• Lazy loading routes</li>
                      <li>• Component library</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Backend Changes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs space-y-1">
                      <li>• Module-based architecture</li>
                      <li>• Service layer pattern</li>
                      <li>• Repository pattern</li>
                      <li>• Event-driven updates</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Authentication Flow */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Authentication & Security</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <h4 className="font-medium">JWT-based Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      Secure token-based authentication with refresh tokens and session management
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <h4 className="font-medium">Role-Based Access Control (RBAC)</h4>
                    <p className="text-sm text-muted-foreground">
                      Multi-level permissions: super_admin, admin, manager, team_member, customer
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <h4 className="font-medium">Multi-Tenant Architecture</h4>
                    <p className="text-sm text-muted-foreground">
                      Organization-based data isolation with tenant-specific configurations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );


  const renderFeatures = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Platform Features Documentation
          </CardTitle>
          <CardDescription>
            Comprehensive documentation for all {features?.length || 0} platform features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* All Features from Database */}
            {moduleFeatures.modules.map(module => (
              <div key={module.id}>
                <h3 className="text-lg font-semibold mb-3 text-primary">{module.name}</h3>
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{module.description}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant={module.isEnabled ? 'default' : 'secondary'}>
                          {module.isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline">{module.visibilityStatus || module.status || 'draft'}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Overview */}
                    {module.overview && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Overview:</h4>
                        <p className="text-xs text-muted-foreground">{module.overview}</p>
                      </div>
                    )}
                    
                    {/* Database Tables */}
                    {module.databaseTables && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Database Tables:</h4>
                        {module.databaseTables.primary && (
                          <div className="mb-2">
                            <p className="text-xs font-medium mb-1">Primary Tables:</p>
                            <div className="flex flex-wrap gap-1">
                              {module.databaseTables.primary.map((table: string) => (
                                <Badge key={table} variant="outline" className="text-xs">
                                  {table}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {module.databaseTables.supporting && (
                          <div>
                            <p className="text-xs font-medium mb-1">Supporting Tables:</p>
                            <div className="flex flex-wrap gap-1">
                              {module.databaseTables.supporting.map((table: string) => (
                                <Badge key={table} variant="secondary" className="text-xs">
                                  {table}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Implementation Details */}
                    {module.implementationDetails && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Implementation Details:</h4>
                        {module.implementationDetails.api_endpoints && (
                          <div className="mb-2">
                            <p className="text-xs font-medium mb-1">API Endpoints:</p>
                            <div className="space-y-1">
                              {module.implementationDetails.api_endpoints.slice(0, 5).map((endpoint: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <Badge variant="outline" className="text-xs">
                                    {endpoint.method}
                                  </Badge>
                                  <code className="bg-muted px-2 py-0.5 rounded">{endpoint.path}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {module.implementationDetails.key_components && (
                          <div>
                            <p className="text-xs font-medium mb-1">Key Components:</p>
                            <ul className="text-xs space-y-1 ml-3">
                              {module.implementationDetails.key_components.slice(0, 5).map((component: string, idx: number) => (
                                <li key={idx} className="list-disc">{component}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* User Documentation */}
                    {module.userDocumentation && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">User Documentation:</h4>
                        <div className="bg-muted rounded p-3 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {module.userDocumentation}
                        </div>
                      </div>
                    )}
                    
                    {/* Technical Specifications */}
                    {module.technicalSpecifications && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Technical Specifications:</h4>
                        <div className="bg-muted rounded p-3 max-h-40 overflow-y-auto">
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(module.technicalSpecifications, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {/* Child Features */}
                    {moduleFeatures.features[module.id] && moduleFeatures.features[module.id].length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Child Features:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {moduleFeatures.features[module.id].map(child => (
                            <Card key={child.id} className="border">
                              <CardHeader className="pb-2 pt-3">
                                <CardTitle className="text-xs">{child.name}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {child.overview || child.description}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );










  const sections: DocumentationSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: <BookOpen className="h-4 w-4" />,
      description: 'Platform overview and quick start guide',
      content: renderOverview(),
      status: 'complete',
    },
    {
      id: 'ai-instructions',
      title: 'AI Instructions',
      icon: <Bot className="h-4 w-4" />,
      description: 'Guidelines for AI agents working on this codebase',
      content: renderAIInstructions(),
      status: 'complete',
    },
    {
      id: 'architecture',
      title: 'Architecture',
      icon: <Layers className="h-4 w-4" />,
      description: 'System architecture and technology stack',
      content: renderArchitecture(),
      status: 'complete',
    },
    {
      id: 'features',
      title: 'Features',
      icon: <Package className="h-4 w-4" />,
      description: 'Features and add-ons documentation',
      content: renderFeatures(),
      status: 'complete',
    },
  ];

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'planned':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const currentSection = sections.find(s => s.id === selectedSection);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Book className="h-8 w-8" />
              Developer Documentation
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive technical documentation for the aimee.works platform
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                window.location.reload();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={downloadDocumentation}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Contract Banner */}
        {contractInfo && (
          <div className="mb-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  Documentation Contract Status
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  This page derives from replit.md (Contract Version: {contractInfo.doc_contract_version || 'Unknown'})
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contractInfo.canonical_topics && (
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-2">Canonical Topics Enforced:</div>
                      <div className="flex flex-wrap gap-1">
                        {contractInfo.canonical_topics.map((topic: any, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {typeof topic === 'object' ? Object.keys(topic)[0] : topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {bannedPhrases.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium text-red-800">
                          Contradiction Warning: Banned phrases found
                        </span>
                      </div>
                      <div className="text-xs text-red-700">
                        The following banned tokens were detected: {bannedPhrases.join(', ')}
                      </div>
                    </div>
                  )}
                  
                  {bannedPhrases.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <CheckCircle className="h-3 w-3" />
                      All documentation complies with canonical guidelines
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentation Sections</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 p-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full px-3 py-2 text-left rounded-md transition-colors flex items-center justify-between ${
                      selectedSection === section.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {section.icon}
                      <span className="text-sm font-medium">{section.title}</span>
                    </div>
                    {getStatusIcon(section.status)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>{currentSection?.title || 'Documentation'}</CardTitle>
              <CardDescription>{currentSection?.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {currentSection?.content || (
                <div className="text-muted-foreground text-center py-8">
                  Select a section from the sidebar to view documentation
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
