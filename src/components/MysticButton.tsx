import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';

interface MysticButtonProps extends ButtonProps {
  glow?: 'gold' | 'purple' | 'none';
  shimmer?: boolean;
}

export function MysticButton({ 
  className,
  glow = 'gold',
  shimmer = false,
  children,
  ...props 
}: MysticButtonProps) {
  return (
    <Button
      className={cn(
        'mystic-button relative overflow-hidden font-display tracking-wider',
        'bg-gradient-to-r from-mystic-purple to-mystic-blue',
        'hover:from-mystic-purple-light hover:to-mystic-blue-light',
        'border border-mystic-gold/30',
        'transition-all duration-300',
        glow === 'gold' && 'hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]',
        glow === 'purple' && 'hover:shadow-[0_0_30px_rgba(107,76,154,0.4)]',
        className
      )}
      {...props}
    >
      {shimmer && (
        <span className="absolute inset-0 animate-shimmer pointer-events-none" />
      )}
      <span className="relative z-10">{children}</span>
    </Button>
  );
}