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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, MapPin, Loader2, Sparkles, RefreshCw, ExternalLink, Crown, Save, Star,
  TrendingUp, Eye, Phone, MessageSquare, Search, Clock, History, Target, CheckCircle2, BarChart3
} from "lucide-react";

interface GMBReview {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  reply: string | null;
  review_time: string;
}

interface GMBOptimization {
  id: string;
  before_score: number;
  after_score: number;
  changes_applied: any;
  created_at: string;
}

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
  const [reviews, setReviews] = useState<GMBReview[]>([]);
  const [optimizations, setOptimizations] = useState<GMBOptimization[]>([]);
  const planLimits = usePlanLimits(businessId);
  const [planAllowsGmb, setPlanAllowsGmb] = useState(true);

  useEffect(() => { if (user) init(); }, [user]);

  async function init() {
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", user!.id).limit(1) as any;
    if (biz?.[0]) {
      const bid = biz[0].id;
      setBusinessId(bid);
      const [{ data: acc }, { data: prof }] = await Promise.all([
        supabase.from("social_accounts").select("id").eq("business_id", bid).eq("platform", "google_business").maybeSingle(),
        supabase.from("gmb_profiles").select("*").eq("business_id", bid).maybeSingle(),
      ]);
      setConnected(!!acc);
      setProfile(prof);
      if (prof) setEdits({ title: prof.name || "", phone: prof.phone || "", website: prof.website || "", description: prof.ai_description || "" });

      if (prof) {
        const [reviewsRes, optsRes] = await Promise.all([
          supabase.from("gmb_reviews").select("*").eq("gmb_profile_id", prof.id).order("review_time", { ascending: false }).limit(20),
          supabase.from("gmb_optimizations").select("*").eq("gmb_profile_id", prof.id).order("created_at", { ascending: false }).limit(10),
        ]);
        setReviews((reviewsRes.data || []) as GMBReview[]);
        setOptimizations((optsRes.data || []) as GMBOptimization[]);
      }
    }
    setLoading(false);
  }

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

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const ratingDistribution = [0, 0, 0, 0, 0];
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) ratingDistribution[5 - r.rating]++; });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-heading font-bold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Google Business Profile</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview" className="text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Overview</TabsTrigger>
              <TabsTrigger value="optimize" className="text-xs"><Sparkles className="h-3.5 w-3.5 mr-1" /> AI Optimize</TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Reviews</TabsTrigger>
              <TabsTrigger value="history" className="text-xs"><History className="h-3.5 w-3.5 mr-1" /> History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Profile Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle>{profile.name || "Untitled location"}</CardTitle>
                      <CardDescription>{profile.address || "No address"}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {profile.verified && <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Verified</Badge>}
                      {profile.published && <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">Published</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Profile completeness</span>
                      <span className="text-sm font-bold">{profile.completeness_score || 0}%</span>
                    </div>
                    <Progress value={profile.completeness_score || 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-5 pb-4 text-center">
                    <Eye className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold text-foreground">{profile.view_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Profile Views</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4 text-center">
                    <Search className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold text-foreground">{profile.search_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Searches</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4 text-center">
                    <Phone className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold text-foreground">{profile.phone_call_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Phone Calls</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold text-foreground">{profile.direction_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Direction Requests</p>
                  </CardContent>
                </Card>
              </div>

              {/* Details Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Business Details</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{profile.category || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{profile.phone || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Website</span><span className="font-medium truncate max-w-[200px]">{profile.website || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Rating</span><span className="font-medium flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{profile.rating || 0} ({profile.review_count || 0})</span></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Local SEO Keywords</CardTitle></CardHeader>
                  <CardContent>
                    {profile.keywords?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.keywords.map((k: string) => <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>)}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Run AI Optimize to generate local SEO keywords.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Rating Distribution */}
              {reviews.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Rating Distribution</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingDistribution[5 - star];
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="w-8 text-muted-foreground">{star}★</span>
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-8 text-right text-muted-foreground">{count}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="optimize" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Profile Optimization</CardTitle>
                  <CardDescription>Let AI analyze your profile and generate optimized content for better local SEO.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border p-4 text-center">
                      <Target className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="text-xs text-muted-foreground">Current Score</p>
                      <p className="text-2xl font-bold">{profile.completeness_score || 0}%</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <Sparkles className="h-6 w-6 mx-auto text-accent mb-2" />
                      <p className="text-xs text-muted-foreground">Optimizations Run</p>
                      <p className="text-2xl font-bold">{optimizations.length}</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-2" />
                      <p className="text-xs text-muted-foreground">Last Optimized</p>
                      <p className="text-sm font-bold">{profile.last_optimized_at ? new Date(profile.last_optimized_at).toLocaleDateString() : "Never"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={syncProfile} disabled={syncing}>
                      {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Re-sync
                    </Button>
                    <Button size="sm" onClick={optimize} disabled={optimizing}>
                      {optimizing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} Run AI Optimization
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
                  <Button onClick={pushUpdates} disabled={pushing}>
                    {pushing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Push updates to Google
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Customer Reviews</CardTitle>
                    <Badge variant="outline" className="text-xs">{reviews.length} total</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No reviews synced yet. Sync your GMB profile to fetch reviews.</p>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((r) => (
                        <div key={r.id} className="p-3 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{r.reviewer_name}</span>
                              <div className="flex">{[...Array(r.rating)].map((_, i) => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}</div>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{r.review_time ? new Date(r.review_time).toLocaleDateString() : ""}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{r.comment}</p>
                          {r.reply && (
                            <div className="mt-2 pl-3 border-l-2 border-primary/30">
                              <p className="text-xs font-medium text-primary">Your reply:</p>
                              <p className="text-xs text-muted-foreground">{r.reply}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Optimization History</CardTitle>
                  <CardDescription>Track how your profile completeness has improved over time.</CardDescription>
                </CardHeader>
                <CardContent>
                  {optimizations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No optimizations performed yet. Run AI Optimize to see history.</p>
                  ) : (
                    <div className="space-y-3">
                      {optimizations.map((opt, i) => (
                        <div key={opt.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Target className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Optimization #{optimizations.length - i}</p>
                              <p className="text-xs text-muted-foreground">{new Date(opt.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{opt.before_score}% → {opt.after_score}%</p>
                            <p className="text-xs text-green-600">+{opt.after_score - opt.before_score}% improvement</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}