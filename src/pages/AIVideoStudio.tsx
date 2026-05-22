import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Film, Loader2, Sparkles } from "lucide-react";

export default function AIVideoStudio() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({
    title: "",
    script: "",
    video_ratio: "9:16",
    video_duration: 30,
    video_style: "cinematic",
    voice_type: "female_warm",
    music_type: "upbeat",
    subtitle_style: "hormozi",
    generation_mode: "stock",
    platform_target: "instagram",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    refresh();
    const channel = supabase
      .channel("video-jobs-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "video_generation_jobs", filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const refresh = async () => {
    if (!user) return;
    const [jobsRes, subRes, settingsRes] = await Promise.all([
      supabase.from("video_generation_jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("subscriptions").select("plan_name").eq("user_id", user.id).maybeSingle(),
      supabase.from("admin_ai_settings").select("*").eq("singleton", true).maybeSingle(),
    ]);
    setJobs(jobsRes.data ?? []);
    setSettings(settingsRes.data);
    const planName = (subRes.data?.plan_name as string) || "free_trial";
    const { data: ctrl } = await supabase
      .from("subscription_feature_controls")
      .select("*")
      .eq("subscription_plan", planName)
      .maybeSingle();
    setPlan({ name: planName, ...ctrl });
  };

  const generate = async () => {
    if (!form.title.trim()) { toast.error("Add a title"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("video-job-create", { body: form });
    setSubmitting(false);
    if (error || !data?.ok) {
      toast.error(data?.error || error?.message || "Failed to create job");
      return;
    }
    toast.success("Video job created. Generating blueprint…");
    setForm((f) => ({ ...f, title: "", script: "" }));
    refresh();
  };

  if (authLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const premiumLocked = !plan?.allow_premium_generation || !settings?.enable_premium_video_generation;
  const avatarLocked = !plan?.allow_avatar_generation || !settings?.enable_ai_avatar_generation;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 grid place-items-center">
            <Film className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Video Studio</h1>
            <p className="text-muted-foreground text-sm">Plan: <Badge variant="secondary" className="ml-1">{plan?.name ?? "—"}</Badge></p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> New video</CardTitle>
              <CardDescription>Generates a scene blueprint from your business context first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Launch teaser for spring collection" />
              </div>
              <div>
                <Label>Script / seed idea (optional)</Label>
                <Textarea rows={3} value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} placeholder="What is this video about?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Platform</Label>
                  <Select value={form.platform_target} onValueChange={(v) => setForm({ ...form, platform_target: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Aspect ratio</Label>
                  <Select value={form.video_ratio} onValueChange={(v) => setForm({ ...form, video_ratio: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9:16">9:16 — Reels/Shorts</SelectItem>
                      <SelectItem value="1:1">1:1 — Square</SelectItem>
                      <SelectItem value="16:9">16:9 — Landscape</SelectItem>
                      <SelectItem value="4:5">4:5 — Feed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration (sec)</Label>
                  <Input type="number" min={10} max={(plan?.max_video_minutes ?? 1) * 60} value={form.video_duration} onChange={(e) => setForm({ ...form, video_duration: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Style</Label>
                  <Select value={form.video_style} onValueChange={(v) => setForm({ ...form, video_style: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="energetic">Energetic</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="ugc">UGC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Voice</Label>
                  <Select value={form.voice_type} onValueChange={(v) => setForm({ ...form, voice_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female_warm">Female — Warm</SelectItem>
                      <SelectItem value="male_deep">Male — Deep</SelectItem>
                      <SelectItem value="female_pro">Female — Pro</SelectItem>
                      <SelectItem value="male_friendly">Male — Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Music</Label>
                  <Select value={form.music_type} onValueChange={(v) => setForm({ ...form, music_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upbeat">Upbeat</SelectItem>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="chill">Chill</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Generation mode</Label>
                  <Select value={form.generation_mode} onValueChange={(v) => setForm({ ...form, generation_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">Stock footage (cheapest)</SelectItem>
                      <SelectItem value="ai_image" disabled={!plan?.allow_ai_images}>AI images + motion {plan?.allow_ai_images ? "" : "(Pro+)"}</SelectItem>
                      <SelectItem value="hybrid" disabled={!plan?.allow_ai_images}>Hybrid (stock + AI) {plan?.allow_ai_images ? "" : "(Pro+)"}</SelectItem>
                      <SelectItem value="premium_ai_video" disabled={premiumLocked}>Premium AI video {premiumLocked ? "(locked)" : ""}</SelectItem>
                      <SelectItem value="avatar" disabled={avatarLocked}>AI Avatar {avatarLocked ? "(locked)" : ""}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={generate} disabled={submitting} className="w-full">
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : "Generate video"}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent renders</CardTitle>
              <CardDescription>Live updates as jobs progress.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {jobs.length === 0 && <div className="text-sm text-muted-foreground">No videos yet.</div>}
              {jobs.map((j) => (
                <div key={j.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm truncate pr-2">{j.title}</div>
                    <Badge variant={j.render_status === "completed" ? "default" : j.render_status === "failed" ? "destructive" : "secondary"}>
                      {j.render_status}
                    </Badge>
                  </div>
                  <Progress value={j.render_progress ?? 0} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{j.video_ratio} · {j.video_duration}s · {j.generation_mode}</span>
                    {j.output_url && <a href={j.output_url} target="_blank" rel="noreferrer" className="text-primary">Open</a>}
                  </div>
                  {j.render_error && <div className="text-xs text-destructive">{j.render_error}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}