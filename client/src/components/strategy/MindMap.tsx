import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  Position,
  Handle,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target, GitBranch, CheckCircle2, ListTodo, Maximize2, Minimize2, Users } from 'lucide-react';

interface MindMapProps {
  objectives: any[];
  onNodeClick?: (nodeId: string, nodeType: string, data: any) => void;
}

type LayoutMode = 'tree' | 'radial';
type FocusMode = 'all' | 'my-work' | 'by-team';

// Custom Node Components
const MissionNode = ({ data }: { data: any }) => {
  const handleStyle = { opacity: 0, background: 'transparent', width: '1px', height: '1px', border: 'none' };
  
  return (
    <>
      <Handle id="top" type="target" position={Position.Top} isConnectable={false} style={handleStyle} />
      <Handle id="right" type="target" position={Position.Right} isConnectable={false} style={handleStyle} />
      <Handle id="bottom" type="target" position={Position.Bottom} isConnectable={false} style={handleStyle} />
      <Handle id="left" type="target" position={Position.Left} isConnectable={false} style={handleStyle} />
      
      <Card className="p-4 min-w-[280px] max-w-[320px] border-2 border-blue-500 dark:border-blue-400 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-background shadow-lg">
        <div className="flex items-start gap-2">
          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">Mission</div>
            <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">{data.mission || 'Define your mission'}</div>
          </div>
        </div>
      </Card>
      
      <Handle id="top" type="source" position={Position.Top} isConnectable={false} style={handleStyle} />
      <Handle id="right" type="source" position={Position.Right} isConnectable={false} style={handleStyle} />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectable={false} style={handleStyle} />
      <Handle id="left" type="source" position={Position.Left} isConnectable={false} style={handleStyle} />
    </>
  );
};

const TeamNode = ({ data }: { data: any }) => {
  const handleStyle = { opacity: 0, background: 'transparent', width: '1px', height: '1px', border: 'none' };
  
  return (
    <>
      <Handle id="top" type="target" position={Position.Top} isConnectable={false} style={handleStyle} />
      <Handle id="right" type="target" position={Position.Right} isConnectable={false} style={handleStyle} />
      <Handle id="bottom" type="target" position={Position.Bottom} isConnectable={false} style={handleStyle} />
      <Handle id="left" type="target" position={Position.Left} isConnectable={false} style={handleStyle} />
      
      <Card className="p-3.5 min-w-[220px] max-w-[260px] border-2 border-orange-400 dark:border-orange-500 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950 dark:to-background shadow-md">
        <div className="flex items-start gap-2">
          <Users className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-xs text-orange-900 dark:text-orange-100 mb-0.5">{data.name}</div>
            {data.description && (
              <div className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-2">{data.description}</div>
            )}
          </div>
        </div>
      </Card>
      
      <Handle id="top" type="source" position={Position.Top} isConnectable={false} style={handleStyle} />
      <Handle id="right" type="source" position={Position.Right} isConnectable={false} style={handleStyle} />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectable={false} style={handleStyle} />
      <Handle id="left" type="source" position={Position.Left} isConnectable={false} style={handleStyle} />
    </>
  );
};

const ObjectiveNode = ({ data }: { data: any }) => {
  const progress = Math.round((data.currentValue || 0) / (data.targetValue || 1) * 100);
  const handleStyle = { opacity: 0, background: 'transparent', width: '1px', height: '1px', border: 'none' };
  
  return (
    <>
      <Handle id="top" type="target" position={Position.Top} isConnectable={false} style={handleStyle} />
      <Handle id="right" type="target" position={Position.Right} isConnectable={false} style={handleStyle} />
      <Handle id="bottom" type="target" position={Position.Bottom} isConnectable={false} style={handleStyle} />
      <Handle id="left" type="target" position={Position.Left} isConnectable={false} style={handleStyle} />
      
      <Card className="p-3 min-w-[240px] max-w-[280px] border border-purple-300 dark:border-purple-600 bg-background shadow-md hover:shadow-lg transition-shadow">
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">🎯</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs text-foreground mb-1 line-clamp-2">{data.title}</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-purple-600 dark:bg-purple-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{progress}%</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {data.status && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-auto">
                  {data.status}
                </Badge>
              )}
              <span className="text-[9px] text-muted-foreground font-medium">
                {Math.floor(data.currentValue || 0)}/{Math.floor(data.targetValue || 0)}
              </span>
              {data.team?.name && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-auto bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                  {data.team.name}
                </Badge>
              )}
              {data.owner?.fullName && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-auto bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {data.owner.fullName}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
      
      <Handle id="top" type="source" position={Position.Top} isConnectable={false} style={handleStyle} />
      <Handle id="right" type="source" position={Position.Right} isConnectable={false} style={handleStyle} />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectable={false} style={handleStyle} />
      <Handle id="left" type="source" position={Position.Left} isConnectable={false} style={handleStyle} />
    </>
  );
};

const KeyResultNode = ({ data }: { data: any }) => {
  const progress = Math.round(
    (parseFloat(data.currentValue || '0') / parseFloat(data.targetValue || '1')) * 100
  );
  const handleStyle = { opacity: 0, background: 'transparent', width: '1px', height: '1px', border: 'none' };
  
  return (
    <>
      <Handle id="top" type="target" position={Position.Top} isConnectable={false} style={handleStyle} />
      <Handle id="right" type="target" position={Position.Right} isConnectable={false} style={handleStyle} />
      <Handle id="bottom" type="target" position={Position.Bottom} isConnectable={false} style={handleStyle} />
      <Handle id="left" type="target" position={Position.Left} isConnectable={false} style={handleStyle} />
      
      <Card className="p-2.5 min-w-[200px] max-w-[240px] border border-green-300 dark:border-green-600 bg-background shadow hover:shadow-md transition-shadow">
        <div className="flex items-start gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[11px] text-foreground mb-1 line-clamp-2">{data.title}</div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-green-600 dark:bg-green-500 h-1 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{progress}%</span>
            </div>
            {data.status && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-auto">
                {data.status}
              </Badge>
            )}
          </div>
        </div>
      </Card>
      
      <Handle id="top" type="source" position={Position.Top} isConnectable={false} style={handleStyle} />
      <Handle id="right" type="source" position={Position.Right} isConnectable={false} style={handleStyle} />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectable={false} style={handleStyle} />
      <Handle id="left" type="source" position={Position.Left} isConnectable={false} style={handleStyle} />
    </>
  );
};

const TaskNode = ({ data }: { data: any }) => {
  const handleStyle = { opacity: 0, background: 'transparent', width: '1px', height: '1px', border: 'none' };
  
  return (
    <>
      <Handle id="top" type="target" position={Position.Top} isConnectable={false} style={handleStyle} />
      <Handle id="right" type="target" position={Position.Right} isConnectable={false} style={handleStyle} />
      <Handle id="bottom" type="target" position={Position.Bottom} isConnectable={false} style={handleStyle} />
      <Handle id="left" type="target" position={Position.Left} isConnectable={false} style={handleStyle} />
      
      <Card className="p-2 min-w-[160px] max-w-[200px] border border-border bg-background shadow-sm hover:shadow transition-shadow">
        <div className="flex items-start gap-1.5">
          <ListTodo className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-foreground line-clamp-2">{data.title}</div>
            {data.status && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-auto mt-1">
                {data.status}
              </Badge>
            )}
          </div>
        </div>
      </Card>
      
      <Handle id="top" type="source" position={Position.Top} isConnectable={false} style={handleStyle} />
      <Handle id="right" type="source" position={Position.Right} isConnectable={false} style={handleStyle} />
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectable={false} style={handleStyle} />
      <Handle id="left" type="source" position={Position.Left} isConnectable={false} style={handleStyle} />
    </>
  );
};

// Node types registry - moved inside component to use useMemo

// Helper function to determine connection handles based on relative node positions
const getConnectionHandles = (sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }) => {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  
  // Determine source and target handle IDs based on relative positions
  let sourceHandle = 'bottom';
  let targetHandle = 'top';
  
  // If horizontal distance is greater than vertical, use left/right
  if (absDx > absDy) {
    sourceHandle = dx > 0 ? 'right' : 'left';
    targetHandle = dx > 0 ? 'left' : 'right';
  } else {
    // Otherwise use top/bottom
    sourceHandle = dy > 0 ? 'bottom' : 'top';
    targetHandle = dy > 0 ? 'top' : 'bottom';
  }
  
  return { sourceHandle, targetHandle };
};

// Improved Tree layout with mission centered
const getTreeLayout = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ 
    rankdir: 'TB', // Top to bottom
    ranksep: 200, // Large vertical spacing between levels
    nodesep: 180, // Large horizontal spacing between nodes
    marginx: 80,
    marginy: 80,
  });

  // Set node sizes based on type
  nodes.forEach((node) => {
    let width = 280;
    let height = 100;
    
    if (node.type === 'mission') {
      width = 320;
      height = 120;
    } else if (node.type === 'objective') {
      width = 280;
      height = 110;
    } else if (node.type === 'keyResult') {
      width = 240;
      height = 90;
    } else if (node.type === 'task') {
      width = 200;
      height = 70;
    }
    
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // Calculate bounds to center the mission node
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = nodeWithPosition.width;
    const height = nodeWithPosition.height;
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
      dagreX: nodeWithPosition.x,
      dagreY: nodeWithPosition.y,
      width,
      height,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  // Find mission node and calculate offset to center it horizontally
  const missionNode = layoutedNodes.find(n => n.type === 'mission');
  if (missionNode) {
    const offsetX = -missionNode.dagreX;
    
    // Apply offset to all nodes to center mission
    return layoutedNodes.map(node => ({
      ...node,
      position: {
        x: node.position.x + offsetX,
        y: node.position.y,
      },
    }));
  }

  return layoutedNodes;
};

// Organic Mind Map Radial Layout with improved spacing
const getRadialLayout = (nodes: Node[], edges: Edge[]) => {
  const centerX = 0;
  const centerY = 0;
  const positioned: Map<string, { x: number; y: number }> = new Map();
  
  // Find mission node
  const missionNode = nodes.find(n => n.type === 'mission');
  
  // Position mission at center
  if (missionNode) {
    positioned.set(missionNode.id, { x: centerX, y: centerY });
  }
  
  // Get team nodes if they exist
  const teamNodes = nodes.filter(n => n.type === 'team');
  const hasTeams = teamNodes.length > 0;
  
  if (hasTeams) {
    // Position team nodes in a circle around mission
    const teamRadius = 320;
    const teamAngleStep = (2 * Math.PI) / Math.max(teamNodes.length, 1);
    
    teamNodes.forEach((team, index) => {
      const angle = index * teamAngleStep - Math.PI / 2; // Start from top
      const x = centerX + teamRadius * Math.cos(angle);
      const y = centerY + teamRadius * Math.sin(angle);
      positioned.set(team.id, { x, y });
    });
  }
  
  // Get objectives
  const objectives = nodes.filter(n => n.type === 'objective');
  const objectiveRadius = hasTeams ? 550 : 550; // Same radius whether teams exist or not
  
  // Group objectives by team if teams exist
  const objectivesByTeam = new Map<string, typeof objectives>();
  
  if (hasTeams) {
    // Find which objectives belong to which teams
    teamNodes.forEach(team => {
      const teamObjectives = objectives.filter(obj => 
        edges.some(e => e.source === team.id && e.target === obj.id)
      );
      objectivesByTeam.set(team.id, teamObjectives);
    });
  }
  
  // Position objectives
  if (hasTeams) {
    // Position objectives around their parent team nodes
    teamNodes.forEach((team, teamIndex) => {
      const teamPos = positioned.get(team.id)!;
      const teamObjectives = objectivesByTeam.get(team.id) || [];
      
      const objAngleSpread = Math.min(Math.PI * 1.2, teamObjectives.length * 0.6);
      const objAngleStep = teamObjectives.length > 1 ? objAngleSpread / (teamObjectives.length - 1) : 0;
      const teamAngle = teamIndex * (2 * Math.PI) / teamNodes.length - Math.PI / 2;
      
      teamObjectives.forEach((obj, objIndex) => {
        const angle = teamAngle + (objIndex - (teamObjectives.length - 1) / 2) * objAngleStep;
        const x = teamPos.x + objectiveRadius * Math.cos(angle);
        const y = teamPos.y + objectiveRadius * Math.sin(angle);
        positioned.set(obj.id, { x, y });
      });
    });
  } else {
    // Position objectives in a circle around mission (no teams)
    const angleStep = (2 * Math.PI) / Math.max(objectives.length, 1);
    objectives.forEach((obj, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const x = centerX + objectiveRadius * Math.cos(angle);
      const y = centerY + objectiveRadius * Math.sin(angle);
      positioned.set(obj.id, { x, y });
    });
  }
  
  // Position key results and tasks for all objectives
  objectives.forEach((obj) => {
    const objPos = positioned.get(obj.id);
    if (!objPos) return;
    
    // Find this objective's key results
    const keyResults = nodes.filter(n => 
      n.type === 'keyResult' && 
      edges.some(e => e.source === obj.id && e.target === n.id)
    );
    
    const krRadius = 380;
    const krAngleSpread = Math.min(Math.PI * 1.0, keyResults.length * 0.5);
    const krAngleStep = krAngleSpread / (Math.max(keyResults.length, 1));
    
    // Calculate base angle from mission/team to this objective
    const baseAngle = Math.atan2(objPos.y - centerY, objPos.x - centerX);
    
    // Position key results branching from their objective
    keyResults.forEach((kr, krIndex) => {
      const krAngle = baseAngle + (krIndex - (keyResults.length - 1) / 2) * krAngleStep;
      const krX = objPos.x + krRadius * Math.cos(krAngle);
      const krY = objPos.y + krRadius * Math.sin(krAngle);
      positioned.set(kr.id, { x: krX, y: krY });
      
      // Find this key result's tasks
      const tasks = nodes.filter(n => 
        n.type === 'task' && 
        edges.some(e => e.source === kr.id && e.target === n.id)
      );
      
      const taskRadius = 300;
      const taskAngleSpread = Math.min(Math.PI * 0.8, tasks.length * 0.45);
      const taskAngleStep = taskAngleSpread / (Math.max(tasks.length, 1));
      
      // Position tasks branching from their key result
      tasks.forEach((task, taskIndex) => {
        const taskAngle = krAngle + (taskIndex - (tasks.length - 1) / 2) * taskAngleStep;
        const taskX = krX + taskRadius * Math.cos(taskAngle);
        const taskY = krY + taskRadius * Math.sin(taskAngle);
        positioned.set(task.id, { x: taskX, y: taskY });
      });
    });
  });
  
  // Apply positions to nodes with dynamic connection points
  return nodes.map((node) => {
    const pos = positioned.get(node.id) || { x: centerX, y: centerY };
    
    // Find edges where this node is the source to determine optimal source position
    const outgoingEdges = edges.filter(e => e.source === node.id);
    const incomingEdges = edges.filter(e => e.target === node.id);
    
    // Default positions
    let sourcePosition = Position.Bottom;
    let targetPosition = Position.Top;
    
    // If there are outgoing edges, calculate average target position
    if (outgoingEdges.length > 0) {
      const avgTargetX = outgoingEdges.reduce((sum, edge) => {
        const targetPos = positioned.get(edge.target);
        return sum + (targetPos?.x || 0);
      }, 0) / outgoingEdges.length;
      
      const avgTargetY = outgoingEdges.reduce((sum, edge) => {
        const targetPos = positioned.get(edge.target);
        return sum + (targetPos?.y || 0);
      }, 0) / outgoingEdges.length;
      
      const connHandles = getConnectionHandles(pos, { x: avgTargetX, y: avgTargetY });
      // Keep sourcePosition for display, but we'll use handles for actual connections
      sourcePosition = Position.Bottom;
    }
    
    // If there are incoming edges, calculate average source position
    if (incomingEdges.length > 0) {
      const avgSourceX = incomingEdges.reduce((sum, edge) => {
        const sourcePos = positioned.get(edge.source);
        return sum + (sourcePos?.x || 0);
      }, 0) / incomingEdges.length;
      
      const avgSourceY = incomingEdges.reduce((sum, edge) => {
        const sourcePos = positioned.get(edge.source);
        return sum + (sourcePos?.y || 0);
      }, 0) / incomingEdges.length;
      
      const connHandles = getConnectionHandles({ x: avgSourceX, y: avgSourceY }, pos);
      // Keep targetPosition for display, but we'll use handles for actual connections
      targetPosition = Position.Top;
    }
    
    return {
      ...node,
      position: { x: pos.x - 140, y: pos.y - 50 },
      sourcePosition,
      targetPosition,
    };
  });
};

// Inner component that has access to ReactFlow context
function MindMapInner({ objectives, onNodeClick }: MindMapProps) {
  const reactFlowInstance = useReactFlow();
  const fitViewCalledRef = useRef(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('radial'); // Default to radial (mindmap) view
  const [focusMode, setFocusMode] = useState<FocusMode>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [groupByTeam, setGroupByTeam] = useState(false);

  // Memoize node types to prevent recreation on every render
  const nodeTypes = useMemo(() => ({
    mission: MissionNode,
    team: TeamNode,
    objective: ObjectiveNode,
    keyResult: KeyResultNode,
    task: TaskNode,
  }), []);

  // Fetch mission/vision data
  const { data: missionVision } = useQuery<{ mission?: string; vision?: string }>({
    queryKey: ['/api/strategy/mission-vision'],
  });

  // Fetch teams data for filtering
  const { data: teams = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ['/api/teams'],
  });

  // Use all objectives (no filtering when grouping by team)
  const filteredObjectives = objectives;

  // Build nodes and edges from objectives data
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Add mission node if available
    if (missionVision?.mission) {
      nodes.push({
        id: 'mission',
        type: 'mission',
        data: { mission: missionVision.mission },
        position: { x: 0, y: 0 },
      });
    }

    // When grouping by team, create team nodes and restructure hierarchy
    if (groupByTeam) {
      // Find teams that have objectives assigned
      const teamsWithObjectives = new Set(
        filteredObjectives.filter(obj => obj.teamId).map(obj => obj.teamId)
      );
      
      // Create team nodes for teams that have objectives
      teamsWithObjectives.forEach(teamId => {
        const team = teams.find(t => t.id === teamId);
        if (team) {
          nodes.push({
            id: `team-${team.id}`,
            type: 'team',
            data: team,
            position: { x: 0, y: 0 },
          });
          
          // Connect mission to team node
          if (missionVision?.mission) {
            edges.push({
              id: `mission-team-${team.id}`,
              source: 'mission',
              target: `team-${team.id}`,
              type: 'default',
              style: { 
                stroke: '#f59e0b', // Orange for mission-to-team
                strokeWidth: 3,
              },
              animated: false,
            });
          }
        }
      });
    }

    // Add objective nodes
    filteredObjectives.forEach((objective, objIndex) => {
      nodes.push({
        id: `obj-${objective.id}`,
        type: 'objective',
        data: objective,
        position: { x: 0, y: 0 },
      });

      // Determine parent node: team node if grouping and has team, otherwise mission
      let parentNode = 'mission';
      let edgeColor = '#b8c5d6'; // Default blue
      
      if (groupByTeam && objective.teamId) {
        parentNode = `team-${objective.teamId}`;
        edgeColor = '#fb923c'; // Light orange for team-to-objective
      }
      
      // Connect to parent node if mission exists
      if (missionVision?.mission) {
        edges.push({
          id: `${parentNode}-obj-${objective.id}`,
          source: parentNode,
          target: `obj-${objective.id}`,
          type: 'default',
          style: { 
            stroke: edgeColor,
            strokeWidth: 3,
          },
          animated: false,
        });
      }

      // Add key result nodes
      objective.keyResults?.forEach((kr: any, krIndex: number) => {
        nodes.push({
          id: `kr-${kr.id}`,
          type: 'keyResult',
          data: kr,
          position: { x: 0, y: 0 },
        });

        edges.push({
          id: `obj-${objective.id}-kr-${kr.id}`,
          source: `obj-${objective.id}`,
          target: `kr-${kr.id}`,
          type: 'default',
          style: { 
            stroke: '#d9c5e6',
            strokeWidth: 3,
          },
          animated: false,
        });

        // Add task nodes
        kr.tasks?.forEach((task: any, taskIndex: number) => {
          nodes.push({
            id: `task-${task.id}`,
            type: 'task',
            data: task,
            position: { x: 0, y: 0 },
          });

          edges.push({
            id: `kr-${kr.id}-task-${task.id}`,
            source: `kr-${kr.id}`,
            target: `task-${task.id}`,
            type: 'default',
            style: { 
              stroke: '#c5e6d9',
              strokeWidth: 3,
            },
            animated: false,
          });
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [filteredObjectives, missionVision, groupByTeam, teams]);

  // Apply layout algorithm
  const layoutedNodes = useMemo(() => {
    if (layoutMode === 'tree') {
      return getTreeLayout(initialNodes, initialEdges);
    } else {
      return getRadialLayout(initialNodes, initialEdges);
    }
  }, [initialNodes, initialEdges, layoutMode]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([] as Edge[]);
  
  // Track when layout mode changes to trigger new layout
  const prevLayoutModeRef = useRef(layoutMode);
  // Track current layout mode for localStorage (always current, no closure issues)
  const layoutModeRef = useRef(layoutMode);
  
  // Keep layoutModeRef in sync with layoutMode state
  useEffect(() => {
    layoutModeRef.current = layoutMode;
  }, [layoutMode]);

  // Fetch saved positions from database
  const { data: savedPositionsData } = useQuery<{
    positions: Array<{ nodeId: string; nodeType: string; positionX: number; positionY: number }>;
    viewport: { x: number; y: number; zoom: number } | null;
  }>({
    queryKey: ['/api/strategy/mindmap-positions'],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Mutation to save positions to database
  const savePositionsMutation = useMutation({
    mutationFn: async (data: {
      positions: Array<{ nodeId: string; nodeType: string; positionX: number; positionY: number }>;
      viewport?: { x: number; y: number; zoom: number };
    }) => {
      return apiRequest('/api/strategy/mindmap-positions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Invalidate positions cache to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/mindmap-positions'] });
    },
    onError: (error) => {
      console.error('Failed to save node positions:', error);
    },
  });

  // Save node positions to database with debounce
  const savePositionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveNodePositions = useCallback((nodesToSave: Node[]) => {
    // Clear any pending save
    if (savePositionsTimeoutRef.current) {
      clearTimeout(savePositionsTimeoutRef.current);
    }

    // Debounce saves to avoid too many API calls
    savePositionsTimeoutRef.current = setTimeout(() => {
      const positions = nodesToSave.map(node => ({
        nodeId: node.id,
        nodeType: node.type || 'unknown',
        positionX: node.position.x,
        positionY: node.position.y,
      }));

      // Get current viewport
      const viewport = reactFlowInstance.getViewport();

      savePositionsMutation.mutate({
        positions,
        viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
      });
    }, 500); // Debounce 500ms
  }, [reactFlowInstance, savePositionsMutation]);

  // Load positions from database cache
  const loadNodePositions = useCallback((): Record<string, { x: number; y: number }> | null => {
    if (!savedPositionsData?.positions || savedPositionsData.positions.length === 0) {
      return null;
    }
    
    const positions: Record<string, { x: number; y: number }> = {};
    savedPositionsData.positions.forEach(pos => {
      positions[pos.nodeId] = { x: pos.positionX, y: pos.positionY };
    });
    return positions;
  }, [savedPositionsData]);

  // Clear positions (reset layout mutation)
  const clearPositionsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/strategy/mindmap-positions', {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategy/mindmap-positions'] });
    },
  });

  const clearNodePositions = useCallback(() => {
    clearPositionsMutation.mutate();
  }, [clearPositionsMutation]);

  // Custom onNodesChange handler to save positions when dragged
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    
    // Check if any change is a position change (drag)
    const hasPositionChange = changes.some((change: any) => change.type === 'position' && change.dragging === false);
    
    if (hasPositionChange) {
      // Save positions after a short delay to batch multiple changes
      setTimeout(() => {
        setNodes((currentNodes) => {
          saveNodePositions(currentNodes);
          return currentNodes;
        });
      }, 100);
    }
  }, [onNodesChange, saveNodePositions, setNodes]);

  // Update nodes AND edges when layout changes OR when layout mode switches OR when grouping changes
  useEffect(() => {
    const layoutModeChanged = prevLayoutModeRef.current !== layoutMode;
    prevLayoutModeRef.current = layoutMode;
    
    // Apply new layout when:
    // 1. Layout mode changes (tree <-> radial)
    // 2. Nodes are initially empty
    // 3. Node count changed (team grouping toggled, creating/removing team nodes)
    const nodeCountChanged = layoutedNodes.length !== nodes.length;
    
    if (layoutModeChanged || nodes.length === 0 || nodeCountChanged) {
      // Try to load saved positions for this layout mode
      const savedPositions = loadNodePositions();
      
      if (savedPositions) {
        // Merge saved positions with layout positions
        const nodesToSet = layoutedNodes.map(node => {
          const savedPos = savedPositions[node.id];
          if (savedPos) {
            return { ...node, position: savedPos };
          }
          return node;
        });
        setNodes(nodesToSet);
      } else {
        setNodes(layoutedNodes);
      }
    }
    
    // Always update edges to reflect current node positions
    const currentNodes = (layoutModeChanged || nodes.length === 0 || nodeCountChanged) ? layoutedNodes : nodes;
    const edgesWithHandles = initialEdges.map((edge) => {
      const sourceNode = currentNodes.find(n => n.id === edge.source);
      const targetNode = currentNodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const { sourceHandle, targetHandle } = getConnectionHandles(
          sourceNode.position,
          targetNode.position
        );
        
        return {
          ...edge,
          sourceHandle,
          targetHandle,
        };
      }
      
      return edge;
    });
    
    setEdges(edgesWithHandles);
  }, [layoutedNodes, initialEdges, layoutMode, nodes, setNodes, setEdges, loadNodePositions, savedPositionsData]);

  const handleNodeClick = useCallback(
    (_event: any, node: Node) => {
      if (onNodeClick) {
        const nodeType = node.type || '';
        onNodeClick(node.id, nodeType, node.data);
      }
    },
    [onNodeClick]
  );

  // Call fitView only once on initial mount, before any positions are saved
  useEffect(() => {
    if (!fitViewCalledRef.current && nodes.length > 0) {
      fitViewCalledRef.current = true;
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.2,
          includeHiddenNodes: false,
        });
      }, 50);
    }
  }, [nodes.length, reactFlowInstance]);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'relative w-full h-full'} bg-background border border-border rounded-lg`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        elementsSelectable={true}
        nodesConnectable={false}
        nodesDraggable={true}
        minZoom={0.05}
        maxZoom={2}
        className="bg-background"
      >
        <Background />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.type) {
              case 'mission': return '#3b82f6';
              case 'team': return '#f59e0b';
              case 'objective': return '#a855f7';
              case 'keyResult': return '#22c55e';
              case 'task': return '#6b7280';
              default: return '#9ca3af';
            }
          }}
          className="bg-background dark:bg-card"
        />
        
        <Panel position="top-left" className="flex gap-2">
          <Select value={layoutMode} onValueChange={(value: LayoutMode) => setLayoutMode(value)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Layout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tree">Tree View</SelectItem>
              <SelectItem value="radial">Mindmap View</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 h-8 px-3 bg-background border border-border rounded-md shadow-sm">
            <Switch 
              id="group-by-team"
              checked={groupByTeam} 
              onCheckedChange={setGroupByTeam}
              className="data-[state=checked]:bg-orange-500"
            />
            <Label htmlFor="group-by-team" className="text-xs cursor-pointer flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Group by Team
            </Label>
          </div>

          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 px-2"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
        </Panel>

        <Panel position="bottom-right" className="bg-background/90 dark:bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border shadow-sm">
          <div className="text-[10px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3 text-blue-600" />
              <span>Mission</span>
            </div>
            {groupByTeam && (
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-orange-600" />
                <span>Team</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <span>Objective</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>Key Result</span>
            </div>
            <div className="flex items-center gap-2">
              <ListTodo className="h-3 w-3 text-gray-600" />
              <span>Task</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function MindMap(props: MindMapProps) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  );
}
