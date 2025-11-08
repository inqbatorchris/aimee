import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

interface PageData {
  pageContext: string;
  pageData: Record<string, any>;
}

export function useAIPageData(): PageData {
  const [location] = useLocation();
  const [pageContext, setPageContext] = useState('Unknown');
  const [pageData, setPageData] = useState<Record<string, any>>({});

  const { data: objectivesData } = useQuery({
    queryKey: ['/api/strategy/objectives'],
    enabled: location === '/strategy/objectives',
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['/api/ai/context'],
    enabled: location === '/my-day',
  });

  const { data: workItemsData } = useQuery({
    queryKey: ['/api/work-items'],
    enabled: location === '/strategy/work-items',
  });

  useEffect(() => {
    // Clear pageData immediately when location changes to prevent stale data
    setPageData({});
    
    if (location === '/strategy/objectives') {
      setPageContext('Objectives Page');
      
      if (objectivesData) {
        const objectives = Array.isArray(objectivesData) ? objectivesData : [];
        setPageData({
          currentPage: 'objectives',
          totalObjectives: objectives.length,
          activeObjectives: objectives.filter((obj: any) => obj.status === 'Active').slice(0, 5),
          summary: `Viewing ${objectives.length} objectives`,
        });
      }
    } else if (location === '/my-day') {
      setPageContext('Dashboard (My Day)');
      
      if (dashboardData) {
        const data = dashboardData as any;
        setPageData({
          currentPage: 'dashboard',
          todayDate: new Date().toLocaleDateString(),
          activeObjectives: data.activeObjectives || [],
          upcomingTasks: data.upcomingTasks || [],
          overdueTasks: data.overdueTasks || [],
          alerts: data.alerts || [],
          summary: data.summary || {},
        });
      }
    } else if (location === '/strategy/work-items') {
      setPageContext('Work Items Page');
      
      if (workItemsData) {
        const items = Array.isArray(workItemsData) ? workItemsData : [];
        const stuck = items.filter((item: any) => item.status === 'Stuck');
        const inProgress = items.filter((item: any) => item.status === 'In Progress');
        
        setPageData({
          currentPage: 'work-items',
          totalWorkItems: items.length,
          stuckItems: stuck.slice(0, 5),
          inProgressItems: inProgress.slice(0, 5),
          summary: `${items.length} work items (${stuck.length} stuck, ${inProgress.length} in progress)`,
        });
      }
    } else if (location.startsWith('/strategy/objectives/')) {
      const objectiveId = location.split('/').pop();
      setPageContext(`Objective Detail (ID: ${objectiveId})`);
      setPageData({
        currentPage: 'objective-detail',
        objectiveId,
        summary: `Viewing objective ${objectiveId}`,
      });
    } else {
      setPageContext(getPageContextFromLocation(location));
      setPageData({
        currentPage: 'other',
        path: location,
      });
    }
  }, [location, objectivesData, dashboardData, workItemsData]);

  return { pageContext, pageData };
}

function getPageContextFromLocation(location: string): string {
  const pathMap: Record<string, string> = {
    '/': 'Home',
    '/my-day': 'Dashboard (My Day)',
    '/strategy/mission-vision': 'Mission & Vision',
    '/strategy/management': 'OKR Tracking',
    '/strategy/objectives': 'Objectives',
    '/strategy/work-items': 'Work Items',
    '/strategy/checkin': 'Check-in Dashboard',
    '/strategy/knowledge-base': 'Knowledge Base',
    '/ai-assistant/settings': 'AI Assistant Settings',
    '/core/user-management': 'User Management',
    '/core/account-settings': 'Settings',
    '/core/theme-editor': 'Theme Editor',
    '/integrations': 'Integrations Hub',
    '/agents': 'Agent Builder',
  };

  return pathMap[location] || `Page: ${location}`;
}
