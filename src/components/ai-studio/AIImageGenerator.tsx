import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, ImagePlus, Type } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const platforms = ["Instagram Post", "Instagram Story", "Facebook Post", "LinkedIn Post", "X Post", "Ad Creative"];
const imageStyles = ["Minimal", "Luxury", "Corporate", "Product Ad", "Creative Marketing", "Flat Design", "Cinematic", "Poster Style"];
const aspectRatios = ["1:1", "4:5", "16:9", "9:16"];

export default function AIImageGenerator({ business }: { business: any }) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const [platform, setPlatform] = useState("Instagram Post");
  const [imageStyle, setImageStyle] = useState("Minimal");
  const [brandName, setBrandName] = useState(business?.name || "");
  const [mainText, setMainText] = useState("");
  const [offer, setOffer] = useState("");
  const [colorPref, setColorPref] = useState("");
  const [promptDetails, setPromptDetails] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");

  const handleGenerate = () => {
    if (!mainText.trim() && !promptDetails.trim()) {
      toast({ title: "Please describe what you want", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setImages([]);

    // Simulated — will be replaced in Phase 2
    setTimeout(() => {
      setImages([
        "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=600&fit=crop",
        "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&h=600&fit=crop",
      ]);
      setGenerating(false);
      toast({ title: "🎨 Images generated!", description: "2 images ready for download." });
    }, 3000);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Style</Label>
                <Select value={imageStyle} onValueChange={setImageStyle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{imageStyles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Brand Name</Label>
              <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your brand name" />
            </div>

            <div>
              <Label>Main Text / Headline</Label>
              <Input value={mainText} onChange={e => setMainText(e.target.value)} placeholder="e.g. 50% OFF Everything" />
            </div>

            <div>
              <Label>Offer or Message <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={offer} onChange={e => setOffer(e.target.value)} placeholder="e.g. Summer Sale - Limited Time" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Color Preference</Label>
                <Input value={colorPref} onChange={e => setColorPref(e.target.value)} placeholder="e.g. Black & Gold" />
              </div>
              <div>
                <Label>Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{aspectRatios.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Describe your image <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={promptDetails}
                onChange={e => setPromptDetails(e.target.value)}
                rows={2}
                placeholder="Describe visual elements, mood, layout..."
              />
            </div>

            <Button onClick={handleGenerate} className="w-full bg-gradient-to-r from-primary to-success border-0" disabled={generating}>
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating images...</>
              ) : (
                <><ImagePlus className="h-4 w-4 mr-2" /> Generate Images</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3 space-y-4">
        {generating && (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="font-medium text-foreground">AI is creating your images...</p>
              <p className="text-sm text-muted-foreground">This may take 15-30 seconds</p>
            </CardContent>
          </Card>
        )}

        {images.length > 0 && (
          <>
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
                    <Button size="sm" variant="outline">
                      <Type className="h-3.5 w-3.5 mr-1" /> Generate Caption
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {!generating && images.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <ImagePlus className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="font-medium text-foreground">Ready to create stunning visuals</p>
              <p className="text-sm text-muted-foreground">Describe your image and click Generate</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
