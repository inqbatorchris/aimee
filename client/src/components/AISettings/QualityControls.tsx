import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle, AlertTriangle, XCircle, Save, Filter } from 'lucide-react';

interface QualityConfig {
  requireApproval: boolean;
  autoSaveDrafts: boolean;
  contentFilterLevel: 'strict' | 'moderate' | 'relaxed';
  confidenceThreshold: number;
  escalationRules: boolean;
  includeConfidenceScore: boolean;
  blockInappropriate: boolean;
  requireHumanReview: boolean;
}

export default function QualityControls() {
  const [config, setConfig] = useState<QualityConfig>({
    requireApproval: true,
    autoSaveDrafts: true,
    contentFilterLevel: 'moderate',
    confidenceThreshold: 0.7,
    escalationRules: true,
    includeConfidenceScore: true,
    blockInappropriate: true,
    requireHumanReview: false
  });

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadQualityConfig();
  }, []);

  const loadQualityConfig = async () => {
    try {
      const response = await fetch('/api/ai/quality-controls');
      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to load quality controls:', error);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/ai/quality-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Quality controls updated successfully',
        });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save quality controls. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (key: keyof QualityConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const getSecurityLevel = () => {
    const securityFeatures = [
      config.requireApproval,
      config.blockInappropriate,
      config.contentFilterLevel === 'strict',
      config.confidenceThreshold >= 0.8,
      config.escalationRules
    ].filter(Boolean).length;

    if (securityFeatures >= 4) return { level: 'High', color: 'green' };
    if (securityFeatures >= 2) return { level: 'Medium', color: 'yellow' };
    return { level: 'Low', color: 'red' };
  };

  const security = getSecurityLevel();

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Quality & Safety Overview
          </CardTitle>
          <CardDescription>
            Current security posture and response quality settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Security Level</div>
                <div className="text-sm text-gray-600">{security.level}</div>
              </div>
              <div className={`w-3 h-3 rounded-full bg-${security.color}-500`} />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Content Filter</div>
                <div className="text-sm text-gray-600 capitalize">{config.contentFilterLevel}</div>
              </div>
              <Filter className="w-5 h-5 text-blue-600" />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Confidence Threshold</div>
                <div className="text-sm text-gray-600">{Math.round(config.confidenceThreshold * 100)}%</div>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Approval Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>Response Approval Workflow</CardTitle>
          <CardDescription>
            Control how AI responses are reviewed before sending to customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="require-approval">Require Agent Approval</Label>
              <p className="text-sm text-gray-600">
                AI responses must be reviewed and approved before sending
              </p>
            </div>
            <Switch
              id="require-approval"
              checked={config.requireApproval}
              onCheckedChange={(checked) => updateConfig('requireApproval', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-save">Auto-save as Drafts</Label>
              <p className="text-sm text-gray-600">
                Automatically save AI responses as drafts for later review
              </p>
            </div>
            <Switch
              id="auto-save"
              checked={config.autoSaveDrafts}
              onCheckedChange={(checked) => updateConfig('autoSaveDrafts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="confidence-score">Include Confidence Scores</Label>
              <p className="text-sm text-gray-600">
                Show AI confidence level with each generated response
              </p>
            </div>
            <Switch
              id="confidence-score"
              checked={config.includeConfidenceScore}
              onCheckedChange={(checked) => updateConfig('includeConfidenceScore', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="human-review">Require Human Review</Label>
              <p className="text-sm text-gray-600">
                Flag responses for mandatory human review on sensitive topics
              </p>
            </div>
            <Switch
              id="human-review"
              checked={config.requireHumanReview}
              onCheckedChange={(checked) => updateConfig('requireHumanReview', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Filtering */}
      <Card>
        <CardHeader>
          <CardTitle>Content Filtering & Safety</CardTitle>
          <CardDescription>
            Automated content moderation and safety controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filter-level">Content Filter Level</Label>
            <Select 
              value={config.contentFilterLevel} 
              onValueChange={(value: 'strict' | 'moderate' | 'relaxed') => updateConfig('contentFilterLevel', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select filter level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <div>
                      <div className="font-medium">Strict</div>
                      <div className="text-xs text-gray-500">High security, may block valid responses</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="moderate">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <div>
                      <div className="font-medium">Moderate</div>
                      <div className="text-xs text-gray-500">Balanced approach (recommended)</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="relaxed">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="font-medium">Relaxed</div>
                      <div className="text-xs text-gray-500">Minimal filtering, maximum flexibility</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="block-inappropriate">Block Inappropriate Content</Label>
              <p className="text-sm text-gray-600">
                Automatically block responses containing inappropriate content
              </p>
            </div>
            <Switch
              id="block-inappropriate"
              checked={config.blockInappropriate}
              onCheckedChange={(checked) => updateConfig('blockInappropriate', checked)}
            />
          </div>

          {/* Content Filter Details */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">What gets filtered:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Profanity</Badge>
                <span className="text-gray-600">Offensive language</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Personal Info</Badge>
                <span className="text-gray-600">Accidental PII exposure</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Harmful Content</Badge>
                <span className="text-gray-600">Dangerous instructions</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Bias</Badge>
                <span className="text-gray-600">Discriminatory content</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Thresholds</CardTitle>
          <CardDescription>
            Set minimum quality standards for AI-generated responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Minimum Confidence Score: {Math.round(config.confidenceThreshold * 100)}%</Label>
            <Slider
              value={[config.confidenceThreshold]}
              onValueChange={(value) => updateConfig('confidenceThreshold', value[0])}
              max={1}
              min={0.5}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>50% (Low quality allowed)</span>
              <span>100% (Only highest quality)</span>
            </div>
            <p className="text-sm text-gray-600">
              Responses below this confidence level will be flagged for human review or blocked entirely.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="escalation-rules">Enable Escalation Rules</Label>
              <p className="text-sm text-gray-600">
                Automatically escalate complex issues to senior agents
              </p>
            </div>
            <Switch
              id="escalation-rules"
              checked={config.escalationRules}
              onCheckedChange={(checked) => updateConfig('escalationRules', checked)}
            />
          </div>

          {config.escalationRules && (
            <div className="ml-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <strong>Auto-escalation triggers:</strong>
              <ul className="mt-1 space-y-1 text-gray-600">
                <li>• Low AI confidence (&lt;{Math.round(config.confidenceThreshold * 100)}%)</li>
                <li>• Multiple failed response attempts</li>
                <li>• Customer complaint keywords detected</li>
                <li>• Technical issues beyond AI knowledge</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance & Audit */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance & Audit Trail</CardTitle>
          <CardDescription>
            Maintain records for quality assurance and compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Automatic Logging</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>✓ All AI response generations</div>
                <div>✓ Agent approval/rejection decisions</div>
                <div>✓ Content filter actions</div>
                <div>✓ Quality threshold violations</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Data Retention</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>• AI prompts: 30 days</div>
                <div>• Generated responses: 90 days</div>
                <div>• Audit logs: 1 year</div>
                <div>• Quality metrics: Indefinite</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={saveConfig} disabled={isSaving} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Quality Controls'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}