import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { booleanPointInPolygon, point, polygon } from '@turf/turf';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MapPin, Search, X, FileText, Activity, Plus, Image as ImageIcon, Wrench, Trash2, Upload, Camera, Map, Table as TableIcon, Download, Settings, Eye, EyeOff, GripVertical, Square, CheckCircle, Hand, Pencil, Cable, Link2, Edit, Save } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { createWorkItem } from '@/lib/workItems.api';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FiberNode {
  id: number;
  name: string;
  nodeType: string;
  status: string;
  network: string;
  latitude: number;
  longitude: number;
  what3words?: string;
  address?: string;
  notes?: string;
  photos: any[];
  fiberDetails: any;
  createdAt: string;
  updatedAt: string;
}

interface ActivityLog {
  id: number;
  userName: string;
  actionType: string;
  changes: any;
  timestamp: string;
}

// Component to display linked work items for a fiber node
function LinkedWorkItems({ nodeId }: { nodeId: number }) {
  const [, setLocation] = useLocation();
  
  const { data: workItems, isLoading } = useQuery({
    queryKey: ['/api/work-items', { fiberNodeId: nodeId }],
    queryFn: async () => {
      const response = await fetch(`/api/work-items?fiberNodeId=${nodeId}`);
      if (!response.ok) throw new Error('Failed to fetch work items');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">Loading work items...</p>
      </div>
    );
  }

  if (!workItems || workItems.length === 0) {
    return (
      <div className="text-center py-8">
        <Wrench className="w-12 h-12 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">No work items linked to this chamber</p>
        <p className="text-xs text-gray-400 mt-1">
          Click "Create Work Item" to add one
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Planning': 'bg-gray-100 text-gray-800',
      'Ready': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Stuck': 'bg-red-100 text-red-800',
      'Completed': 'bg-green-100 text-green-800',
      'Archived': 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600 mb-2">
        {workItems.length} work {workItems.length === 1 ? 'item' : 'items'} linked to this chamber
      </div>
      {workItems.map((item: any) => (
        <Card 
          key={item.id} 
          className="p-4 cursor-pointer hover:bg-accent transition-colors" 
          onClick={() => {
            const templateId = item.workflowTemplateId || item.workItemType || '';
            setLocation(`/strategy/work-items?panel=workItem&mode=view&id=${item.id}&workflowTemplateId=${templateId}`);
          }}
          data-testid={`work-item-card-${item.id}`}
        >
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{item.title}</h4>
                {item.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                )}
              </div>
              <Badge className={getStatusColor(item.status)}>
                {item.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {item.assignee && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">{item.assignee.fullName}</span>
                </div>
              )}
              {item.dueDate && (
                <div className="flex items-center gap-1">
                  <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              {item.workflowMetadata?.templateName && (
                <div className="flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  <span>{item.workflowMetadata.templateName}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Component to handle map clicks for polygon creation
function PolygonDrawer({ 
  isDrawing, 
  currentPolygon, 
  onPointAdd 
}: {
  isDrawing: boolean;
  currentPolygon: [number, number][];
  onPointAdd: (point: [number, number]) => void;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!isDrawing) return;
    
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onPointAdd([lat, lng]);
    };
    
    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, isDrawing, onPointAdd]);
  
  return null;
}

// Component to handle map clicks for adding new nodes
function MapClickHandler({ 
  onMapClick,
  disabled
}: {
  onMapClick: (lat: number, lng: number) => void;
  disabled: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (!disabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  
  return null;
}

// Component to handle adding waypoints to cable paths
function WaypointAdder({
  enabled,
  onWaypointAdd
}: {
  enabled: boolean;
  onWaypointAdd: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onWaypointAdd(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  
  return null;
}

export default function FiberNetwork() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [selectedNode, setSelectedNode] = useState<FiberNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');
  const [tableTab, setTableTab] = useState<'nodes' | 'cables'>('nodes'); // Tab selection for table view
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const [workItemDialogOpen, setWorkItemDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [workItemAssignee, setWorkItemAssignee] = useState<number | null>(null);
  const [workItemTeam, setWorkItemTeam] = useState<number | null>(null);
  const [workItemDueDate, setWorkItemDueDate] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<FiberNode | null>(null);
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    status: true,
    nodeType: true,
    network: true,
    address: true,
    what3words: true,
    coordinates: true,
    notes: true,
    photos: true,
    workItems: true,
  });

  // Filter state
  const [filterType, setFilterType] = useState<'network' | 'status' | 'type'>('network');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [workItemFilter, setWorkItemFilter] = useState<'all' | 'with' | 'without'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<string>('');
  const [showNodes, setShowNodes] = useState(true);
  const [showCables, setShowCables] = useState(true);

  // Unified map mode state - only one mode can be active at a time
  const [mapMode, setMapMode] = useState<'idle' | 'addNode' | 'cableRouting' | 'polygonSelect' | 'clickSelect'>('idle');
  
  // Polygon drawing state
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([]);
  const [selectedPolygon, setSelectedPolygon] = useState<[number, number][]>([]);

  // Add Node dialog state
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [newNodeData, setNewNodeData] = useState({
    name: '',
    nodeType: 'chamber',
    network: 'FibreLtd',
    status: 'planned',
    latitude: 0,
    longitude: 0,
    what3words: '',
    address: '',
    notes: '',
  });
  const [createWorkItemForNewNode, setCreateWorkItemForNewNode] = useState(false);
  const [newNodeTemplate, setNewNodeTemplate] = useState<any>(null);

  // Cable routing state
  const [cableStartNode, setCableStartNode] = useState<FiberNode | null>(null);
  const [cableEndNode, setCableEndNode] = useState<FiberNode | null>(null);
  const [cableDialogOpen, setCableDialogOpen] = useState(false);
  const [newCableData, setNewCableData] = useState({
    cableId: '',
    fiberCount: 24,
    cableType: 'single_mode',
    lengthMeters: 0,
    status: 'planned',
    notes: '',
  });
  const [selectedCable, setSelectedCable] = useState<any>(null);
  const [cableEditMode, setCableEditMode] = useState(false);
  const [editingCable, setEditingCable] = useState<any>(null);
  const [editingCableWaypoints, setEditingCableWaypoints] = useState<Array<[number, number]>>([]);
  const [originalCableWaypoints, setOriginalCableWaypoints] = useState<Array<[number, number]>>([]);
  const [addingWaypoint, setAddingWaypoint] = useState(false);

  // Derived states for backward compatibility
  const cableRoutingMode = mapMode === 'cableRouting';
  const selectionMode = mapMode === 'polygonSelect' ? 'polygon' : mapMode === 'clickSelect' ? 'click' : null;
  const isDrawing = mapMode === 'polygonSelect'; // Activate drawing immediately when mode is set

  // Fetch all fiber nodes
  const { data: nodesData, isLoading } = useQuery<{ nodes: FiberNode[] }>({
    queryKey: ['/api/fiber-network/nodes'],
  });

  // Fetch users for assignee dropdown
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/work-items/users'],
    select: (data: any) => data.users || data || [],
  });

  // Fetch teams for team dropdown
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });

  // Fetch activity logs for selected node
  const { data: activityData } = useQuery<{ logs: ActivityLog[] }>({
    queryKey: selectedNode?.id 
      ? [`/api/fiber-network/nodes/${selectedNode.id}/activity`]
      : ['disabled'],
    enabled: !!selectedNode?.id,
  });

  // Fetch workflow templates
  const { data: templates } = useQuery<any[]>({
    queryKey: ['/api/workflows/templates'],
  });

  // Update node mutation
  const updateNodeMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<FiberNode> }) => {
      return apiRequest(`/api/fiber-network/nodes/${data.id}`, {
        method: 'PATCH',
        body: data.updates,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/fiber-network/nodes'] });
      // Invalidate activity logs for the updated chamber
      if (variables.id) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/fiber-network/nodes/${variables.id}/activity`] 
        });
      }
      toast({
        title: 'Success',
        description: 'Chamber updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update chamber',
        variant: 'destructive',
      });
    },
  });

  // Bulk update status mutation
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async (data: { nodeIds: number[]; status: string }) => {
      return apiRequest('/api/fiber-network/nodes/bulk-update-status', {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fiber-network/nodes'] });
    },
  });

  // Delete node mutation
  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: number) => {
      const response = await apiRequest(`/api/fiber-network/nodes/${nodeId}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fiber-network/nodes'] });
      toast({
        title: 'Success',
        description: 'Node deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete node',
        variant: 'destructive',
      });
    },
  });

  // Create cable mutation
  const createCableMutation = useMutation({
    mutationFn: async (data: { startNodeId: number; endNodeId: number; cableData: typeof newCableData }) => {
      return apiRequest('/api/fiber-network/cables', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fiber-network/nodes'] });
      toast({
        title: 'Success',
        description: 'Cable created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create cable',
        variant: 'destructive',
      });
    },
  });

  // Create node mutation
  const createNodeMutation = useMutation({
    mutationFn: async (nodeData: typeof newNodeData) => {
      const response = await apiRequest('/api/fiber-network/nodes', {
        method: 'POST',
        body: nodeData,
      });
      // apiRequest throws on error, so if we get here it succeeded
      // Parse the JSON response from the fetch Response object
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fiber-network/nodes'] });
      // Toast is handled in handleCreateNode to avoid duplicates
    },
  });

  // Settings dialog state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [newNodeTypeName, setNewNodeTypeName] = useState('');
  const [newNodeTypeLabel, setNewNodeTypeLabel] = useState('');

  // Splice tray editor state
  const [spliceTrayEditorOpen, setSpliceTrayEditorOpen] = useState(false);
  const [selectedSpliceTray, setSelectedSpliceTray] = useState<any>(null);
  const [spliceTrayFormData, setSpliceTrayFormData] = useState({
    trayIdentifier: '',
    description: '',
  });
  const [leftCableId, setLeftCableId] = useState<number | null>(null);
  const [rightCableId, setRightCableId] = useState<number | null>(null);
  const [fiberConnections, setFiberConnections] = useState<Array<{
    id?: number;
    leftCableId: number;
    leftFiberNumber: number;
    rightCableId: number;
    rightFiberNumber: number;
    createdVia: 'manual' | 'workflow_step';
  }>>([]);

  // Fetch node types
  const { data: nodeTypesData } = useQuery<{ nodeTypes: any[] }>({
    queryKey: ['/api/fiber-network/node-types'],
  });

  const nodeTypes = nodeTypesData?.nodeTypes || [];

  // Create node type mutation
  const createNodeTypeMutation = useMutation({
    mutationFn: async (data: { value: string; label: string }) => {
      return apiRequest('/api/fiber-network/node-types', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fiber-network/node-types'] });
      setNewNodeTypeName('');
      setNewNodeTypeLabel('');
      toast({
        title: 'Success',
        description: 'Node type created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create node type',
        variant: 'destructive',
      });
    },
  });

  // Delete node type mutation
  const deleteNodeTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/fiber-network/node-types/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fiber-network/node-types'] });
      toast({
        title: 'Success',
        description: 'Node type deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete node type',
        variant: 'destructive',
      });
    },
  });

  // Create splice tray mutation
  const createSpliceTrayMutation = useMutation({
    mutationFn: async (data: {
      nodeId: number;
      trayIdentifier: string;
      description?: string;
      connections: Array<{
        leftCableId: number;
        leftFiberNumber: number;
        rightCableId: number;
        rightFiberNumber: number;
        createdVia: 'manual' | 'workflow_step';
      }>;
    }) => {
      return apiRequest('/api/fiber-network/splice-trays', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fiber-network/nodes'] });
      setSpliceTrayEditorOpen(false);
      setSelectedSpliceTray(null);
      setSpliceTrayFormData({ trayIdentifier: '', description: '' });
      setFiberConnections([]);
      setLeftCableId(null);
      setRightCableId(null);
      toast({
        title: 'Success',
        description: 'Splice tray created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create splice tray',
        variant: 'destructive',
      });
    },
  });

  const nodes = nodesData?.nodes || [];
  
  // Extract all cables from nodes (for cable table view)
  const allCables = (() => {
    const renderedCables = new Set<string>();
    const cables: any[] = [];
    
    nodes.forEach((node) => {
      const nodeCables = node.fiberDetails?.cables || [];
      nodeCables.forEach((cable: any) => {
        // Only include each cable once (check both directions)
        const cableKey = [node.id, cable.connectedNodeId].sort().join('-');
        if (!renderedCables.has(cableKey) && cable.direction === 'outgoing') {
          renderedCables.add(cableKey);
          cables.push({
            ...cable,
            startNodeId: node.id,
            startNodeName: node.name,
            endNodeId: cable.connectedNodeId,
            endNodeName: cable.connectedNodeName,
          });
        }
      });
    });
    
    return cables;
  })();
  
  // Mode management helpers - ensures clean transitions between modes
  const enterAddNodeMode = () => {
    setMapMode('addNode');
    // Clear conflicting state
    setCableStartNode(null);
    setCableEndNode(null);
    setSelectedNodes([]);
    setSelectedPolygon([]);
    setCurrentPolygon([]);
    toast({
      title: 'Add Node Mode',
      description: 'Click on the map to place a new node',
    });
  };

  const enterCableRoutingMode = () => {
    setMapMode('cableRouting');
    // Clear conflicting state
    setSelectedNodes([]);
    setSelectedPolygon([]);
    setCurrentPolygon([]);
    toast({
      title: 'Cable Routing Mode',
      description: 'Click two nodes to create a cable connection',
    });
  };

  const enterPolygonSelectMode = () => {
    setMapMode('polygonSelect');
    // Clear conflicting state
    setCableStartNode(null);
    setCableEndNode(null);
  };

  const enterClickSelectMode = () => {
    setMapMode('clickSelect');
    // Clear conflicting state
    setCableStartNode(null);
    setCableEndNode(null);
  };

  const exitMode = () => {
    setMapMode('idle');
    // Clear all mode-related state
    setCableStartNode(null);
    setCableEndNode(null);
    setSelectedNodes([]);
    setSelectedPolygon([]);
    setCurrentPolygon([]);
  };
  
  // Check if filters are active
  const hasActiveFilters = !!(selectedNetwork || selectedStatus || selectedType || workItemFilter !== 'all');
  
  // DEBUG: Log API data
  console.log('[FIBER] API Response - Total nodes:', nodes.length);
  console.log('[FIBER] Sample node:', nodes[0]);
  if (nodes[0]) {
    console.log('[FIBER] Sample node fields:', {
      network: nodes[0].network,
      status: nodes[0].status,
      nodeType: nodes[0].nodeType,
      latitude: nodes[0].latitude,
      longitude: nodes[0].longitude
    });
  }
  
  // Apply filters
  const filteredNodes = nodes.filter(node => {
    // Search match
    const searchMatch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by selected criteria (empty = show all)
    let filterMatch = true;
    if (selectedNetwork) {
      filterMatch = filterMatch && node.network === selectedNetwork;
    }
    if (selectedStatus) {
      filterMatch = filterMatch && node.status === selectedStatus;
    }
    if (selectedType) {
      filterMatch = filterMatch && node.nodeType === selectedType;
    }
    
    // Filter by work item attachment
    if (workItemFilter === 'with') {
      const hasWorkItems = (node as any).workItemCounts?.total > 0;
      filterMatch = filterMatch && hasWorkItems;
    } else if (workItemFilter === 'without') {
      const hasWorkItems = (node as any).workItemCounts?.total > 0;
      filterMatch = filterMatch && !hasWorkItems;
    }
    
    return searchMatch && filterMatch;
  });
  
  // DEBUG: Log filter state and results
  console.log('[FIBER] Filter State:', {
    hasActiveFilters,
    selectedNetwork,
    selectedStatus,
    selectedType,
    viewMode,
    searchTerm,
    filteredCount: filteredNodes.length
  });
  console.log('[FIBER] Sample filtered node:', filteredNodes[0]);

  // Apply filter handler
  const handleApplyFilter = () => {
    setIsFilterVisible(false);
    setMobileFilterOpen(false);
    toast({
      title: hasActiveFilters ? 'Filter Applied' : 'Showing All Chambers',
      description: `Showing ${filteredNodes.length} chambers`,
    });
  };

  // DEBUG: Track filtered nodes changes
  useEffect(() => {
    console.log('[FIBER] Filtered nodes changed:', filteredNodes.length);
    console.log('[FIBER] This should trigger marker re-render');
  }, [filteredNodes.length]);

  // Clear filters
  const handleClearFilters = () => {
    setSelectedNetwork('');
    setSelectedStatus('');
    setSelectedType('');
    setWorkItemFilter('all');
    setMobileFilterOpen(false);
  };

  // Get status display information
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      active: { label: 'Active', color: 'text-green-800', bgColor: 'bg-green-100' },
      planned: { label: 'Planned', color: 'text-blue-800', bgColor: 'bg-blue-100' },
      build_complete: { label: 'Build Complete', color: 'text-purple-800', bgColor: 'bg-purple-100' },
      awaiting_evidence: { label: 'Awaiting Evidence', color: 'text-amber-800', bgColor: 'bg-amber-100' },
      action_required: { label: 'Action Required', color: 'text-red-800', bgColor: 'bg-red-100' },
      decommissioned: { label: 'Decommissioned', color: 'text-gray-800', bgColor: 'bg-gray-100' }
    };
    return statusMap[status] || { label: status, color: 'text-gray-800', bgColor: 'bg-gray-100' };
  };

  // Marker icons using standard Leaflet PNG icons
  const markerIcons = {
    chamber: L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    }),
    cabinet: L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    }),
    pole: L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    }),
    splice_closure: L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    }),
    default: L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    }),
  };

  const getMarkerIcon = (nodeType: string) => {
    return markerIcons[nodeType as keyof typeof markerIcons] || markerIcons.default;
  };

  const handleNodeUpdate = async (updates: Partial<FiberNode>) => {
    if (!selectedNode) return;
    
    await updateNodeMutation.mutateAsync({
      id: selectedNode.id,
      updates,
    });
    
    setSelectedNode({ ...selectedNode, ...updates });
  };

  const handleDeleteNode = async () => {
    if (!nodeToDelete) return;
    
    try {
      await deleteNodeMutation.mutateAsync(nodeToDelete.id);
      setDeleteConfirmOpen(false);
      setNodeToDelete(null);
      if (selectedNode?.id === nodeToDelete.id) {
        setSelectedNode(null);
      }
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  const handlePhotoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string;
        const newPhoto = {
          data: base64,
          timestamp: new Date().toISOString(),
          uploadedBy: currentUser?.id || 0,
          fileName: file.name,
          fileSize: file.size,
        };

        const updatedPhotos = [...(selectedNode?.photos || []), newPhoto];
        await handleNodeUpdate({ photos: updatedPhotos });
        setPhotoUploadOpen(false);
        
        toast({
          title: 'Success',
          description: 'Photo uploaded successfully',
        });
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast({
          title: 'Upload Failed',
          description: error instanceof Error ? error.message : 'Failed to upload photo',
          variant: 'destructive',
        });
      }
    };
    
    reader.onerror = () => {
      toast({
        title: 'Upload Failed',
        description: 'Failed to read image file',
        variant: 'destructive',
      });
    };
    
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = async (index: number) => {
    if (!selectedNode) return;
    const updatedPhotos = selectedNode.photos.filter((_, i) => i !== index);
    await handleNodeUpdate({ photos: updatedPhotos });
  };

  // CSV Export function
  const handleExportCSV = () => {
    const headers = ['Name', 'Status', 'Type', 'Address', 'What3Words', 'Latitude', 'Longitude', 'Notes'];
    const rows = filteredNodes.map(node => [
      node.name,
      node.status,
      node.nodeType,
      node.address || '',
      node.what3words || '',
      node.latitude,
      node.longitude,
      node.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fiber-network-chambers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreateWorkItem = async () => {
    if (!selectedTemplate) return;

    // Determine if bulk creation or single
    const isBulk = selectedNodes.length > 0;
    const nodesToProcess = isBulk 
      ? nodes.filter(n => selectedNodes.includes(n.id))
      : selectedNode ? [selectedNode] : [];

    if (nodesToProcess.length === 0) return;

    try {
      // Create work items for all selected nodes
      const promises = nodesToProcess.map(node => {
        const workItemData = {
          title: `${selectedTemplate.name} - ${node.name}`,
          description: `Work item for ${node.name} at ${node.address || 'Unknown location'}`,
          status: 'Planning' as const,
          assignedTo: workItemAssignee || currentUser?.id, // Use selected assignee or default to current user
          teamId: workItemTeam || undefined,
          dueDate: workItemDueDate || undefined,
          workflowTemplateId: selectedTemplate.id,
          workflowSource: 'manual',
          workItemType: selectedTemplate.id,
          workflowMetadata: {
            templateName: selectedTemplate.name,
            templateCategory: selectedTemplate.category || 'Field Engineering',
            fiberNodeId: node.id,
            chamberName: node.name,
            chamberLocation: {
              latitude: node.latitude,
              longitude: node.longitude,
              address: node.address,
              what3words: node.what3words,
            },
          },
        };
        return createWorkItem(workItemData);
      });

      await Promise.all(promises);
      
      toast({
        title: 'Success',
        description: isBulk 
          ? `${nodesToProcess.length} work items created successfully`
          : 'Work item created successfully',
      });

      setWorkItemDialogOpen(false);
      setSelectedTemplate(null);
      setWorkItemAssignee(null);
      setWorkItemTeam(null);
      setWorkItemDueDate('');
      setSelectedNodes([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create work item(s)',
        variant: 'destructive',
      });
    }
  };

  // Polygon drawing functions - updated to use new mode system
  const startDrawing = () => {
    setMapMode('polygonSelect');
    setCurrentPolygon([]);
    setSelectedPolygon([]);
    setSelectedNodes([]);
    setCableStartNode(null);
    setCableEndNode(null);
    toast({
      title: "Polygon Mode",
      description: "Click on the map to create polygon points. Click finish when done.",
    });
  };

  const addPolygonPoint = (point: [number, number]) => {
    setCurrentPolygon(prev => [...prev, point]);
  };

  const finishPolygon = () => {
    if (currentPolygon.length < 3) {
      toast({
        title: "Invalid Polygon",
        description: "A polygon needs at least 3 points",
        variant: "destructive",
      });
      return;
    }

    // Close the polygon by ensuring first and last points are identical
    const closedPolygon = [...currentPolygon];
    const firstPoint = closedPolygon[0];
    const lastPoint = closedPolygon[closedPolygon.length - 1];

    // Check if polygon is already closed
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      closedPolygon.push([firstPoint[0], firstPoint[1]]);
    }

    setSelectedPolygon(closedPolygon);
    setCurrentPolygon([]); // Clear drawing polygon

    // Find nodes within the polygon using Turf.js
    // Note: Uses filteredNodes to only select from currently visible/filtered chambers
    // This ensures polygon selection respects active filters (Network/Status/Type)
    const nodesInPolygon = filteredNodes.filter((node: FiberNode) => {
      const nodePoint = point([node.longitude, node.latitude]);
      // Create properly closed polygon for Turf.js
      const polygonCoords = closedPolygon.map(([lat, lng]) => [lng, lat]);
      const poly = polygon([polygonCoords]);

      return booleanPointInPolygon(nodePoint, poly);
    });

    // Select the nodes for bulk operations
    setSelectedNodes(nodesInPolygon.map(n => n.id));

    toast({
      title: "Polygon Created",
      description: `Selected ${nodesInPolygon.length} chamber${nodesInPolygon.length !== 1 ? 's' : ''} within the polygon`,
    });
  };

  const clearPolygon = () => {
    exitMode();
  };

  // Click selection handler for markers
  const handleMarkerClick = (nodeId: number) => {
    // Handle cable routing mode clicks
    if (cableRoutingMode) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      if (!cableStartNode) {
        // First click - select start node
        setCableStartNode(node);
        toast({
          title: 'Start node selected',
          description: `Now click on the end node to create cable from ${node.name}`,
        });
      } else if (cableStartNode.id === nodeId) {
        // Clicked same node - deselect
        setCableStartNode(null);
        toast({
          title: 'Selection cleared',
          description: 'Click a node to start cable routing',
        });
      } else {
        // Second click - select end node and open dialog
        setCableEndNode(node);
        setCableDialogOpen(true);
        // Auto-generate cable ID
        setNewCableData(prev => ({
          ...prev,
          cableId: `CBL-${cableStartNode.id}-${nodeId}`,
        }));
      }
      return;
    }
    
    if (selectionMode !== 'click') return;
    
    setSelectedNodes(prev => {
      if (prev.includes(nodeId)) {
        // Deselect if already selected
        return prev.filter(id => id !== nodeId);
      } else {
        // Select if not selected
        return [...prev, nodeId];
      }
    });
  };

  // Handle map click for adding new node
  const handleMapClick = (lat: number, lng: number) => {
    setNewNodeData({
      name: '',
      nodeType: 'chamber',
      network: 'FibreLtd',
      status: 'planned',
      latitude: lat,
      longitude: lng,
      what3words: '',
      address: '',
      notes: '',
    });
    setCreateWorkItemForNewNode(false);
    setAddNodeDialogOpen(true);
  };

  // Handle creating new node
  const handleCreateNode = async () => {
    if (!newNodeData.name) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a name for the node',
        variant: 'destructive',
      });
      return;
    }

    // Validate template selection if creating work item
    if (createWorkItemForNewNode && !newNodeTemplate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a workflow template',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('[CREATE NODE] Submitting node data:', newNodeData);
      const result = await createNodeMutation.mutateAsync(newNodeData);
      console.log('[CREATE NODE] Node created successfully:', result);
      
      // If user wants to create a work item for this node
      if (createWorkItemForNewNode && newNodeTemplate && result && result.node) {
        console.log('[CREATE NODE] Creating work item for new node');
        const workItemData = {
          title: `${newNodeTemplate.name} - ${result.node.name}`,
          description: `Work item for ${result.node.name} at ${result.node.address || 'Unknown location'}`,
          status: 'Planning' as const,
          assignedTo: currentUser?.id,
          workflowTemplateId: newNodeTemplate.id,
          workflowSource: 'manual',
          workItemType: newNodeTemplate.id,
          workflowMetadata: {
            templateName: newNodeTemplate.name,
            templateCategory: newNodeTemplate.category || 'Field Engineering',
            fiberNodeId: result.node.id,
            chamberName: result.node.name,
            chamberLocation: {
              latitude: result.node.latitude,
              longitude: result.node.longitude,
              address: result.node.address,
              what3words: result.node.what3words,
            },
          },
        };
        
        await createWorkItem(workItemData);
        queryClient.invalidateQueries({ queryKey: ['/api/work-items'] });
        
        toast({
          title: 'Success',
          description: 'Node and work item created successfully',
        });
      } else if (!createWorkItemForNewNode) {
        // Show success toast for node-only creation
        toast({
          title: 'Success',
          description: 'Node created successfully',
        });
      }
    } catch (error) {
      console.error('[CREATE NODE] Full error:', error);
      console.error('[CREATE NODE] Error type:', typeof error);
      console.error('[CREATE NODE] Error details:', error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Not an Error object');
      
      // Try to extract a meaningful error message
      let errorMessage = 'Failed to create node';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      // Always close dialog and reset form (in finally to ensure it runs even on error)
      setAddNodeDialogOpen(false);
      setNewNodeData({
        name: '',
        nodeType: 'chamber',
        network: 'FibreLtd',
        status: 'planned',
        latitude: 0,
        longitude: 0,
        what3words: '',
        address: '',
        notes: '',
      });
      setNewNodeTemplate(null);
      setCreateWorkItemForNewNode(false);
    }
  };

  // Center map on UK (default location)
  const mapCenter: [number, number] = [51.1125, -0.8675]; // Petersfield area
  const mapZoom = 14;

  // DraggableFilterPanel Component
  function DraggableFilterPanel({ 
    children, 
    isVisible, 
    onToggleVisibility 
  }: { 
    children: React.ReactNode;
    isVisible: boolean;
    onToggleVisibility: () => void;
  }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.drag-handle')) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y
        });
      }
    };

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
          });
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, dragStart]);

    if (!isVisible) {
      return (
        <div className="absolute top-4 right-4 z-[1000]">
          <Button
            onClick={onToggleVisibility}
            size="sm"
            className="shadow-lg h-7 text-xs px-2"
            data-testid="button-show-filters"
          >
            <Eye className="w-3 h-3 mr-1" />
            Show
          </Button>
        </div>
      );
    }

    return (
      <div
        ref={panelRef}
        className="absolute z-[1000] bg-white rounded-lg shadow-2xl border border-gray-300"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: isCollapsed ? 'auto' : '210px',
          cursor: isDragging ? 'grabbing' : 'auto'
        }}
        onMouseDown={handleMouseDown}
        data-testid="filter-panel"
      >
        <div className="drag-handle flex items-center justify-between p-1.5 bg-gray-50 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-1">
            <GripVertical className="w-3 h-3 text-gray-400" />
            <span className="text-xs font-medium">Filters</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-5 w-5 p-0"
              data-testid="button-collapse-filters"
            >
              {isCollapsed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVisibility}
              className="h-5 w-5 p-0"
              data-testid="button-hide-filters"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {!isCollapsed && (
          <div className="p-2 max-h-[80vh] overflow-y-auto text-xs">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b pt-3 px-3 pb-2 md:pt-4 md:px-4 md:pb-1.5">
        {/* Mobile Layout: Stacked */}
        <div className="md:hidden space-y-2">
          {/* Title and Stats */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">Fiber Network</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-base font-semibold text-gray-900">{nodes.length}</span>
                  <span className="text-xs text-gray-600">total</span>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1">
                  <span className="text-base font-semibold text-green-700">{filteredNodes.length}</span>
                  <span className="text-xs text-gray-600">visible</span>
                </div>
                {hasActiveFilters && (
                  <>
                    <span className="text-gray-400">•</span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      Filtered
                    </Badge>
                  </>
                )}
              </div>
            </div>
            {/* View Toggle */}
            <div className="flex items-center border rounded-md ml-2">
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('map')}
                data-testid="button-map-view"
                className="rounded-r-none h-12 min-w-[64px]"
              >
                <Map className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                data-testid="button-table-view"
                className="rounded-l-none h-12 min-w-[64px]"
              >
                <TableIcon className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Settings Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsDialogOpen(true)}
              data-testid="button-settings"
              className="h-12 ml-2"
              title="Manage Node Types"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Search and Filters Row */}
          <div className="flex items-center gap-2">
            {/* Search - Full width on mobile */}
            <div className="relative flex-1">
              <Input
                placeholder="Search chambers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 text-base"
                data-testid="input-search-chambers"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-12 w-12"
                  onClick={() => setSearchTerm('')}
                  data-testid="button-clear-search"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <Button
              variant={hasActiveFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 min-w-[80px]"
              data-testid="button-toggle-filters"
            >
              <Settings className="h-4 w-4 mr-1" />
              Filters
              {hasActiveFilters && (
                <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-white text-primary">
                  {(selectedNetwork ? 1 : 0) + (selectedStatus ? 1 : 0) + (selectedType ? 1 : 0) + (workItemFilter !== 'all' ? 1 : 0)}
                </Badge>
              )}
            </Button>

            {/* Clear filters button - only show if filters are active */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-12"
                data-testid="button-clear-filters"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Layout: Single Row */}
        <div className="hidden md:flex items-center gap-4">
          {/* Left: Title and Stats */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold">Fiber Network</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-gray-900">{nodes.length}</span>
                <span className="text-sm text-gray-600">total</span>
              </div>
              <span className="text-gray-400">•</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-green-700">{filteredNodes.length}</span>
                <span className="text-sm text-gray-600">visible</span>
              </div>
              {hasActiveFilters && (
                <>
                  <span className="text-gray-400">•</span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    Filtered
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Center: Search and Filters */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-64">
              <Input
                placeholder="Search chambers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 text-sm"
                data-testid="input-search-chambers"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-9 w-9"
                  onClick={() => setSearchTerm('')}
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button
              variant={hasActiveFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9 min-w-[80px]"
              data-testid="button-toggle-filters"
            >
              <Settings className="h-4 w-4 mr-1" />
              Filters
              {hasActiveFilters && (
                <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-white text-primary">
                  {(selectedNetwork ? 1 : 0) + (selectedStatus ? 1 : 0) + (selectedType ? 1 : 0) + (workItemFilter !== 'all' ? 1 : 0)}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9"
                data-testid="button-clear-filters"
              >
                Clear
              </Button>
            )}

            {viewMode === 'table' && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-column-settings" className="h-9">
                      <Eye className="h-4 w-4 mr-1" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {Object.entries(visibleColumns).map(([key, value]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={value}
                        onCheckedChange={(checked) =>
                          setVisibleColumns(prev => ({ ...prev, [key]: checked }))
                        }
                        data-testid={`checkbox-column-${key}`}
                      >
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  data-testid="button-export-csv"
                  className="h-9"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              </>
            )}
          </div>

          {/* Right: View Toggle */}
          <div className="flex items-center border rounded-md flex-shrink-0">
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              data-testid="button-map-view"
              className="rounded-r-none h-9"
            >
              <Map className="h-4 w-4 mr-1" />
              Map
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              data-testid="button-table-view"
              className="rounded-l-none h-9"
            >
              <TableIcon className="h-4 w-4 mr-1" />
              Table
            </Button>
          </div>
          
          {/* Settings Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsDialogOpen(true)}
            data-testid="button-settings-desktop"
            className="h-9"
            title="Manage Node Types"
          >
            <Settings className="h-4 w-4 mr-1" />
            Node Types
          </Button>
        </div>

        {/* Expandable Filter Row - Shared by both mobile and desktop */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg border mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Network</Label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger className="h-9" data-testid="select-network-filter">
                  <SelectValue placeholder="All Networks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Networks</SelectItem>
                  <SelectItem value="CCNet">CCNet</SelectItem>
                  <SelectItem value="FibreLtd">FibreLtd</SelectItem>
                  <SelectItem value="S&MFibre">S&MFibre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9" data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="build_complete">Build Complete</SelectItem>
                  <SelectItem value="awaiting_evidence">Awaiting Evidence</SelectItem>
                  <SelectItem value="action_required">Action Required</SelectItem>
                  <SelectItem value="decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-9" data-testid="select-type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All Types</SelectItem>
                  <SelectItem value="chamber">Chamber</SelectItem>
                  <SelectItem value="cabinet">Cabinet</SelectItem>
                  <SelectItem value="pole">Pole</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Work Items</Label>
              <Select value={workItemFilter} onValueChange={(value) => setWorkItemFilter(value as 'all' | 'with' | 'without')}>
                <SelectTrigger className="h-9" data-testid="select-workitem-filter">
                  <SelectValue placeholder="All Chambers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chambers</SelectItem>
                  <SelectItem value="with">With Work Items</SelectItem>
                  <SelectItem value="without">Without Work Items</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
      {/* Content: Map or Table View */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading chambers...</p>
          </div>
        </div>
      ) : viewMode === 'map' ? (
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            data-testid="map-fiber-network"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Map click handler for adding nodes (only enabled in add node mode) */}
            <MapClickHandler 
              onMapClick={handleMapClick} 
              disabled={mapMode !== 'addNode'}
            />
            
            {/* Waypoint adder for cable path editing */}
            <WaypointAdder
              enabled={cableEditMode && addingWaypoint}
              onWaypointAdd={(lat, lng) => {
                // Add the waypoint to the array at the end (before the last point which is the end node)
                const newWaypoints = [...editingCableWaypoints];
                // Insert before the last waypoint (which is the end node)
                newWaypoints.splice(newWaypoints.length - 1, 0, [lat, lng]);
                setEditingCableWaypoints(newWaypoints);
                setAddingWaypoint(false); // Exit add waypoint mode after adding one
                toast({
                  title: 'Waypoint Added',
                  description: 'A new waypoint has been added to the cable path. Drag it to adjust.',
                });
              }}
            />
            
            {/* Cable Polylines */}
            {showCables && (() => {
              // Collect all cables from nodes (avoid duplicates by tracking cable IDs)
              const renderedCables = new Set<string>();
              const cables: any[] = [];
              
              nodes.forEach((node) => {
                const nodeCables = node.fiberDetails?.cables || [];
                nodeCables.forEach((cable: any) => {
                  // Only render each cable once (check both directions)
                  const cableKey = [node.id, cable.connectedNodeId].sort().join('-');
                  if (!renderedCables.has(cableKey) && cable.direction === 'outgoing') {
                    renderedCables.add(cableKey);
                    cables.push({
                      ...cable,
                      startNodeId: node.id,
                      startNodeName: node.name
                    });
                  }
                });
              });
              
              // Color coding function
              const getCableColor = (status: string) => {
                switch (status) {
                  case 'active': return '#10B981'; // green
                  case 'planned': return '#3B82F6'; // blue
                  case 'under_construction': return '#F59E0B'; // orange
                  case 'decommissioned': return '#6B7280'; // gray
                  default: return '#3B82F6';
                }
              };
              
              return cables.map((cable) => (
                <Polyline
                  key={`cable-${cable.id}`}
                  positions={cable.routeGeometry || []}
                  pathOptions={{
                    color: getCableColor(cable.status),
                    weight: 5,
                    opacity: 0.8,
                  }}
                  eventHandlers={{
                    click: () => {
                      if (!cableRoutingMode && !selectionMode) {
                        // Open cable detail sheet
                        setSelectedCable(cable);
                        toast({
                          title: `Cable: ${cable.cableIdentifier}`,
                          description: `${cable.startNodeName} → ${cable.connectedNodeName} (${cable.fiberCount} fibers)`,
                        });
                      }
                    },
                  }}
                />
              ));
            })()}
            
            {/* Cable edit mode - draggable waypoints */}
            {cableEditMode && editingCable && editingCableWaypoints.length > 0 && (
              <>
                {/* Render the cable being edited */}
                <Polyline
                  positions={editingCableWaypoints}
                  pathOptions={{
                    color: '#F59E0B',
                    weight: 5,
                    opacity: 0.8,
                    dashArray: '10, 5',
                  }}
                />
                
                {/* Draggable waypoint markers */}
                {editingCableWaypoints.map((waypoint, index) => {
                  const isFirstOrLast = index === 0 || index === editingCableWaypoints.length - 1;
                  return (
                    <Marker
                      key={`waypoint-${index}`}
                      position={waypoint}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => {
                          const marker = e.target;
                          const position = marker.getLatLng();
                          const newWaypoints = [...editingCableWaypoints];
                          newWaypoints[index] = [position.lat, position.lng];
                          setEditingCableWaypoints(newWaypoints);
                        },
                      }}
                      icon={L.divIcon({
                        className: 'custom-waypoint-icon',
                        html: `<div style="
                          width: 12px;
                          height: 12px;
                          border-radius: 50%;
                          background: #F59E0B;
                          border: 2px solid white;
                          cursor: move;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        "></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6],
                      })}
                    >
                      {!isFirstOrLast && (
                        <Popup>
                          <div className="p-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                const newWaypoints = [...editingCableWaypoints];
                                newWaypoints.splice(index, 1);
                                setEditingCableWaypoints(newWaypoints);
                                toast({
                                  title: 'Waypoint Removed',
                                  description: 'The waypoint has been deleted from the cable path.',
                                });
                              }}
                              data-testid={`button-delete-waypoint-${index}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Waypoint
                            </Button>
                          </div>
                        </Popup>
                      )}
                    </Marker>
                  );
                })}
              </>
            )}
            
            {/* Cable edit mode - Save/Cancel buttons */}
            {cableEditMode && editingCable && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white p-4 rounded-lg shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Cable className="w-4 h-4" />
                  <span className="font-semibold">Editing: {editingCable.cableIdentifier}</span>
                </div>
                {addingWaypoint && (
                  <div className="mb-3 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                    Click on the map to add a waypoint
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={addingWaypoint ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setAddingWaypoint(!addingWaypoint);
                      if (!addingWaypoint) {
                        toast({
                          title: 'Add Waypoint Mode',
                          description: 'Click on the map to add a waypoint to the cable path.',
                        });
                      }
                    }}
                    data-testid="button-add-waypoint"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {addingWaypoint ? 'Adding...' : 'Add Waypoint'}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      // Save the cable path
                      if (!editingCable?.startNodeId) {
                        toast({
                          title: 'Error',
                          description: 'Missing node information. Cannot save cable path.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      
                      apiRequest(`/api/fiber-network/cables/${editingCable.id}/route`, {
                        method: 'PATCH',
                        body: {
                          nodeId: editingCable.startNodeId,
                          waypoints: editingCableWaypoints,
                        },
                      }).then(() => {
                        // Clear edit state
                        setCableEditMode(false);
                        setEditingCable(null);
                        setEditingCableWaypoints([]);
                        setOriginalCableWaypoints([]);
                        setAddingWaypoint(false);
                        // Refresh data
                        queryClient.invalidateQueries({ queryKey: ['/api/fiber-network/nodes'] });
                        toast({
                          title: 'Cable Path Updated',
                          description: 'The cable route has been saved successfully.',
                        });
                      }).catch((error) => {
                        console.error('Failed to update cable path:', error);
                        toast({
                          title: 'Error',
                          description: error.message || 'Failed to update cable path.',
                          variant: 'destructive',
                        });
                      });
                    }}
                    data-testid="button-save-cable-path"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Restore original state
                      setCableEditMode(false);
                      setEditingCable(null);
                      setEditingCableWaypoints([]);
                      setOriginalCableWaypoints([]);
                      setAddingWaypoint(false);
                      // Refresh data to show original cable path
                      queryClient.invalidateQueries({ queryKey: ['/api/fiber-network/nodes'] });
                      toast({
                        title: 'Edit Cancelled',
                        description: 'Cable path changes have been discarded.',
                      });
                    }}
                    data-testid="button-cancel-cable-edit"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {/* Highlight cable being created */}
            {cableRoutingMode && cableStartNode && !cableDialogOpen && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                <Cable className="w-4 h-4 inline mr-2" />
                From: {cableStartNode.name} - Click end node
              </div>
            )}
            
            {filteredNodes.length === 0 && nodes.length > 0 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white p-4 rounded-lg shadow-lg text-center">
                <p className="text-gray-600">No chambers match the current filters</p>
              </div>
            )}
            {(() => {
              console.log('[FIBER] 🗺️ RENDERING MARKERS:', filteredNodes.length);
              console.log('[FIBER] 🗺️ Sample marker data:', filteredNodes[0]);
              if (filteredNodes.length > 0) {
                console.log('[FIBER] 🗺️ First marker position:', [Number(filteredNodes[0].latitude), Number(filteredNodes[0].longitude)]);
              }
              return null;
            })()}
            {showNodes && filteredNodes.map((node) => {
              const isSelected = selectedNodes.includes(node.id);
              const isCableStartNode = cableStartNode?.id === node.id;
              
              return (
                <Marker
                  key={node.id}
                  position={[Number(node.latitude), Number(node.longitude)]}
                  icon={getMarkerIcon(node.nodeType)}
                  eventHandlers={{
                    click: () => {
                      if (selectionMode === 'click' || cableRoutingMode) {
                        handleMarkerClick(node.id);
                      } else {
                        setSelectedNode(node);
                      }
                    },
                  }}
                  opacity={
                    isCableStartNode ? 1 :
                    (selectionMode === 'click' || cableRoutingMode) && !isSelected ? 0.5 : 1
                  }
                >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold">{node.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs ${getStatusInfo(node.status).bgColor} ${getStatusInfo(node.status).color}`}>
                        {getStatusInfo(node.status).label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{node.network}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 capitalize mt-1">{node.nodeType.replace('_', ' ')}</p>
                    {node.address && (
                      <p className="text-xs text-gray-500 mt-1">{node.address}</p>
                    )}
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setSelectedNode(node)}
                      data-testid={`button-view-chamber-${node.id}`}
                    >
                      View Details
                    </Button>
                  </div>
                </Popup>
              </Marker>
              );
            })}
            
            {/* Polygon drawer for selection */}
            <PolygonDrawer
              isDrawing={isDrawing}
              currentPolygon={currentPolygon}
              onPointAdd={addPolygonPoint}
            />

            {/* Selection Polygon */}
            {selectedPolygon.length > 0 && (
              <Polygon
                positions={selectedPolygon}
                pathOptions={{
                  color: '#3B82F6',
                  fillColor: '#3B82F6',
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              />
            )}

            {/* Current Drawing Polygon */}
            {isDrawing && currentPolygon.length > 0 && (
              <Polygon
                positions={currentPolygon}
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: '5, 5',
                }}
              />
            )}
          </MapContainer>
          
          {/* Draggable Filter Panel */}
          <DraggableFilterPanel 
            isVisible={isFilterVisible} 
            onToggleVisibility={() => setIsFilterVisible(!isFilterVisible)}
          >
            <div className="space-y-2">
              {/* Filter Type Toggle */}
              <div className="space-y-1">
                <Label className="text-[10px] font-medium">Filter Type</Label>
                <ToggleGroup 
                  type="single" 
                  value={filterType} 
                  onValueChange={(value) => {
                    if (value) {
                      setFilterType(value as any);
                      setSelectedNetwork('');
                      setSelectedStatus('');
                      setSelectedType('');
                    }
                  }}
                  className="grid grid-cols-3 gap-1"
                >
                  <ToggleGroupItem value="network" className="h-6 text-[10px] px-1" data-testid="toggle-network">
                    Network
                  </ToggleGroupItem>
                  <ToggleGroupItem value="status" className="h-6 text-[10px] px-1" data-testid="toggle-status">
                    Status
                  </ToggleGroupItem>
                  <ToggleGroupItem value="type" className="h-6 text-[10px] px-1" data-testid="toggle-type">
                    Type
                  </ToggleGroupItem>
                </ToggleGroup>

                {/* Conditional Dropdowns */}
                <div className="space-y-1 pt-1">
                  {filterType === 'network' && (
                    <Select 
                      value={selectedNetwork} 
                      onValueChange={setSelectedNetwork}
                    >
                      <SelectTrigger className="h-7 text-[10px]" data-testid="select-network">
                        <SelectValue placeholder="Select network..." />
                      </SelectTrigger>
                      <SelectContent className="text-[10px]">
                        <SelectItem value="CCNet" data-testid="option-network-ccnet">CCNet</SelectItem>
                        <SelectItem value="FibreLtd" data-testid="option-network-fibreltd">FibreLtd</SelectItem>
                        <SelectItem value="S&MFibre" data-testid="option-network-smfibre">S&MFibre</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {filterType === 'status' && (
                    <Select 
                      value={selectedStatus} 
                      onValueChange={setSelectedStatus}
                    >
                      <SelectTrigger className="h-7 text-[10px]" data-testid="select-status">
                        <SelectValue placeholder="Select status..." />
                      </SelectTrigger>
                      <SelectContent className="text-[10px]">
                        <SelectItem value="active" data-testid="option-status-active">Active</SelectItem>
                        <SelectItem value="planned" data-testid="option-status-planned">Planned</SelectItem>
                        <SelectItem value="build_complete" data-testid="option-status-build-complete">Build Complete</SelectItem>
                        <SelectItem value="awaiting_evidence" data-testid="option-status-awaiting-evidence">Awaiting Evidence</SelectItem>
                        <SelectItem value="action_required" data-testid="option-status-action-required">Action Required</SelectItem>
                        <SelectItem value="decommissioned" data-testid="option-status-decommissioned">Decommissioned</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {filterType === 'type' && (
                    <Select 
                      value={selectedType} 
                      onValueChange={setSelectedType}
                    >
                      <SelectTrigger className="h-7 text-[10px]" data-testid="select-type">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent className="text-[10px]">
                        <SelectItem value="chamber" data-testid="option-type-chamber">Chamber</SelectItem>
                        <SelectItem value="cabinet" data-testid="option-type-cabinet">Cabinet</SelectItem>
                        <SelectItem value="pole" data-testid="option-type-pole">Pole</SelectItem>
                        <SelectItem value="splice_closure" data-testid="option-type-splice">Splice Closure</SelectItem>
                        <SelectItem value="customer_premise" data-testid="option-type-premise">Customer Premise</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Apply/Close Button */}
                <Button 
                  onClick={handleApplyFilter} 
                  className="w-full h-7 text-[11px] px-2 mt-2"
                  data-testid="button-apply-filter"
                >
                  <Search className="w-3 h-3 mr-1" />
                  {hasActiveFilters ? 'Apply Filter' : 'Close'}
                </Button>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button 
                    onClick={handleClearFilters} 
                    variant="outline"
                    className="w-full h-7 text-[11px] px-2 mt-1"
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                )}

                {/* Filter Summary */}
                {hasActiveFilters && (
                  <div className="pt-2 border-t mt-2">
                    <div className="text-[10px] text-gray-600">
                      Showing {filteredNodes.length} of {nodes.length} chambers
                    </div>
                  </div>
                )}

                {/* Visibility Controls */}
                <div className="space-y-1 pt-2 border-t mt-2">
                  <Label className="text-[10px] font-medium">Visibility</Label>
                  
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[11px] text-gray-700">Show Nodes</span>
                    <Switch
                      checked={showNodes}
                      onCheckedChange={setShowNodes}
                      data-testid="switch-show-nodes"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[11px] text-gray-700">Show Cables</span>
                    <Switch
                      checked={showCables}
                      onCheckedChange={setShowCables}
                      data-testid="switch-show-cables"
                    />
                  </div>
                  
                  {/* Quick preset buttons */}
                  <div className="flex gap-1 pt-1">
                    <Button 
                      onClick={() => {
                        setShowNodes(false);
                        setShowCables(true);
                      }} 
                      variant="outline"
                      className="flex-1 h-6 text-[10px] px-1"
                      data-testid="button-cables-only"
                    >
                      Cables Only
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowNodes(true);
                        setShowCables(true);
                      }} 
                      variant="outline"
                      className="flex-1 h-6 text-[10px] px-1"
                      data-testid="button-show-all"
                    >
                      Show All
                    </Button>
                  </div>
                </div>

                {/* Map Tools */}
                {filteredNodes.length > 0 && (
                  <div className="space-y-1 pt-2 border-t mt-2">
                    <Label className="text-[10px] font-medium">Map Tools</Label>
                    
                    <Button 
                      onClick={() => {
                        if (mapMode === 'addNode') {
                          // Turn off add node mode
                          exitMode();
                        } else {
                          // Turn on add node mode
                          enterAddNodeMode();
                        }
                      }} 
                      variant={mapMode === 'addNode' ? 'default' : 'outline'}
                      className="w-full h-8 text-[11px] px-2"
                      data-testid="button-add-node-mode"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {mapMode === 'addNode' ? 'Add Node Active' : 'Add Node'}
                    </Button>
                    
                    <Button 
                      onClick={() => {
                        if (cableRoutingMode) {
                          // Turn off cable routing mode
                          exitMode();
                        } else {
                          // Turn on cable routing mode
                          enterCableRoutingMode();
                        }
                      }} 
                      variant={cableRoutingMode ? 'default' : 'outline'}
                      className="w-full h-8 text-[11px] px-2"
                      data-testid="button-cable-routing-mode"
                    >
                      <Cable className="w-3 h-3 mr-1" />
                      {cableRoutingMode ? 'Cable Mode Active' : 'Cable Routing'}
                    </Button>
                    
                    {mapMode === 'addNode' && (
                      <div className="text-[10px] text-gray-600 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        Click on the map to place a new node
                      </div>
                    )}
                    
                    {cableRoutingMode && cableStartNode && (
                      <div className="text-[10px] text-gray-600 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        Start: {cableStartNode.name}
                        <br />
                        Click end node...
                      </div>
                    )}
                  </div>
                )}

                {/* Selection Tools */}
                {filteredNodes.length > 0 && (
                  <div className="space-y-1 pt-2 border-t mt-2">
                    <Label className="text-[10px] font-medium">Selection Tools</Label>
                    
                    {/* Selection Mode Toggle Buttons */}
                    {!isDrawing && selectedPolygon.length === 0 && (
                      <div className="flex gap-1">
                        <Button 
                          onClick={startDrawing} 
                          variant={selectionMode === 'polygon' ? 'default' : 'outline'}
                          className="flex-1 h-8 text-[11px] px-2"
                          data-testid="button-polygon-mode"
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Draw
                        </Button>
                        <Button 
                          onClick={enterClickSelectMode} 
                          variant={selectionMode === 'click' ? 'default' : 'outline'}
                          className="flex-1 h-8 text-[11px] px-2"
                          data-testid="button-click-mode"
                        >
                          <Hand className="w-3 h-3 mr-1" />
                          Click
                        </Button>
                      </div>
                    )}

                    {isDrawing && (
                      <div className="space-y-1">
                        <Button 
                          onClick={finishPolygon} 
                          className="w-full h-7 text-[11px] px-2"
                          disabled={currentPolygon.length < 3}
                          data-testid="button-finish-polygon"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Finish ({currentPolygon.length})
                        </Button>
                        <Button 
                          onClick={clearPolygon} 
                          variant="outline" 
                          className="w-full h-7 text-[11px] px-2"
                          data-testid="button-cancel-drawing"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    )}

                    {(selectedPolygon.length > 0 || (selectionMode === 'click' && selectedNodes.length > 0)) && !isDrawing && (
                      <Button 
                        onClick={exitMode} 
                        variant="outline" 
                        className="w-full h-7 text-[11px] px-2"
                        data-testid="button-clear-selection-mode"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear Selection ({selectedNodes.length})
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DraggableFilterPanel>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Bulk Actions Toolbar */}
          {selectedNodes.length > 0 && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-900">
                  {selectedNodes.length} chamber{selectedNodes.length > 1 ? 's' : ''} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedNodes([])}
                  data-testid="button-clear-selection"
                >
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select 
                  value={bulkStatusValue} 
                  onValueChange={setBulkStatusValue}
                >
                  <SelectTrigger className="w-[200px] h-9" data-testid="select-bulk-status">
                    <SelectValue placeholder="Select Status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="build_complete">Build Complete</SelectItem>
                    <SelectItem value="awaiting_evidence">Awaiting Evidence</SelectItem>
                    <SelectItem value="action_required">Action Required</SelectItem>
                    <SelectItem value="decommissioned">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!bulkStatusValue || bulkUpdateStatusMutation.isPending}
                  onClick={async () => {
                    if (!bulkStatusValue) return;
                    
                    try {
                      await bulkUpdateStatusMutation.mutateAsync({
                        nodeIds: selectedNodes,
                        status: bulkStatusValue,
                      });
                      toast({
                        title: 'Status Updated',
                        description: `Updated ${selectedNodes.length} chamber${selectedNodes.length > 1 ? 's' : ''}`,
                      });
                      setSelectedNodes([]);
                      setBulkStatusValue('');
                    } catch (error) {
                      toast({
                        title: 'Update Failed',
                        description: 'Failed to update chamber status',
                        variant: 'destructive',
                      });
                    }
                  }}
                  data-testid="button-apply-bulk-status"
                >
                  {bulkUpdateStatusMutation.isPending ? 'Updating...' : 'Apply Status'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setWorkItemDialogOpen(true)}
                  data-testid="button-bulk-create-work-items"
                >
                  <Wrench className="h-4 w-4 mr-1" />
                  Create Work Items ({selectedNodes.length})
                </Button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-auto">
            <Tabs value={tableTab} onValueChange={(value) => setTableTab(value as 'nodes' | 'cables')} className="h-full flex flex-col">
              <TabsList className="mx-4 mt-2">
                <TabsTrigger value="nodes" data-testid="tab-nodes">Nodes</TabsTrigger>
                <TabsTrigger value="cables" data-testid="tab-cables">Cables ({allCables.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="nodes" className="flex-1 overflow-auto m-0 p-0">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedNodes.length === filteredNodes.length && filteredNodes.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedNodes(filteredNodes.map(n => n.id));
                      } else {
                        setSelectedNodes([]);
                      }
                    }}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                {visibleColumns.name && <TableHead>Name</TableHead>}
                {visibleColumns.status && <TableHead>Status</TableHead>}
                {visibleColumns.nodeType && <TableHead>Type</TableHead>}
                {visibleColumns.network && <TableHead>Network</TableHead>}
                {visibleColumns.address && <TableHead>Address</TableHead>}
                {visibleColumns.what3words && <TableHead>What3Words</TableHead>}
                {visibleColumns.coordinates && <TableHead>Coordinates</TableHead>}
                {visibleColumns.notes && <TableHead>Notes</TableHead>}
                {visibleColumns.photos && <TableHead>Photos</TableHead>}
                {visibleColumns.workItems && <TableHead>Work Items</TableHead>}
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 2} className="text-center py-8 text-gray-500">
                    No chambers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredNodes.map((node) => (
                  <TableRow 
                    key={node.id}
                    className="hover:bg-gray-50"
                    data-testid={`table-row-${node.id}`}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedNodes.includes(node.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedNodes([...selectedNodes, node.id]);
                          } else {
                            setSelectedNodes(selectedNodes.filter(id => id !== node.id));
                          }
                        }}
                        data-testid={`checkbox-${node.id}`}
                      />
                    </TableCell>
                    {visibleColumns.name && (
                      <TableCell className="font-medium cursor-pointer" onClick={() => setSelectedNode(node)}>{node.name}</TableCell>
                    )}
                    {visibleColumns.status && (
                      <TableCell>
                        <Badge variant={node.status === 'active' ? 'default' : 'secondary'}>
                          {node.status}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.nodeType && (
                      <TableCell className="capitalize">{node.nodeType.replace('_', ' ')}</TableCell>
                    )}
                    {visibleColumns.network && (
                      <TableCell>
                        <Badge variant="outline">{node.network}</Badge>
                      </TableCell>
                    )}
                    {visibleColumns.address && (
                      <TableCell className="max-w-[200px] truncate">{node.address || '-'}</TableCell>
                    )}
                    {visibleColumns.what3words && (
                      <TableCell className="font-mono text-xs">{node.what3words || '-'}</TableCell>
                    )}
                    {visibleColumns.coordinates && (
                      <TableCell className="text-xs text-gray-600">
                        {Number(node.latitude).toFixed(5)}, {Number(node.longitude).toFixed(5)}
                      </TableCell>
                    )}
                    {visibleColumns.notes && (
                      <TableCell className="max-w-[200px] truncate">{node.notes || '-'}</TableCell>
                    )}
                    {visibleColumns.photos && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{node.photos?.length || 0}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.workItems && (
                      <TableCell>
                        {(node as any).workItemCounts?.total > 0 ? (
                          <div className="flex items-center gap-1">
                            {(node as any).workItemCounts.completed > 0 && (
                              <Badge variant="default" className="bg-green-600 text-white text-xs px-1.5 py-0">
                                {(node as any).workItemCounts.completed} ✓
                              </Badge>
                            )}
                            {(node as any).workItemCounts.pending > 0 && (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0">
                                {(node as any).workItemCounts.pending}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedNode(node)}
                          data-testid={`button-view-${node.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setNodeToDelete(node);
                            setDeleteConfirmOpen(true);
                          }}
                          data-testid={`button-delete-${node.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
              </TabsContent>
              
              <TabsContent value="cables" className="flex-1 overflow-auto m-0 p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cable ID</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Fiber Count</TableHead>
                      <TableHead>Cable Type</TableHead>
                      <TableHead>Length (m)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCables.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No cables found
                        </TableCell>
                      </TableRow>
                    ) : (
                      allCables.map((cable) => (
                        <TableRow 
                          key={cable.id}
                          className="hover:bg-gray-50"
                          data-testid={`cable-row-${cable.id}`}
                        >
                          <TableCell className="font-medium">{cable.cableIdentifier}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span>{cable.startNodeName}</span>
                              <span className="text-gray-400">→</span>
                              <span>{cable.endNodeName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{cable.fiberCount}</TableCell>
                          <TableCell className="capitalize">{cable.cableType?.replace('_', ' ')}</TableCell>
                          <TableCell>{cable.lengthMeters || 0}</TableCell>
                          <TableCell>
                            <Badge variant={cable.status === 'active' ? 'default' : 'secondary'}>
                              {cable.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Navigate to map and highlight cable
                                setViewMode('map');
                                toast({
                                  title: 'Cable Selected',
                                  description: `${cable.cableIdentifier}: ${cable.startNodeName} → ${cable.endNodeName}`,
                                });
                              }}
                              data-testid={`button-view-cable-${cable.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
      {/* Chamber Detail Sheet */}
      <Sheet open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <SheetContent className="sm:w-[640px] overflow-y-auto">
          {selectedNode && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {selectedNode.name}
                </SheetTitle>
                <SheetDescription>
                  <Badge variant={selectedNode.status === 'active' ? 'default' : 'secondary'}>
                    {selectedNode.status}
                  </Badge>
                  {' • '}
                  <span className="capitalize">{selectedNode.nodeType}</span>
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="details" data-testid="tab-details">
                    <FileText className="w-4 h-4 mr-2" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="splice-trays" data-testid="tab-splice-trays">
                    <Cable className="w-4 h-4 mr-2" />
                    Splices
                  </TabsTrigger>
                  <TabsTrigger value="photos" data-testid="tab-photos">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Photos
                  </TabsTrigger>
                  <TabsTrigger value="work-items" data-testid="tab-work-items">
                    <Wrench className="w-4 h-4 mr-2" />
                    Work Items
                  </TabsTrigger>
                  <TabsTrigger value="activity" data-testid="tab-activity">
                    <Activity className="w-4 h-4 mr-2" />
                    Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div>
                    <Label>Chamber Name</Label>
                    <Input
                      value={selectedNode.name}
                      onChange={(e) => setSelectedNode({ ...selectedNode, name: e.target.value })}
                      onBlur={() => handleNodeUpdate({ name: selectedNode.name })}
                      data-testid="input-chamber-name"
                    />
                  </div>

                  <div>
                    <Label>Node Type</Label>
                    <Select
                      value={selectedNode.nodeType}
                      onValueChange={(value) => {
                        setSelectedNode({ ...selectedNode, nodeType: value });
                        handleNodeUpdate({ nodeType: value });
                      }}
                    >
                      <SelectTrigger data-testid="select-node-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {nodeTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select
                      value={selectedNode.status}
                      onValueChange={(value) => {
                        setSelectedNode({ ...selectedNode, status: value });
                        handleNodeUpdate({ status: value });
                      }}
                    >
                      <SelectTrigger data-testid="select-chamber-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="build_complete">Build Complete</SelectItem>
                        <SelectItem value="awaiting_evidence">Awaiting Evidence</SelectItem>
                        <SelectItem value="action_required">Action Required</SelectItem>
                        <SelectItem value="decommissioned">Decommissioned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>What3Words</Label>
                    <Input
                      value={selectedNode.what3words || ''}
                      onChange={(e) => setSelectedNode({ ...selectedNode, what3words: e.target.value })}
                      onBlur={() => handleNodeUpdate({ what3words: selectedNode.what3words })}
                      placeholder="///word.word.word"
                      data-testid="input-what3words"
                    />
                  </div>

                  <div>
                    <Label>Address</Label>
                    <Textarea
                      value={selectedNode.address || ''}
                      onChange={(e) => setSelectedNode({ ...selectedNode, address: e.target.value })}
                      onBlur={() => handleNodeUpdate({ address: selectedNode.address })}
                      placeholder="Enter address..."
                      rows={3}
                      data-testid="textarea-address"
                    />
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={selectedNode.notes || ''}
                      onChange={(e) => setSelectedNode({ ...selectedNode, notes: e.target.value })}
                      onBlur={() => handleNodeUpdate({ notes: selectedNode.notes })}
                      placeholder="Add notes..."
                      rows={4}
                      data-testid="textarea-notes"
                    />
                  </div>

                  <div>
                    <Label>Coordinates</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={selectedNode.latitude} disabled />
                      <Input value={selectedNode.longitude} disabled />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setWorkItemDialogOpen(true)}
                    data-testid="button-create-work-item"
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    Create Work Item
                  </Button>
                </TabsContent>

                <TabsContent value="splice-trays" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">Splice Trays at this Node</h3>
                      <Button
                        size="sm"
                        onClick={() => {
                          // Generate automatic tray identifier: {NETWORK}-{NODE_NAME}-TRAY-{NUMBER}
                          const network = selectedNode?.network || 'NETWORK';
                          const nodeName = selectedNode?.name || 'NODE';
                          // Count existing trays for this node to determine next number
                          const existingTrays = selectedNode?.fiberDetails?.spliceTrays || [];
                          const nextNumber = (existingTrays.length + 1).toString().padStart(3, '0');
                          const autoTrayId = `${network}-${nodeName}-TRAY-${nextNumber}`;
                          
                          setSpliceTrayFormData({
                            trayIdentifier: autoTrayId,
                            description: '',
                          });
                          setSelectedSpliceTray(null);
                          setSpliceTrayEditorOpen(true);
                        }}
                        data-testid="button-add-splice-tray"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Tray
                      </Button>
                    </div>
                    
                    <div className="text-center py-8 text-sm text-gray-500">
                      Splice documentation feature coming soon. This will allow you to:
                      <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
                        <li>• Document splice trays at this node</li>
                        <li>• Record fiber-to-fiber connections</li>
                        <li>• Track which cables connect to which fibers</li>
                        <li>• Trace customer connections through the network</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="photos" className="space-y-4">
                  {selectedNode.photos && selectedNode.photos.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {selectedNode.photos.map((photo: any, index: number) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo.data}
                              alt={photo.fileName || `Photo ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setViewPhotoUrl(photo.data)}
                              data-testid={`photo-thumbnail-${index}`}
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                              onClick={() => handleDeletePhoto(index)}
                              data-testid={`button-delete-photo-${index}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                              {photo.timestamp ? new Date(photo.timestamp).toLocaleDateString() : 'No date'}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setPhotoUploadOpen(true)}
                        data-testid="button-add-more-photos"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add More Photos
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No photos uploaded</p>
                      <Button 
                        size="sm" 
                        className="mt-4"
                        onClick={() => setPhotoUploadOpen(true)}
                        data-testid="button-upload-photo"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Upload Photo
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="work-items" className="space-y-4">
                  <LinkedWorkItems nodeId={selectedNode.id} />
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  {activityData?.logs && activityData.logs.length > 0 ? (
                    <div className="space-y-2">
                      {activityData.logs.map((log) => {
                        const changes = log.changes || {};
                        let changeDescription = '';
                        
                        if (changes.photos) {
                          const photoCount = Array.isArray(changes.photos) ? changes.photos.length : 0;
                          changeDescription = photoCount === 1 ? 'Added 1 photo' : `Updated photos (${photoCount} total)`;
                        } else if (changes.name) {
                          changeDescription = `Updated name to "${changes.name}"`;
                        } else if (changes.status) {
                          changeDescription = `Changed status to "${changes.status}"`;
                        } else if (changes.address) {
                          changeDescription = 'Updated address';
                        } else if (changes.notes) {
                          changeDescription = 'Updated notes';
                        } else if (changes.what3words) {
                          changeDescription = 'Updated What3Words location';
                        } else if (changes.fiberDetails) {
                          changeDescription = 'Updated fiber details';
                        } else {
                          changeDescription = 'Updated chamber';
                        }

                        return (
                          <Card key={log.id} className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{log.userName}</p>
                                <p className="text-xs text-gray-600 mt-0.5">{changeDescription}</p>
                              </div>
                              <p className="text-xs text-gray-400">
                                {new Date(log.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No activity recorded</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Cable Detail Sheet */}
      <Sheet open={!!selectedCable} onOpenChange={(open) => !open && setSelectedCable(null)}>
        <SheetContent className="sm:w-[640px] overflow-y-auto">
          {selectedCable && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Cable className="w-5 h-5" />
                  {selectedCable.cableIdentifier}
                </SheetTitle>
                <SheetDescription>
                  <Badge variant={selectedCable.status === 'active' ? 'default' : 'secondary'}>
                    {selectedCable.status}
                  </Badge>
                  {' • '}
                  <span className="capitalize">{selectedCable.cableType}</span>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div>
                  <Label>Cable ID</Label>
                  <p className="text-sm text-gray-900">{selectedCable.cableIdentifier}</p>
                </div>

                <div>
                  <Label>Route</Label>
                  <p className="text-sm text-gray-900">
                    {selectedCable.startNodeName} → {selectedCable.connectedNodeName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cable Type</Label>
                    <p className="text-sm text-gray-900 capitalize">{selectedCable.cableType}</p>
                  </div>
                  <div>
                    <Label>Fiber Count</Label>
                    <p className="text-sm text-gray-900">{selectedCable.fiberCount} fibers</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Length</Label>
                    <p className="text-sm text-gray-900">
                      {selectedCable.lengthMeters ? `${selectedCable.lengthMeters}m` : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={selectedCable.status === 'active' ? 'default' : 'secondary'}>
                      {selectedCable.status}
                    </Badge>
                  </div>
                </div>

                {selectedCable.notes && (
                  <div>
                    <Label>Notes</Label>
                    <p className="text-sm text-gray-600">{selectedCable.notes}</p>
                  </div>
                )}

                <div className="border-t pt-4 mt-6 space-y-2">
                  {!cableEditMode ? (
                    <>
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => {
                          if (!selectedCable.startNodeId) {
                            toast({
                              title: 'Error',
                              description: 'Cannot edit this cable - missing node information.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          const waypoints = selectedCable.routeGeometry || [];
                          setCableEditMode(true);
                          setEditingCable(selectedCable);
                          setEditingCableWaypoints(waypoints);
                          setOriginalCableWaypoints(waypoints);
                          setSelectedCable(null);
                          toast({
                            title: 'Edit Mode Active',
                            description: 'Drag the waypoints to adjust the cable path. Click Save when done.',
                          });
                        }}
                        data-testid="button-edit-cable-path"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Path
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedCable(null)}
                        data-testid="button-close-cable-sheet"
                      >
                        Close
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Photo Upload Dialog */}
      <Dialog open={photoUploadOpen} onOpenChange={setPhotoUploadOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="photo-upload-dialog">
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 flex flex-col gap-2"
                variant="outline"
                data-testid="button-choose-file"
              >
                <Upload className="h-8 w-8" />
                <span>Choose from Files</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
                className="hidden"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Mobile Filter Sheet - Shown on mobile only */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom" className="h-[85vh]" data-testid="mobile-filter-sheet">
          <SheetHeader>
            <SheetTitle>Filter Chambers</SheetTitle>
            <SheetDescription>
              Filter by network, status, type, or work items
            </SheetDescription>
          </SheetHeader>
          <div className="py-6 space-y-5">
            {/* All Filters Visible */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Network</Label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger className="h-12 text-base" data-testid="mobile-select-network">
                  <SelectValue placeholder="All Networks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" " className="text-base py-3">All Networks</SelectItem>
                  <SelectItem value="CCNet" className="text-base py-3">CCNet</SelectItem>
                  <SelectItem value="FibreLtd" className="text-base py-3">FibreLtd</SelectItem>
                  <SelectItem value="S&MFibre" className="text-base py-3">S&MFibre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-12 text-base" data-testid="mobile-select-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" " className="text-base py-3">All Statuses</SelectItem>
                  <SelectItem value="active" className="text-base py-3">Active</SelectItem>
                  <SelectItem value="planned" className="text-base py-3">Planned</SelectItem>
                  <SelectItem value="build_complete" className="text-base py-3">Build Complete</SelectItem>
                  <SelectItem value="awaiting_evidence" className="text-base py-3">Awaiting Evidence</SelectItem>
                  <SelectItem value="action_required" className="text-base py-3">Action Required</SelectItem>
                  <SelectItem value="decommissioned" className="text-base py-3">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-12 text-base" data-testid="mobile-select-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" " className="text-base py-3">All Types</SelectItem>
                  <SelectItem value="chamber" className="text-base py-3">Chamber</SelectItem>
                  <SelectItem value="cabinet" className="text-base py-3">Cabinet</SelectItem>
                  <SelectItem value="pole" className="text-base py-3">Pole</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Work Items</Label>
              <Select value={workItemFilter} onValueChange={(value) => setWorkItemFilter(value as 'all' | 'with' | 'without')}>
                <SelectTrigger className="h-12 text-base" data-testid="mobile-select-workitem">
                  <SelectValue placeholder="All Chambers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-base py-3">All Chambers</SelectItem>
                  <SelectItem value="with" className="text-base py-3">With Work Items</SelectItem>
                  <SelectItem value="without" className="text-base py-3">Without Work Items</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Summary */}
            {hasActiveFilters && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Active Filters
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedNetwork && (
                    <Badge variant="secondary" className="text-sm py-1 px-2">
                      Network: {selectedNetwork}
                    </Badge>
                  )}
                  {selectedStatus && (
                    <Badge variant="secondary" className="text-sm py-1 px-2">
                      Status: {selectedStatus}
                    </Badge>
                  )}
                  {selectedType && (
                    <Badge variant="secondary" className="text-sm py-1 px-2">
                      Type: {selectedType}
                    </Badge>
                  )}
                  {workItemFilter !== 'all' && (
                    <Badge variant="secondary" className="text-sm py-1 px-2">
                      {workItemFilter === 'with' ? 'With Work Items' : 'Without Work Items'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  Showing {filteredNodes.length} of {nodes.length} chambers
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button 
                onClick={() => setMobileFilterOpen(false)}
                className="w-full h-12 text-base"
                data-testid="mobile-button-apply-filter"
              >
                Done
              </Button>
              
              {hasActiveFilters && (
                <Button 
                  onClick={handleClearFilters}
                  variant="outline"
                  className="w-full h-12 text-base"
                  data-testid="mobile-button-clear-filters"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!viewPhotoUrl} onOpenChange={() => setViewPhotoUrl(null)}>
        <DialogContent className="sm:max-w-[800px]" data-testid="photo-viewer-dialog">
          <DialogHeader>
            <DialogTitle>View Photo</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <img
              src={viewPhotoUrl || ''}
              alt="Full size"
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              data-testid="photo-fullsize"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chamber</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{nodeToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteConfirmOpen(false);
                setNodeToDelete(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNode}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Work Item Creation Dialog */}
      <Dialog open={workItemDialogOpen} onOpenChange={setWorkItemDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="work-item-dialog">
          <DialogHeader>
            <DialogTitle>
              Create Work Item{selectedNodes.length > 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Workflow Template *</Label>
              <Select
                value={selectedTemplate?.id}
                onValueChange={(value) => {
                  const template = templates?.find((t: any) => t.id === value);
                  setSelectedTemplate(template);
                }}
              >
                <SelectTrigger data-testid="select-workflow-template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template: any) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assign To</Label>
                <Select
                  value={workItemAssignee?.toString() || undefined}
                  onValueChange={(value) => setWorkItemAssignee(value ? parseInt(value) : null)}
                >
                  <SelectTrigger data-testid="select-assignee">
                    <SelectValue placeholder="Select user (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Team</Label>
                <Select
                  value={workItemTeam?.toString() || undefined}
                  onValueChange={(value) => setWorkItemTeam(value ? parseInt(value) : null)}
                >
                  <SelectTrigger data-testid="select-team">
                    <SelectValue placeholder="Select team (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team: any) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={workItemDueDate}
                onChange={(e) => setWorkItemDueDate(e.target.value)}
                data-testid="input-due-date"
              />
            </div>
            
            {selectedNodes.length > 0 ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Creating work items for {selectedNodes.length} chamber{selectedNodes.length > 1 ? 's' : ''}
                </p>
                <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                  {nodes.filter(n => selectedNodes.includes(n.id)).map(n => n.name).slice(0, 3).join(', ')}
                  {selectedNodes.length > 3 && ` and ${selectedNodes.length - 3} more...`}
                </p>
              </div>
            ) : selectedNode && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm">
                <p className="font-medium">Chamber: {selectedNode.name}</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedNode.address || 'No address'}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setWorkItemDialogOpen(false);
                  setSelectedTemplate(null);
                  setWorkItemAssignee(null);
                  setWorkItemTeam(null);
                  setWorkItemDueDate('');
                }}
                data-testid="button-cancel-work-item"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWorkItem}
                disabled={!selectedTemplate}
                data-testid="button-confirm-create-work-item"
              >
                Create {selectedNodes.length > 1 ? `${selectedNodes.length} ` : ''}Work Item{selectedNodes.length > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Node Dialog */}
      <Dialog open={addNodeDialogOpen} onOpenChange={setAddNodeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" data-testid="add-node-dialog">
          <DialogHeader>
            <DialogTitle>
              <Plus className="w-5 h-5 inline mr-2" />
              Add New Fiber Network Node
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={newNodeData.name}
                  onChange={(e) => setNewNodeData({ ...newNodeData, name: e.target.value })}
                  placeholder="e.g., Chamber 1, Cabinet A"
                  data-testid="input-node-name"
                />
              </div>

              <div>
                <Label>Node Type</Label>
                <Select
                  value={newNodeData.nodeType}
                  onValueChange={(value) => setNewNodeData({ ...newNodeData, nodeType: value })}
                >
                  <SelectTrigger data-testid="select-node-type">
                    <SelectValue placeholder="Select node type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nodeTypes.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-gray-500 text-center">
                        No node types available
                      </div>
                    ) : (
                      nodeTypes.map((type: any) => (
                        <SelectItem key={type.id} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Network</Label>
                <Select
                  value={newNodeData.network}
                  onValueChange={(value) => setNewNodeData({ ...newNodeData, network: value })}
                >
                  <SelectTrigger data-testid="select-node-network">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CCNet">CCNet</SelectItem>
                    <SelectItem value="FibreLtd">FibreLtd</SelectItem>
                    <SelectItem value="S&MFibre">S&MFibre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={newNodeData.status}
                  onValueChange={(value) => setNewNodeData({ ...newNodeData, status: value })}
                >
                  <SelectTrigger data-testid="select-node-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="build_complete">Build Complete</SelectItem>
                    <SelectItem value="awaiting_evidence">Awaiting Evidence</SelectItem>
                    <SelectItem value="action_required">Action Required</SelectItem>
                    <SelectItem value="decommissioned">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={newNodeData.latitude}
                  onChange={(e) => setNewNodeData({ ...newNodeData, latitude: parseFloat(e.target.value) || 0 })}
                  data-testid="input-node-latitude"
                />
              </div>

              <div>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={newNodeData.longitude}
                  onChange={(e) => setNewNodeData({ ...newNodeData, longitude: parseFloat(e.target.value) || 0 })}
                  data-testid="input-node-longitude"
                />
              </div>
            </div>

            <div>
              <Label>What3Words</Label>
              <Input
                value={newNodeData.what3words}
                onChange={(e) => setNewNodeData({ ...newNodeData, what3words: e.target.value })}
                placeholder="///word.word.word"
                data-testid="input-node-what3words"
              />
            </div>

            <div>
              <Label>Address</Label>
              <Textarea
                value={newNodeData.address}
                onChange={(e) => setNewNodeData({ ...newNodeData, address: e.target.value })}
                placeholder="Enter address..."
                rows={2}
                data-testid="textarea-node-address"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={newNodeData.notes}
                onChange={(e) => setNewNodeData({ ...newNodeData, notes: e.target.value })}
                placeholder="Add notes..."
                rows={3}
                data-testid="textarea-node-notes"
              />
            </div>

            <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-work-item-checkbox"
                  checked={createWorkItemForNewNode}
                  onCheckedChange={(checked) => setCreateWorkItemForNewNode(checked as boolean)}
                  data-testid="checkbox-create-work-item-for-node"
                />
                <Label htmlFor="create-work-item-checkbox" className="cursor-pointer">
                  Create work item after adding node
                </Label>
              </div>
              
              {createWorkItemForNewNode && (
                <div className="ml-6">
                  <Label>Workflow Template *</Label>
                  <Select
                    value={newNodeTemplate?.id?.toString()}
                    onValueChange={(value) => {
                      const template = templates?.find(t => t.id.toString() === value);
                      setNewNodeTemplate(template || null);
                    }}
                  >
                    <SelectTrigger data-testid="select-new-node-template">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((template: any) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setAddNodeDialogOpen(false);
                  setNewNodeData({
                    name: '',
                    nodeType: 'chamber',
                    network: 'FibreLtd',
                    status: 'planned',
                    latitude: 0,
                    longitude: 0,
                    what3words: '',
                    address: '',
                    notes: '',
                  });
                }}
                data-testid="button-cancel-add-node"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNode}
                disabled={
                  !newNodeData.name || 
                  createNodeMutation.isPending ||
                  (createWorkItemForNewNode && !newNodeTemplate)
                }
                data-testid="button-confirm-add-node"
              >
                {createNodeMutation.isPending ? 'Creating...' : 'Add Node'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Cable Dialog */}
      <Dialog open={cableDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCableDialogOpen(false);
          setCableStartNode(null);
          setCableEndNode(null);
          setNewCableData({
            cableId: '',
            fiberCount: 24,
            cableType: 'single_mode',
            lengthMeters: 0,
            status: 'planned',
            notes: '',
          });
        }
      }}>
        <DialogContent className="sm:max-w-[500px]" data-testid="add-cable-dialog">
          <DialogHeader>
            <DialogTitle>
              <Cable className="w-5 h-5 inline mr-2" />
              Create Cable Route
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Link2 className="w-4 h-4" />
                <span className="font-medium">Connection:</span>
              </div>
              <div className="mt-1 text-xs text-blue-800 dark:text-blue-200">
                {cableStartNode?.name} → {cableEndNode?.name}
              </div>
            </div>

            <div>
              <Label>Cable ID *</Label>
              <Input
                value={newCableData.cableId}
                onChange={(e) => setNewCableData({ ...newCableData, cableId: e.target.value })}
                placeholder="e.g., CBL-001"
                data-testid="input-cable-id"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fiber Count</Label>
                <Select
                  value={newCableData.fiberCount.toString()}
                  onValueChange={(value) => setNewCableData({ ...newCableData, fiberCount: parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-fiber-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 fibers</SelectItem>
                    <SelectItem value="24">24 fibers</SelectItem>
                    <SelectItem value="48">48 fibers</SelectItem>
                    <SelectItem value="96">96 fibers</SelectItem>
                    <SelectItem value="144">144 fibers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cable Type</Label>
                <Select
                  value={newCableData.cableType}
                  onValueChange={(value) => setNewCableData({ ...newCableData, cableType: value })}
                >
                  <SelectTrigger data-testid="select-cable-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_mode">Single Mode</SelectItem>
                    <SelectItem value="multi_mode">Multi Mode</SelectItem>
                    <SelectItem value="armored">Armored</SelectItem>
                    <SelectItem value="aerial">Aerial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Length (meters)</Label>
                <Input
                  type="number"
                  value={newCableData.lengthMeters || ''}
                  onChange={(e) => setNewCableData({ ...newCableData, lengthMeters: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  data-testid="input-cable-length"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={newCableData.status}
                  onValueChange={(value) => setNewCableData({ ...newCableData, status: value })}
                >
                  <SelectTrigger data-testid="select-cable-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_construction">Under Construction</SelectItem>
                    <SelectItem value="decommissioned">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={newCableData.notes}
                onChange={(e) => setNewCableData({ ...newCableData, notes: e.target.value })}
                placeholder="Add notes about this cable..."
                rows={3}
                data-testid="textarea-cable-notes"
              />
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setCableDialogOpen(false);
                  setCableStartNode(null);
                  setCableEndNode(null);
                  setNewCableData({
                    cableId: '',
                    fiberCount: 24,
                    cableType: 'single_mode',
                    lengthMeters: 0,
                    status: 'planned',
                    notes: '',
                  });
                }}
                data-testid="button-cancel-add-cable"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!newCableData.cableId || !cableStartNode || !cableEndNode) {
                    toast({
                      title: 'Validation Error',
                      description: 'Please provide a cable ID',
                      variant: 'destructive',
                    });
                    return;
                  }

                  await createCableMutation.mutateAsync({
                    startNodeId: cableStartNode.id,
                    endNodeId: cableEndNode.id,
                    cableData: newCableData,
                  });

                  setCableDialogOpen(false);
                  setCableStartNode(null);
                  setCableEndNode(null);
                  exitMode();
                  setNewCableData({
                    cableId: '',
                    fiberCount: 24,
                    cableType: 'single_mode',
                    lengthMeters: 0,
                    status: 'planned',
                    notes: '',
                  });
                }}
                disabled={!newCableData.cableId || createCableMutation.isPending}
                data-testid="button-confirm-add-cable"
              >
                {createCableMutation.isPending ? 'Creating...' : 'Create Cable'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog - Manage Node Types */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" data-testid="settings-dialog">
          <DialogHeader>
            <DialogTitle>Manage Node Types</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Existing Node Types */}
            <div>
              <h3 className="text-sm font-medium mb-3">Available Node Types</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {nodeTypes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No node types configured</p>
                    <p className="text-xs mt-1">Add your first node type below</p>
                  </div>
                ) : (
                  nodeTypes.map((nodeType: any) => (
                    <div
                      key={nodeType.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      data-testid={`node-type-${nodeType.value}`}
                    >
                      <div>
                        <div className="font-medium">{nodeType.label}</div>
                        <div className="text-xs text-gray-500">{nodeType.value}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${nodeType.label}"?`)) {
                            deleteNodeTypeMutation.mutate(nodeType.id);
                          }
                        }}
                        disabled={deleteNodeTypeMutation.isPending}
                        data-testid={`button-delete-${nodeType.value}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add New Node Type */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">Add New Node Type</h3>
              <div className="space-y-3">
                <div>
                  <Label>Value *</Label>
                  <Input
                    value={newNodeTypeName}
                    onChange={(e) => setNewNodeTypeName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="e.g., pole, splice_closure"
                    data-testid="input-node-type-value"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Internal value (lowercase, underscores only)
                  </p>
                </div>
                <div>
                  <Label>Display Label *</Label>
                  <Input
                    value={newNodeTypeLabel}
                    onChange={(e) => setNewNodeTypeLabel(e.target.value)}
                    placeholder="e.g., Pole, Splice Closure"
                    data-testid="input-node-type-label"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Label shown to users
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (!newNodeTypeName || !newNodeTypeLabel) {
                      toast({
                        title: 'Validation Error',
                        description: 'Please provide both value and label',
                        variant: 'destructive',
                      });
                      return;
                    }
                    createNodeTypeMutation.mutate({
                      value: newNodeTypeName,
                      label: newNodeTypeLabel,
                    });
                  }}
                  disabled={!newNodeTypeName || !newNodeTypeLabel || createNodeTypeMutation.isPending}
                  className="w-full"
                  data-testid="button-add-node-type"
                >
                  {createNodeTypeMutation.isPending ? 'Adding...' : 'Add Node Type'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Splice Tray Editor Dialog */}
      <Dialog open={spliceTrayEditorOpen} onOpenChange={(open) => {
        if (!open) {
          setSpliceTrayEditorOpen(false);
          setSelectedSpliceTray(null);
          setSpliceTrayFormData({ trayIdentifier: '', description: '' });
        }
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto" data-testid="splice-tray-editor-dialog">
          <DialogHeader>
            <DialogTitle>
              {selectedSpliceTray ? 'Edit Splice Tray' : 'Create Splice Tray'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Tray Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Tray Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tray-identifier">Tray Identifier*</Label>
                  <Input
                    id="tray-identifier"
                    value={spliceTrayFormData.trayIdentifier}
                    onChange={(e) => setSpliceTrayFormData(prev => ({
                      ...prev,
                      trayIdentifier: e.target.value
                    }))}
                    placeholder="e.g., TRAY-001, Tray A"
                    data-testid="input-tray-identifier"
                  />
                </div>
                <div>
                  <Label htmlFor="tray-description">Description</Label>
                  <Input
                    id="tray-description"
                    value={spliceTrayFormData.description || ''}
                    onChange={(e) => setSpliceTrayFormData(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    placeholder="Optional description"
                    data-testid="input-tray-description"
                  />
                </div>
              </div>
            </div>

            {/* Fiber Connections Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Fiber Connections</h3>
              
              {/* Cable Selection - Only show cables from selected node */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Left Cable</Label>
                  <Select
                    value={leftCableId?.toString() || ''}
                    onValueChange={(value) => setLeftCableId(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger data-testid="select-left-cable">
                      <SelectValue placeholder="Select cable..." />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                      {(selectedNode?.fiberDetails?.cables || []).map((cable: any) => (
                        <SelectItem key={cable.id} value={cable.id.toString()}>
                          {cable.cableIdentifier} ({cable.fiberCount || 0} fibers)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Right Cable</Label>
                  <Select
                    value={rightCableId?.toString() || ''}
                    onValueChange={(value) => setRightCableId(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger data-testid="select-right-cable">
                      <SelectValue placeholder="Select cable..." />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                      {(selectedNode?.fiberDetails?.cables || []).map((cable: any) => (
                        <SelectItem key={cable.id} value={cable.id.toString()}>
                          {cable.cableIdentifier} ({cable.fiberCount || 0} fibers)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fiber Connection Interface */}
              {leftCableId && rightCableId ? (
                <div className="border rounded-lg p-4">
                  <div className="space-y-4">
                    {/* Connection Stats */}
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {fiberConnections.length} connection(s) created
                      </span>
                      {fiberConnections.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFiberConnections([])}
                          data-testid="button-clear-connections"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>

                    {/* Quick Connect Interface */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium mb-2">
                          {(selectedNode?.fiberDetails?.cables || []).find((c: any) => c.id === leftCableId)?.cableIdentifier}
                        </div>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto">
                          {Array.from({ length: (selectedNode?.fiberDetails?.cables || []).find((c: any) => c.id === leftCableId)?.fiberCount || 0 }, (_, i) => i + 1).map(fiberNum => {
                            const hasConnection = fiberConnections.some(
                              conn => conn.leftCableId === leftCableId && conn.leftFiberNumber === fiberNum
                            );
                            return (
                              <div
                                key={fiberNum}
                                className={`p-2 text-xs border rounded cursor-pointer transition-colors ${
                                  hasConnection
                                    ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
                                    : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900'
                                }`}
                                onClick={() => {
                                  // Simple click-to-connect: creates 1-to-1 connection
                                  if (!hasConnection && rightCableId) {
                                    const rightCable = (selectedNode?.fiberDetails?.cables || []).find((c: any) => c.id === rightCableId);
                                    const nextAvailableRight = Array.from(
                                      { length: rightCable?.fiberCount || 0 },
                                      (_, i) => i + 1
                                    ).find(num => !fiberConnections.some(
                                      conn => conn.rightCableId === rightCableId && conn.rightFiberNumber === num
                                    ));
                                    
                                    if (nextAvailableRight) {
                                      setFiberConnections(prev => [...prev, {
                                        leftCableId,
                                        leftFiberNumber: fiberNum,
                                        rightCableId,
                                        rightFiberNumber: nextAvailableRight,
                                        createdVia: 'manual'
                                      }]);
                                    }
                                  }
                                }}
                                data-testid={`fiber-left-${fiberNum}`}
                              >
                                Fiber {fiberNum}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium mb-2">
                          {(selectedNode?.fiberDetails?.cables || []).find((c: any) => c.id === rightCableId)?.cableIdentifier}
                        </div>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto">
                          {Array.from({ length: (selectedNode?.fiberDetails?.cables || []).find((c: any) => c.id === rightCableId)?.fiberCount || 0 }, (_, i) => i + 1).map(fiberNum => {
                            const hasConnection = fiberConnections.some(
                              conn => conn.rightCableId === rightCableId && conn.rightFiberNumber === fiberNum
                            );
                            return (
                              <div
                                key={fiberNum}
                                className={`p-2 text-xs border rounded ${
                                  hasConnection
                                    ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
                                    : 'bg-white dark:bg-gray-800'
                                }`}
                                data-testid={`fiber-right-${fiberNum}`}
                              >
                                Fiber {fiberNum}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Connection List */}
                    {fiberConnections.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-xs font-medium mb-2">Connections</div>
                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                          {fiberConnections.map((conn, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs">
                              <span>
                                Fiber {conn.leftFiberNumber} ⟷ Fiber {conn.rightFiberNumber}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setFiberConnections(prev => prev.filter((_, i) => i !== index))}
                                data-testid={`button-delete-connection-${index}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center text-sm text-gray-500">
                  <Cable className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>Select two cables to begin creating fiber connections</p>
                </div>
              )}
            </div>
          </div>

          {/* Dialog Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setSpliceTrayEditorOpen(false);
                setSelectedSpliceTray(null);
                setSpliceTrayFormData({ trayIdentifier: '', description: '' });
              }}
              data-testid="button-cancel-splice-tray"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedNode?.id) {
                  toast({
                    title: 'Error',
                    description: 'No node selected',
                    variant: 'destructive',
                  });
                  return;
                }
                
                createSpliceTrayMutation.mutate({
                  nodeId: selectedNode.id,
                  trayIdentifier: spliceTrayFormData.trayIdentifier,
                  description: spliceTrayFormData.description,
                  connections: fiberConnections,
                });
              }}
              disabled={!spliceTrayFormData.trayIdentifier.trim() || createSpliceTrayMutation.isPending}
              data-testid="button-save-splice-tray"
            >
              {createSpliceTrayMutation.isPending ? 'Creating...' : (selectedSpliceTray ? 'Update' : 'Create')} Tray
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
