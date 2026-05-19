import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, X } from "lucide-react";

type Task = {
  key: string;
  label: string;
  done: boolean;
  route: string;
  cta: string;
};

interface Props {
  businessId: string | null;
}

export function SetupProgress({ businessId }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) {
      const stored = localStorage.getItem("growvix_setup_dismissed");
      if (stored === "1") setDismissed(true);
    } else {
      const stored = localStorage.getItem("growvix_setup_dismissed");
      if (stored === "1") setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, businessId]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [biz, social, sub, content, schedules, assets] = await Promise.all([
      supabase.from("businesses").select("id, name, industry, publishing_platforms").eq("user_id", user.id).maybeSingle(),
      supabase.from("social_accounts").select("id").eq("user_id", user.id).limit(1),
      supabase.from("subscriptions").select("status, is_trial, plan_name").eq("user_id", user.id).limit(1),
      supabase.from("content_items").select("id").eq("user_id", user.id).limit(1),
      supabase.from("posting_schedules").select("id").eq("user_id", user.id).eq("enabled", true).limit(1),
      supabase.from("brand_assets").select("id").eq("user_id", user.id).limit(1),
    ]);

    const hasSocial = (social.data?.length ?? 0) > 0;
    const hasPlan = !!sub.data && sub.data.length > 0;
    const subActive = hasPlan && (sub.data![0].status === "active" || sub.data![0].is_trial === true);
    const hasBrand = !!biz.data && (!!biz.data.industry || (assets.data?.length ?? 0) > 0);
    const hasAiConfig = !!biz.data && (biz.data.publishing_platforms?.length ?? 0) > 0 && (schedules.data?.length ?? 0) > 0;
    const hasContent = (content.data?.length ?? 0) > 0;

    setTasks([
      { key: "social", label: "Connect a social platform", done: hasSocial, route: "/settings", cta: "Connect" },
      { key: "plan", label: "Activate plan & subscription", done: subActive, route: "/pricing", cta: "Choose plan" },
      { key: "brand", label: "Complete brand profile", done: hasBrand, route: "/setup", cta: "Set up brand" },
      { key: "ai", label: "Configure AI Studio & schedule", done: hasAiConfig, route: "/schedule", cta: "Configure" },
      { key: "content", label: "Generate your first content", done: hasContent, route: "/ai-studio", cta: "Generate" },
    ]);
    setLoading(false);
  }

  if (dismissed || loading || tasks.length === 0) return null;
  const completed = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  if (completed === total) return null;
  const pct = Math.round((completed / total) * 100);
  const next = tasks.find((t) => !t.done);

  return (
    <Card className="mb-6 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Complete your setup</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completed} of {total} steps done — finish setup to unlock automated posting.
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("growvix_setup_dismissed", "1");
              setDismissed(true);
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Progress value={pct} className="h-2 mb-4" />
        <div className="space-y-2">
          {tasks.map((t) => (
            <div
              key={t.key}
              className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {t.done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className={`text-sm truncate ${t.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {t.label}
                </span>
              </div>
              {!t.done && (
                <Button size="sm" variant={next?.key === t.key ? "default" : "ghost"} onClick={() => navigate(t.route)} className="text-xs h-7">
                  {t.cta} <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
