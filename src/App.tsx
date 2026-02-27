import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { TaxConfigProvider } from "@/contexts/TaxConfigContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModuleGuard from "@/components/ModuleGuard";
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
      <ImpersonationProvider>
      <TenantProvider>
      <TaxConfigProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/:slug" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/simulations" element={<ModuleGuard><Simulations /></ModuleGuard>} />
              <Route path="/pre-travel" element={<ModuleGuard><PreTravel /></ModuleGuard>} />
              <Route path="/pre-travel/:id" element={<ModuleGuard><PreTravelDetail /></ModuleGuard>} />
              <Route path="/policies" element={<ModuleGuard><Policies /></ModuleGuard>} />
              <Route path="/calculations" element={<ModuleGuard><Calculations /></ModuleGuard>} />
              <Route path="/tax-engine" element={<ModuleGuard><TaxEngine /></ModuleGuard>} />
              <Route path="/analytics" element={<ModuleGuard><Analytics /></ModuleGuard>} />
              <Route path="/users" element={<ModuleGuard><UserManagement /></ModuleGuard>} />
              <Route path="/tenants" element={<ModuleGuard><TenantManagement /></ModuleGuard>} />
              <Route path="/lookup-tables" element={<ModuleGuard><LookupTables /></ModuleGuard>} />
              <Route path="/field-library" element={<ModuleGuard><FieldLibrary /></ModuleGuard>} />
              <Route path="/data-sources" element={<ModuleGuard><DataSources /></ModuleGuard>} />
              <Route path="/settings" element={<ModuleGuard><SettingsPage /></ModuleGuard>} />
              <Route path="/settings/roles" element={<ModuleGuard><RolesPermissions /></ModuleGuard>} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/audit-log" element={<ModuleGuard><AuditLog /></ModuleGuard>} />
              <Route path="/employees" element={<ModuleGuard><EmployeeDirectory /></ModuleGuard>} />
              <Route path="/documents" element={<ModuleGuard><Documents /></ModuleGuard>} />
              <Route path="/field-mappings" element={<ModuleGuard><FieldMappings /></ModuleGuard>} />
              <Route path="/cost-estimate-templates" element={<ModuleGuard><CostEstimateTemplates /></ModuleGuard>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </TaxConfigProvider>
      </TenantProvider>
      </ImpersonationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
