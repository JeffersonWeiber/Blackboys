import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TrackingScripts } from "@/components/tracking/TrackingScripts";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import Index from "./pages/Index";
import Works from "./pages/Works";
import Processo from "./pages/Processo";
import Sobre from "./pages/Sobre";
import Contato from "./pages/Contato";
import NichoPage from "./pages/NichoPage";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import LeadsList from "./pages/admin/LeadsList";
import LeadDetail from "./pages/admin/LeadDetail";
import Portfolio from "./pages/admin/Portfolio";
import PortfolioForm from "./pages/admin/PortfolioForm";
import NichesList from "./pages/admin/NichesList";
import NichesForm from "./pages/admin/NichesForm";
import ClientsList from "./pages/admin/ClientsList";
import ClientsForm from "./pages/admin/ClientsForm";
import Analytics from "./pages/admin/Analytics";
import Tracking from "./pages/admin/Tracking";
import Config from "./pages/admin/Config";
import BudgetTemplatesList from "./pages/admin/BudgetTemplatesList";
import BudgetTemplateForm from "./pages/admin/BudgetTemplateForm";
import BudgetPublic from "./pages/BudgetPublic";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <TrackingScripts />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/works" element={<Works />} />
            <Route path="/processo" element={<Processo />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="/nicho/:nicho" element={<NichoPage />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/leads"
              element={
                <ProtectedRoute>
                  <LeadsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/leads/:id"
              element={
                <ProtectedRoute>
                  <LeadDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/portfolio"
              element={
                <ProtectedRoute>
                  <Portfolio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/portfolio/new"
              element={
                <ProtectedRoute>
                  <PortfolioForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/portfolio/:id/edit"
              element={
                <ProtectedRoute>
                  <PortfolioForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/nichos"
              element={
                <ProtectedRoute>
                  <NichesList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/nichos/new"
              element={
                <ProtectedRoute>
                  <NichesForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/nichos/:id/edit"
              element={
                <ProtectedRoute>
                  <NichesForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clients"
              element={
                <ProtectedRoute>
                  <ClientsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clients/new"
              element={
                <ProtectedRoute>
                  <ClientsForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clients/:id/edit"
              element={
                <ProtectedRoute>
                  <ClientsForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tracking"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Tracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/config"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Config />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/orcamentos"
              element={
                <ProtectedRoute>
                  <BudgetTemplatesList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/orcamentos/new"
              element={
                <ProtectedRoute>
                  <BudgetTemplateForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/orcamentos/:id/edit"
              element={
                <ProtectedRoute>
                  <BudgetTemplateForm />
                </ProtectedRoute>
              }
            />
            
            <Route path="/orcamento/:token" element={<BudgetPublic />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
