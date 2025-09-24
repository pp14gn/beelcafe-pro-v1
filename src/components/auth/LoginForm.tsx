import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Coffee, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createAdminUser } from '@/utils/createAdminUser';
import { supabase } from '@/integrations/supabase/client';
import beelcafeLogo from '@/assets/beelcafe-logo.png';

const LoginForm = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const { signIn, user } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/pos" replace />;
  }

  const handleCreateAdmin = async () => {
    setCreatingAdmin(true);
    
    const result = await createAdminUser();
    
    if (result.success) {
      toast({
        title: 'Admin User Created',
        description: result.message,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to Create Admin',
        description: result.error,
      });
    }
    
    setCreatingAdmin(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername || !password) return;

    setLoading(true);

    try {
      let email = emailOrUsername;

      // For usernames, try to find the user by username in the database
      if (!emailOrUsername.includes('@')) {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Please use your email address to login.',
        });
        setLoading(false);
        return;
      }

      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: error.message || 'Invalid credentials',
        });
      } else {
        toast({
          title: 'Welcome Back!',
          description: 'You have been successfully logged in.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'An unexpected error occurred',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-coffee p-4">
      {/* Beelcafe Banner */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <img 
            src={beelcafeLogo} 
            alt="Beelcafe Logo" 
            className="h-16 w-16 rounded-full shadow-elevated"
          />
          <h1 className="text-4xl font-bold text-coffee-cream drop-shadow-lg">
            Beelcafe
          </h1>
        </div>
        <p className="text-coffee-cream/80 text-lg">
          Sweet Service, Buzzing with Quality
        </p>
      </div>

      <Card className="w-full max-w-md bg-background/95 backdrop-blur shadow-elevated border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your Beelcafe account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailOrUsername" className="text-foreground">Email or Username</Label>
              <Input
                id="emailOrUsername"
                type="text"
                placeholder="Enter your email or username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-background border-border pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-coffee hover:opacity-90"
              disabled={loading || !emailOrUsername || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;