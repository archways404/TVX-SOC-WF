import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Google profile photos end in a size suffix like "=s96-c"; ask for a larger
// one so the 144px champion medallion on /scoreboard isn't blurry.
function sizedGooglePhoto(src, px) {
  return src.replace(/=s\d+-c$/, `=s${px}-c`);
}

/**
 * A player's Google profile photo, falling back to their initial when there's
 * no photo (seeded/manual users) or it fails to load. Fills its parent — put
 * it inside a sized, rounded container that sets the ring/background.
 */
export function Avatar({ name, src, size = 256, className }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <img
        src={sizedGooglePhoto(src, size)}
        alt=""
        // Google's photo CDN intermittently 403s requests that carry a Referer.
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn('h-full w-full rounded-full object-cover', className)}
      />
    );
  }

  return <span className={className}>{name?.charAt(0).toUpperCase() ?? '?'}</span>;
}

const PLAYER_AVATAR_SIZE = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
};

/**
 * A round player photo with their name in a tooltip on hover. The
 * background ring lets several of them overlap in a stack (-space-x-2) and
 * still read as separate faces.
 */
export function PlayerAvatar({ name, src, size = 'sm', className }) {
  return (
    <span className={cn('group/avatar relative inline-flex', className)} role="img" aria-label={name}>
      <span
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-background',
          PLAYER_AVATAR_SIZE[size],
        )}
      >
        <Avatar name={name} src={src} size={96} />
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-opacity group-hover/avatar:opacity-100"
      >
        {name}
      </span>
    </span>
  );
}
