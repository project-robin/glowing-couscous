import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: 'gold' | 'purple' | 'none';
  hover?: boolean;
}

export function GlassCard({ 
  children, 
  className,
  glow = 'none',
  hover = true 
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-card rounded-xl p-6',
        glow === 'gold' && 'glow-gold',
        glow === 'purple' && 'glow-purple',
        hover && 'transition-all duration-300 hover:border-mystic-gold/30 hover:shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
}