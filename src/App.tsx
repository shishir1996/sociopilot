import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BusinessSetup from "./pages/BusinessSetup";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminUserDetail from "./pages/AdminUserDetail";
import NotFound from "./pages/NotFound";
import SocialSettings from "./pages/SocialSettings";
import AccountSettings from "./pages/AccountSettings";
import BrandAssets from "./pages/BrandAssets";
import ContentPage from "./pages/ContentPage";
import ScheduleSettings from "./pages/ScheduleSettings";
import AdminAIControlCenter from "./pages/AdminAIControlCenter";
import AdminSocialIntegrations from "./pages/AdminSocialIntegrations";
import AIStudio from "./pages/AIStudio";
import Pricing from "./pages/Pricing";
import GoogleMyBusiness from "./pages/GoogleMyBusiness";
import AboutUs from "./pages/legal/AboutUs";
import TermsConditions from "./pages/legal/TermsConditions";
import RefundPolicy from "./pages/legal/RefundPolicy";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Disclaimer from "./pages/legal/Disclaimer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup" element={<BusinessSetup />} />
            <Route path="/settings" element={<SocialSettings />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/brand-assets" element={<BrandAssets />} />
            <Route path="/content" element={<ContentPage />} />
            <Route path="/schedule" element={<ScheduleSettings />} />
            <Route path="/ai-studio" element={<AIStudio />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/google-business" element={<GoogleMyBusiness />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/user" element={<AdminUserDetail />} />
            <Route path="/admin/ai" element={<AdminAIControlCenter />} />
            <Route path="/admin/integrations" element={<AdminSocialIntegrations />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
