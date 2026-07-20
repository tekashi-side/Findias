import { useState, type FC } from 'react';
import { Info } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ModGroupRow, ModVariantRow } from '@shared/modList';
import StatusChip from './StatusChip';
import { formatBytes, formatDate, formatDownloads } from '../format';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

/** Build the "release vX / installed vY / size / updated" summary line for a variant. */
const versionSummary = (variant: ModVariantRow): string => {
  const release =
    variant.releaseVersion === null ? 'Not in release' : `Release v${variant.releaseVersion}`;
  const installed =
    variant.installedVersion === null ? 'Not installed' : `Installed v${variant.installedVersion}`;
  const size = variant.size === null ? '' : ` • ${formatBytes(variant.size)}`;
  const updatedDate = variant.updatedAt ? formatDate(variant.updatedAt) : '';
  const updated = updatedDate ? ` • ${updatedDate}` : '';
  const downloads =
    variant.downloadCount === undefined
      ? ''
      : ` • ${formatDownloads(variant.downloadCount)} downloads`;
  return `${release} • ${installed}${size}${updated}${downloads}`;
};

/** A single carousel image with its own loading skeleton and error fallback. */
const CarouselImage: FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-lg bg-[color-mix(in_oklch,var(--muted),black_20%)]">
      {/*
       * We modify the background color of the skeleton loader to match the
       * container's background color so we don't get an odd color flash after the skeleton finishes loading.
       */}
      {state === 'loading' && (
        <Skeleton className="absolute inset-0 rounded-lg bg-[color-mix(in_oklch,var(--muted),black_20%)]" />
      )}
      {state === 'error' ? (
        <span className="px-4 text-center text-xs text-muted-foreground">Image unavailable</span>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className="h-full w-full object-contain transition-opacity duration-200"
          style={{ opacity: state === 'loaded' ? 1 : 0 }}
        />
      )}
    </div>
  );
};

type ModDetailBodyProps = {
  variant: ModVariantRow;
  group: ModGroupRow | null;
  /**
   * Extra classes for the root. The base padding intentionally omits the top so
   * the caller controls it: inside the tabs the `gap` above supplies the spacing,
   * while the tab-less orphan path passes `pt-6` to sit off the pane's top edge.
   */
  className?: string;
};

/**
 * The scrollable "Details" content for a selected mod: header metadata, an image
 * carousel (fixed height, per-slide loading, `object-contain` so mixed aspect
 * ratios do not reflow), and the rendered README markdown. README and images
 * resolve from the variant, falling back independently to the group's when the
 * variant has none. Images are rendered only in the carousel (hidden in the
 * markdown).
 */
const ModDetailBody: FC<ModDetailBodyProps> = ({ variant, group, className }) => {
  const readme = variant.readme ?? group?.readme;
  const images = variant.images ?? group?.images ?? [];

  return (
    <div className={cn('flex flex-col gap-4 px-6 pb-6', className)}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold wrap-anywhere">{variant.name}</h2>
          <StatusChip state={variant.state} />
        </div>

        <p className="text-sm text-muted-foreground">{versionSummary(variant)}</p>

        {(variant.modAuthor || variant.modAdditionalCredits) && (
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            {variant.modAuthor && (
              <span>
                By <span className="text-foreground">{variant.modAuthor}</span>
              </span>
            )}
            {variant.modAdditionalCredits && <span>Credits: {variant.modAdditionalCredits}</span>}
          </div>
        )}

        {variant.recentUpdateNotes && (
          <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <Info />
            <AlertTitle>Recent update</AlertTitle>
            <AlertDescription className="text-emerald-700/90 dark:text-emerald-400/90">
              {variant.recentUpdateNotes}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {images.length > 0 && (
        <Carousel className="w-full" opts={{ align: 'start' }}>
          {/*
           * Full-bleed slides with spacing between them: instead of the stock
           * `-ml-4`/`pl-4` gutter (which narrows each slide's content), keep slides
           * full width (`ml-0` + `pl-0`) and space them with a flex `gap-4`. At rest a
           * slide fills the container edge-to-edge; the gap sits off-screen and is only
           * visible while transitioning between slides.
           */}
          <CarouselContent className="ml-0 gap-4">
            {images.map((src) => (
              <CarouselItem key={src} className="pl-0">
                <CarouselImage src={src} alt={variant.name} />
              </CarouselItem>
            ))}
          </CarouselContent>
          {images.length > 1 && (
            <>
              {/* Solid `secondary` (not the default `outline`) so the controls stay
               * legible overlaid on full-width images. */}
              <CarouselPrevious variant="secondary" className="left-2" />
              <CarouselNext variant="secondary" className="right-2" />
            </>
          )}
        </Carousel>
      )}

      {readme ? (
        <>
          <Separator />
          {/*
           * `wrap-anywhere` (overflow-wrap: anywhere), not `break-words`: only
           * `anywhere` shrinks the element's min-content size, so a giant unbroken
           * word can't force the column (and the ScrollArea's inner display:table
           * wrapper) wider than its container. `max-w-none` drops prose's default
           * reading-width cap so it fills the pane. Heading sizes and the inline-code
           * chip are themed centrally in the `.prose` block in index.css.
           */}
          <div className="prose prose-sm max-w-none wrap-anywhere">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                // The h1 is the mod title, already shown in the header above, so
                // drop it. Removing it from the DOM (vs. hiding) lets prose's
                // `> :first-child { margin-top: 0 }` flush the next heading to the top.
                h1: () => null,
                // Images live in the carousel, so they are dropped here.
                img: () => null,
                // Anchors can't navigate the app shell; route http(s) links to
                // the user's default browser via the main process instead.
                a: ({ children, href }) => (
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      if (href) window.findias.openExternal(href);
                    }}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {readme}
            </Markdown>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No description available for this mod.</p>
      )}
    </div>
  );
};

export default ModDetailBody;
