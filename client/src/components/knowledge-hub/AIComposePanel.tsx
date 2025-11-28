import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Sparkles, 
  FileText, 
  ChevronDown, 
  ChevronRight, 
  Wand2, 
  PenLine,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface AIComposePanelProps {
  onInsertContent: (content: string) => void;
  currentContent?: string;
}

export function AIComposePanel({ onInsertContent, currentContent }: AIComposePanelProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('internal');
  const [documentType, setDocumentType] = useState('knowledge_article');
  const [sectionToExpand, setSectionToExpand] = useState('');
  const [improveInstruction, setImproveInstruction] = useState('');

  const generateOutlineMutation = useMutation({
    mutationFn: async (data: { topic: string; documentType: string; audience: string }) => {
      const response = await apiRequest('/api/knowledge-base/documents/ai/generate-outline', {
        method: 'POST',
        body: data,
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.outline) {
        onInsertContent(data.outline);
        toast({
          title: 'Outline Generated',
          description: 'The AI-generated outline has been inserted into your document.',
        });
        setTopic('');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate outline. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const expandSectionMutation = useMutation({
    mutationFn: async (data: { section: string; context?: string; tone?: string }) => {
      const response = await apiRequest('/api/knowledge-base/documents/ai/expand-section', {
        method: 'POST',
        body: data,
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.content) {
        onInsertContent(data.content);
        toast({
          title: 'Section Expanded',
          description: 'The AI-generated content has been inserted.',
        });
        setSectionToExpand('');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Expansion Failed',
        description: error.message || 'Failed to expand section. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const improveWritingMutation = useMutation({
    mutationFn: async (data: { content: string; instruction?: string }) => {
      const response = await apiRequest('/api/knowledge-base/documents/ai/improve-writing', {
        method: 'POST',
        body: data,
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.content) {
        onInsertContent(data.content);
        toast({
          title: 'Content Improved',
          description: 'The improved content has been inserted.',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Improvement Failed',
        description: error.message || 'Failed to improve writing. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleGenerateOutline = () => {
    if (!topic.trim()) {
      toast({
        title: 'Topic Required',
        description: 'Please enter a topic for the outline.',
        variant: 'destructive',
      });
      return;
    }
    generateOutlineMutation.mutate({ topic, documentType, audience });
  };

  const handleExpandSection = () => {
    if (!sectionToExpand.trim()) {
      toast({
        title: 'Section Required',
        description: 'Please enter a section title or brief content to expand.',
        variant: 'destructive',
      });
      return;
    }
    expandSectionMutation.mutate({ section: sectionToExpand });
  };

  const handleImproveWriting = () => {
    if (!currentContent?.trim()) {
      toast({
        title: 'Content Required',
        description: 'Please add some content to the document first.',
        variant: 'destructive',
      });
      return;
    }
    improveWritingMutation.mutate({ 
      content: currentContent, 
      instruction: improveInstruction || undefined 
    });
  };

  const isAnyLoading = generateOutlineMutation.isPending || 
                       expandSectionMutation.isPending || 
                       improveWritingMutation.isPending;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Writing Assistant
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 ml-auto" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-auto" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-3 border-b border-border pb-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Generate Outline
              </div>
              
              <div>
                <Label htmlFor="topic" className="text-xs">Topic</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Customer onboarding process"
                  className="text-sm h-8"
                  data-testid="ai-topic-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="text-sm h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="knowledge_article">Knowledge Article</SelectItem>
                      <SelectItem value="training_guide">Training Guide</SelectItem>
                      <SelectItem value="how_to">How-To Guide</SelectItem>
                      <SelectItem value="process_doc">Process Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Audience</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger className="text-sm h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal Team</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="technical">Technical Staff</SelectItem>
                      <SelectItem value="executive">Executives</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleGenerateOutline}
                disabled={isAnyLoading || !topic.trim()}
                size="sm"
                className="w-full"
                data-testid="generate-outline-button"
              >
                {generateOutlineMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Outline
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3 border-b border-border pb-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wand2 className="h-4 w-4" />
                Expand Section
              </div>
              
              <div>
                <Label htmlFor="section" className="text-xs">Section or Heading</Label>
                <Textarea
                  id="section"
                  value={sectionToExpand}
                  onChange={(e) => setSectionToExpand(e.target.value)}
                  placeholder="e.g., Best practices for customer communication"
                  className="text-sm min-h-[60px] resize-none"
                  data-testid="ai-section-input"
                />
              </div>

              <Button 
                onClick={handleExpandSection}
                disabled={isAnyLoading || !sectionToExpand.trim()}
                size="sm"
                variant="outline"
                className="w-full"
                data-testid="expand-section-button"
              >
                {expandSectionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Expanding...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Expand Section
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <PenLine className="h-4 w-4" />
                Improve Writing
              </div>
              
              <div>
                <Label htmlFor="instruction" className="text-xs">Instruction (Optional)</Label>
                <Input
                  id="instruction"
                  value={improveInstruction}
                  onChange={(e) => setImproveInstruction(e.target.value)}
                  placeholder="e.g., Make it more concise"
                  className="text-sm h-8"
                  data-testid="ai-instruction-input"
                />
              </div>

              <Button 
                onClick={handleImproveWriting}
                disabled={isAnyLoading || !currentContent?.trim()}
                size="sm"
                variant="outline"
                className="w-full"
                data-testid="improve-writing-button"
              >
                {improveWritingMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Improving...
                  </>
                ) : (
                  <>
                    <PenLine className="h-4 w-4 mr-2" />
                    Improve Current Content
                  </>
                )}
              </Button>

              {!currentContent?.trim() && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Add content to enable improvement
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
