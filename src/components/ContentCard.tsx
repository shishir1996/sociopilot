import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlatformBadge } from "./PlatformBadge";
import { ContentTypeBadge } from "./ContentTypeBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Lightbulb, MessageSquare, Target, Send, CalendarClock, ChevronDown, ChevronUp, Copy, Hash, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface ContentCardProps {
  id: string;
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
  caption?: string;
  hashtags?: string[];
  imagePrompt?: string;
  imageUrl?: string;
  visualStyle?: string;
  repurposingSuggestion?: string;
  onStatusChange?: () => void;
}

export function ContentCard({
  id,
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
  caption,
  hashtags,
  imagePrompt,
  visualStyle,
  repurposingSuggestion,
  onStatusChange,
}: ContentCardProps) {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [posting, setPosting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [copied, setCopied] = useState(false);

  const statusColors: Record<string, string> = {
    draft: "secondary",
    approved: "default",
    scheduled: "outline",
    posted: "default",
    partially_posted: "destructive",
  };

  const handleCopyCaption = async () => {
    const fullText = caption
      ? `${caption}\n\n${(hashtags || []).map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}`
      : `${hook}\n\n${coreMessage}\n\n${cta}`;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Caption copied to clipboard" });
  };

  const handlePostNow = async () => {
    setPosting(true);
    try {
      const { data, error } = await supabase.functions.invoke("post-to-social", {
        body: { content_item_id: id, action: "post_now" },
      });
      if (error) throw error;
      if (data?.needs_setup) {
        toast({ title: "Setup Required", description: data.error, variant: "destructive" });
      } else if (data?.success) {
        toast({ title: "Posted!", description: "Content published to your platforms" });
        onStatusChange?.();
      } else {
        toast({ title: "Partial Success", description: "Some platforms had errors. Check details.", variant: "destructive" });
        onStatusChange?.();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setPosting(false);
  };

  const handleSchedule = async () => {
    if (!scheduleDate) return;
    setPosting(true);
    try {
      const { data, error } = await supabase.functions.invoke("post-to-social", {
        body: { content_item_id: id, action: "schedule", scheduled_at: new Date(scheduleDate).toISOString() },
      });
      if (error) throw error;
      if (data?.needs_setup) {
        toast({ title: "Setup Required", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Scheduled!", description: "Post scheduled successfully" });
        setScheduling(false);
        onStatusChange?.();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setPosting(false);
  };

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
          <Badge variant={statusColors[status] as any || "secondary"} className="text-xs">
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

        {/* Expandable section for AI-generated content */}
        {(caption || hashtags?.length) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium w-full"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide" : "Show"} full content
          </button>
        )}

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-border animate-fade-in">
            {caption && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Caption</p>
                  <button onClick={handleCopyCaption} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{caption}</p>
              </div>
            )}

            {hashtags && hashtags.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3 text-primary" />
                  <p className="text-xs font-semibold text-foreground">Hashtags</p>
                </div>
                <p className="text-xs text-primary/80">{hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}</p>
              </div>
            )}

            {imagePrompt && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">🎨 Image Prompt</p>
                <p className="text-xs text-muted-foreground">{imagePrompt}</p>
              </div>
            )}

            {visualStyle && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">🖼️ Visual Style</p>
                <p className="text-xs text-muted-foreground">{visualStyle}</p>
              </div>
            )}

            {repurposingSuggestion && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">♻️ Repurposing</p>
                <p className="text-xs text-muted-foreground">{repurposingSuggestion}</p>
              </div>
            )}
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

        {/* Post / Schedule actions */}
        {status !== "posted" && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="default"
              className="flex-1 text-xs"
              onClick={handlePostNow}
              disabled={posting}
            >
              <Send className="h-3 w-3 mr-1" />
              {posting ? "Posting..." : "Post Now"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => setScheduling(!scheduling)}
              disabled={posting}
            >
              <CalendarClock className="h-3 w-3" />
            </Button>
          </div>
        )}

        {scheduling && (
          <div className="flex gap-2 animate-fade-in">
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="text-xs flex-1"
            />
            <Button size="sm" onClick={handleSchedule} disabled={!scheduleDate || posting}>
              Schedule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
