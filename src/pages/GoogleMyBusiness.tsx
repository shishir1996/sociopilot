import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Loader2, Sparkles, RefreshCw, ExternalLink, Crown, Save, Star } from "lucide-react";

export default function GoogleMyBusiness() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [edits, setEdits] = useState<{ title?: string; phone?: string; website?: string; description?: string }>({});
  const planLimits = usePlanLimits(businessId);
  const [planAllowsGmb, setPlanAllowsGmb] = useState(true);

  useEffect(() => { if (user) init(); }, [user]);

  async function init() {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", user!.id).limit(1) as any;
    if (biz?.[0]) {
      const bid = biz[0].id;
      setBusinessId(bid);
      const [{ data: acc }, { data: prof }, { data: planRow }] = await Promise.all([
        supabase.from("social_accounts").select("id").eq("business_id", bid).eq("platform", "google_business").maybeSingle(),
        supabase.from("gmb_profiles").select("*").eq("business_id", bid).maybeSingle(),
        supabase.from("ai_plan_limits").select("gmb_enabled").eq("plan_name", "free_trial").maybeSingle(),
      ]);
      setConnected(!!acc);
      setProfile(prof);
      if (prof) setEdits({ title: prof.name || "", phone: prof.phone || "", website: prof.website || "", description: prof.ai_description || "" });
    }
    setLoading(false);
  }

  // Plan check
  useEffect(() => {
    (async () => {
      if (!planLimits.planName) return;
      const { data } = await supabase.from("ai_plan_limits").select("gmb_enabled").eq("plan_name", planLimits.planName).maybeSingle();
      setPlanAllowsGmb(!!data?.gmb_enabled);
    })();
  }, [planLimits.planName]);

  async function syncProfile() {
    setSyncing(true);
    try {
      const { data } = await supabase.functions.invoke("gmb-sync", { body: { business_id: businessId } });
      if (!data?.ok) throw new Error(data?.error || "Sync failed");
      toast({ title: "Profile synced", description: `Completeness: ${data.completeness}%` });
      await init();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally { setSyncing(false); }
  }

  async function optimize() {
    if (!profile) return;
    setOptimizing(true);
    try {
      const { data } = await supabase.functions.invoke("gmb-optimize", { body: { profile_id: profile.id } });
      if (!data?.ok) throw new Error(data?.error || "Optimize failed");
      toast({ title: "AI optimization done", description: `${data.before_score}% → ${data.after_score}%` });
      setEdits((e) => ({ ...e, description: data.description }));
      await init();
    } catch (e: any) {
      toast({ title: "Optimize failed", description: e.message, variant: "destructive" });
    } finally { setOptimizing(false); }
  }

  async function pushUpdates() {
    if (!profile) return;
    setPushing(true);
    try {
      const { data } = await supabase.functions.invoke("gmb-push", { body: { profile_id: profile.id, fields: edits } });
      if (!data?.ok) throw new Error(data?.error || "Push failed");
      toast({ title: "Updates pushed to Google ✓" });
      await init();
    } catch (e: any) {
      toast({ title: "Push failed", description: e.message, variant: "destructive" });
    } finally { setPushing(false); }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!planAllowsGmb) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
            <h1 className="text-xl font-heading font-bold">Google My Business</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <Crown className="h-12 w-12 mx-auto text-primary" />
              <h2 className="text-xl font-bold">Upgrade to unlock Google My Business</h2>
              <p className="text-muted-foreground">This feature isn't included in your current plan.</p>
              <Button onClick={() => navigate("/pricing")}>View plans</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-heading font-bold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Google My Business</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {!connected ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <MapPin className="h-12 w-12 mx-auto text-primary" />
              <h2 className="text-lg font-bold">Connect Google My Business</h2>
              <p className="text-muted-foreground text-sm">Connect your Google Business Profile to sync, optimize, and update your local listing.</p>
              <Button onClick={() => navigate("/settings")}><ExternalLink className="h-4 w-4 mr-1" /> Go to Connections</Button>
            </CardContent>
          </Card>
        ) : !profile ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <h2 className="text-lg font-bold">Sync your business profile</h2>
              <p className="text-muted-foreground text-sm">We'll fetch your Google Business location, reviews, and details.</p>
              <Button onClick={syncProfile} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Sync now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle>{profile.name || "Untitled location"}</CardTitle>
                    <CardDescription>{profile.address || "No address"}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {profile.verified && <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Verified</Badge>}
                    {profile.published && <Badge variant="outline">Published</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Profile completeness</span>
                    <span className="text-sm font-bold">{profile.completeness_score || 0}%</span>
                  </div>
                  <Progress value={profile.completeness_score || 0} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Rating</div>
                    <div className="text-lg font-bold flex items-center justify-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {profile.rating || 0}</div>
                  </div>
                  <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Reviews</div><div className="text-lg font-bold">{profile.review_count || 0}</div></div>
                  <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Photos</div><div className="text-lg font-bold">{profile.photo_count || 0}</div></div>
                  <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Category</div><div className="text-sm font-medium truncate">{profile.category || "—"}</div></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={syncProfile} disabled={syncing}>
                    {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Re-sync
                  </Button>
                  <Button size="sm" onClick={optimize} disabled={optimizing}>
                    {optimizing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} AI Optimize
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Edit & push to Google</CardTitle>
                <CardDescription>Updates here are pushed back to your Google Business Profile.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><label className="text-sm font-medium">Business name</label><Input value={edits.title || ""} onChange={(e) => setEdits({ ...edits, title: e.target.value })} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">Phone</label><Input value={edits.phone || ""} onChange={(e) => setEdits({ ...edits, phone: e.target.value })} /></div>
                  <div><label className="text-sm font-medium">Website</label><Input value={edits.website || ""} onChange={(e) => setEdits({ ...edits, website: e.target.value })} /></div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea rows={5} value={edits.description || ""} onChange={(e) => setEdits({ ...edits, description: e.target.value })} placeholder="AI-optimized description appears here after running AI Optimize" />
                </div>
                {profile.keywords?.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-1">Suggested local SEO keywords</div>
                    <div className="flex flex-wrap gap-1">{profile.keywords.map((k: string) => <Badge key={k} variant="secondary">{k}</Badge>)}</div>
                  </div>
                )}
                <Button onClick={pushUpdates} disabled={pushing}>
                  {pushing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Push updates to Google
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}