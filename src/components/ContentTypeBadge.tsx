import { cn } from "@/lib/utils";
import { Image, Layers, Video, Type } from "lucide-react";

const typeConfig: Record<string, { icon: React.ElementType; className: string }> = {
  image: { icon: Image, className: "bg-accent/20 text-accent-foreground" },
  carousel: { icon: Layers, className: "bg-primary/15 text-primary" },
  reel: { icon: Video, className: "bg-destructive/15 text-destructive" },
  video: { icon: Video, className: "bg-destructive/15 text-destructive" },
  text: { icon: Type, className: "bg-secondary text-secondary-foreground" },
};

export function ContentTypeBadge({ type }: { type: string }) {
  const config = typeConfig[type.toLowerCase()] || typeConfig.text;
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium", config.className)}>
      <Icon className="h-3 w-3" />
      {type}
    </span>
  );
}
