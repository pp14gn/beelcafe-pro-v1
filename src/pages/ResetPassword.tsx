import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import beelcafeLogo from '@/assets/beelcafe-logo.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Listen for auth state changes (recovery link will trigger this)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidSession(true);
        } else if (session) {
          setIsValidSession(true);
        }
      });

      // If already have a session, allow password reset
      if (session) {
        setIsValidSession(true);
      } else {
        // Give it a moment for the recovery event to fire
        setTimeout(() => {
          if (isValidSession === null) {
            setIsValidSession(false);
          }
        }, 2000);
      }

      return () => subscription.unsubscribe();
    };

    checkSession();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (pwd.length > 72) {
      return 'Password must be less than 72 characters';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: updateError.message,
        });
      } else {
        setSuccess(true);
        toast({
          title: 'Password Updated',
          description: 'Your password has been successfully reset.',
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      });
    }

    setLoading(false);
  };

  // Show loading while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-coffee p-4">
        <div className="flex items-center gap-4 mb-8">
          <img 
            src={beelcafeLogo} 
            alt="Beelcafe Logo" 
            className="h-16 w-16 rounded-full shadow-elevated"
          />
          <h1 className="text-4xl font-bold text-coffee-cream drop-shadow-lg">
            Beelcafe
          </h1>
        </div>
        <Card className="w-full max-w-md bg-background/95 backdrop-blur shadow-elevated border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if no valid session
  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-coffee p-4">
        <div className="flex items-center gap-4 mb-8">
          <img 
            src={beelcafeLogo} 
            alt="Beelcafe Logo" 
            className="h-16 w-16 rounded-full shadow-elevated"
          />
          <h1 className="text-4xl font-bold text-coffee-cream drop-shadow-lg">
            Beelcafe
          </h1>
        </div>
        <Card className="w-full max-w-md bg-background/95 backdrop-blur shadow-elevated border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Invalid or Expired Link</h2>
              <p className="text-muted-foreground text-sm">
                This password reset link is invalid or has expired.
                Please request a new one.
              </p>
            </div>
            <Button onClick={() => navigate('/login')} className="mt-4">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-coffee p-4">
        <div className="flex items-center gap-4 mb-8">
          <img 
            src={beelcafeLogo} 
            alt="Beelcafe Logo" 
            className="h-16 w-16 rounded-full shadow-elevated"
          />
          <h1 className="text-4xl font-bold text-coffee-cream drop-shadow-lg">
            Beelcafe
          </h1>
        </div>
        <Card className="w-full max-w-md bg-background/95 backdrop-blur shadow-elevated border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="rounded-full bg-primary/10 p-3">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Password Reset Successful</h2>
              <p className="text-muted-foreground text-sm">
                Your password has been updated. Redirecting to login...
              </p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-coffee p-4">
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
          <CardTitle className="text-2xl font-bold text-foreground">Reset Password</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={72}
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
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={72}
                  className="bg-background border-border pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-coffee hover:opacity-90"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/login')}
              >
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
