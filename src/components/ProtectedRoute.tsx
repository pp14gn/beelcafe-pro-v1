import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'manager' | 'cashier' | 'admin';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, userProfile, loading } = useAuth();

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-coffee">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-coffee-cream" />
          <p className="text-coffee-cream">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user exists but no profile, show loading (prevents redirect loop)
  if (user && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-coffee">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-coffee-cream" />
          <p className="text-coffee-cream">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (requiredRole && userProfile.role !== requiredRole && userProfile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-coffee p-4">
        <div className="text-center text-coffee-cream">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;