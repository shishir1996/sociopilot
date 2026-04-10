import { cn } from "@/lib/utils";
import { Image, Layers, Type } from "lucide-react";

const typeConfig: Record<string, { icon: React.ElementType; className: string; label: string }> = {
  "text post": { icon: Type, className: "bg-secondary text-secondary-foreground", label: "Text Post" },
  "image post": { icon: Image, className: "bg-accent/20 text-accent-foreground", label: "Image Post" },
  "carousel": { icon: Layers, className: "bg-primary/15 text-primary", label: "Carousel" },
  // Legacy mappings
  image: { icon: Image, className: "bg-accent/20 text-accent-foreground", label: "Image" },
  text: { icon: Type, className: "bg-secondary text-secondary-foreground", label: "Text" },
};

export function ContentTypeBadge({ type }: { type: string }) {
  const config = typeConfig[type.toLowerCase()] || typeConfig["text post"];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
