import { useEffect, useState } from "react";
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
  ArrowLeft, Shield, Users, Building2, CheckCircle, XCircle, Loader2,
  BarChart3, Search, Eye, Cpu, Crown, Activity, CreditCard
} from "lucide-react";

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

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  useEffect(() => {
    checkAdmin();
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

      // Also fetch subscriptions for plan info
      const { data: subs } = await supabase.from("subscriptions").select("*");
      const subMap = new Map((subs || []).map((s: any) => [s.user_id, s]));

      if (adminData?.users) {
        const enriched = adminData.users.map((u: any) => {
          const sub = subMap.get(u.user_id);
          return {
            ...u,
            plan_name: sub?.plan_name || "free_trial",
            is_trial: sub?.is_trial || false,
          };
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

  const filteredUsers = users.filter(u => {
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
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <Shield className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-heading font-bold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground">You don't have admin privileges.</p>
            <Button onClick={() => navigate("/")} variant="outline">
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-heading font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/analytics")} className="text-xs">
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/ai")} className="text-xs">
              <Cpu className="h-3.5 w-3.5 mr-1" /> AI Control
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/integrations")} className="text-xs">
              🔗 Integrations
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/payments")} className="text-xs">
              <CreditCard className="h-3.5 w-3.5 mr-1" /> Payments
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <Users className="h-7 w-7 text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <CheckCircle className="h-7 w-7 text-green-500" />
              <div>
                <p className="text-xl font-bold text-foreground">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <Activity className="h-7 w-7 text-blue-500" />
              <div>
                <p className="text-xl font-bold text-foreground">{trialCount}</p>
                <p className="text-xs text-muted-foreground">Trial Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <Crown className="h-7 w-7 text-amber-500" />
              <div>
                <p className="text-xl font-bold text-foreground">{proCount}</p>
                <p className="text-xs text-muted-foreground">Pro Users</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or business name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
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
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">All Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => (
                      <TableRow key={u.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/user?id=${u.user_id}`)}>
                        <TableCell className="font-medium text-sm">{u.email || u.user_id.slice(0, 8) + "..."}</TableCell>
                        <TableCell className="text-sm">{u.business_name || "—"}</TableCell>
                        <TableCell>
                          <PlanBadge planName={u.plan_name || "free_trial"} isTrial={u.is_trial} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.subscription_status === "active" ? "default" : "secondary"}>
                            {u.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate(`/admin/user?id=${u.user_id}`)}>
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                          <Button
                            variant={u.subscription_status === "active" ? "outline" : "default"}
                            size="sm"
                            className="text-xs"
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
                              <Button variant="destructive" size="sm" className="text-xs">Remove</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove this user?</AlertDialogTitle>
                                <AlertDialogDescription>This will delete the user and all their data permanently.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeUser(u.user_id)} className="bg-destructive text-destructive-foreground">
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
      </main>
    </div>
  );
}
