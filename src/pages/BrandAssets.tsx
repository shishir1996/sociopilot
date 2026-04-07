import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Upload, Trash2, Building2, Package, Loader2,
  Star, Palette, Type,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BrandAsset {
  id: string;
  asset_type: string;
  file_url: string;
  label: string | null;
  created_at: string;
}

const ASSET_TYPES = [
  { value: "logo", label: "Company Logo", icon: Star, description: "Your brand logo shown in your dashboard" },
  { value: "product_image", label: "Product Image", icon: Package, description: "Photos of your products" },
  { value: "service_image", label: "Service Image", icon: Building2, description: "Images representing your services" },
] as const;

const DEFAULT_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export default function BrandAssets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [brandColors, setBrandColors] = useState<string[]>(DEFAULT_COLORS);
  const [slogan, setSlogan] = useState("");
  const [savingBrand, setSavingBrand] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user) return;
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, brand_colors, slogan")
      .eq("user_id", user.id)
      .limit(1) as any;

    if (biz && biz.length > 0) {
      setBusinessId(biz[0].id);
      if (biz[0].brand_colors && biz[0].brand_colors.length > 0) {
        const colors = [...biz[0].brand_colors];
        while (colors.length < 5) colors.push(DEFAULT_COLORS[colors.length]);
        setBrandColors(colors.slice(0, 5));
      }
      if (biz[0].slogan) setSlogan(biz[0].slogan);

      const { data: assetData } = await supabase
        .from("brand_assets")
        .select("id, asset_type, file_url, label, created_at")
        .eq("business_id", biz[0].id)
        .order("created_at", { ascending: false });
      setAssets((assetData as BrandAsset[]) || []);
    }
    setLoading(false);
  };

  const saveBrandInfo = async () => {
    if (!businessId) return;
    setSavingBrand(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({ brand_colors: brandColors, slogan } as any)
        .eq("id", businessId);
      if (error) throw error;
      toast({ title: "Saved!", description: "Brand colors and slogan updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSavingBrand(false);
  };

  const handleUpload = async (assetType: string, file: File) => {
    if (!user || !businessId) return;
    setUploading(assetType);

    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${assetType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("content-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("content-images")
        .getPublicUrl(path);

      const { error: insertError } = await supabase.from("brand_assets").insert({
        user_id: user.id,
        business_id: businessId,
        asset_type: assetType,
        file_url: urlData.publicUrl,
        label: file.name,
      });

      if (insertError) throw insertError;

      toast({ title: "Uploaded!", description: `${assetType.replace("_", " ")} uploaded successfully.` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(null);
  };

  const handleDelete = async (asset: BrandAsset) => {
    try {
      const urlParts = asset.file_url.split("/content-images/");
      if (urlParts[1]) {
        await supabase.storage.from("content-images").remove([decodeURIComponent(urlParts[1])]);
      }
      const { error } = await supabase.from("brand_assets").delete().eq("id", asset.id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Asset removed." });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const onFileSelected = (assetType: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 5MB per image.", variant: "destructive" });
        return;
      }
      handleUpload(assetType, file);
    }
    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <Building2 className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Set up your business first</h2>
            <Button onClick={() => navigate("/setup")} className="gradient-primary border-0">
              Go to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card h-14 flex items-center px-4 sm:px-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="ml-4 text-lg font-bold text-foreground">Brand Assets</h1>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <p className="text-sm text-muted-foreground">
          Upload your logo, product images, and service photos. Set your brand colors and slogan for AI-generated content with a more authentic, human touch.
        </p>

        {/* Brand Colors */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Brand Colors</CardTitle>
                <p className="text-xs text-muted-foreground">Choose 5 colors that represent your brand</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-5 gap-3">
              {brandColors.map((color, idx) => (
                <div key={idx} className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Color {idx + 1}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const updated = [...brandColors];
                        updated[idx] = e.target.value;
                        setBrandColors(updated);
                      }}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0"
                    />
                    <Input
                      value={color}
                      onChange={(e) => {
                        const updated = [...brandColors];
                        updated[idx] = e.target.value;
                        setBrandColors(updated);
                      }}
                      className="text-xs h-8 font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {brandColors.map((c, i) => (
                <div key={i} className="h-8 flex-1 rounded-md border border-border" style={{ backgroundColor: c }} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Slogan / Tagline */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Type className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Slogan / Tagline</CardTitle>
                <p className="text-xs text-muted-foreground">Your brand's catchy tagline used in content</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="e.g. Empowering businesses to grow smarter"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              maxLength={150}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{slogan.length}/150 characters</p>
          </CardContent>
        </Card>

        {/* Save brand info button */}
        <Button
          onClick={saveBrandInfo}
          disabled={savingBrand}
          className="gradient-primary border-0 w-full sm:w-auto"
        >
          {savingBrand ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Brand Colors & Slogan"}
        </Button>

        {/* Asset upload sections */}
        {ASSET_TYPES.map((type) => {
          const typeAssets = assets.filter((a) => a.asset_type === type.value);
          const isUploading = uploading === type.value;

          return (
            <Card key={type.value} className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <type.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{type.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {typeAssets.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {typeAssets.map((asset) => (
                      <div key={asset.id} className="relative group rounded-lg overflow-hidden border border-border">
                        <img
                          src={asset.file_url}
                          alt={asset.label || type.label}
                          className="w-full h-28 object-cover"
                        />
                        <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="destructive" className="h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove this image.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(asset)} className="bg-destructive text-destructive-foreground">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        {asset.label && (
                          <p className="text-[10px] text-muted-foreground truncate px-2 py-1">{asset.label}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => { fileInputRefs.current[type.value] = el; }}
                  onChange={onFileSelected(type.value)}
                />
                <Button
                  variant="outline"
                  className="w-full border-dashed h-12"
                  disabled={isUploading}
                  onClick={() => fileInputRefs.current[type.value]?.click()}
                >
                  {isUploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" /> Upload {type.label}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
