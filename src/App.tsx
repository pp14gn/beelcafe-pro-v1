import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginForm from "./components/auth/LoginForm";
import Sidebar from "./components/Layout/Sidebar";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Recipes from "./pages/Recipes";
import Staff from "./pages/Staff";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
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
            <Route path="/" element={
              <ProtectedRoute>
                <div className="flex h-screen bg-background">
                  <Sidebar />
                  <main className="flex-1 overflow-auto">
                    <POS />
                  </main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute requiredRole="manager">
                <div className="flex h-screen bg-background">
                  <Sidebar />
                  <main className="flex-1 overflow-auto">
                    <Inventory />
                  </main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/recipes" element={
              <ProtectedRoute requiredRole="manager">
                <div className="flex h-screen bg-background">
                  <Sidebar />
                  <main className="flex-1 overflow-auto">
                    <Recipes />
                  </main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/staff" element={
              <ProtectedRoute requiredRole="manager">
                <div className="flex h-screen bg-background">
                  <Sidebar />
                  <main className="flex-1 overflow-auto">
                    <Staff />
                  </main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute requiredRole="manager">
                <div className="flex h-screen bg-background">
                  <Sidebar />
                  <main className="flex-1 overflow-auto">
                    <Analytics />
                  </main>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <div className="flex h-screen bg-background">
                  <Sidebar />
                  <main className="flex-1 overflow-auto">
                    <Settings />
                  </main>
                </div>
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
