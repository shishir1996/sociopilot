import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformBadge } from "./PlatformBadge";
import { ContentTypeBadge } from "./ContentTypeBadge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  X, ChevronLeft, ChevronRight, Copy, Check, Hash, ExternalLink,
  Download, ArrowLeft, Loader2, FileText,
} from "@/lib/icons";

interface CarouselSlide {
  prompt?: string;
  image_url: string | null;
}

interface ContentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    dayNumber: number;
    theme: string;
    goal: string;
    primaryPlatform: string;
    secondaryPlatforms: string[];
    contentType: string;
    topic: string;
    hook: string;
    painPoint: string;
    coreMessage: string;
    cta: string;
    postingTime: string;
    scheduledAt?: string | null;
    whyItMatters: string;
    status: string;
    caption?: string;
    hashtags?: string[];
    imagePrompt?: string;
    imageUrl?: string;
    visualStyle?: string;
    repurposingSuggestion?: string;
    carouselSlides?: CarouselSlide[] | null;
  };
}

export function ContentDetailModal({ open, onOpenChange, item }: ContentDetailModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("content");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCarouselIndex(0);
    setActiveTab("content");

    if (item.contentType === "Carousel") {
      if (item.carouselSlides && item.carouselSlides.length > 0) {
        setCarouselSlides(item.carouselSlides);
      } else {
        fetchCarouselSlides();
      }
    }
  }, [open, item.id]);

  const fetchCarouselSlides = async () => {
    setLoadingSlides(true);
    try {
      const { data } = await supabase
        .from("content_items")
        .select("carousel_slides, image_url")
        .eq("id", item.id)
        .single() as any;
      if (data?.carousel_slides) {
        const slides = Array.isArray(data.carousel_slides)
          ? data.carousel_slides
          : typeof data.carousel_slides === "string"
            ? JSON.parse(data.carousel_slides)
            : [];
        setCarouselSlides(slides);
      } else if (data?.image_url) {
        setCarouselSlides([{ image_url: data.image_url, prompt: item.imagePrompt }]);
      }
    } catch { /* ignore */ }
    setLoadingSlides(false);
  };

  const handleCopyCaption = async () => {
    const fullText = item.caption
      ? `${item.caption}\n\n${(item.hashtags || []).map(h => h.startsWith("#") ? h : `#${h}`).join(" ")}`
      : `${item.hook}\n\n${item.coreMessage}\n\n${item.cta}`;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Caption copied to clipboard" });
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const scheduledDateLabel = item.scheduledAt
    ? new Date(item.scheduledAt).toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "short", year: "numeric" })
    : null;
  const scheduledTimeLabel = item.scheduledAt
    ? new Date(item.scheduledAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : item.postingTime || null;

  const isPdfUrl = (url: string) => url.toLowerCase().endsWith(".pdf") || url.startsWith("data:application/pdf");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <span className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-lg font-bold text-primary-foreground shrink-0">
              {item.dayNumber}
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg">{item.theme}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {dayNames[item.dayNumber - 1] || `Day ${item.dayNumber}`}
                {scheduledDateLabel && ` · ${scheduledDateLabel}`}
                {scheduledTimeLabel && ` · ${scheduledTimeLabel}`}
              </p>
            </div>
          </div>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
            {(item.imageUrl || carouselSlides.length > 0 || item.imagePrompt) && (
              <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
            )}
            {(item.caption || item.hashtags?.length) && (
              <TabsTrigger value="caption" className="text-xs">Caption</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="content" className="space-y-4 pt-4">
            {/* Platforms & Type */}
            <div className="flex flex-wrap gap-2">
              <PlatformBadge platform={item.primaryPlatform} />
              {item.secondaryPlatforms?.map((p) => (
                <PlatformBadge key={p} platform={p} />
              ))}
              <ContentTypeBadge type={item.contentType} />
              <Badge variant="secondary" className="text-xs capitalize">{item.status}</Badge>
            </div>

            {/* Topic */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Topic</p>
              <p className="text-sm font-semibold text-foreground">{item.topic}</p>
              {item.goal && <p className="text-xs text-muted-foreground">Goal: {item.goal}</p>}
            </div>

            {/* Hook */}
            <div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
              <p className="text-xs font-medium text-accent mb-1">🔥 Hook</p>
              <p className="text-sm text-foreground italic">"{item.hook}"</p>
            </div>

            {/* Pain Point */}
            {item.painPoint && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pain Point</p>
                <p className="text-sm text-foreground">{item.painPoint}</p>
              </div>
            )}

            {/* Core Message */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Core Message</p>
              <p className="text-sm text-foreground">{item.coreMessage}</p>
            </div>

            {/* CTA */}
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-1">🎯 Call to Action</p>
              <p className="text-sm font-semibold text-foreground">{item.cta}</p>
            </div>

            {/* Why it matters */}
            {item.whyItMatters && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Why It Matters</p>
                <p className="text-sm text-muted-foreground">{item.whyItMatters}</p>
              </div>
            )}

            {/* Repurposing */}
            {item.repurposingSuggestion && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Repurposing</p>
                <p className="text-sm text-muted-foreground">{item.repurposingSuggestion}</p>
              </div>
            )}

            {/* Visual style */}
            {item.visualStyle && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Visual Style</p>
                <p className="text-sm text-muted-foreground">{item.visualStyle}</p>
              </div>
            )}

            {/* Image prompt */}
            {item.imagePrompt && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Image Prompt</p>
                <p className="text-sm text-muted-foreground">{item.imagePrompt}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-4 pt-4">
            {loadingSlides ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Single image */}
                {item.imageUrl && !item.carouselSlides && (
                  <div className="rounded-xl overflow-hidden border border-border bg-muted">
                    <img
                      src={item.imageUrl}
                      alt={`Visual for: ${item.topic}`}
                      className="w-full max-h-[500px] object-contain"
                    />
                    <div className="flex items-center justify-between p-3 bg-card border-t border-border">
                      <a
                        href={item.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Open full size
                      </a>
                      <a
                        href={item.imageUrl}
                        download
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </div>
                  </div>
                )}

                {/* PDF Viewer */}
                {item.imageUrl && isPdfUrl(item.imageUrl) && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <embed
                      src={item.imageUrl}
                      type="application/pdf"
                      className="w-full h-[600px]"
                    />
                    <div className="flex items-center justify-between p-3 bg-card border-t border-border">
                      <a
                        href={item.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Open PDF
                      </a>
                      <a
                        href={item.imageUrl}
                        download
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> Download PDF
                      </a>
                    </div>
                  </div>
                )}

                {/* Carousel slides */}
                {carouselSlides.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Carousel · Slide {carouselIndex + 1} of {carouselSlides.length}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={carouselIndex === 0}
                          onClick={() => setCarouselIndex(i => Math.max(0, i - 1))}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={carouselIndex >= carouselSlides.length - 1}
                          onClick={() => setCarouselIndex(i => Math.min(carouselSlides.length - 1, i + 1))}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-border bg-muted">
                      {carouselSlides[carouselIndex]?.image_url ? (
                        (() => {
                          const url = carouselSlides[carouselIndex].image_url!;
                          if (isPdfUrl(url)) {
                            return (
                              <div className="w-full h-[500px]">
                                <embed src={url} type="application/pdf" className="w-full h-full" />
                              </div>
                            );
                          }
                          return (
                            <img
                              src={url}
                              alt={`Carousel slide ${carouselIndex + 1}`}
                              className="w-full max-h-[500px] object-contain"
                            />
                          );
                        })()
                      ) : (
                        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                          No image generated for this slide yet
                        </div>
                      )}
                    </div>
                    {carouselSlides[carouselIndex]?.prompt && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Prompt: {carouselSlides[carouselIndex].prompt}
                      </p>
                    )}
                    <div className="flex justify-center gap-1.5 mt-3">
                      {carouselSlides.map((_, i) => (
                        <button
                          key={i}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            i === carouselIndex ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                          onClick={() => setCarouselIndex(i)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* No image yet */}
                {!item.imageUrl && item.imagePrompt && carouselSlides.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Image is being generated</p>
                    <p className="text-xs text-muted-foreground mt-1">Check back after the content plan finishes generating images.</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="caption" className="space-y-4 pt-4">
            {item.caption ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Caption</p>
                  <button onClick={handleCopyCaption} className="text-xs text-primary hover:underline flex items-center gap-1">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{item.caption}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Caption</p>
                <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-2">
                  <p className="text-sm text-foreground">{item.hook}</p>
                  <p className="text-sm text-muted-foreground">{item.coreMessage}</p>
                  <p className="text-sm font-semibold text-primary">{item.cta}</p>
                </div>
              </div>
            )}

            {item.hashtags && item.hashtags.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hashtags</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.hashtags.map((h, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {h.startsWith("#") ? h : `#${h}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
