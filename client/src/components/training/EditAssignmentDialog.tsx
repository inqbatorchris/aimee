import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  fullName: string;
  email: string;
}

interface EditAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: {
    id: number;
    documentId: number;
    documentTitle: string;
    userId: number;
    userName: string;
    status: string;
    dueDate?: string;
    priority?: string;
  };
  onUpdate: (assignmentId: number, updates: {
    userId?: number;
    dueDate?: string | null;
    priority?: string;
  }) => void;
  isUpdating: boolean;
}

export function EditAssignmentDialog({
  isOpen,
  onClose,
  assignment,
  onUpdate,
  isUpdating
}: EditAssignmentDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(assignment.userId.toString());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    assignment.dueDate ? new Date(assignment.dueDate) : undefined
  );
  const [selectedPriority, setSelectedPriority] = useState<string>(assignment.priority || "medium");

  // Reset form when assignment changes
  useEffect(() => {
    setSelectedUserId(assignment.userId.toString());
    setSelectedDate(assignment.dueDate ? new Date(assignment.dueDate) : undefined);
    setSelectedPriority(assignment.priority || "medium");
  }, [assignment]);

  // Fetch users for reassignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/core/users"],
    enabled: isOpen
  });

  const handleSubmit = () => {
    const updates: any = {};
    
    if (parseInt(selectedUserId) !== assignment.userId) {
      updates.userId = parseInt(selectedUserId);
    }
    
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString();
      if (formattedDate !== assignment.dueDate) {
        updates.dueDate = formattedDate;
      }
    } else if (assignment.dueDate) {
      updates.dueDate = null; // Clear due date
    }
    
    if (selectedPriority !== (assignment.priority || "medium")) {
      updates.priority = selectedPriority;
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(assignment.id, updates);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>
            Update the assignment details for "{assignment.documentTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Assignee Selection */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assigned To</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="assignee" data-testid="select-assignee">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.fullName} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date Selection */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                  data-testid="button-due-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "No due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
                {selectedDate && (
                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDate(undefined)}
                      className="w-full"
                      data-testid="button-clear-date"
                    >
                      Clear due date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger id="priority" data-testid="select-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUpdating}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isUpdating}
            data-testid="button-save"
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
