import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Briefcase, 
  Plus,
  Calendar,
  DollarSign,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  ChevronRight
} from "lucide-react";

export default function StrategyInitiatives() {
  const [viewMode, setViewMode] = useState("kanban");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newInitiative, setNewInitiative] = useState({
    name: "",
    description: "",
    objectiveId: "",
    owner: "",
    budget: "",
    startDate: "",
    endDate: "",
    status: "planned"
  });

  // Mock data for initiatives
  const initiatives = {
    planned: [
      {
        id: 1,
        name: "Mobile App Development",
        description: "Build native iOS and Android apps",
        objective: "Increase Digital Revenue",
        owner: "Sarah Chen",
        budget: 250000,
        progress: 0,
        startDate: "2025-02-01",
        endDate: "2025-06-30",
        riskLevel: "medium"
      },
      {
        id: 2,
        name: "AI Customer Service Bot",
        description: "Implement AI-powered support chatbot",
        objective: "Improve Customer Satisfaction",
        owner: "Mike Johnson",
        budget: 150000,
        progress: 0,
        startDate: "2025-03-01",
        endDate: "2025-05-31",
        riskLevel: "low"
      }
    ],
    active: [
      {
        id: 3,
        name: "Website Redesign",
        description: "Complete overhaul of customer portal",
        objective: "Increase Digital Revenue",
        owner: "Emily Davis",
        budget: 100000,
        progress: 65,
        startDate: "2024-11-01",
        endDate: "2025-02-28",
        riskLevel: "low"
      },
      {
        id: 4,
        name: "International Expansion",
        description: "Launch operations in 3 new countries",
        objective: "Expand Market Presence",
        owner: "David Kim",
        budget: 500000,
        progress: 30,
        startDate: "2024-12-01",
        endDate: "2025-08-31",
        riskLevel: "high"
      }
    ],
    blocked: [
      {
        id: 5,
        name: "CRM Integration",
        description: "Integrate with Salesforce CRM",
        objective: "Build Operational Excellence",
        owner: "Sarah Chen",
        budget: 75000,
        progress: 45,
        startDate: "2024-10-01",
        endDate: "2025-01-31",
        riskLevel: "high",
        blockedReason: "Awaiting vendor API access"
      }
    ],
    done: [
      {
        id: 6,
        name: "Security Audit",
        description: "Complete security assessment and fixes",
        objective: "Build Operational Excellence",
        owner: "Mike Johnson",
        budget: 50000,
        progress: 100,
        startDate: "2024-09-01",
        endDate: "2024-12-31",
        riskLevel: "low"
      }
    ]
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned": return "bg-gray-100 text-gray-800";
      case "active": return "bg-blue-100 text-blue-800";
      case "blocked": return "bg-red-100 text-red-800";
      case "done": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const renderInitiativeCard = (initiative: any) => (
    <Card key={initiative.id} className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{initiative.name}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {initiative.objective}
            </CardDescription>
          </div>
          <Badge className={getRiskColor(initiative.riskLevel)} variant="outline">
            {initiative.riskLevel} risk
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600">{initiative.description}</p>
        
        {initiative.blockedReason && (
          <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-xs text-red-800">
            <AlertCircle className="h-3 w-3" />
            {initiative.blockedReason}
          </div>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{initiative.progress}%</span>
          </div>
          <Progress value={initiative.progress} className="h-1.5" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-gray-600">
            <User className="h-3 w-3" />
            {initiative.owner}
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <DollarSign className="h-3 w-3" />
            {formatBudget(initiative.budget)}
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Calendar className="h-3 w-3" />
            {new Date(initiative.startDate).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Clock className="h-3 w-3" />
            {new Date(initiative.endDate).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Strategic Initiatives</h1>
          <p className="text-gray-600 mt-1">Track progress on major initiatives</p>
        </div>
        <div className="flex gap-3">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kanban">Kanban View</SelectItem>
              <SelectItem value="list">List View</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Initiative
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Initiative</DialogTitle>
                <DialogDescription>
                  Define a new strategic initiative to drive objectives forward
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Initiative Name</Label>
                  <Input
                    placeholder="e.g., Mobile App Development"
                    value={newInitiative.name}
                    onChange={(e) => setNewInitiative({ ...newInitiative, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the initiative and its goals"
                    rows={3}
                    value={newInitiative.description}
                    onChange={(e) => setNewInitiative({ ...newInitiative, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Linked Objective</Label>
                    <Select value={newInitiative.objectiveId} onValueChange={(value) => setNewInitiative({ ...newInitiative, objectiveId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select objective" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Increase Digital Revenue</SelectItem>
                        <SelectItem value="2">Improve Customer Satisfaction</SelectItem>
                        <SelectItem value="3">Expand Market Presence</SelectItem>
                        <SelectItem value="4">Build Operational Excellence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Input
                      placeholder="Initiative owner"
                      value={newInitiative.owner}
                      onChange={(e) => setNewInitiative({ ...newInitiative, owner: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Budget</Label>
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newInitiative.budget}
                      onChange={(e) => setNewInitiative({ ...newInitiative, budget: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={newInitiative.startDate}
                      onChange={(e) => setNewInitiative({ ...newInitiative, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={newInitiative.endDate}
                      onChange={(e) => setNewInitiative({ ...newInitiative, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    console.log("Creating initiative:", newInitiative);
                    setShowAddDialog(false);
                  }}>
                    Create Initiative
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Initiatives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(initiatives).flat().length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {initiatives.active.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {initiatives.blocked.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatBudget(Object.values(initiatives).flat().reduce((sum, i) => sum + i.budget, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">At Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {Object.values(initiatives).flat().filter(i => i.riskLevel === 'high').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(initiatives).map(([status, items]) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium capitalize flex items-center gap-2">
                  {status === "planned" && <Clock className="h-4 w-4" />}
                  {status === "active" && <TrendingUp className="h-4 w-4" />}
                  {status === "blocked" && <AlertCircle className="h-4 w-4" />}
                  {status === "done" && <CheckCircle className="h-4 w-4" />}
                  {status}
                </h3>
                <Badge variant="outline">{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.map(renderInitiativeCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">Initiative</th>
                  <th className="text-left p-4 text-sm font-medium">Objective</th>
                  <th className="text-left p-4 text-sm font-medium">Owner</th>
                  <th className="text-left p-4 text-sm font-medium">Budget</th>
                  <th className="text-left p-4 text-sm font-medium">Progress</th>
                  <th className="text-left p-4 text-sm font-medium">Status</th>
                  <th className="text-left p-4 text-sm font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(initiatives).map(([status, items]) =>
                  items.map((initiative) => (
                    <tr key={initiative.id} className="border-b hover:bg-gray-50 cursor-pointer">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-sm">{initiative.name}</p>
                          <p className="text-xs text-gray-600">{initiative.description}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{initiative.objective}</td>
                      <td className="p-4 text-sm">{initiative.owner}</td>
                      <td className="p-4 text-sm">{formatBudget(initiative.budget)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Progress value={initiative.progress} className="w-16 h-2" />
                          <span className="text-sm">{initiative.progress}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(status)}>
                          {status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={getRiskColor(initiative.riskLevel)} variant="outline">
                          {initiative.riskLevel}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}