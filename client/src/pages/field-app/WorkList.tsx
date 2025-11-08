/**
 * Work List - Shows downloaded work items from IndexedDB
 * 100% offline functionality
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { fieldDB } from '@/lib/field-app/db';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Circle,
  Download
} from 'lucide-react';

interface WorkListProps {
  stats: any;
}

export default function WorkList({ stats }: WorkListProps) {
  const [, setLocation] = useLocation();
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    loadWorkItems();
  }, []);

  const loadWorkItems = async () => {
    try {
      const items = await fieldDB.getWorkItems();
      setWorkItems(items);
    } catch (error) {
      console.error('Failed to load work items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'in progress':
        return <Circle className="h-5 w-5 text-amber-400" />;
      case 'stuck':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'ready':
        return <Circle className="h-5 w-5 text-blue-400" />;
      case 'planning':
        return <Circle className="h-5 w-5 text-zinc-400" />;
      default:
        return <Circle className="h-5 w-5 text-zinc-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'Planning': { label: 'Planning', className: 'bg-zinc-700 text-zinc-300' },
      'Ready': { label: 'Ready', className: 'bg-blue-600/20 text-blue-400 border border-blue-500/30' },
      'In Progress': { label: 'In Progress', className: 'bg-amber-600/20 text-amber-400 border border-amber-500/30' },
      'Stuck': { label: 'Stuck', className: 'bg-red-600/20 text-red-400 border border-red-500/30' },
      'Completed': { label: 'Completed', className: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' },
      'Archived': { label: 'Archived', className: 'bg-zinc-800 text-zinc-500' }
    };
    
    const config = statusMap[status] || statusMap['Planning'];
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 bg-red-400/10';
      case 'medium':
        return 'text-amber-400 bg-amber-400/10';
      default:
        return 'text-zinc-400 bg-zinc-400/10';
    }
  };

  const filteredItems = workItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'pending') return item.status === 'Planning' || item.status === 'Ready';
    if (filter === 'in_progress') return item.status === 'In Progress' || item.status === 'Stuck';
    if (filter === 'completed') return item.status === 'Completed' || item.status === 'Archived';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (workItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Download className="h-12 w-12 text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Work Items</h2>
        <p className="text-zinc-400 mb-4">Download work items to get started</p>
        <Button
          onClick={() => setLocation('/field-app/download')}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Download Work Items
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar */}
      <div className="bg-zinc-800/50 p-3 border-b border-zinc-700">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">My Work</h2>
          <span className="text-sm text-zinc-400">{workItems.length} items</span>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
          {['all', 'pending', 'in_progress', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                filter === f 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Work Items List */}
      <div className="flex-1 overflow-y-auto touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setLocation(`/field-app/work/${item.id}`)}
            className="w-full p-4 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getStatusIcon(item.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-medium text-white truncate">
                    {item.title}
                  </h3>
                  <ChevronRight className="h-5 w-5 text-zinc-500 flex-shrink-0" />
                </div>
                
                {item.description && (
                  <p className="text-sm text-zinc-400 line-clamp-2 mb-2">
                    {item.description}
                  </p>
                )}
                
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {item.status && getStatusBadge(item.status)}
                  
                  {item.priority && (
                    <span className={`px-2 py-0.5 rounded ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  )}
                  
                  {item.dueDate && (
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Clock className="h-3 w-3" />
                      {new Date(item.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  
                  {item.localEdits && (
                    <span className="text-amber-400">
                      Edited offline
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-8 text-center text-zinc-500">
          No {filter === 'all' ? '' : filter.replace('_', ' ')} work items
        </div>
      )}
    </div>
  );
}