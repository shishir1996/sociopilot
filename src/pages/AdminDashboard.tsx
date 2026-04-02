import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Shield, Users, Building2, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface UserProfile {
  user_id: string;
  email: string;
  business_name: string | null;
  industry: string | null;
  platforms: string[] | null;
  timezone: string | null;
  subscription_status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      // Fetch all businesses (admin can see via RLS on businesses is user-scoped, 
      // so we use a different approach - fetch subscriptions which admin CAN see)
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*") as any;

      const { data: businesses } = await supabase
        .from("businesses")
        .select("*") as any;

      // Merge data - subscriptions are admin-visible, businesses need service role
      // For now, build user list from subscriptions + businesses
      const userMap = new Map<string, UserProfile>();

      // Add from subscriptions
      (subs || []).forEach((sub: any) => {
        userMap.set(sub.user_id, {
          user_id: sub.user_id,
          email: "",
          business_name: null,
          industry: null,
          platforms: null,
          timezone: null,
          subscription_status: sub.status,
          created_at: sub.created_at,
        });
      });

      // Enrich with business data (admin won't see these via RLS, so we'll use edge function)
      // For simplicity, fetch via edge function
      const { data: adminData, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_users" },
      });

      if (adminData?.users) {
        setUsers(adminData.users);
      } else {
        // Fallback: just show subscription data
        setUsers(Array.from(userMap.values()));
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
      toast({ title: "User Removed", description: "User and all their data have been deleted" });
      fetchAllUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-heading font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.subscription_status === "active").length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.business_name).length}
                </p>
                <p className="text-sm text-muted-foreground">With Business Profile</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No users yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium text-sm">{u.email || u.user_id.slice(0, 8) + "..."}</TableCell>
                        <TableCell className="text-sm">{u.business_name || "—"}</TableCell>
                        <TableCell className="text-sm">{u.industry || "—"}</TableCell>
                        <TableCell className="text-sm">{u.timezone || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={u.subscription_status === "active" ? "default" : "secondary"}>
                            {u.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
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
                              <>
                                <XCircle className="h-3 w-3 mr-1" /> Revoke
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" /> Activate
                              </>
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="text-xs">
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove this user?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete the user's account and all their data permanently.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeUser(u.user_id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
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
