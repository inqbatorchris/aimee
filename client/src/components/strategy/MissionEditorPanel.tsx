import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import DOMPurify from 'dompurify';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Edit, Save, X, Loader2, TrendingUp } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ModernDocumentEditor } from '@/components/DocumentEditor/ModernDocumentEditor';

const missionUpdateSchema = z.object({
  mission: z.string().min(1, 'Mission is required'),
  vision: z.string().optional(),
});

type MissionUpdateData = z.infer<typeof missionUpdateSchema>;

interface MissionState {
  title: string;
  content: string;
  targetNumber: number;
}

interface MissionEditorPanelProps {
  mission: any;
  open: boolean;
  onClose: () => void;
  defaultTab?: 'edit' | 'preview';
}

export function MissionEditorPanel({
  mission,
  open,
  onClose,
  defaultTab = 'edit'
}: MissionEditorPanelProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>(defaultTab);

  // Parse KPI data to extract target number
  const parseKPIData = (kpiString: string) => {
    const targetMatch = kpiString.match(/(\d+)/);
    const target = targetMatch ? parseInt(targetMatch[1]) : 1000;
    return target;
  };

  // Utility to strip HTML tags and get text content
  const stripHtml = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  // Parse combined content to extract mission and vision using robust DOM parsing
  const parseContent = (content: string) => {
    if (!content) return { mission: '', vision: '' };
    
    try {
      // Create a DOM parser to handle HTML content reliably
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${content}</div>`, 'text/html');
      const container = doc.body.firstChild as HTMLElement;
      
      if (!container) {
        return { mission: content, vision: '' };
      }
      
      // Look for Vision and Mission headings (h1-h6)
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let visionContent = '';
      let missionContent = '';
      let currentSection = 'mission'; // default to mission
      
      // If no headings found, treat all content as mission
      if (headings.length === 0) {
        return { mission: content, vision: '' };
      }
      
      // Parse content by sections
      const allNodes = Array.from(container.childNodes);
      let currentCollectedContent: Node[] = [];
      
      for (const node of allNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (element.tagName.match(/^H[1-6]$/)) {
            // Save previous section before starting new one
            if (currentCollectedContent.length > 0) {
              const sectionHtml = currentCollectedContent
                .map(n => n.nodeType === Node.TEXT_NODE ? n.textContent : (n as HTMLElement).outerHTML)
                .join('');
              
              if (currentSection === 'vision') {
                visionContent = sectionHtml.trim();
              } else if (currentSection === 'mission') {
                missionContent = sectionHtml.trim();
              }
            }
            
            // Determine section based on heading text
            const headingText = element.textContent?.toLowerCase().trim() || '';
            if (headingText.includes('vision')) {
              currentSection = 'vision';
            } else if (headingText.includes('mission')) {
              currentSection = 'mission';
            } else {
              // Unknown heading, keep current section
            }
            
            currentCollectedContent = [];
            continue;
          }
        }
        
        // Collect content for current section
        currentCollectedContent.push(node);
      }
      
      // Handle remaining content
      if (currentCollectedContent.length > 0) {
        const sectionHtml = currentCollectedContent
          .map(n => n.nodeType === Node.TEXT_NODE ? n.textContent : (n as HTMLElement).outerHTML)
          .join('');
        
        if (currentSection === 'vision') {
          visionContent = sectionHtml.trim();
        } else if (currentSection === 'mission') {
          missionContent = sectionHtml.trim();
        }
      }
      
      // Improved fallback logic for more forgiving content extraction
      if (!visionContent && !missionContent) {
        // No structured content found, treat everything as mission
        return { mission: content, vision: '' };
      }
      
      // If we only found one section, be more intelligent about assignment
      if (!visionContent && missionContent) {
        return { mission: missionContent, vision: '' };
      }
      
      if (visionContent && !missionContent) {
        // Check if we have any remaining unassigned content
        const allText = container.textContent || '';
        const visionText = visionContent ? stripHtml(visionContent) : '';
        const remainingContent = allText.replace(visionText, '').trim();
        
        return {
          vision: visionContent,
          mission: remainingContent || '', // Use remaining content as mission if available
        };
      }
      
      return {
        vision: visionContent,
        mission: missionContent,
      };
      
    } catch (error) {
      console.warn('Failed to parse content with DOM parser, falling back to simple parsing:', error);
      // Fallback: treat entire content as mission
      return { mission: content, vision: '' };
    }
  };

  // Sanitize HTML content
  const sanitizeHtml = (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
    });
  };

  // Validate content by checking actual text length
  const isContentEmpty = (content: string): boolean => {
    if (!content || content.trim() === '') return true;
    const textContent = stripHtml(content).trim();
    return textContent.length === 0;
  };

  // Centralized mission state
  const [missionState, setMissionState] = useState<MissionState>({
    title: '',
    content: '',
    targetNumber: 1000,
  });

  // Reset tab when defaultTab changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Initialize mission state when mission data changes
  useEffect(() => {
    if (mission && open) {
      const targetNumber = mission.kpi ? parseKPIData(mission.kpi) : 1000;
      
      // Handle backward compatibility: prefer mission.mission, fall back to mission.description
      const missionText = mission.mission || mission.description || '';
      const visionText = mission.vision || '';
      
      // Combine vision and mission into a single content field with sanitization
      let combinedContent = '';
      const sanitizedVision = visionText ? DOMPurify.sanitize(visionText) : '';
      const sanitizedMission = missionText ? DOMPurify.sanitize(missionText) : '';
      
      if (sanitizedVision && sanitizedMission) {
        combinedContent = `<h3>Vision</h3><p>${sanitizedVision}</p><h3>Mission</h3>${sanitizedMission}`;
      } else if (sanitizedVision) {
        combinedContent = `<h3>Vision</h3><p>${sanitizedVision}</p>`;
      } else if (sanitizedMission) {
        combinedContent = sanitizedMission;
      }
      
      setMissionState({
        title: mission.title || '',
        content: combinedContent,
        targetNumber: targetNumber,
      });
    }
  }, [mission, open]);



  // Save mission mutation
  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      const parsed = parseContent(content);
      const data: MissionUpdateData = {
        mission: parsed.mission,
        vision: parsed.vision,
      };
      
      return apiRequest('/api/strategy/mission-vision', {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/mission-vision'] });
      toast({
        title: 'Success',
        description: 'Mission and Vision updated successfully',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update mission and vision',
        variant: 'destructive',
      });
    },
  });

  // Update mission state helper functions
  const updateMissionState = (updates: Partial<MissionState>) => {
    setMissionState(prev => ({ ...prev, ...updates }));
  };

  // Centralized save function with validation
  const handleSave = () => {
    // Validate content using improved validation
    if (isContentEmpty(missionState.content)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your mission and vision content.',
        variant: 'destructive',
      });
      setActiveTab('edit');
      return;
    }

    // Save with parsed content
    saveMutation.mutate(missionState.content);
  };



  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        className="w-full sm:w-[600px] sm:max-w-none overflow-hidden flex flex-col p-0 [&>button]:hidden"
      >
        <SheetHeader className="flex-shrink-0 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SheetTitle className="text-lg font-semibold">
                Edit Mission
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                Update your organizational mission and target objectives
              </SheetDescription>
            </div>

          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 h-8 mx-4 mt-3" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="edit" className="text-xs">
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="edit" className="h-full m-0 px-4">
              <div className="flex flex-col h-full">
                {/* Header with save button */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Mission Details</h3>
                  <Button
                    onClick={handleSave}
                    disabled={isContentEmpty(missionState.content) || saveMutation.isPending}
                    size="sm"
                    className="h-8"
                    type="button"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3 mr-1" />
                    )}
                    Save
                  </Button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto space-y-4">
                  {/* Combined Mission Content with Rich Text Editor */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Mission & Vision</label>
                    <div className="border rounded-md">
                      <ModernDocumentEditor
                        content={missionState.content}
                        onChange={(content) => updateMissionState({ content: content })}
                        placeholder="Enter your mission and vision here. You can use headings to separate sections (e.g., ## Vision, ## Mission)..."
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tip: Use headings to organize your content. For example, start with "Vision" then add your "Mission" below.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="h-full m-0 px-4">
              <div className="h-full overflow-y-auto">
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Mission Preview</h3>
                      <Badge variant="outline" className="text-xs">
                        <Target className="h-3 w-3 mr-1" />
                        Draft
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div 
                          className="text-xs text-muted-foreground leading-relaxed prose prose-sm max-w-none
                            prose-headings:text-xs prose-headings:font-medium prose-headings:mb-1 prose-headings:mt-2
                            prose-p:text-xs prose-p:mb-2 prose-p:leading-relaxed
                            prose-ul:text-xs prose-ul:my-1 prose-ul:pl-4
                            prose-ol:text-xs prose-ol:my-1 prose-ol:pl-4
                            prose-li:text-xs prose-li:my-0.5
                            prose-strong:text-xs prose-strong:font-semibold
                            prose-em:text-xs
                            prose-img:rounded-md prose-img:my-2"
                          dangerouslySetInnerHTML={{ 
                            __html: sanitizeHtml(missionState.content || mission?.content || '<p>Mission and vision content will appear here...</p>') 
                          }}
                        />
                      </div>
                      
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>Word count: {stripHtml(missionState.content || '').split(/\s+/).filter(word => word.length > 0).length} words</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}