import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import beelcafeLogo from '@/assets/beelcafe-logo.png';

const LoginForm = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/pos" replace />;
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/pos`
        }
      });
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Google Sign In Failed',
          description: error.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Google Sign In Failed',
        description: 'An unexpected error occurred',
      });
    }
    setGoogleLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername || !password) return;

    setLoading(true);

    try {
      let email = emailOrUsername;

      // If input doesn't look like an email, try to find user by username
      if (!emailOrUsername.includes('@')) {
        const { data: userData, error: lookupError } = await supabase
          .from('users')
          .select('id')
          .eq('username', emailOrUsername)
          .single();

        if (lookupError || !userData) {
          toast({
            variant: 'destructive',
            title: t('login.failed'),
            description: 'Username not found. Please check and try again.',
          });
          setLoading(false);
          return;
        }

        // Get the email from auth.users using the user id
        const { data: emailData, error: emailError } = await supabase.functions.invoke('get-user-email', {
          body: { userId: userData.id },
        });

        if (emailError || !emailData?.email) {
          toast({
            variant: 'destructive',
            title: t('login.failed'),
            description: 'Could not verify user. Please try using your email.',
          });
          setLoading(false);
          return;
        }

        email = emailData.email;
      }

      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          variant: 'destructive',
          title: t('login.failed'),
          description: error.message || 'Invalid credentials',
        });
      } else {
        toast({
          title: t('login.success'),
          description: t('login.success.desc'),
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('login.failed'),
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
          <CardTitle className="text-2xl font-bold text-foreground">{t('login.welcome')}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('login.signin')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailOrUsername" className="text-foreground">{t('login.email')}</Label>
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
              <Label htmlFor="password" className="text-foreground">{t('login.password')}</Label>
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
              disabled={loading || googleLoading || !emailOrUsername || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('login.signing.in')}
                </>
              ) : (
                t('login.signin.button')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;