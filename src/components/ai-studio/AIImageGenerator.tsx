import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Image, Sparkles, RefreshCw } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const platforms = ["Instagram Post", "Instagram Story", "Facebook Post", "LinkedIn Post", "X Post", "Ad Creative"];
const imageStyles = ["Realistic", "3D", "Minimal", "Luxury", "Corporate", "Product Ad", "Creative Marketing", "Flat Design", "Cinematic", "Poster Style"];
const aspectRatios = ["1:1", "4:5", "16:9", "9:16"];

export default function AIImageGenerator({ business }: { business: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [promptUsed, setPromptUsed] = useState("");

  const [platform, setPlatform] = useState("Instagram Post");
  const [imageStyle, setImageStyle] = useState("Minimal");
  const [brandName, setBrandName] = useState(business?.name || "");
  const [productDetails, setProductDetails] = useState(business?.products_services || "");
  const [offerMessage, setOfferMessage] = useState("");
  const [mainText, setMainText] = useState("");
  const [secondaryText, setSecondaryText] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [colorPref, setColorPref] = useState("");
  const [audienceType, setAudienceType] = useState(business?.target_audience || "");
  const [designMood, setDesignMood] = useState("Professional");
  const [promptDetails, setPromptDetails] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [numImages, setNumImages] = useState(1);

  useEffect(() => {
    if (business) {
      setBrandName(business.name || "");
      setProductDetails(business.products_services || "");
      setAudienceType(business.target_audience || "");
    }
  }, [business]);

  const generate = async () => {
    if (!user) return;
    setGenerating(true);
    setImages([]);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-image", {
        body: {
          platform, image_style: imageStyle, brand_name: brandName,
          product_details: productDetails, offer_message: offerMessage,
          main_text: mainText, secondary_text: secondaryText, cta_text: ctaText,
          color_preference: colorPref, audience_type: audienceType,
          design_mood: designMood, prompt_details: promptDetails,
          aspect_ratio: aspectRatio, num_images: numImages,
          business_id: business?.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setImages(data.images || []);
      setPromptUsed(data.prompt_used || "");
      toast({ title: "🎨 Images generated!", description: `${(data.images || []).length} image(s) ready.` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Form */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Image Style</Label>
                <Select value={imageStyle} onValueChange={setImageStyle}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{imageStyles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div><Label>Brand Name</Label><Input value={brandName} onChange={e => setBrandName(e.target.value)} /></div>
            <div><Label>Product / Service Details</Label><Input value={productDetails} onChange={e => setProductDetails(e.target.value)} /></div>
            <div><Label>Offer / Message</Label><Input value={offerMessage} onChange={e => setOfferMessage(e.target.value)} placeholder="e.g. 50% off this weekend" /></div>
            <div><Label>Main Text on Image</Label><Input value={mainText} onChange={e => setMainText(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Secondary Text</Label><Input value={secondaryText} onChange={e => setSecondaryText(e.target.value)} /></div>
              <div><Label>CTA Text</Label><Input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Shop Now" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Color Preference</Label><Input value={colorPref} onChange={e => setColorPref(e.target.value)} placeholder="Brand colors" /></div>
              <div><Label>Design Mood</Label><Input value={designMood} onChange={e => setDesignMood(e.target.value)} /></div>
            </div>
            <div><Label>Audience Type</Label><Input value={audienceType} onChange={e => setAudienceType(e.target.value)} /></div>
            <div><Label>Prompt Details</Label><Textarea value={promptDetails} onChange={e => setPromptDetails(e.target.value)} rows={2} placeholder="Describe visual elements..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{aspectRatios.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Number of Images</Label>
                <Select value={String(numImages)} onValueChange={v => setNumImages(parseInt(v))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="4">4</SelectItem></SelectContent></Select>
              </div>
            </div>
            <Button onClick={generate} className="w-full bg-gradient-to-r from-primary to-accent border-0" disabled={generating}>
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Image className="h-4 w-4 mr-2" /> Generate Images</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Output */}
      <div className="lg:col-span-3 space-y-4">
        {generating && (
          <Card><CardContent className="py-16 text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">AI is generating your images...</p>
            <p className="text-xs text-muted-foreground">This may take 15-30 seconds per image</p>
          </CardContent></Card>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((url, i) => (
              <Card key={i} className="overflow-hidden">
                <img src={url} alt={`Generated ${i + 1}`} className="w-full aspect-square object-cover" />
                <CardContent className="pt-3 pb-3 flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={url} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5 mr-1" /> Download
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {promptUsed && (
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">System Generated Prompt</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{promptUsed}</p>
            </CardContent>
          </Card>
        )}

        {!generating && images.length === 0 && (
          <Card><CardContent className="py-16 text-center space-y-3">
            <Image className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Configure your image settings and click Generate</p>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
