import { Building2, Globe } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useOnboarding } from "@/contexts/OnboardingContext";

const INDUSTRIES = [
  "Real Estate", "SaaS / Tech", "E-Commerce", "Coaching / Consulting",
  "Healthcare", "Education", "Restaurant / Food", "Fitness / Wellness",
  "Fashion / Beauty", "Finance / Insurance", "Travel / Hospitality", "Other",
];

const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Singapore",
  "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland", "America/Sao_Paulo", "Africa/Lagos",
];

export default function SetupBusiness() {
  const { form, updateField } = useOnboarding();

  return (
    <div className="space-y-5 stagger-enter">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 flex items-center justify-center mx-auto mb-3 gradient-border">
          <Building2 className="h-7 w-7 text-purple-400" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Business Details</h3>
        <p className="text-sm text-muted-foreground mt-1">Tell us about your company</p>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Business Name *</Label>
        <div className="relative group">
          <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-purple-400 transition-colors" />
          <Input
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="e.g. Acme Corp"
            className="h-11 pl-10 bg-background/50 border-border/50 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Industry</Label>
        <select
          value={form.industry}
          onChange={(e) => updateField("industry", e.target.value)}
          className="flex h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500/50 transition-all"
        >
          <option value="">Select your industry</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Target Audience</Label>
        <Input
          value={form.target_audience}
          onChange={(e) => updateField("target_audience", e.target.value)}
          placeholder="e.g. Small business owners, 25-45"
          className="h-11 bg-background/50 border-border/50 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80">Timezone *</Label>
        <select
          value={form.timezone}
          onChange={(e) => updateField("timezone", e.target.value)}
          className="flex h-11 w-full rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500/50 transition-all"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
