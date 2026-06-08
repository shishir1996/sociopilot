import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Check, Building2, Target, Palette, Share2, Zap, Send } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";

const STEP_ROUTES = ["business", "goals", "products", "connect", "plan", "publish"];
const TOTAL_STEPS = STEP_ROUTES.length;

function stepFromPath(path: string) {
  const idx = STEP_ROUTES.indexOf(path);
  return idx >= 0 ? idx : 0;
}

function pathFromStep(step: number) {
  return STEP_ROUTES[Math.min(step, TOTAL_STEPS - 1)];
}

const stepLabels = [
  { icon: Building2, label: "Business" },
  { icon: Target, label: "Goals & Tone" },
  { icon: Palette, label: "Product Info" },
  { icon: Share2, label: "Connect" },
  { icon: Zap, label: "Choose Plan" },
  { icon: Send, label: "Publishing" },
];

function FloatingParticles({ count = 15 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    left: `${10 + ((i * 37) % 80)}%`,
    top: `${5 + ((i * 53) % 85)}%`,
    size: 1.5 + (i % 3),
    delay: i * 0.7,
    duration: 6 + (i % 6),
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-purple-400/20"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animation: `orb-float-${(i % 3) + 1} ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function SetupContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { form, pubPlatforms, handleSubmit, loading } = useOnboarding();

  const currentStep = stepFromPath(location.pathname.replace("/setup/", ""));
  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;

  const canProceed = () => {
    if (currentStep === 0) return form.name.trim() !== "";
    if (currentStep === 5) return pubPlatforms.length > 0;
    return true;
  };

  const goBack = () => {
    if (currentStep > 0) {
      navigate(`/setup/${pathFromStep(currentStep - 1)}`, { replace: true });
    }
  };

  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      navigate(`/setup/${pathFromStep(currentStep + 1)}`, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 mesh-gradient-dark" />
      <div className="fixed inset-0 bg-grid opacity-[0.03]" />
      <div className="fixed inset-0 bg-gradient-to-b from-purple-500/3 via-transparent to-blue-500/3" />

      <div className="fixed top-[15%] left-[10%] orb orb-1" />
      <div className="fixed bottom-[20%] right-[15%] orb orb-2" />
      <div className="fixed top-[50%] right-[25%] orb orb-3" />

      <FloatingParticles count={20} />

      <div className="relative z-10 w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-premium border-purple-500/20 text-xs font-medium text-purple-300 mb-4 shadow-lg shadow-purple-500/5">
            <Sparkles className="h-3.5 w-3.5" />
            Step {currentStep + 1} of {TOTAL_STEPS}
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            <span className="gradient-text">Set up your business</span>
          </h1>
          <p className="text-sm text-muted-foreground/70 mt-1.5">Takes less than 2 minutes</p>
        </div>

        <div className="relative mb-6">
          <Progress value={progress} className="h-2 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-violet-500" />
        </div>

        <div className="flex items-center justify-between mb-6 px-1">
          {stepLabels.map((s, i) => {
            const Icon = s.icon;
            const isComplete = i < currentStep;
            const isActive = i === currentStep;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-500 ${
                    isComplete
                      ? "bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30"
                      : isActive
                      ? "bg-gradient-to-br from-purple-500/20 to-violet-600/20 text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-500/10"
                      : "bg-white/5 text-muted-foreground/40 border border-white/10"
                  }`}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-300 ${
                  isComplete || isActive ? "text-purple-400" : "text-muted-foreground/40"
                }`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="gradient-border rounded-2xl">
          <div className="glass-premium rounded-2xl backdrop-blur-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500" />
            <CardContent className="p-6 md:p-8">
              <div
                key={currentStep}
                style={{
                  animation: "stagger-fade-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                }}
              >
                <Outlet />
              </div>

              <div className="flex justify-between mt-8 pt-5 border-t border-white/5">
                <Button
                  variant="outline"
                  onClick={goBack}
                  disabled={currentStep === 0}
                  className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-foreground/70 hover:text-foreground transition-all"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>

                {currentStep < TOTAL_STEPS - 1 ? (
                  <Button
                    onClick={goNext}
                    disabled={!canProceed()}
                    className="gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 btn-shine"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || pubPlatforms.length === 0}
                    className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 btn-shine"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {loading ? "Creating..." : "Finish Setup"}
                  </Button>
                )}
              </div>
            </CardContent>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/40 mt-6">
          Your data is encrypted and secure
        </p>
      </div>
    </div>
  );
}

export default function SetupLayout() {
  return (
    <ErrorBoundary>
      <OnboardingProvider>
        <SetupContent />
      </OnboardingProvider>
    </ErrorBoundary>
  );
}
