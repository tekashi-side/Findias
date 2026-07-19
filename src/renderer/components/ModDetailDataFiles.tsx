import type { FC } from 'react';
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui';
import { ScrollBar } from '@/components/ui/scroll-area';

type ModDetailDataFilesProps = {
  /** Repo-relative game files the mod modifies, in manifest order. */
  files: string[];
};

/**
 * The "Data Files" tab body: the game files a mod modifies, one monospaced path
 * per line in manifest order. Directory prefixes are dimmed so the eye lands on
 * the file name.
 *
 * Composes the Radix ScrollArea primitive directly with the shadcn-styled
 * `ScrollBar` for both axes. The vendored `ScrollArea` renders a vertical bar
 * only; here long paths must scroll horizontally (they never wrap), so we need a
 * styled horizontal scrollbar too. Radix's viewport wraps content in a
 * `display: table` box, so the `whitespace-nowrap` rows expand it and trigger
 * horizontal overflow without any explicit width on the list.
 *
 * The content omits top padding: this panel only ever renders inside the detail
 * tabs, so the tab-to-content gap already supplies the spacing above it.
 */
const ModDetailDataFiles: FC<ModDetailDataFilesProps> = ({ files }) => (
  <ScrollAreaPrimitive.Root data-slot="scroll-area" className="relative h-full">
    <ScrollAreaPrimitive.Viewport
      data-slot="scroll-area-viewport"
      className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
    >
      <div className="flex flex-col gap-2 px-6 pb-6">
        <p className="text-sm text-muted-foreground">
          Modifies <span className="tabular-nums text-foreground">{files.length}</span>{' '}
          {files.length === 1 ? 'file' : 'files'}
        </p>
        <ul className="flex flex-col gap-0.5 font-mono text-xs">
          {files.map((path) => {
            const slash = path.lastIndexOf('/');
            return (
              <li key={path} className="whitespace-nowrap">
                <span className="text-muted-foreground">{path.slice(0, slash + 1)}</span>
                <span className="text-foreground">{path.slice(slash + 1)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar orientation="vertical" />
    <ScrollBar orientation="horizontal" />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
);

export default ModDetailDataFiles;
