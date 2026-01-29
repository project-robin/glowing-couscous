import { useState } from 'react';
import { AstroShivaAPI, type OnboardingData } from '../services/astroApi';
import { GlassCard } from './GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sparkles, User, Calendar, Clock, MapPin, Compass, Loader2, Globe } from 'lucide-react';

interface Props {
  api: AstroShivaAPI;
  onSuccess: () => void;
}

export function OnboardingForm({ api, onSuccess }: Props) {
  const [formData, setFormData] = useState<OnboardingData>({
    name: '',
    dateOfBirth: '',
    timeOfBirth: '',
    place: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formattedData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth
          ? new Date(formData.dateOfBirth).toISOString()
          : ''
      };

      const result = await api.onboard(formattedData);
      if (result.success) {
        const maxAttempts = 30;
        let attempts = 0;
        let pollingComplete = false;

        while (attempts < maxAttempts && !pollingComplete) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            const profileResult = await api.getProfile();
            if (profileResult.success && profileResult.data?.status === 'completed') {
              pollingComplete = true;
              onSuccess();
              return;
            }
          } catch (pollError) {
            console.error('Polling error:', pollError);
          }
        }

        if (!pollingComplete) {
          setError('Onboarding is taking longer than expected. Please refresh the page.');
        }
      } else {
        setError(result.error?.message || 'Onboarding failed');
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Failed to submit onboarding data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-mystic-purple to-mystic-blue mb-4 animate-pulse-glow">
            <Sparkles className="w-8 h-8 text-mystic-gold" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-2">
            Birth Chart Creation
          </h1>
          <p className="text-muted-foreground font-body italic">
            Enter your birth details to unlock your cosmic blueprint
          </p>
        </div>

        <GlassCard glow="purple">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground/90 flex items-center gap-2">
                <User className="w-4 h-4 text-mystic-gold" />
                Full Name <span className="text-mystic-gold">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
                required
                minLength={2}
                maxLength={100}
                className="mystic-input h-12 text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-foreground/90 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-mystic-gold" />
                  Date of Birth <span className="text-mystic-gold">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  required
                  className="mystic-input h-12 text-foreground"
                />
              </div>

              {/* Time of Birth */}
              <div className="space-y-2">
                <Label htmlFor="timeOfBirth" className="text-foreground/90 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-mystic-gold" />
                  Time of Birth <span className="text-mystic-gold">*</span>
                </Label>
                <Input
                  id="timeOfBirth"
                  type="time"
                  value={formData.timeOfBirth}
                  onChange={(e) => setFormData({ ...formData, timeOfBirth: e.target.value })}
                  required
                  className="mystic-input h-12 text-foreground"
                />
                <p className="text-xs text-muted-foreground">Use 24-hour format (HH:mm)</p>
              </div>
            </div>

            {/* Place of Birth */}
            <div className="space-y-2">
              <Label htmlFor="place" className="text-foreground/90 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-mystic-gold" />
                Place of Birth <span className="text-mystic-gold">*</span>
              </Label>
              <Input
                id="place"
                type="text"
                value={formData.place}
                onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                placeholder="City, Country"
                required
                minLength={2}
                className="mystic-input h-12 text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            <Separator className="bg-mystic-gold/20" />

            {/* Optional Coordinates */}
            <div className="space-y-4">
              <Label className="text-foreground/90 flex items-center gap-2">
                <Compass className="w-4 h-4 text-mystic-gold" />
                Coordinates (Optional)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude" className="text-sm text-muted-foreground">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.0001"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 40.7128"
                    min={-90}
                    max={90}
                    className="mystic-input h-10 text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude" className="text-sm text-muted-foreground">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.0001"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., -74.0060"
                    min={-180}
                    max={180}
                    className="mystic-input h-10 text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
              {/* Timezone Field */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="timezone" className="text-sm text-muted-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-mystic-gold" />
                  Timezone
                </Label>
                <Input
                  id="timezone"
                  type="text"
                  value={formData.timezone || ''}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  placeholder="e.g., America/New_York or UTC+5:30"
                  className="mystic-input h-10 text-foreground placeholder:text-muted-foreground/50"
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to your browser timezone. Use IANA format (e.g., Asia/Calcutta) or UTC offset.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full mystic-button bg-gradient-to-r from-mystic-purple to-mystic-blue hover:from-mystic-purple-light hover:to-mystic-blue-light border border-mystic-gold/30 text-white font-display tracking-wider py-6 text-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Calculating Your Chart...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Complete Onboarding
                </>
              )}
            </Button>
          </form>
        </GlassCard>

        {/* Footer */}
        <div className="text-center mt-6 text-mystic-gold/30 text-sm font-display tracking-widest">
          ✦ THE STARS ALIGN FOR YOU ✦
        </div>
      </div>
    </div>
  );
}