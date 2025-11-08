import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Settings2, ChevronDown, ChevronRight, Eye, Copy } from 'lucide-react';
import { SaveVersionDialog } from './SaveVersionDialog';
import { ConfigurationDetailModal } from './ConfigurationDetailModal';

interface AgentVersion {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
  configuration: {
    prompt: string;
    model: string;
    temperature: number;
  };
}

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
}

const AVAILABLE_AGENTS: Agent[] = [
  {
    id: 'support-tickets',
    name: 'Support Ticket Assistant',
    description: 'AI agent for handling customer support tickets',
    type: 'support'
  }
  // Future agents will be added here
];

export default function AgentConfigManager() {
  const [selectedAgent, setSelectedAgent] = useState('support-tickets');
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [detailModalVersion, setDetailModalVersion] = useState<AgentVersion | null>(null);

  // Load versions from localStorage on component mount
  useEffect(() => {
    loadVersions();
    loadCurrentPrompt();
  }, [selectedAgent]);

  const loadVersions = async () => {
    try {
      // First try to load from database
      const response = await fetch('/api/ai/agents/support_ticket/versions');
      if (response.ok) {
        const versions = await response.json();
        setVersions(versions);
        return;
      }
    } catch (error) {
      console.error('Failed to load versions from database:', error);
    }

    // Fallback to localStorage for backwards compatibility
    const storageKey = `ai-agent-versions-${selectedAgent}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsedVersions = JSON.parse(stored);
        
        // Check if versions need updating with real configuration data
        const needsUpdate = parsedVersions.some((v: AgentVersion) => 
          !v.configuration?.prompt || 
          v.configuration.prompt === 'Current prompt from the system will be captured here' ||
          v.configuration.prompt === 'You are a helpful customer support assistant.'
        );

        if (needsUpdate) {
          await refreshVersionsWithCurrentConfig(parsedVersions);
        } else {
          setVersions(parsedVersions);
        }
      } catch (error) {
        console.error('Failed to parse stored versions:', error);
        await initializeDefaultVersion();
      }
    } else {
      await initializeDefaultVersion();
    }
  };

  const refreshVersionsWithCurrentConfig = async (existingVersions: AgentVersion[]) => {
    try {
      const [promptResponse, configResponse] = await Promise.all([
        fetch('/api/ai/prompt'),
        fetch('/api/ai/config')
      ]);

      let currentConfig = {
        prompt: '',
        model: 'gpt-4o',
        temperature: 0.7
      };

      if (promptResponse.ok) {
        const promptData = await promptResponse.json();
        currentConfig.prompt = promptData.prompt;
      }

      if (configResponse.ok) {
        const configData = await configResponse.json();
        currentConfig.model = configData.model || currentConfig.model;
        currentConfig.temperature = configData.temperature || currentConfig.temperature;
      }

      // Update versions that have placeholder prompts
      const updatedVersions = existingVersions.map((version: AgentVersion) => {
        if (!version.configuration?.prompt || 
            version.configuration.prompt === 'Current prompt from the system will be captured here' ||
            version.configuration.prompt === 'You are a helpful customer support assistant.') {
          return {
            ...version,
            configuration: {
              ...version.configuration,
              prompt: currentConfig.prompt,
              model: currentConfig.model,
              temperature: currentConfig.temperature
            }
          };
        }
        return version;
      });

      setVersions(updatedVersions);
      saveVersions(updatedVersions);
      setCurrentPrompt(currentConfig.prompt);
    } catch (error) {
      console.error('Failed to refresh versions:', error);
      setVersions(existingVersions);
    }
  };

  const loadCurrentPrompt = async () => {
    try {
      const response = await fetch('/api/ai/prompt');
      if (response.ok) {
        const data = await response.json();
        setCurrentPrompt(data.prompt || '');
      }
    } catch (error) {
      console.error('Failed to load current prompt:', error);
      setCurrentPrompt('');
    }
  };

  const initializeDefaultVersion = async () => {
    try {
      // Load current configuration when initializing
      const [promptResponse, configResponse] = await Promise.all([
        fetch('/api/ai/prompt'),
        fetch('/api/ai/config')
      ]);

      let config = {
        prompt: 'Loading current configuration...',
        model: 'gpt-4o',
        temperature: 0.7
      };

      if (promptResponse.ok) {
        const promptData = await promptResponse.json();
        config.prompt = promptData.prompt || config.prompt;
      }

      if (configResponse.ok) {
        const configData = await configResponse.json();
        config.model = configData.model || config.model;
        config.temperature = configData.temperature || config.temperature;
      }

      const defaultVersion: AgentVersion = {
        id: 'default-v1',
        name: 'v1.0',
        notes: 'Initial configuration',
        createdAt: new Date().toISOString(),
        createdBy: 'System',
        isActive: true,
        configuration: config
      };
      
      setVersions([defaultVersion]);
      saveVersions([defaultVersion]);
      setCurrentPrompt(config.prompt);
    } catch (error) {
      console.error('Failed to initialize default version:', error);
      // Fallback initialization
      const defaultVersion: AgentVersion = {
        id: 'default-v1',
        name: 'v1.0',
        notes: 'Initial configuration',
        createdAt: new Date().toISOString(),
        createdBy: 'System',
        isActive: true,
        configuration: {
          prompt: 'Failed to load current configuration',
          model: 'gpt-4o',
          temperature: 0.7
        }
      };
      setVersions([defaultVersion]);
      saveVersions([defaultVersion]);
    }
  };

  const saveVersions = (newVersions: AgentVersion[]) => {
    const storageKey = `ai-agent-versions-${selectedAgent}`;
    localStorage.setItem(storageKey, JSON.stringify(newVersions));
  };

  const handleSaveVersion = async (versionData: { name: string; notes: string }) => {
    try {
      // Get the current complete configuration from all sources
      const [promptResponse, configResponse] = await Promise.all([
        fetch('/api/ai/prompt'),
        fetch('/api/ai/config')
      ]);

      let configData = {
        agentId: 1, // Support Ticket Assistant
        prompt: currentPrompt,
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 500,
        includeCustomerProfile: true,
        includeFinancialData: true,
        includeServiceData: true,
        includeTicketHistory: true,
        includeServiceHealth: true,
        historicalTicketLimit: 5,
        includeInternalNotes: false,
        includeBillingDetails: true,
        requireApproval: false,
        autoSaveDrafts: true,
        contentFilterLevel: 'moderate',
        confidenceThreshold: 0.7,
        escalationRules: false,
        includeConfidenceScore: true,
        blockInappropriate: true,
        requireHumanReview: false,
        isActive: true
      };

      // Update with latest prompt data if available
      if (promptResponse.ok) {
        const promptData = await promptResponse.json();
        configData.prompt = promptData.prompt || currentPrompt;
      }

      // Update with latest config data if available
      if (configResponse.ok) {
        const configResponseData = await configResponse.json();
        configData.model = configResponseData.model || configData.model;
        configData.temperature = configResponseData.temperature || configData.temperature;
      }

      // Create configuration in database
      const configCreateResponse = await fetch('/api/ai/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });

      if (!configCreateResponse.ok) {
        throw new Error('Failed to save configuration');
      }

      const configuration = await configCreateResponse.json();

      // Create version in database
      const versionCreateData = {
        agentId: 1,
        configurationId: configuration.id,
        version: `1.${versions.length + 1}.0`,
        name: versionData.name,
        description: versionData.notes,
        status: 'active'
      };

      const versionCreateResponse = await fetch('/api/ai/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versionCreateData)
      });

      if (!versionCreateResponse.ok) {
        throw new Error('Failed to save version');
      }

      // Reload versions from database
      await loadVersions();
      setShowSaveDialog(false);

      // Update current prompt state to match what was saved
      setCurrentPrompt(configData.prompt);
    } catch (error) {
      console.error('Failed to save version:', error);
      // Fallback to localStorage for backwards compatibility
      const newVersion: AgentVersion = {
        id: `version-${Date.now()}`,
        name: versionData.name,
        notes: versionData.notes,
        createdAt: new Date().toISOString(),
        createdBy: 'Admin User',
        isActive: true,
        configuration: {
          prompt: currentPrompt || 'Failed to load current prompt',
          model: 'gpt-4o',
          temperature: 0.7
        }
      };

      const updatedVersions = versions.map(v => ({ ...v, isActive: false }));
      const newVersions = [newVersion, ...updatedVersions];
      
      setVersions(newVersions);
      saveVersions(newVersions);
      setShowSaveDialog(false);
    }
  };

  const activateVersion = (versionId: string) => {
    const updatedVersions = versions.map(v => ({
      ...v,
      isActive: v.id === versionId
    }));
    setVersions(updatedVersions);
    saveVersions(updatedVersions);
  };

  const handleDuplicateVersion = (version: AgentVersion) => {
    const duplicatedVersion: AgentVersion = {
      ...version,
      id: `version-${Date.now()}`,
      name: `${version.name} (copy)`,
      notes: `Copy of ${version.name}: ${version.notes}`,
      createdAt: new Date().toISOString(),
      createdBy: 'Admin User',
      isActive: false
    };

    const updatedVersions = [duplicatedVersion, ...versions];
    setVersions(updatedVersions);
    saveVersions(updatedVersions);
  };

  const toggleVersionExpanded = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const getCurrentVersion = () => {
    return versions.find(v => v.isActive) || versions[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const currentVersion = getCurrentVersion();

  return (
    <div className="space-y-4">
      {/* Agent Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">AI Agent</label>
        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an AI agent" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_AGENTS.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-xs text-gray-500">{agent.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Current Configuration Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                Current: {currentVersion?.name || 'No version'}
              </span>
              <Badge variant="secondary" className="text-xs">Active</Badge>
            </div>
            {currentVersion && (
              <div className="flex items-center gap-4 text-xs text-blue-700">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(currentVersion.createdAt)}
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {currentVersion.createdBy}
                </div>
              </div>
            )}
            {currentVersion?.notes && (
              <p className="text-xs text-blue-600 mt-1">{currentVersion.notes}</p>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setShowSaveDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save New Version
          </Button>
        </div>
      </div>

      {/* Compact Configuration History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Configuration History</h4>
          <span className="text-xs text-gray-500">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
        </div>
        
        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
          {versions.map((version) => (
            <div key={version.id} className="group">
              {/* Compact Row */}
              <div 
                className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  version.isActive ? 'bg-blue-50' : ''
                }`}
                onClick={() => toggleVersionExpanded(version.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {expandedVersions.has(version.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <span className="font-medium text-sm">{version.name}</span>
                    {version.isActive && (
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                    )}
                    <span className="text-sm text-gray-600 truncate">{version.notes}</span>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatDate(version.createdAt)}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedVersions.has(version.id) && (
                <div className="px-3 pb-3 bg-gray-50 border-t">
                  <div className="pt-2 space-y-2">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Model:</span> {version.configuration.model}, 
                      <span className="font-medium ml-2">Temp:</span> {version.configuration.temperature} | 
                      <span className="font-medium ml-2">By:</span> {version.createdBy}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2">
                      <span className="font-medium">Prompt:</span> {version.configuration.prompt.slice(0, 100)}...
                    </div>
                    <div className="flex gap-2 pt-1">
                      {!version.isActive && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            activateVersion(version.id);
                          }}
                        >
                          Activate
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailModalVersion(version);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Full Config
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateVersion(version);
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Duplicate
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Version Dialog */}
      <SaveVersionDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveVersion}
        currentVersion={currentVersion?.name || 'v1.0'}
      />

      {/* Configuration Detail Modal */}
      <ConfigurationDetailModal
        open={!!detailModalVersion}
        onOpenChange={(open) => !open && setDetailModalVersion(null)}
        version={detailModalVersion}
        onActivate={activateVersion}
        onDuplicate={handleDuplicateVersion}
      />
    </div>
  );
}