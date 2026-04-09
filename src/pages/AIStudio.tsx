import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Image, Type, Palette, PenTool, ImagePlus } from "lucide-react";
import AICaptionGenerator from "@/components/ai-studio/AICaptionGenerator";
import AIAdCopyGenerator from "@/components/ai-studio/AIAdCopyGenerator";
import AIImageGenerator from "@/components/ai-studio/AIImageGenerator";
import AIBrandPresets from "@/components/ai-studio/AIBrandPresets";

type ActiveView = "home" | "caption" | "adcopy" | "image" | "presets";

const tools = [
  {
    id: "caption" as const,
    icon: Type,
    title: "AI Caption Generator",
    description: "Create engaging captions for any social media platform",
    color: "from-primary to-accent",
  },
  {
    id: "adcopy" as const,
    icon: PenTool,
    title: "AI Ad Copy Generator",
    description: "Generate high-converting ad copy and promotional content",
    color: "from-accent to-primary",
  },
  {
    id: "image" as const,
    icon: ImagePlus,
    title: "AI Image Generator",
    description: "Create stunning social media visuals and creatives",
    color: "from-primary to-success",
  },
  {
    id: "presets" as const,
    icon: Palette,
    title: "Brand Presets",
    description: "Save your brand voice, tone, and style for faster generation",
    color: "from-warning to-accent",
  },
];

export default function AIStudio() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ActiveView>("home");
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    if (user) fetchBusiness();
  }, [user]);

  const fetchBusiness = async () => {
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user!.id)
      .limit(1)
      .single();
    setBusiness(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const renderContent = () => {
    switch (activeView) {
      case "caption":
        return <AICaptionGenerator business={business} />;
      case "adcopy":
        return <AIAdCopyGenerator business={business} />;
      case "image":
        return <AIImageGenerator business={business} />;
      case "presets":
        return <AIBrandPresets />;
      default:
        return (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">AI Studio</h2>
              <p className="text-muted-foreground">
                Your AI-powered social media content engine. Generate captions, ad copy, and images in seconds.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {tools.map((tool) => (
                <Card
                  key={tool.id}
                  className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                  onClick={() => setActiveView(tool.id)}
                >
                  <CardContent className="pt-6 pb-6">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <tool.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (activeView === "home" ? navigate("/") : setActiveView("home"))}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {activeView === "home" ? "Dashboard" : "AI Studio"}
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold text-foreground">
                {activeView === "home" && "AI Studio"}
                {activeView === "caption" && "Caption Generator"}
                {activeView === "adcopy" && "Ad Copy Generator"}
                {activeView === "image" && "Image Generator"}
                {activeView === "presets" && "Brand Presets"}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {renderContent()}
      </main>
    </div>
  );
}
