import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Save, Loader2, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const PLATFORMS = ["Facebook", "Instagram", "LinkedIn", "X (Twitter)", "Threads", "YouTube", "Google Business"];

interface ScheduleRow {
  id?: string;
  day_of_week: number;
  posting_time: string;
  platforms: string[];
  enabled: boolean;
}

export default function ScheduleSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPro } = usePlanLimits();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [publishingPlatform, setPublishingPlatform] = useState<string>("");
  const [autoPublish, setAutoPublish] = useState(true);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleRow[]>(
    DAYS.map((d) => ({ day_of_week: d.value, posting_time: "10:00", platforms: [], enabled: true }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .limit(1) as any;

    if (!biz || biz.length === 0) { setLoading(false); return; }
    const bizId = biz[0].id;
    setBusinessId(bizId);

    // Fetch connected platforms
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("platform")
      .eq("business_id", bizId) as any;
    setConnectedPlatforms((accounts || []).map((a: any) => a.platform));

    // Load business publishing settings
    const { data: bizRow } = await supabase
      .from("businesses")
      .select("publishing_platforms, auto_publish_enabled, approval_required")
      .eq("id", bizId)
      .maybeSingle() as any;
    if (bizRow) {
      setPublishingPlatform((bizRow.publishing_platforms || [])[0] || "");
      setAutoPublish(bizRow.auto_publish_enabled !== false);
      setApprovalRequired(!!bizRow.approval_required);
    }

    // Fetch existing schedules
    const { data: existing } = await supabase
      .from("posting_schedules")
      .select("*")
      .eq("business_id", bizId) as any;

    if (existing && existing.length > 0) {
      setSchedules(
        DAYS.map((d) => {
          const found = existing.find((e: any) => e.day_of_week === d.value);
          return found
            ? { id: found.id, day_of_week: d.value, posting_time: found.posting_time?.slice(0, 5) || "10:00", platforms: found.platforms || [], enabled: found.enabled }
            : { day_of_week: d.value, posting_time: "10:00", platforms: [], enabled: true };
        })
      );
    }
    setLoading(false);
  };

  const updateSchedule = (dayIndex: number, field: string, value: any) => {
    setSchedules((prev) =>
      prev.map((s, i) => (i === dayIndex ? { ...s, [field]: value } : s))
    );
  };

  const togglePlatform = (dayIndex: number, platform: string) => {
    // Free/Basic users are locked to a single publishing platform across all days
    if (!isPro) {
      const target = publishingPlatform || platform;
      if (publishingPlatform && platform !== publishingPlatform) {
        setShowUpgrade(true);
        return;
      }
      // First selection on any day sets the locked platform for everyone
      setPublishingPlatform(target);
      setSchedules((prev) =>
        prev.map((s) => {
          if (s.day_of_week === DAYS[dayIndex].value) {
            const has = s.platforms.includes(target);
            return { ...s, platforms: has ? [] : [target] };
          }
          return s;
        })
      );
      return;
    }
    setSchedules((prev) =>
      prev.map((s, i) => {
        if (i !== dayIndex) return s;
        const has = s.platforms.includes(platform);
        return { ...s, platforms: has ? s.platforms.filter((p) => p !== platform) : [...s.platforms, platform] };
      })
    );
  };

  const handleSave = async () => {
    if (!businessId || !user) return;
    setSaving(true);

    try {
      // Persist business-level publishing settings
      const platformsArr = !isPro && publishingPlatform ? [publishingPlatform] : [];
      await supabase.from("businesses").update({
        publishing_platforms: platformsArr.length ? platformsArr : (schedules.flatMap(s => s.platforms).filter((v, i, a) => a.indexOf(v) === i)),
        auto_publish_enabled: autoPublish,
        approval_required: approvalRequired,
      } as any).eq("id", businessId);

      for (const schedule of schedules) {
        const row = {
          business_id: businessId,
          user_id: user.id,
          day_of_week: schedule.day_of_week,
          posting_time: schedule.posting_time + ":00",
          platforms: !isPro && publishingPlatform && schedule.platforms.length > 0
            ? [publishingPlatform]
            : schedule.platforms,
          enabled: schedule.enabled,
        };

        if (schedule.id) {
          await supabase.from("posting_schedules").update(row).eq("id", schedule.id);
        } else {
          await supabase.from("posting_schedules").upsert(row, { onConflict: "business_id,day_of_week" });
        }
      }
      toast({ title: "✅ Schedule Saved", description: "Your posting schedule has been updated." });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showUpgrade && (
        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          reason="Upgrade to Pro to publish across multiple platforms."
          feature="multi-platform scheduling"
        />
      )}
      <header className="border-b border-border bg-card h-14 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h1 className="text-sm font-bold text-foreground">Posting Schedule</h1>
          </div>
        </div>
        <Button onClick={handleSave} size="sm" disabled={saving} className="gradient-primary border-0">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save Schedule
        </Button>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Set your posting time and choose which platforms to post on each day. Only connected platforms are available.
        </p>

        {/* Publishing settings card */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold">Publishing Settings</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-3 text-sm">
            {!isPro && (
              <div className="rounded-md bg-warning/5 border border-warning/20 p-3 text-xs">
                <strong>Free / Basic plan:</strong> you can automate publishing on <strong>one</strong> platform.
                {publishingPlatform ? <> Currently locked to <strong>{publishingPlatform}</strong>.</> : <> Pick a platform on any day below — it will apply to all days.</>}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-publish generated content</p>
                <p className="text-xs text-muted-foreground">When ON, new posts go straight to the scheduled queue.</p>
              </div>
              <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require my approval before scheduling</p>
                <p className="text-xs text-muted-foreground">New posts wait in an approval queue.</p>
              </div>
              <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
            </div>
          </CardContent>
        </Card>

        {connectedPlatforms.length === 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="py-4">
              <p className="text-sm text-warning font-medium">
                ⚠️ No social platforms connected. Go to your dashboard to connect platforms first.
              </p>
            </CardContent>
          </Card>
        )}

        {DAYS.map((day, idx) => {
          const schedule = schedules[idx];
          return (
            <Card key={day.value} className={`transition-opacity ${!schedule.enabled ? "opacity-50" : ""}`}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{day.label}</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="time"
                        value={schedule.posting_time}
                        onChange={(e) => updateSchedule(idx, "posting_time", e.target.value)}
                        className="text-xs bg-muted rounded px-2 py-1 border border-border text-foreground"
                      />
                    </div>
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={(v) => updateSchedule(idx, "enabled", v)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => {
                    const isConnected = connectedPlatforms.some(
                      (cp) => cp.toLowerCase().includes(platform.toLowerCase().replace("x (twitter)", "twitter").replace("google business", "google"))
                    );
                    const isSelected = schedule.platforms.includes(platform);
                    return (
                      <Badge
                        key={platform}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer text-xs transition-all ${
                          !isConnected ? "opacity-30 cursor-not-allowed" : isSelected ? "bg-primary text-primary-foreground" : "hover:border-primary/50"
                        }`}
                        onClick={() => isConnected && togglePlatform(idx, platform)}
                      >
                        {platform}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
