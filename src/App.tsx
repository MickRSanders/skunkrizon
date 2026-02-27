import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { TaxConfigProvider } from "@/contexts/TaxConfigContext";
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
import FieldLibrary from "./pages/FieldLibrary";
import DataSources from "./pages/DataSources";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import RolesPermissions from "./pages/RolesPermissions";
import ProfilePage from "./pages/ProfilePage";
import AuditLog from "./pages/AuditLog";
import PreTravel from "./pages/PreTravel";
import PreTravelDetail from "./pages/PreTravelDetail";
import ResetPassword from "./pages/ResetPassword";
import EmployeeDirectory from "./pages/EmployeeDirectory";
import Documents from "./pages/Documents";
import FieldMappings from "./pages/FieldMappings";
import CostEstimateTemplates from "./pages/CostEstimateTemplates";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantProvider>
      <TaxConfigProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/simulations" element={<Simulations />} />
              <Route path="/pre-travel" element={<PreTravel />} />
              <Route path="/pre-travel/:id" element={<PreTravelDetail />} />
              <Route path="/policies" element={<Policies />} />
              <Route path="/calculations" element={<Calculations />} />
              <Route path="/tax-engine" element={<TaxEngine />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/tenants" element={<TenantManagement />} />
              <Route path="/lookup-tables" element={<LookupTables />} />
              <Route path="/field-library" element={<FieldLibrary />} />
              <Route path="/data-sources" element={<DataSources />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/roles" element={<RolesPermissions />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/employees" element={<EmployeeDirectory />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/field-mappings" element={<FieldMappings />} />
              <Route path="/cost-estimate-templates" element={<CostEstimateTemplates />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </TaxConfigProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
