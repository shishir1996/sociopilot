import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SetupLayout from "./pages/SetupLayout";
import SetupBusiness from "./pages/setup/SetupBusiness";
import SetupGoals from "./pages/setup/SetupGoals";
import SetupProducts from "./pages/setup/SetupProducts";
import SetupConnect from "./pages/setup/SetupConnect";
import SetupPlan from "./pages/setup/SetupPlan";
import SetupPublish from "./pages/setup/SetupPublish";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLoginPage from "./pages/AdminLoginPage";
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
import AdminPayments from "./pages/AdminPayments";
import AIStudio from "./pages/AIStudio";
import AIVideoStudio from "./pages/AIVideoStudio";
import AdminAIVideoEngine from "./pages/AdminAIVideoEngine";
import Pricing from "./pages/Pricing";
import GoogleMyBusiness from "./pages/GoogleMyBusiness";
import AboutUs from "./pages/legal/AboutUs";
import TermsConditions from "./pages/legal/TermsConditions";
import RefundPolicy from "./pages/legal/RefundPolicy";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Disclaimer from "./pages/legal/Disclaimer";

const queryClient = new QueryClient();

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );
  if (!user) return <AdminLoginPage />;
  return <>{children}</>;
}

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
            <Route path="/setup" element={<SetupLayout />}>
              <Route index element={<Navigate to="business" replace />} />
              <Route path="business" element={<SetupBusiness />} />
              <Route path="goals" element={<SetupGoals />} />
              <Route path="products" element={<SetupProducts />} />
              <Route path="connect" element={<SetupConnect />} />
              <Route path="plan" element={<SetupPlan />} />
              <Route path="publish" element={<SetupPublish />} />
            </Route>
            <Route path="/settings" element={<SocialSettings />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/brand-assets" element={<BrandAssets />} />
            <Route path="/content" element={<ContentPage />} />
            <Route path="/schedule" element={<ScheduleSettings />} />
            <Route path="/ai-studio" element={<AIStudio />} />
            <Route path="/ai-video" element={<AIVideoStudio />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/google-business" element={<GoogleMyBusiness />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
            <Route path="/admin/user" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
            <Route path="/admin/ai" element={<AdminRoute><AdminAIControlCenter /></AdminRoute>} />
            <Route path="/admin/integrations" element={<AdminRoute><AdminSocialIntegrations /></AdminRoute>} />
            <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
            <Route path="/admin/ai-video" element={<AdminRoute><AdminAIVideoEngine /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
