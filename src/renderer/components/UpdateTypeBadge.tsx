import type { FC } from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type UpdateTypeBadgeProps = {
  /** The variant/group freshness class; anything other than `volatile` reads as stable. */
  updateType: string;
};

/**
 * The freshness chip surfaced while a new game patch is pending: amber "Volatile"
 * (likely affected by the patch) or emerald "Stable" (usually survives it), with
 * an info tooltip. Shared by individual rows and variant-group headers.
 */
const UpdateTypeBadge: FC<UpdateTypeBadgeProps> = ({ updateType }) => {
  const isVolatile = updateType === 'volatile';

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1',
        isVolatile
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      )}
    >
      {isVolatile ? 'Volatile' : 'Stable'}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex cursor-default items-center"
            aria-label={
              isVolatile
                ? 'Volatile mods are likely affected by patches'
                : 'Stable mods usually survive patches'
            }
          >
            <Info className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {isVolatile ? 'Likely affected by patches' : 'Usually survives patches'}
        </TooltipContent>
      </Tooltip>
    </Badge>
  );
};

export default UpdateTypeBadge;
