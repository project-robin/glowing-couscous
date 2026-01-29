import { useState, useEffect } from 'react';
import { ConvexProviderWithAuth } from 'convex/react';
import { convex } from './convex';
import { useAuth } from './convexAuth';
import { useAstroAuth } from './hooks/useAstroAuth';
import { AstroShivaAPI } from './services/astroApi';
import { OnboardingForm } from './components/OnboardingForm';
import { ChatInterface } from './components/ChatInterface';
import { StarBackground } from './components/StarBackground';
import { GlassCard } from './components/GlassCard';
import { ConnectionStatus } from './components/ConnectionStatus';
import { Button } from '@/components/ui/button';
import { Sparkles, Moon, Stars, Lock } from 'lucide-react';

function AuthScreen() {
  const handleSignIn = () => {
    // Generate unique guest ID for authentication
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('astroGuestId', guestId);
    localStorage.setItem('convexAuthToken', guestId); // For backward compatibility
    window.location.reload();
  };

  return (
    <div className="min-h-screen cosmic-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <StarBackground />
      
      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 text-mystic-gold/20 animate-float" style={{ animationDelay: '0s' }}>
        <Moon size={48} />
      </div>
      <div className="absolute bottom-32 right-16 text-mystic-purple-light/20 animate-float" style={{ animationDelay: '1s' }}>
        <Stars size={36} />
      </div>
      <div className="absolute top-40 right-20 text-mystic-gold/15 animate-float" style={{ animationDelay: '2s' }}>
        <Sparkles size={32} />
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        <GlassCard glow="gold" className="text-center">
          {/* Logo/Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-mystic-purple to-mystic-blue flex items-center justify-center animate-pulse-glow">
                <Moon size={48} className="text-mystic-gold" />
              </div>
              <div className="absolute -top-2 -right-2 text-mystic-gold animate-twinkle">
                <Sparkles size={20} />
              </div>
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient-gold mb-3">
            Astro Shiva
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg text-muted-foreground mb-2 font-body italic">
            Ancient Wisdom for Modern Souls
          </p>
          
          {/* Divider */}
          <div className="ornament-divider my-6">
            <span className="text-mystic-gold/50">✦</span>
          </div>
          
          {/* Description */}
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Discover the cosmic blueprint of your life through personalized Vedic astrology readings. 
            Your journey to self-discovery begins here.
          </p>
          
          {/* Sign In Button */}
          <Button
            onClick={handleSignIn}
            className="w-full mystic-button bg-gradient-to-r from-mystic-purple to-mystic-blue hover:from-mystic-purple-light hover:to-mystic-blue-light border border-mystic-gold/30 text-white font-display tracking-wider py-6 text-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
          >
            <Lock className="mr-2 h-5 w-5" />
            Enter the Cosmos
          </Button>
          
          {/* Footer text */}
          <p className="mt-6 text-sm text-muted-foreground/60">
            Secure authentication via Convex
          </p>
        </GlassCard>
        
        {/* Bottom decorative text */}
        <div className="text-center mt-8 text-mystic-gold/30 text-sm font-display tracking-widest">
          ✦ AS ABOVE, SO BELOW ✦
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen cosmic-gradient flex flex-col items-center justify-center p-4 relative">
      <StarBackground />
      
      <div className="relative z-10 text-center">
        {/* Animated spinner */}
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-full border-2 border-mystic-gold/20 border-t-mystic-gold animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Moon size={32} className="text-mystic-gold/60" />
          </div>
        </div>
        
        <h2 className="text-2xl font-display text-gradient-gold mb-2">
          Connecting to the Cosmos
        </h2>
        <p className="text-muted-foreground font-body italic">
          Aligning the stars...
        </p>
      </div>
    </div>
  );
}

function App() {
  const { status, isLoading, isAuthenticated, token, error } = useAstroAuth();
  const [api, setApi] = useState<AstroShivaAPI | null>(null);
  const [bypassOnboarding, _setBypassOnboarding] = useState(false);
  const [bypassChat, setBypassChat] = useState(false);

  useEffect(() => {
    if (isAuthenticated && token) {
      const apiClient = new AstroShivaAPI(token);
      setApi(apiClient);
    }
  }, [isAuthenticated, token]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Show onboarding form even if API fails (for UI testing)
  if (status === 'onboarding' || (error && !bypassOnboarding && !bypassChat)) {
    return api || error ? (
      <div className="min-h-screen cosmic-gradient relative">
        <StarBackground />
        <div className="relative z-10">
          <OnboardingForm 
            api={api || new AstroShivaAPI(token || '')} 
            onSuccess={() => setBypassChat(true)} 
          />
        </div>
      </div>
    ) : null;
  }

  if ((status === 'ready' && api) || bypassChat) {
    return (
      <div className="min-h-screen cosmic-gradient relative">
        <StarBackground />
        <div className="relative z-10 h-screen">
          <ChatInterface api={api || new AstroShivaAPI(token || '')} />
        </div>
      </div>
    );
  }

  return null;
}

export default function RootApp() {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
      <App />
      <ConnectionStatus />
    </ConvexProviderWithAuth>
  );
}