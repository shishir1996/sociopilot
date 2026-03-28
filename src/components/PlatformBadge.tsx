import { cn } from "@/lib/utils";

const platformStyles: Record<string, string> = {
  instagram: "bg-platform-instagram/15 text-platform-instagram",
  facebook: "bg-platform-facebook/15 text-platform-facebook",
  linkedin: "bg-platform-linkedin/15 text-platform-linkedin",
  "x (twitter)": "bg-platform-twitter/15 text-platform-twitter",
  twitter: "bg-platform-twitter/15 text-platform-twitter",
  "google business profile": "bg-platform-gmb/15 text-platform-gmb",
  gmb: "bg-platform-gmb/15 text-platform-gmb",
  youtube: "bg-platform-youtube/15 text-platform-youtube",
};

export function PlatformBadge({ platform }: { platform: string }) {
  const style = platformStyles[platform.toLowerCase()] || "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", style)}>
      {platform}
    </span>
  );
}
