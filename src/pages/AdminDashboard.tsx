import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlanBadge } from "@/components/dashboard/PlanBadge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Shield, Users, CheckCircle, XCircle, Loader2,
  Search, Eye, Crown, Activity, TrendingUp, DollarSign, Zap, Sparkles, LogOut,
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

interface UserProfile {
  user_id: string;
  email: string;
  business_name: string | null;
  industry: string | null;
  platforms: string[] | null;
  timezone: string | null;
  subscription_status: string;
  created_at: string;
  plan_name?: string;
  is_trial?: boolean;
}

function AnimatedStatCard({ icon: Icon, label, value, color, delay }: { icon: any; label: string; value: string | number; color: string; delay: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9]/g, "")) || 0;

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const step = Math.max(1, Math.floor(numericValue / 60));
    const timer = setInterval(() => {
      start += step;
      if (start >= numericValue) { start = numericValue; clearInterval(timer); }
      setDisplayValue(start);
    }, duration / (numericValue / step || 1));
    return () => clearInterval(timer);
  }, [numericValue]);

  return (
    <div className={`card-3d-float stagger-enter`} style={{ animationDelay: `${delay}s` }}>
      <Card className="stat-glow overflow-hidden relative border-[0.5px] border-border/60">
        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${color} opacity-10 blur-2xl`} />
        <CardContent className="pt-5 pb-4 flex items-center gap-4 relative z-10">
          <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-20 flex items-center justify-center shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{typeof value === "string" ? value : displayValue}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    localStorage.removeItem("growvix_admin");
    await signOut();
    navigate("/admin");
  };
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    checkAdmin();
    setTimeout(() => setShowAnimation(true), 100);
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin") as any;
    if (data && data.length > 0) {
      setIsAdmin(true);
      fetchAllUsers();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data: adminData } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_users" },
      });
      const { data: subs } = await supabase.from("subscriptions").select("*");
      const subMap = new Map((subs || []).map((s: any) => [s.user_id, s]));
      if (adminData?.users) {
        const enriched = adminData.users.map((u: any) => {
          const sub = subMap.get(u.user_id);
          return { ...u, plan_name: sub?.plan_name || "free_trial", is_trial: sub?.is_trial || false };
        });
        setUsers(enriched);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
    setLoading(false);
  };

  const toggleAccess = async (userId: string, currentStatus: string) => {
    setActionLoading(userId);
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "toggle_access", target_user_id: userId, status: newStatus },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Access Updated", description: `User access set to ${newStatus}` });
      fetchAllUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const removeUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "remove_user", target_user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "User Removed" });
      fetchAllUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const filteredUsers = useMemo(() => users.filter(u => {
    const matchesSearch = !searchQuery ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.business_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === "all" ||
      (planFilter === "trial" && u.is_trial) ||
      (planFilter === "basic" && u.plan_name === "basic" && !u.is_trial) ||
      (planFilter === "pro" && u.plan_name === "pro") ||
      (planFilter === "expired" && u.subscription_status !== "active") ||
      (planFilter === "active" && u.subscription_status === "active");
    return matchesSearch && matchesPlan;
  }), [users, searchQuery, planFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <Shield className="w-6 h-6 absolute inset-0 m-auto text-primary" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="mesh-gradient-1 absolute inset-0" />
        <Card className="max-w-md w-full text-center relative z-10 border-2 border-destructive/20 card-3d-float">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold gradient-text-warm">Access Denied</h2>
            <p className="text-sm text-muted-foreground">You don't have admin privileges.</p>
            <Button onClick={() => navigate("/")} variant="outline" className="btn-shine">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trialCount = users.filter(u => u.is_trial).length;
  const activeCount = users.filter(u => u.subscription_status === "active").length;
  const proCount = users.filter(u => u.plan_name === "pro").length;

  const stats = [
    { icon: Users, label: "Total Users", value: users.length, color: "bg-gradient-to-br from-blue-600 to-blue-400" },
    { icon: CheckCircle, label: "Active", value: activeCount, color: "bg-gradient-to-br from-emerald-600 to-green-400" },
    { icon: Activity, label: "Trial Users", value: trialCount, color: "bg-gradient-to-br from-violet-600 to-purple-400" },
    { icon: Crown, label: "Pro Users", value: proCount, color: "bg-gradient-to-br from-amber-600 to-orange-400" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="glass-strong h-14 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text-anim">Admin Dashboard</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="badge-pulse text-xs gap-1 border-primary/30">
              <Zap className="h-3 w-3 text-primary" /> {users.length} users
            </Badge>
            <Button size="sm" onClick={() => navigate("/")} variant="ghost" className="text-xs btn-shine">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button size="sm" onClick={handleSignOut} variant="ghost" className="text-xs text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto mesh-gradient-1">
          {/* Floating Orbs */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="orb orb-1 top-20 left-10" />
            <div className="orb orb-2 bottom-20 right-10" />
            <div className="orb orb-3 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>

          <div className="max-w-7xl mx-auto space-y-6 relative z-10">
            {/* Stats Grid */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 ${showAnimation ? "stagger-enter" : ""}`}>
              {stats.map((s, i) => (
                <AnimatedStatCard key={s.label} {...s} delay={i * 0.1} />
              ))}
            </div>

            {/* Premium Welcome Banner */}
            <Card className="gradient-border relative overflow-hidden">
              <div className="mesh-gradient-2 absolute inset-0" />
              <CardContent className="pt-6 pb-6 relative z-10">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-bold gradient-text-blue">Welcome back, Admin</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You have <span className="font-semibold text-foreground">{filteredUsers.length}</span> users matching your current filter.
                      <span className="hidden sm:inline"> Manage, monitor, and grow your platform from here.</span>
                    </p>
                  </div>
                  <Button size="sm" className="gradient-primary border-0 btn-shine text-xs" onClick={() => navigate("/admin/analytics")}>
                    <TrendingUp className="h-4 w-4 mr-1" /> View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card className="glass-premium">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by email or business name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-background/80" />
                  </div>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-40 text-xs">
                      <SelectValue placeholder="Filter by plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="glass-premium">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  All Users
                  <Badge variant="secondary" className="ml-1 text-xs">{filteredUsers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead className="text-xs font-semibold">Email</TableHead>
                        <TableHead className="text-xs font-semibold">Business</TableHead>
                        <TableHead className="text-xs font-semibold">Plan</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold">Joined</TableHead>
                        <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                            <div className="space-y-2">
                              <Search className="h-6 w-6 mx-auto opacity-30" />
                              <p className="text-sm">No users found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((u, idx) => (
                          <TableRow key={u.user_id} className="cursor-pointer hover:bg-muted/30 transition-colors card-3d" style={{ animationDelay: `${idx * 0.03}s` }}
                            onClick={() => navigate(`/admin/user?id=${u.user_id}`)}>
                            <TableCell className="font-medium text-sm">{u.email || u.user_id.slice(0, 8) + "..."}</TableCell>
                            <TableCell className="text-sm">{u.business_name || <span className="text-muted-foreground/50">—</span>}</TableCell>
                            <TableCell><PlanBadge planName={u.plan_name || "free_trial"} isTrial={u.is_trial} /></TableCell>
                            <TableCell>
                              <Badge variant={u.subscription_status === "active" ? "default" : "secondary"} className={`text-xs ${u.subscription_status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}`}>
                                {u.subscription_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right space-x-1" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => navigate(`/admin/user?id=${u.user_id}`)}>
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                              <Button
                                variant={u.subscription_status === "active" ? "outline" : "default"}
                                size="sm" className="text-xs h-8"
                                onClick={() => toggleAccess(u.user_id, u.subscription_status)}
                                disabled={actionLoading === u.user_id}
                              >
                                {actionLoading === u.user_id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : u.subscription_status === "active" ? (
                                  <><XCircle className="h-3 w-3 mr-1" /> Revoke</>
                                ) : (
                                  <><CheckCircle className="h-3 w-3 mr-1" /> Activate</>
                                )}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-xs h-8 text-destructive hover:text-destructive" onClick={e => e.stopPropagation()}>
                                    <XCircle className="h-3 w-3 mr-1" /> Remove
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove this user?</AlertDialogTitle>
                                    <AlertDialogDescription>This will delete the user and all their data permanently.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => removeUser(u.user_id)} className="bg-gradient-to-r from-red-600 to-rose-600 text-white">
                                      Remove User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
