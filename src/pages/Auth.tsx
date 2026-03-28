import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Sparkles, TrendingUp } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "Check your email to confirm your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col justify-between p-12">
        <div>
          <h1 className="text-3xl font-heading font-bold text-primary-foreground tracking-tight">
            ContentFlow
          </h1>
          <p className="mt-1 text-sm text-muted-foreground" style={{ color: 'hsl(220 14% 60%)' }}>
            AI-Powered Content Strategy
          </p>
        </div>

        <div className="space-y-8">
          <FeatureItem
            icon={<CalendarDays className="h-6 w-6" />}
            title="7-Day Content Plans"
            description="Get a complete weekly content calendar tailored to your business."
          />
          <FeatureItem
            icon={<Sparkles className="h-6 w-6" />}
            title="Multi-Platform Ready"
            description="Content optimized for Instagram, LinkedIn, Facebook, GMB & more."
          />
          <FeatureItem
            icon={<TrendingUp className="h-6 w-6" />}
            title="Growth-Focused"
            description="Every post designed to drive awareness, trust, and conversions."
          />
        </div>

        <p className="text-xs" style={{ color: 'hsl(220 14% 45%)' }}>
          © 2026 ContentFlow. All rights reserved.
        </p>
      </div>

      {/* Right panel - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-elevated border-border">
          <CardHeader className="text-center space-y-2 pb-2">
            <h2 className="text-2xl font-heading font-bold text-foreground">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to access your content plans"
                : "Start building your content strategy"}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="p-3 rounded-lg" style={{ backgroundColor: 'hsl(172 66% 38% / 0.15)', color: 'hsl(172 66% 48%)' }}>
        {icon}
      </div>
      <div>
        <h3 className="font-heading font-semibold" style={{ color: 'hsl(0 0% 95%)' }}>{title}</h3>
        <p className="text-sm mt-1" style={{ color: 'hsl(220 14% 55%)' }}>{description}</p>
      </div>
    </div>
  );
}
