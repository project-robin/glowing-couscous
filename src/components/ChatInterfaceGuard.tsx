import { useState, useEffect } from 'react';
import { AstroShivaAPI, UserProfile } from '../services/astroApi';
import { ChatInterface } from './ChatInterface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  api: AstroShivaAPI;
  onReturnToOnboarding: () => void;
}

type VerificationState = 'checking' | 'verified' | 'missing' | 'error';

/**
 * ChatInterfaceGuard
 * 
 * This component verifies that astrological data exists in Convex before
 * rendering the ChatInterface. It implements the strict sequential flow:
 * 
 * 1. Onboarding completion → Data stored in Convex
 * 2. This component verifies data exists
 * 3. Only then renders ChatInterface
 * 4. Passes astrological context to AI agent
 * 
 * If data is missing, it shows an error and allows returning to onboarding.
 */
export function ChatInterfaceGuard({ api, onReturnToOnboarding }: Props) {
  const [verificationState, setVerificationState] = useState<VerificationState>('checking');
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifyAstroData();
  }, []);

  const verifyAstroData = async () => {
    setVerificationState('checking');
    setError(null);

    try {
      const result = await api.verifyAstroData();
      
      if (result.exists && result.data) {
        console.log('[ChatInterfaceGuard] Astrological data verified:', result.data);
        setUserData(result.data);
        setVerificationState('verified');
      } else {
        console.warn('[ChatInterfaceGuard] Astrological data missing');
        setVerificationState('missing');
        setError('Your astrological profile is not complete. Please complete onboarding first.');
      }
    } catch (err) {
      console.error('[ChatInterfaceGuard] Error verifying data:', err);
      setVerificationState('error');
      setError('Failed to verify your astrological data. Please try again.');
    }
  };

  // Loading state while checking
  if (verificationState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-mystic-gold" />
            <p className="text-muted-foreground">Retrieving your cosmic blueprint...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error/missing state - show return to onboarding button
  if (verificationState === 'missing' || verificationState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              Astrological Data Missing
            </CardTitle>
            <CardDescription>
              {error || 'Unable to access your birth chart data.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This can happen if:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Onboarding was interrupted</li>
              <li>The astrological calculation timed out</li>
              <li>Your session expired</li>
            </ul>
            <Button 
              onClick={onReturnToOnboarding}
              className="w-full mystic-button"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Complete Onboarding
            </Button>
            <Button 
              onClick={verifyAstroData}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verified state - render ChatInterface with user context
  return (
    <ChatInterface 
      api={api} 
      userContext={userData}
    />
  );
}
