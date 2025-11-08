import { useEffect, useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentationGenerator } from '@/services/DocumentationGenerator';
import { toast } from '@/hooks/use-toast';

interface UseDocumentationUpdaterOptions {
  autoUpdate?: boolean;
  updateInterval?: number; // in hours
  onUpdate?: () => void;
}

export function useDocumentationUpdater(options: UseDocumentationUpdaterOptions = {}) {
  const {
    autoUpdate = true,
    updateInterval = 1,
    onUpdate
  } = options;

  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  // Check if documentation needs update
  const checkForUpdates = useCallback(async () => {
    try {
      const needsUpdate = await documentationGenerator.checkForUpdates(lastUpdateTime);
      if (needsUpdate && autoUpdate) {
        await updateDocumentation();
      }
      return needsUpdate;
    } catch (error) {
      console.error('Error checking for documentation updates:', error);
      return false;
    }
  }, [lastUpdateTime, autoUpdate]);

  // Update documentation
  const updateDocumentation = useCallback(async () => {
    setIsUpdating(true);
    try {
      // Invalidate all related queries to get fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/dev/pages'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/features'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/dev/database/tables'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/menu/navigation'] }),
      ]);

      // Fetch all metadata
      const metadata = await documentationGenerator.fetchAllMetadata();
      
      // Update last update time
      setLastUpdateTime(new Date());

      // Call onUpdate callback if provided
      if (onUpdate) {
        onUpdate();
      }

      toast({
        title: 'Documentation Updated',
        description: 'All documentation has been refreshed with the latest data.',
      });

      return metadata;
    } catch (error) {
      console.error('Error updating documentation:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update documentation. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [queryClient, onUpdate]);

  // Manual update trigger
  const triggerUpdate = useCallback(async () => {
    return await updateDocumentation();
  }, [updateDocumentation]);

  // Set up automatic updates
  useEffect(() => {
    if (!autoUpdate) return;

    const intervalId = documentationGenerator.scheduleUpdates(
      () => checkForUpdates(),
      updateInterval
    );

    return () => clearInterval(intervalId);
  }, [autoUpdate, updateInterval, checkForUpdates]);

  // Listen for data changes that should trigger documentation updates
  useEffect(() => {
    const handleDataChange = (event: CustomEvent) => {
      const { type, data } = event.detail;
      
      // List of event types that should trigger documentation update
      const updateTriggers = [
        'page:created',
        'page:updated',
        'page:deleted',
        'feature:created',
        'feature:updated',
        'feature:deleted',
        'table:created',
        'table:updated',
        'table:deleted',
        'menu:created',
        'menu:updated',
        'menu:deleted',
      ];

      if (updateTriggers.includes(type)) {
        // Debounce updates to avoid too many refreshes
        setTimeout(() => {
          checkForUpdates();
        }, 5000); // Wait 5 seconds before checking
      }
    };

    // Listen for custom events
    window.addEventListener('documentation:dataChanged' as any, handleDataChange);

    return () => {
      window.removeEventListener('documentation:dataChanged' as any, handleDataChange);
    };
  }, [checkForUpdates]);

  return {
    lastUpdateTime,
    isUpdating,
    triggerUpdate,
    checkForUpdates,
  };
}

// Helper function to dispatch documentation update events
export function dispatchDocumentationEvent(type: string, data?: any) {
  const event = new CustomEvent('documentation:dataChanged', {
    detail: { type, data }
  });
  window.dispatchEvent(event);
}