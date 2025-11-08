import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Target, 
  Link,
  Plus,
  User,
  Building2,
  ChevronRight,
  AlertCircle,
  CheckCircle
} from "lucide-react";

export default function StrategyAlignment() {
  const [selectedView, setSelectedView] = useState("teams");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAlignment, setNewAlignment] = useState({
    entityType: "team",
    entityId: "",
    objectiveId: "",
    weight: 50
  });

  // Mock data for teams and objectives
  const teams = [
    {
      id: 1,
      name: "Engineering",
      memberCount: 12,
      lead: "Sarah Chen",
      alignments: [
        { objectiveId: 1, objectiveName: "Increase Digital Revenue", weight: 60 },
        { objectiveId: 3, objectiveName: "Expand Market Presence", weight: 40 }
      ],
      coverage: 85
    },
    {
      id: 2,
      name: "Sales",
      memberCount: 8,
      lead: "Mike Johnson",
      alignments: [
        { objectiveId: 1, objectiveName: "Increase Digital Revenue", weight: 80 },
        { objectiveId: 2, objectiveName: "Improve Customer Satisfaction", weight: 20 }
      ],
      coverage: 95
    },
    {
      id: 3,
      name: "Customer Success",
      memberCount: 6,
      lead: "Emily Davis",
      alignments: [
        { objectiveId: 2, objectiveName: "Improve Customer Satisfaction", weight: 90 },
        { objectiveId: 4, objectiveName: "Build Operational Excellence", weight: 10 }
      ],
      coverage: 100
    },
    {
      id: 4,
      name: "Operations",
      memberCount: 5,
      lead: "David Kim",
      alignments: [
        { objectiveId: 4, objectiveName: "Build Operational Excellence", weight: 100 }
      ],
      coverage: 75
    }
  ];

  const individuals = [
    {
      id: 1,
      name: "Alice Johnson",
      role: "Senior Engineer",
      team: "Engineering",
      alignments: [
        { objectiveId: 1, objectiveName: "Increase Digital Revenue", weight: 70 },
        { objectiveId: 3, objectiveName: "Expand Market Presence", weight: 30 }
      ]
    },
    {
      id: 2,
      name: "Bob Smith",
      role: "Sales Manager",
      team: "Sales",
      alignments: [
        { objectiveId: 1, objectiveName: "Increase Digital Revenue", weight: 100 }
      ]
    },
    {
      id: 3,
      name: "Carol White",
      role: "CS Lead",
      team: "Customer Success",
      alignments: [
        { objectiveId: 2, objectiveName: "Improve Customer Satisfaction", weight: 90 },
        { objectiveId: 1, objectiveName: "Increase Digital Revenue", weight: 10 }
      ]
    }
  ];

  const objectives = [
    { id: 1, name: "Increase Digital Revenue", totalAlignment: 240, targetAlignment: 200, status: "over-aligned" },
    { id: 2, name: "Improve Customer Satisfaction", totalAlignment: 110, targetAlignment: 150, status: "under-aligned" },
    { id: 3, name: "Expand Market Presence", totalAlignment: 70, targetAlignment: 100, status: "under-aligned" },
    { id: 4, name: "Build Operational Excellence", totalAlignment: 110, targetAlignment: 100, status: "aligned" }
  ];

  const getAlignmentColor = (status: string) => {
    switch (status) {
      case "over-aligned": return "text-blue-600 bg-blue-50";
      case "under-aligned": return "text-red-600 bg-red-50";
      case "aligned": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 90) return "text-green-600";
    if (coverage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alignment Map</h1>
          <p className="text-gray-600 mt-1">See how teams and individuals align to strategic objectives</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedView} onValueChange={setSelectedView}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="teams">Teams View</SelectItem>
              <SelectItem value="individuals">Individuals View</SelectItem>
              <SelectItem value="objectives">Objectives View</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Alignment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Alignment</DialogTitle>
                <DialogDescription>
                  Connect a team or individual to a strategic objective
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select value={newAlignment.entityType} onValueChange={(value) => setNewAlignment({ ...newAlignment, entityType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{newAlignment.entityType === "team" ? "Select Team" : "Select Individual"}</Label>
                  <Select value={newAlignment.entityId} onValueChange={(value) => setNewAlignment({ ...newAlignment, entityId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {newAlignment.entityType === "team" 
                        ? teams.map(team => (
                            <SelectItem key={team.id} value={team.id.toString()}>{team.name}</SelectItem>
                          ))
                        : individuals.map(person => (
                            <SelectItem key={person.id} value={person.id.toString()}>{person.name}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Objective</Label>
                  <Select value={newAlignment.objectiveId} onValueChange={(value) => setNewAlignment({ ...newAlignment, objectiveId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose objective..." />
                    </SelectTrigger>
                    <SelectContent>
                      {objectives.map(obj => (
                        <SelectItem key={obj.id} value={obj.id.toString()}>{obj.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Weight / Contribution</Label>
                    <span className="text-sm font-medium">{newAlignment.weight}%</span>
                  </div>
                  <Slider
                    value={[newAlignment.weight]}
                    onValueChange={(value) => setNewAlignment({ ...newAlignment, weight: value[0] })}
                    max={100}
                    step={10}
                  />
                  <p className="text-xs text-gray-600">
                    How much of their effort is dedicated to this objective
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    console.log("Adding alignment:", newAlignment);
                    setShowAddDialog(false);
                  }}>
                    Add Alignment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alignment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
            <p className="text-xs text-gray-600 mt-1">Aligned to objectives</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Average Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89%</div>
            <Progress value={89} className="h-1 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Under-Aligned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">2</div>
            <p className="text-xs text-gray-600 mt-1">Objectives need attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Over-Aligned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">1</div>
            <p className="text-xs text-gray-600 mt-1">Consider rebalancing</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {selectedView === "teams" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription>
                        {team.memberCount} members • Led by {team.lead}
                      </CardDescription>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${getCoverageColor(team.coverage)}`}>
                    {team.coverage}% covered
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.alignments.map((alignment, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">{alignment.objectiveName}</span>
                        </div>
                        <span className="text-sm text-gray-600">{alignment.weight}%</span>
                      </div>
                      <Progress value={alignment.weight} className="h-2" />
                    </div>
                  ))}
                  {team.alignments.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No alignments defined</p>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <Link className="h-3 w-3 mr-2" />
                  Manage Alignments
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedView === "individuals" && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Alignments</CardTitle>
            <CardDescription>How team members contribute to objectives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {individuals.map((person) => (
                <div key={person.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {person.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-gray-600">{person.role} • {person.team}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {person.alignments.map((alignment, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{alignment.objectiveName}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={alignment.weight} className="w-20 h-2" />
                          <span className="text-xs font-medium w-10 text-right">{alignment.weight}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedView === "objectives" && (
        <div className="grid grid-cols-1 gap-6">
          {objectives.map((objective) => (
            <Card key={objective.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{objective.name}</CardTitle>
                    <CardDescription>
                      Alignment: {objective.totalAlignment}% / Target: {objective.targetAlignment}%
                    </CardDescription>
                  </div>
                  <Badge className={getAlignmentColor(objective.status)}>
                    {objective.status.replace("-", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Alignment Coverage</span>
                      <span className="font-medium">
                        {Math.round((objective.totalAlignment / objective.targetAlignment) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, (objective.totalAlignment / objective.targetAlignment) * 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  {/* Teams contributing to this objective */}
                  <div>
                    <p className="text-sm font-medium mb-2">Contributing Teams</p>
                    <div className="flex flex-wrap gap-2">
                      {teams
                        .filter(team => team.alignments.some(a => a.objectiveId === objective.id))
                        .map(team => {
                          const alignment = team.alignments.find(a => a.objectiveId === objective.id);
                          return (
                            <Badge key={team.id} variant="outline">
                              {team.name} ({alignment?.weight}%)
                            </Badge>
                          );
                        })}
                    </div>
                  </div>

                  {objective.status === "under-aligned" && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <p className="text-sm text-red-800">
                        This objective needs more team allocation to meet targets
                      </p>
                    </div>
                  )}
                  
                  {objective.status === "over-aligned" && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <p className="text-sm text-blue-800">
                        Consider reallocating some resources to under-aligned objectives
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}