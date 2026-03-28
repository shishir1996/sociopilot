import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlatformBadge } from "./PlatformBadge";
import { ContentTypeBadge } from "./ContentTypeBadge";
import { Badge } from "@/components/ui/badge";
import { Clock, Lightbulb, MessageSquare, Target } from "lucide-react";

interface ContentCardProps {
  dayNumber: number;
  theme: string;
  goal: string;
  primaryPlatform: string;
  secondaryPlatforms: string[];
  contentType: string;
  topic: string;
  hook: string;
  painPoint: string;
  coreMessage: string;
  cta: string;
  postingTime: string;
  whyItMatters: string;
  status: string;
}

export function ContentCard({
  dayNumber,
  theme,
  goal,
  primaryPlatform,
  secondaryPlatforms,
  contentType,
  topic,
  hook,
  painPoint,
  coreMessage,
  cta,
  postingTime,
  whyItMatters,
  status,
}: ContentCardProps) {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow animate-fade-in group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
              {dayNumber}
            </span>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {dayNames[dayNumber - 1] || `Day ${dayNumber}`}
              </p>
              <p className="text-sm font-heading font-semibold text-foreground">{theme}</p>
            </div>
          </div>
          <Badge variant={status === "approved" ? "default" : "secondary"} className="text-xs">
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <PlatformBadge platform={primaryPlatform} />
          {secondaryPlatforms?.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
          <ContentTypeBadge type={contentType} />
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{topic}</p>
          {goal && <p className="text-xs text-muted-foreground mt-0.5">Goal: {goal}</p>}
        </div>

        {hook && (
          <div className="flex gap-2 items-start">
            <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-accent shrink-0" />
            <p className="text-xs text-muted-foreground italic">"{hook}"</p>
          </div>
        )}

        {painPoint && (
          <div className="flex gap-2 items-start">
            <Target className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
            <p className="text-xs text-muted-foreground">{painPoint}</p>
          </div>
        )}

        {coreMessage && (
          <div className="flex gap-2 items-start">
            <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
            <p className="text-xs text-foreground">{coreMessage}</p>
          </div>
        )}

        {cta && (
          <div className="rounded-md bg-primary/10 px-3 py-2">
            <p className="text-xs font-medium text-primary">CTA: {cta}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          {postingTime && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {postingTime}
            </div>
          )}
          {whyItMatters && (
            <p className="text-xs text-muted-foreground truncate max-w-[180px]" title={whyItMatters}>
              💡 {whyItMatters}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
