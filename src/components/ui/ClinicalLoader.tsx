import * as React from 'react';
import { Activity, Sparkles, FileText, Layout as LayoutIcon, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ClinicalLoaderSize = 'sm' | 'md' | 'lg' | 'fullscreen';
export type ClinicalLoaderVariant = 'spinner' | 'pulsing-logo' | 'skeleton' | 'card-skeleton';

export interface ClinicalLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Size preset of the loader.
   * @default 'md'
   */
  size?: ClinicalLoaderSize;
  /**
   * Visual variant.
   * - 'spinner': Ambient glowing gradient ring with spinning track and breathing center.
   * - 'pulsing-logo': Clinical emblem with concentric breathing ripple waves.
   * - 'skeleton': Modern shimmering clinical document / agenda skeleton.
   * - 'card-skeleton': Grid of shimmering clinical cards (ideal for templates/records).
   * @default 'spinner'
   */
  variant?: ClinicalLoaderVariant;
  /**
   * Primary status message or title.
   */
  message?: React.ReactNode;
  /**
   * Secondary supporting text or HIPAA / engine subtitle.
   */
  subtext?: React.ReactNode;
  /**
   * Custom center icon (defaults to Lucide Activity).
   */
  icon?: LucideIcon;
  /**
   * When true in non-fullscreen modes, stretches to occupy full container height.
   */
  fullHeight?: boolean;
}

export function ClinicalLoader({
  size = 'md',
  variant = 'spinner',
  message,
  subtext,
  icon: Icon = Activity,
  fullHeight = false,
  className,
  ...props
}: ClinicalLoaderProps) {
  // Skeleton Variant
  if (variant === 'skeleton') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'w-full max-w-5xl mx-auto space-y-6 animate-pulse select-none p-4',
          fullHeight && 'flex flex-col justify-center min-h-[360px]',
          className
        )}
        {...props}
      >
        {/* Optional Header Banner if message is provided */}
        {message && (
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-primary animate-ping" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {message}
              </p>
            </div>
            {subtext && (
              <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
                {subtext}
              </span>
            )}
          </div>
        )}

        {/* Document Header Skeleton */}
        <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-surface/60 dark:bg-surface/30 border border-border/60">
          <div className="flex items-center gap-4">
            <div className="size-11 rounded-xl bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-40 sm:w-56 rounded-md bg-muted" />
              <div className="h-3 w-28 rounded-md bg-muted/60" />
            </div>
          </div>
          <div className="h-7 w-24 rounded-full bg-muted/80" />
        </div>

        {/* 3 Metric / Pill Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-20 rounded-2xl bg-muted/40 border border-border/40 p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-5 w-28 rounded bg-muted/80" />
          </div>
          <div className="h-20 rounded-2xl bg-muted/40 border border-border/40 p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-5 w-24 rounded bg-muted/80" />
          </div>
          <div className="h-20 rounded-2xl bg-muted/40 border border-border/40 p-4 space-y-2">
            <div className="h-3 w-14 rounded bg-muted" />
            <div className="h-5 w-32 rounded bg-muted/80" />
          </div>
        </div>

        {/* Body Paragraph Skeletons */}
        <div className="p-6 rounded-3xl bg-surface/50 dark:bg-surface/20 border border-border/50 space-y-4">
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="space-y-2.5 pt-1">
            <div className="h-3.5 w-full rounded bg-muted/70" />
            <div className="h-3.5 w-[94%] rounded bg-muted/70" />
            <div className="h-3.5 w-[88%] rounded bg-muted/70" />
            <div className="h-3.5 w-[65%] rounded bg-muted/50" />
          </div>
        </div>
      </div>
    );
  }

  // Card Skeleton Variant (Ideal for Blueprint / Template / Notes grids)
  if (variant === 'card-skeleton') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'w-full max-w-7xl mx-auto space-y-6 p-2',
          fullHeight && 'flex flex-col justify-center min-h-[400px]',
          className
        )}
        {...props}
      >
        {/* Optional Status Banner */}
        {message && (
          <div className="flex items-center justify-between pb-2 mb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-primary animate-ping" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {message}
              </span>
            </div>
            {subtext && (
              <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
                {subtext}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="rounded-3xl border border-border/60 bg-surface dark:bg-surface/40 p-6 space-y-6 shadow-soft animate-pulse"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-muted" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 rounded bg-muted" />
                    <div className="h-2.5 w-16 rounded bg-muted/60" />
                  </div>
                </div>
                <div className="size-7 rounded-lg bg-muted/60" />
              </div>

              <div className="space-y-2.5 p-4 rounded-2xl bg-muted/20 border border-border/30">
                <div className="h-3 w-full rounded bg-muted/60" />
                <div className="h-3 w-4/5 rounded bg-muted/60" />
                <div className="h-3 w-3/5 rounded bg-muted/40" />
                <div className="h-16 w-full rounded-xl bg-muted/30 mt-2" />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="h-5 w-16 rounded-lg bg-muted/70" />
                <div className="h-3 w-20 rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fullscreen Backdrop Modal / Overlay
  if (size === 'fullscreen') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 dark:bg-background/90 backdrop-blur-md animate-in fade-in duration-300',
          className
        )}
        {...props}
      >
        <div className="relative flex flex-col items-center gap-6 p-8 sm:p-10 rounded-[2rem] bg-surface dark:bg-surface/80 border border-border/80 shadow-elevated max-w-sm sm:max-w-md w-full mx-auto text-center overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-12 -left-12 size-48 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 size-48 rounded-full bg-gradient-to-tl from-primary/20 to-transparent blur-3xl pointer-events-none" />

          {/* Glowing Multi-Ring Spinner Track */}
          <div className="relative flex items-center justify-center size-24">
            {/* Ambient pulse halo */}
            <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl animate-pulse" />
            
            {/* Soft background track */}
            <div className="size-24 rounded-full border-4 border-primary/15 bg-background/60 backdrop-blur-sm shadow-inner" />
            
            {/* High-speed gradient spinner */}
            <div className="absolute inset-0 size-24 rounded-full border-4 border-transparent border-t-primary border-r-primary/50 animate-spin" />
            
            {/* Breathing core */}
            <div className="absolute size-14 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/30 flex items-center justify-center shadow-soft">
              <Icon className="size-7 text-primary animate-pulse" />
            </div>
          </div>

          {/* Typography */}
          <div className="relative space-y-2 z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 shadow-sm mb-1">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span>CLIO Engine</span>
            </div>
            
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
              {message || 'Processing Clinical Request...'}
            </h3>
            
            {subtext && (
              <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-xs mx-auto">
                {subtext}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Pulsing Logo Variant
  if (variant === 'pulsing-logo') {
    const emblemSizes = {
      sm: 'size-9 rounded-xl',
      md: 'size-14 rounded-2xl',
      lg: 'size-20 rounded-[1.75rem]'
    }[size];

    const iconSizes = {
      sm: 'size-4',
      md: 'size-6',
      lg: 'size-9'
    }[size];

    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex flex-col items-center justify-center text-center',
          size === 'sm' && 'gap-2 py-2',
          size === 'md' && 'gap-3.5 py-6',
          size === 'lg' && 'gap-5 py-10',
          fullHeight && 'flex-1 h-full min-h-[300px]',
          className
        )}
        {...props}
      >
        <div className="relative flex items-center justify-center">
          {/* Pulsing Ripple Rings */}
          <div className={cn('absolute -inset-2 bg-primary/20 rounded-2xl animate-ping opacity-30 pointer-events-none', emblemSizes)} />
          <div className={cn('absolute -inset-4 bg-primary/10 rounded-3xl blur-md animate-pulse pointer-events-none')} />

          {/* Clinical Emblem Frame */}
          <div
            className={cn(
              'relative flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/30 shadow-soft backdrop-blur-sm',
              emblemSizes
            )}
          >
            <Icon className={cn('text-primary animate-pulse', iconSizes)} />
          </div>
        </div>

        {(message || subtext) && (
          <div className="space-y-1 max-w-sm">
            {message && (
              <p
                className={cn(
                  'font-bold text-slate-900 dark:text-slate-100 tracking-tight',
                  size === 'sm' && 'text-xs',
                  size === 'md' && 'text-sm',
                  size === 'lg' && 'text-base'
                )}
              >
                {message}
              </p>
            )}
            {subtext && (
              <p
                className={cn(
                  'text-muted-foreground font-medium',
                  size === 'sm' && 'text-[10px]',
                  size === 'md' && 'text-xs',
                  size === 'lg' && 'text-xs uppercase tracking-widest'
                )}
              >
                {subtext}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default Variant: 'spinner'
  if (size === 'sm') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'inline-flex items-center gap-2.5 text-xs text-muted-foreground',
          fullHeight && 'h-full',
          className
        )}
        {...props}
      >
        <div className="relative flex items-center justify-center size-5 shrink-0">
          <div className="absolute -inset-1 rounded-full bg-primary/20 blur-[2px]" />
          <div className="size-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute size-1.5 rounded-full bg-primary animate-pulse" />
        </div>
        {(message || subtext) && (
          <div className="flex flex-col leading-tight">
            {message && (
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {message}
              </span>
            )}
            {subtext && (
              <span className="text-[10px] text-muted-foreground">
                {subtext}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  const isLg = size === 'lg';

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isLg ? 'gap-4 py-8' : 'gap-3 py-4',
        fullHeight && 'flex-1 h-full min-h-[300px]',
        className
      )}
      {...props}
    >
      <div className="relative flex items-center justify-center">
        {/* Ambient Halo Glow */}
        <div
          className={cn(
            'absolute rounded-full bg-gradient-to-tr from-primary/30 via-primary/15 to-transparent blur-xl animate-pulse pointer-events-none',
            isLg ? '-inset-6 size-28' : '-inset-3 size-18'
          )}
        />

        {/* Ambient Outer Track */}
        <div
          className={cn(
            'rounded-full border border-primary/10 bg-surface/60 dark:bg-surface/30 backdrop-blur-sm shadow-soft flex items-center justify-center',
            isLg ? 'size-16' : 'size-12'
          )}
        >
          {/* High-speed rotating ring */}
          <div
            className={cn(
              'absolute inset-0 rounded-full border-transparent border-t-primary border-r-primary/40 animate-spin',
              isLg ? 'size-16 border-[3px]' : 'size-12 border-2'
            )}
          />

          {/* Breathing Core */}
          <div
            className={cn(
              'rounded-full bg-gradient-to-br from-primary/15 to-primary/5 dark:bg-primary/20 border border-primary/20 flex items-center justify-center shadow-inner',
              isLg ? 'size-9' : 'size-6'
            )}
          >
            <Icon
              className={cn(
                'text-primary animate-pulse',
                isLg ? 'size-4' : 'size-3'
              )}
            />
          </div>
        </div>
      </div>

      {(message || subtext) && (
        <div className="space-y-1 max-w-sm px-2">
          {message && (
            <p
              className={cn(
                'font-bold text-slate-900 dark:text-slate-100 tracking-tight',
                isLg ? 'text-base' : 'text-sm'
              )}
            >
              {message}
            </p>
          )}
          {subtext && (
            <p
              className={cn(
                'text-muted-foreground font-medium',
                isLg ? 'text-xs uppercase tracking-widest' : 'text-xs'
              )}
            >
              {subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ClinicalLoader;
