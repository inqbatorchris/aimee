import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Target,
  Calendar,
  Save,
  Send,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function StrategyCheckin() {
  const [currentStep, setCurrentStep] = useState(0);
  const [checkInData, setCheckInData] = useState({
    updates: {},
    confidence: {},
    blockers: {},
    notes: {}
  });

  // Mock data for key results
  const keyResults = [
    {
      id: 1,
      objective: "Increase Digital Revenue",
      title: "Launch mobile app",
      currentValue: 75,
      targetValue: 100,
      unit: "%",
      lastValue: 65,
      lastUpdated: "Last week"
    },
    {
      id: 2,
      objective: "Increase Digital Revenue",
      title: "Achieve $5M in online sales",
      currentValue: 3.2,
      targetValue: 5,
      unit: "M",
      lastValue: 2.8,
      lastUpdated: "2 weeks ago"
    },
    {
      id: 3,
      objective: "Improve Customer Satisfaction",
      title: "Reach 95% satisfaction score",
      currentValue: 87,
      targetValue: 95,
      unit: "%",
      lastValue: 85,
      lastUpdated: "Last week"
    },
    {
      id: 4,
      objective: "Improve Customer Satisfaction",
      title: "Reduce response time to <2 hours",
      currentValue: 3.5,
      targetValue: 2,
      unit: "hrs",
      lastValue: 4.2,
      lastUpdated: "3 days ago"
    }
  ];

  const currentKR = keyResults[currentStep];

  const handleNext = () => {
    if (currentStep < keyResults.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = () => {
    // Save draft logic
    console.log("Saving draft...", checkInData);
  };

  const handleSubmit = () => {
    // Submit check-in logic
    console.log("Submitting check-in...", checkInData);
  };

  const getProgress = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  const getTrend = (current: number, last: number) => {
    if (current > last) return "up";
    if (current < last) return "down";
    return "stable";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <AlertCircle className="h-4 w-4 text-gray-600" />;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Weekly Check-in</h1>
        <p className="text-gray-600 mt-1">Update progress on your key results</p>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">
              Key Result {currentStep + 1} of {keyResults.length}
            </span>
            <span className="text-sm font-medium">
              {Math.round(((currentStep + 1) / keyResults.length) * 100)}% Complete
            </span>
          </div>
          <Progress value={((currentStep + 1) / keyResults.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Main Check-in Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="outline" className="mb-2">{currentKR.objective}</Badge>
              <CardTitle>{currentKR.title}</CardTitle>
              <CardDescription className="mt-2">
                Last updated {currentKR.lastUpdated} • Previous value: {currentKR.lastValue}{currentKR.unit}
              </CardDescription>
            </div>
            {getTrendIcon(getTrend(currentKR.currentValue, currentKR.lastValue))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">Current Progress</span>
              <span className="text-2xl font-bold text-primary">
                {currentKR.currentValue}{currentKR.unit} / {currentKR.targetValue}{currentKR.unit}
              </span>
            </div>
            <Progress value={getProgress(currentKR.currentValue, currentKR.targetValue)} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>0{currentKR.unit}</span>
              <span>{getProgress(currentKR.currentValue, currentKR.targetValue)}% Complete</span>
              <span>{currentKR.targetValue}{currentKR.unit}</span>
            </div>
          </div>

          {/* Update Value */}
          <div className="space-y-2">
            <Label>New Value</Label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={`Enter new value (current: ${currentKR.currentValue}${currentKR.unit})`}
                value={checkInData.updates[currentKR.id] || ''}
                onChange={(e) => setCheckInData({
                  ...checkInData,
                  updates: { ...checkInData.updates, [currentKR.id]: e.target.value }
                })}
              />
              <span className="text-sm text-gray-600 whitespace-nowrap">
                Target: {currentKR.targetValue}{currentKR.unit}
              </span>
            </div>
          </div>

          {/* Confidence Level */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Confidence Level</Label>
              <span className="text-sm font-medium">
                {checkInData.confidence[currentKR.id] || 75}%
              </span>
            </div>
            <Slider
              value={[checkInData.confidence[currentKR.id] || 75]}
              onValueChange={(value) => setCheckInData({
                ...checkInData,
                confidence: { ...checkInData.confidence, [currentKR.id]: value[0] }
              })}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>Not confident</span>
              <span>Very confident</span>
            </div>
          </div>

          {/* Update Notes */}
          <div className="space-y-2">
            <Label>Update Notes</Label>
            <Textarea
              placeholder="What progress was made? What's working well?"
              rows={3}
              value={checkInData.notes[currentKR.id] || ''}
              onChange={(e) => setCheckInData({
                ...checkInData,
                notes: { ...checkInData.notes, [currentKR.id]: e.target.value }
              })}
            />
          </div>

          {/* Blockers */}
          <div className="space-y-2">
            <Label>Blockers or Risks</Label>
            <Textarea
              placeholder="Any challenges or blockers? (Optional)"
              rows={2}
              value={checkInData.blockers[currentKR.id] || ''}
              onChange={(e) => setCheckInData({
                ...checkInData,
                blockers: { ...checkInData.blockers, [currentKR.id]: e.target.value }
              })}
            />
          </div>

          {/* AI Suggestion */}
          {checkInData.updates[currentKR.id] && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Insight:</strong> Based on your update, you're tracking 
                {getProgress(Number(checkInData.updates[currentKR.id]), currentKR.targetValue) > getProgress(currentKR.currentValue, currentKR.targetValue) ? ' ahead of' : ' behind'} 
                {' '}your target pace. Consider adjusting your approach if needed.
              </AlertDescription>
            </Alert>
          )}
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

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          
          {currentStep === keyResults.length - 1 ? (
            <Button onClick={handleSubmit}>
              <Send className="h-4 w-4 mr-2" />
              Submit Check-in
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Quick Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Check-in Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {keyResults.map((kr, index) => (
              <div 
                key={kr.id}
                className={`text-center p-2 rounded-lg border cursor-pointer transition-colors ${
                  index === currentStep ? 'bg-primary/10 border-primary' : 
                  checkInData.updates[kr.id] ? 'bg-green-50 border-green-300' : 'bg-gray-50'
                }`}
                onClick={() => setCurrentStep(index)}
              >
                <div className="text-xs font-medium truncate">{kr.title}</div>
                <div className="mt-1">
                  {checkInData.updates[kr.id] ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300 mx-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}