import { useEffect } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import {
  Share2, ArrowRight, Lock, Check, CheckCircle2,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SOCIAL_PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", icon: "💼", color: "from-sky-500/20 to-blue-600/20 border-sky-500/30 hover:border-sky-400/50" },
  { id: "instagram", label: "Instagram", icon: "📸", color: "from-pink-500/20 to-rose-600/20 border-pink-500/30 hover:border-pink-400/50" },
  { id: "facebook", label: "Facebook", icon: "📘", color: "from-blue-500/20 to-indigo-600/20 border-blue-500/30 hover:border-blue-400/50" },
];

export default function SetupConnect() {
  const {
    connectedAccounts, connectedCount, connectedList,
    enabledPlatforms, loading, toggleLinkedInPage, handleConnectPlatform,
    loadEnabledPlatforms,
  } = useOnboarding();
  const { toast } = useToast();

  useEffect(() => {
    loadEnabledPlatforms().catch(console.error);
  }, []);

  return (
    <div className="space-y-6 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <Share2 className="h-7 w-7 text-sky-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Connect Social Platforms</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Publish content directly. You can skip and connect later.
        </p>
      </div>

      <div className="space-y-3">
        {SOCIAL_PLATFORMS.map((platform) => {
          const oauthKey = platform.id === "instagram" ? "facebook" : platform.id;
          const isAvailable = enabledPlatforms.includes(oauthKey);
          const alreadyConnected = connectedList.includes(platform.id) || connectedList.includes(oauthKey);
          return (
            <button
              key={platform.id}
              onClick={() => isAvailable
                ? handleConnectPlatform(platform.id)
                : toast({
                    title: "Not available yet",
                    description: "Connect it later from your dashboard's Accounts page.",
                  })}
              disabled={loading || alreadyConnected}
              className={`w-full relative group overflow-hidden rounded-xl border transition-all duration-300 card-3d-float ${
                alreadyConnected
                  ? "bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-emerald-500/30 opacity-80"
                  : isAvailable
                    ? `bg-gradient-to-r ${platform.color}`
                    : "bg-background/30 border-dashed border-border/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  alreadyConnected ? "bg-emerald-500/20 text-emerald-400" : "text-foreground/70"
                }`}>
                  {alreadyConnected ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-lg">{platform.icon}</span>}
                </div>
                <span className="text-sm font-medium">
                  {alreadyConnected ? `${platform.label} Connected` : `Connect ${platform.label}`}
                </span>
                {isAvailable && !alreadyConnected && (
                  <ArrowRight className="h-4 w-4 ml-auto opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                )}
                {!isAvailable && !alreadyConnected && (
                  <Lock className="h-4 w-4 ml-auto opacity-40" />
                )}
                {alreadyConnected && (
                  <Check className="h-4 w-4 ml-auto text-emerald-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {connectedCount > 0 && (
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400/90 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {connectedCount} platform{connectedCount !== 1 ? "s" : ""} connected
        </div>
      )}

      {connectedAccounts
        .filter((a: any) => a.platform === "linkedin" && Array.isArray(a.pages) && a.pages.length > 0)
        .map((acc: any) => (
          <div key={acc.id} className="rounded-xl bg-gradient-to-r from-sky-500/5 to-blue-500/5 border border-sky-500/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-foreground/80 font-medium">
              <span className="text-base">💼</span>
              Publish destinations for LinkedIn
            </div>
            <p className="text-[11px] text-muted-foreground/60">
              Choose where your content will be published:
            </p>
            <div className="space-y-1.5">
              {acc.pages.map((pg: any) => (
                <div
                  key={pg.urn || pg.id}
                  onClick={() => toggleLinkedInPage(acc.id, pg.urn, pg.enabled !== true)}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-background/40 border border-border/40 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{pg.type === "organization" ? "🏢" : "👤"}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate text-foreground/80">{pg.name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground/50 capitalize">{pg.type || "page"}</p>
                    </div>
                  </div>
                  <div
                    className={`relative h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 pointer-events-none ${
                      pg.enabled === true ? "bg-emerald-500" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                        pg.enabled === true ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      {enabledPlatforms.length === 0 && (
        <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 px-4 py-3 text-xs text-foreground/70">
          No platforms are enabled yet. You can <strong className="text-amber-400">Skip & Finish</strong> and connect later from your dashboard → <strong className="text-amber-400">Accounts</strong>.
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground/60 flex items-center justify-center gap-1.5">
        <Shield className="h-3.5 w-3.5" />
        Secure OAuth — no passwords stored
      </p>
    </div>
  );
}
