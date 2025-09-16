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
import { supabase } from '@/lib/supabase';

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
    return <Navigate to="/" replace />;
  }

  const handleCreateAdmin = async () => {
    setCreatingAdmin(true);
    const result = await createAdminUser();
    
    if (result.success) {
      toast({
        title: 'Admin User Created',
        description: 'Admin user created successfully! You can now login with username: admin, password: admin',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to Create Admin',
        description: result.error || 'Failed to create admin user',
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

      // If input looks like a username (no @), try to find the user by username
      if (!emailOrUsername.includes('@')) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('username', emailOrUsername)
          .single();

        if (userError || !userData) {
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'Username not found',
          });
          setLoading(false);
          return;
        }

        // Get the email from auth.users using the user ID
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userData.id);
        
        if (authError || !authUser.user?.email) {
          // Fallback: try common admin email patterns
          if (emailOrUsername === 'admin') {
            email = 'admin@coffeepos.com';
          } else {
            toast({
              variant: 'destructive',
              title: 'Login Failed',
              description: 'Could not resolve username to email',
            });
            setLoading(false);
            return;
          }
        } else {
          email = authUser.user.email;
        }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-coffee p-4">
      <Card className="w-full max-w-md bg-background/95 backdrop-blur shadow-elevated border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coffee-gold">
              <Coffee className="h-8 w-8 text-coffee-bean" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your CoffeePos account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCreateAdmin}
              disabled={creatingAdmin}
              className="w-full mb-4 gap-2 border-coffee-gold/30 hover:bg-coffee-gold/10"
            >
              {creatingAdmin ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Admin...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Admin User
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Click above to create admin user (username: admin, password: admin)
            </p>
          </div>

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