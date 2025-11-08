import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction, Calendar } from "lucide-react";

interface ComingSoonProps {
  featureName?: string;
  description?: string;
}

export default function ComingSoon({ featureName = "Feature", description }: ComingSoonProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="text-center">
        <CardHeader className="pb-8">
          <div className="flex justify-center mb-4">
            <Construction className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {featureName} Coming Soon
          </CardTitle>
          {description && (
            <p className="text-muted-foreground mt-2">
              {description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>This feature is planned for future development</span>
          </div>
          <Badge variant="secondary" className="mt-4">
            In Development
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}