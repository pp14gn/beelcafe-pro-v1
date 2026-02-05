import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginForm from "./components/auth/LoginForm";
import ResetPassword from "./pages/ResetPassword";
import ResponsiveLayout from "./components/Layout/ResponsiveLayout";
import POS from "./pages/POS";
import Orders from "./pages/Orders";
import Inventory from "./pages/Inventory";
import Recipes from "./pages/Recipes";
import Staff from "./pages/Staff";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Customers from "./pages/Customers";
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
            <Route path="/login" element={<LoginForm />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Navigate to="/pos" replace />
              </ProtectedRoute>
            } />
            <Route path="/pos" element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <POS />
                </ResponsiveLayout>
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <Orders />
                </ResponsiveLayout>
              </ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute requiredRole="manager">
                <ResponsiveLayout>
                  <Inventory />
                </ResponsiveLayout>
              </ProtectedRoute>
            } />
            <Route path="/recipes" element={
              <ProtectedRoute requiredRole="manager">
                <ResponsiveLayout>
                  <Recipes />
                </ResponsiveLayout>
              </ProtectedRoute>
            } />
            <Route path="/staff" element={
              <ProtectedRoute requiredRole="manager">
                <ResponsiveLayout>
                  <Staff />
                </ResponsiveLayout>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute requiredRole="manager">
                <ResponsiveLayout>
                  <Analytics />
                </ResponsiveLayout>
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <Customers />
                </ResponsiveLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <Settings />
                </ResponsiveLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
