import { useState } from 'react';
import { TaskDetailPanel } from '@/components/task-detail/TaskDetailPanel';

export function AddToBacklogButton() {
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);

  return (
    <>
      <TaskDetailPanel
        taskId={null}
        open={taskPanelOpen}
        onClose={() => setTaskPanelOpen(false)}
        isCreating={true}
        defaultLifecycleStage="backlog"
      />
    </>
  );
}