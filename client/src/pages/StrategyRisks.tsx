import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  AlertTriangle, 
  Shield, 
  Plus,
  Edit,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";

export default function StrategyRisks() {
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRisk, setNewRisk] = useState({
    title: "",
    description: "",
    likelihood: "medium",
    impact: "medium",
    mitigation: "",
    owner: ""
  });

  // Mock data for risks
  const risks = [
    {
      id: 1,
      title: "Competitor launches similar product",
      description: "Main competitor may launch a competing product in Q2",
      likelihood: "high",
      impact: "high",
      status: "active",
      owner: "Sarah Chen",
      mitigation: "Accelerate feature development, strengthen customer relationships",
      createdAt: "2025-01-10",
      trend: "increasing"
    },
    {
      id: 2,
      title: "Key talent retention",
      description: "Risk of losing critical engineering talent",
      likelihood: "medium",
      impact: "high",
      status: "mitigating",
      owner: "Mike Johnson",
      mitigation: "Implement retention bonuses, improve career development paths",
      createdAt: "2025-01-08",
      trend: "stable"
    },
    {
      id: 3,
      title: "Supply chain disruption",
      description: "Potential delays in hardware component delivery",
      likelihood: "low",
      impact: "medium",
      status: "monitoring",
      owner: "Emily Davis",
      mitigation: "Identify alternative suppliers, increase buffer stock",
      createdAt: "2025-01-05",
      trend: "decreasing"
    },
    {
      id: 4,
      title: "Regulatory compliance changes",
      description: "New data privacy regulations may require system changes",
      likelihood: "medium",
      impact: "medium",
      status: "active",
      owner: "David Kim",
      mitigation: "Regular compliance audits, legal consultation",
      createdAt: "2025-01-03",
      trend: "stable"
    }
  ];

  const getRiskScore = (likelihood: string, impact: string) => {
    const scores = { low: 1, medium: 2, high: 3 };
    return scores[likelihood] * scores[impact];
  };

  const getRiskColor = (likelihood: string, impact: string) => {
    const score = getRiskScore(likelihood, impact);
    if (score >= 6) return "bg-red-100 border-red-300 text-red-800";
    if (score >= 3) return "bg-yellow-100 border-yellow-300 text-yellow-800";
    return "bg-green-100 border-green-300 text-green-800";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-red-100 text-red-800";
      case "mitigating": return "bg-yellow-100 text-yellow-800";
      case "monitoring": return "bg-blue-100 text-blue-800";
      case "resolved": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing": return <TrendingUp className="h-4 w-4 text-red-600" />;
      case "decreasing": return <TrendingDown className="h-4 w-4 text-green-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Risk Management</h1>
          <p className="text-gray-600 mt-1">Identify and mitigate strategic risks</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Risk
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Risk</DialogTitle>
              <DialogDescription>
                Identify a new risk and define mitigation strategies
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Risk Title</Label>
                <Input
                  placeholder="Brief description of the risk"
                  value={newRisk.title}
                  onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Detailed description and potential impact"
                  rows={3}
                  value={newRisk.description}
                  onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Likelihood</Label>
                  <Select value={newRisk.likelihood} onValueChange={(value) => setNewRisk({ ...newRisk, likelihood: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Impact</Label>
                  <Select value={newRisk.impact} onValueChange={(value) => setNewRisk({ ...newRisk, impact: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mitigation Strategy</Label>
                <Textarea
                  placeholder="How will you mitigate this risk?"
                  rows={3}
                  value={newRisk.mitigation}
                  onChange={(e) => setNewRisk({ ...newRisk, mitigation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input
                  placeholder="Who is responsible for this risk?"
                  value={newRisk.owner}
                  onChange={(e) => setNewRisk({ ...newRisk, owner: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  console.log("Adding risk:", newRisk);
                  setShowAddDialog(false);
                }}>
                  Add Risk
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Risk Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Matrix</CardTitle>
          <CardDescription>Visual representation of risk likelihood vs impact</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center text-sm font-medium">Impact →</div>
            <div className="text-center text-sm text-gray-600">Low</div>
            <div className="text-center text-sm text-gray-600">Medium</div>
            <div className="text-center text-sm text-gray-600">High</div>
            
            <div className="text-sm font-medium">High ↑</div>
            <div className="aspect-square border-2 border-yellow-300 bg-yellow-50 rounded-lg p-2">
              <div className="text-xs text-gray-600">Medium Risk</div>
            </div>
            <div className="aspect-square border-2 border-red-300 bg-red-50 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-xs text-gray-600">High Risk</div>
              <div className="text-xs font-medium mt-1">2 risks</div>
            </div>
            <div className="aspect-square border-2 border-red-400 bg-red-100 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-xs text-gray-600">Critical</div>
              <div className="text-xs font-medium mt-1">1 risk</div>
            </div>
            
            <div className="text-sm font-medium">Medium</div>
            <div className="aspect-square border-2 border-green-300 bg-green-50 rounded-lg p-2">
              <div className="text-xs text-gray-600">Low Risk</div>
            </div>
            <div className="aspect-square border-2 border-yellow-300 bg-yellow-50 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-xs text-gray-600">Medium Risk</div>
              <div className="text-xs font-medium mt-1">1 risk</div>
            </div>
            <div className="aspect-square border-2 border-red-300 bg-red-50 rounded-lg p-2">
              <div className="text-xs text-gray-600">High Risk</div>
            </div>
            
            <div className="text-sm font-medium">Low</div>
            <div className="aspect-square border-2 border-green-300 bg-green-50 rounded-lg p-2">
              <div className="text-xs text-gray-600">Low Risk</div>
            </div>
            <div className="aspect-square border-2 border-green-300 bg-green-50 rounded-lg p-2 flex flex-col items-center justify-center">
              <div className="text-xs text-gray-600">Low Risk</div>
              <div className="text-xs font-medium mt-1">1 risk</div>
            </div>
            <div className="aspect-square border-2 border-yellow-300 bg-yellow-50 rounded-lg p-2">
              <div className="text-xs text-gray-600">Medium Risk</div>
            </div>
            
            <div className="text-sm text-gray-600">Likelihood →</div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </CardContent>
      </Card>

      {/* Risk List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Risks</CardTitle>
            <CardDescription>Risks requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {risks.map((risk) => (
                <div
                  key={risk.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${getRiskColor(risk.likelihood, risk.impact)}`}
                  onClick={() => setSelectedRisk(risk)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        <h3 className="font-medium">{risk.title}</h3>
                        {getTrendIcon(risk.trend)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className={getStatusColor(risk.status)}>
                          {risk.status}
                        </Badge>
                        <span className="text-gray-600">
                          {risk.likelihood} likelihood • {risk.impact} impact
                        </span>
                        <span className="text-gray-600">• {risk.owner}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Details */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Details</CardTitle>
            <CardDescription>
              {selectedRisk ? "View and update risk information" : "Select a risk to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedRisk ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-600">Title</Label>
                  <p className="font-medium">{selectedRisk.title}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Description</Label>
                  <p className="text-sm">{selectedRisk.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Likelihood</Label>
                    <Badge variant="outline" className="mt-1">
                      {selectedRisk.likelihood}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Impact</Label>
                    <Badge variant="outline" className="mt-1">
                      {selectedRisk.impact}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Mitigation Strategy</Label>
                  <p className="text-sm mt-1">{selectedRisk.mitigation}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Owner</Label>
                    <p className="text-sm">{selectedRisk.owner}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Status</Label>
                    <Badge className={`mt-1 ${getStatusColor(selectedRisk.status)}`}>
                      {selectedRisk.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Created</Label>
                  <p className="text-sm">{selectedRisk.createdAt}</p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button size="sm" className="flex items-center gap-2">
                    <Edit className="h-3 w-3" />
                    Edit Risk
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Update Mitigation
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>Select a risk to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}