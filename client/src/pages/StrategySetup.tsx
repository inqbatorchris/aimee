import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Target, 
  ChevronRight, 
  ChevronLeft,
  Calendar,
  Shield,
  Eye,
  Lightbulb,
  CheckCircle,
  Plus,
  X,
  AlertCircle
} from "lucide-react";

export default function StrategySetup() {
  const [currentStep, setCurrentStep] = useState(0);
  const [strategyData, setStrategyData] = useState({
    // Basic Info
    name: "",
    timeframe: "annual",
    startDate: "",
    endDate: "",
    
    // Diagnosis
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
    rootCauses: "",
    
    // Vision
    visionStatement: "",
    horizonYears: 3,
    
    // Boundaries
    boundaries: [],
    
    // Cadence
    reviewCycle: "monthly",
    dayOfWeek: "monday",
    time: "14:00"
  });

  const [inputValues, setInputValues] = useState({
    strength: "",
    weakness: "",
    opportunity: "",
    threat: "",
    boundary: ""
  });

  const steps = [
    { title: "Basic Information", icon: Target, description: "Define strategy name and timeframe" },
    { title: "Diagnosis", icon: AlertCircle, description: "Analyze current situation (SWOT)" },
    { title: "Vision", icon: Eye, description: "Set your strategic vision" },
    { title: "Boundaries", icon: Shield, description: "Define what you won't do" },
    { title: "Review Cadence", icon: Calendar, description: "Set review schedule" }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    console.log("Strategy created:", strategyData);
    // Handle strategy creation
  };

  const addItem = (type: string, value: string) => {
    if (value.trim()) {
      setStrategyData({
        ...strategyData,
        [type]: [...strategyData[type], value.trim()]
      });
      setInputValues({ ...inputValues, [type.slice(0, -1)]: "" });
    }
  };

  const removeItem = (type: string, index: number) => {
    setStrategyData({
      ...strategyData,
      [type]: strategyData[type].filter((_, i) => i !== index)
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Strategy Name</Label>
              <Input
                id="name"
                placeholder="e.g., Growth Strategy 2025"
                value={strategyData.name}
                onChange={(e) => setStrategyData({ ...strategyData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Timeframe</Label>
              <RadioGroup
                value={strategyData.timeframe}
                onValueChange={(value) => setStrategyData({ ...strategyData, timeframe: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quarterly" id="quarterly" />
                  <Label htmlFor="quarterly">Quarterly (3 months)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="biannual" id="biannual" />
                  <Label htmlFor="biannual">Bi-annual (6 months)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="annual" id="annual" />
                  <Label htmlFor="annual">Annual (12 months)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multi-year" id="multi-year" />
                  <Label htmlFor="multi-year">Multi-year (2-5 years)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={strategyData.startDate}
                  onChange={(e) => setStrategyData({ ...strategyData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={strategyData.endDate}
                  onChange={(e) => setStrategyData({ ...strategyData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 1: // Diagnosis (SWOT)
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="text-green-600">Strengths</span>
                  <Badge variant="outline">{strategyData.strengths.length}</Badge>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a strength..."
                    value={inputValues.strength}
                    onChange={(e) => setInputValues({ ...inputValues, strength: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && addItem('strengths', inputValues.strength)}
                  />
                  <Button 
                    size="sm"
                    onClick={() => addItem('strengths', inputValues.strength)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {strategyData.strengths.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">{item}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem('strengths', index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="text-red-600">Weaknesses</span>
                  <Badge variant="outline">{strategyData.weaknesses.length}</Badge>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a weakness..."
                    value={inputValues.weakness}
                    onChange={(e) => setInputValues({ ...inputValues, weakness: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && addItem('weaknesses', inputValues.weakness)}
                  />
                  <Button 
                    size="sm"
                    onClick={() => addItem('weaknesses', inputValues.weakness)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {strategyData.weaknesses.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span className="text-sm">{item}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem('weaknesses', index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opportunities */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="text-blue-600">Opportunities</span>
                  <Badge variant="outline">{strategyData.opportunities.length}</Badge>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an opportunity..."
                    value={inputValues.opportunity}
                    onChange={(e) => setInputValues({ ...inputValues, opportunity: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && addItem('opportunities', inputValues.opportunity)}
                  />
                  <Button 
                    size="sm"
                    onClick={() => addItem('opportunities', inputValues.opportunity)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {strategyData.opportunities.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm">{item}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem('opportunities', index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Threats */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="text-yellow-600">Threats</span>
                  <Badge variant="outline">{strategyData.threats.length}</Badge>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a threat..."
                    value={inputValues.threat}
                    onChange={(e) => setInputValues({ ...inputValues, threat: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && addItem('threats', inputValues.threat)}
                  />
                  <Button 
                    size="sm"
                    onClick={() => addItem('threats', inputValues.threat)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {strategyData.threats.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span className="text-sm">{item}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem('threats', index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Root Causes Analysis</Label>
              <Textarea
                placeholder="What are the underlying causes of current challenges?"
                rows={3}
                value={strategyData.rootCauses}
                onChange={(e) => setStrategyData({ ...strategyData, rootCauses: e.target.value })}
              />
            </div>
          </div>
        );

      case 2: // Vision
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Vision Statement</Label>
              <Textarea
                placeholder="Where do you want to be? What does success look like?"
                rows={4}
                value={strategyData.visionStatement}
                onChange={(e) => setStrategyData({ ...strategyData, visionStatement: e.target.value })}
              />
              <p className="text-sm text-gray-600">
                A clear, inspiring statement of your desired future state
              </p>
            </div>

            <div className="space-y-2">
              <Label>Planning Horizon</Label>
              <RadioGroup
                value={strategyData.horizonYears.toString()}
                onValueChange={(value) => setStrategyData({ ...strategyData, horizonYears: parseInt(value) })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="1year" />
                  <Label htmlFor="1year">1 Year</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="3years" />
                  <Label htmlFor="3years">3 Years</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="5" id="5years" />
                  <Label htmlFor="5years">5 Years</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="10" id="10years" />
                  <Label htmlFor="10years">10 Years</Label>
                </div>
              </RadioGroup>
            </div>

            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Your vision should be ambitious yet achievable, 
                specific enough to guide decisions, and inspiring to your team.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 3: // Boundaries
        return (
          <div className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Strategic boundaries define what you explicitly choose <strong>not</strong> to do. 
                This helps maintain focus and prevent strategic drift.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                What We Won't Do
                <Badge variant="outline">{strategyData.boundaries.length}</Badge>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., We won't compete on price alone"
                  value={inputValues.boundary}
                  onChange={(e) => setInputValues({ ...inputValues, boundary: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && addItem('boundaries', inputValues.boundary)}
                />
                <Button 
                  size="sm"
                  onClick={() => addItem('boundaries', inputValues.boundary)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {strategyData.boundaries.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">{item}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem('boundaries', index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {strategyData.boundaries.length === 0 && (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <Shield className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No boundaries defined yet</p>
                <p className="text-xs mt-1">Add strategic boundaries to maintain focus</p>
              </div>
            )}
          </div>
        );

      case 4: // Review Cadence
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Review Cycle</Label>
              <RadioGroup
                value={strategyData.reviewCycle}
                onValueChange={(value) => setStrategyData({ ...strategyData, reviewCycle: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly">Weekly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="biweekly" id="biweekly" />
                  <Label htmlFor="biweekly">Bi-weekly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly">Monthly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quarterly" id="quarterly-review" />
                  <Label htmlFor="quarterly-review">Quarterly</Label>
                </div>
              </RadioGroup>
            </div>

            {(strategyData.reviewCycle === 'weekly' || strategyData.reviewCycle === 'biweekly') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={strategyData.dayOfWeek}
                    onChange={(e) => setStrategyData({ ...strategyData, dayOfWeek: e.target.value })}
                  >
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={strategyData.time}
                    onChange={(e) => setStrategyData({ ...strategyData, time: e.target.value })}
                  />
                </div>
              </div>
            )}

            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Regular reviews ensure your strategy stays on track. We'll send reminders 
                and prepare check-in templates based on your chosen cadence.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Strategy</h1>
        <p className="text-gray-600 mt-1">Define your strategic direction step by step</p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-between items-center">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className={`flex items-center ${index <= currentStep ? 'text-primary' : 'text-gray-400'}`}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 
                ${index < currentStep ? 'bg-primary border-primary text-white' : 
                  index === currentStep ? 'border-primary' : 'border-gray-300'}`}>
                {index < currentStep ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <div className="ml-3 hidden md:block">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-gray-600">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 md:w-24 h-0.5 mx-2 
                ${index < currentStep ? 'bg-primary' : 'bg-gray-300'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep === steps.length - 1 ? (
          <Button onClick={handleFinish}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Create Strategy
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}