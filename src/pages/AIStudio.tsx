import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Image, Palette, Zap } from "lucide-react";
import AITextGenerator from "@/components/ai-studio/AITextGenerator";
import AIImageGenerator from "@/components/ai-studio/AIImageGenerator";
import AIBrandPresets from "@/components/ai-studio/AIBrandPresets";

export default function AIStudio() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("text");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold text-foreground">AI Studio</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Text Generator</span>
              <span className="sm:hidden">Text</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Image Generator</span>
              <span className="sm:hidden">Image</span>
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Brand Presets</span>
              <span className="sm:hidden">Presets</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text">
            <AITextGenerator business={business} />
          </TabsContent>
          <TabsContent value="image">
            <AIImageGenerator business={business} />
          </TabsContent>
          <TabsContent value="presets">
            <AIBrandPresets />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
