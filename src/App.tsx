import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Simulations from "./pages/Simulations";
import Policies from "./pages/Policies";
import Calculations from "./pages/Calculations";
import TaxEngine from "./pages/TaxEngine";
import Analytics from "./pages/Analytics";
import UserManagement from "./pages/UserManagement";
import SettingsPage from "./pages/SettingsPage";
import TenantManagement from "./pages/TenantManagement";
import LookupTables from "./pages/LookupTables";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/simulations" element={<Simulations />} />
              <Route path="/policies" element={<Policies />} />
              <Route path="/calculations" element={<Calculations />} />
              <Route path="/tax-engine" element={<TaxEngine />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/tenants" element={<TenantManagement />} />
              <Route path="/lookup-tables" element={<LookupTables />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
