import { useEffect, useState, type FC } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { ChooseFolderResult, SetupState } from '@shared/api';
import type { ModListState } from '@shared/modList';
import { isTheme, THEMES, useTheme, type Theme } from '@/components/theme-provider';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type SettingsViewProps = {
  setup: SetupState;
};

/** Presentation for each theme value; the value set itself comes from {@link THEMES}. */
const THEME_LABELS: Record<Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const THEME_ICONS: Record<Theme, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };

/** Extract a user-facing message from an unknown thrown value, with a fallback. */
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'The action failed.';

/**
 * Dedicated settings screen that replaces the two-column mod view. Each setting
 * category is wrapped in an {@link Item} (mirroring the mod list). Changes that
 * affect setup or the mod catalog invalidate the relevant queries.
 */
const SettingsView: FC<SettingsViewProps> = ({ setup }) => {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { data: appInfo } = useQuery({
    queryKey: ['appInfo'],
    queryFn: () => window.findias.getAppInfo(),
  });
  const isPrereleasesEnabled = useFeatureFlag('prereleases');
  const [shouldIncludePrereleases, setShouldIncludePrereleases] = useState(
    setup.shouldIncludePrereleases,
  );

  useEffect(() => {
    setShouldIncludePrereleases(setup.shouldIncludePrereleases);
  }, [setup.shouldIncludePrereleases]);

  const choose = useMutation<ChooseFolderResult>({
    mutationFn: () => window.findias.chooseGameFolder(),
    onSuccess: (result) => {
      if (result.isOk) {
        void queryClient.invalidateQueries({ queryKey: ['setupState'] });
        void queryClient.invalidateQueries({ queryKey: ['modList'] });
      }
    },
  });

  const prerelease = useMutation({
    mutationFn: (shouldIncludePrereleases: boolean) =>
      window.findias.setShouldIncludePrereleases(shouldIncludePrereleases),
    onSuccess: (state: ModListState) => {
      queryClient.setQueryData(['modList'], state);
      void queryClient.invalidateQueries({ queryKey: ['setupState'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  /** Optimistically reflect the prerelease toggle, then persist it. */
  const handlePrereleaseChange = (shouldIncludePrereleases: boolean): void => {
    setShouldIncludePrereleases(shouldIncludePrereleases);
    prerelease.mutate(shouldIncludePrereleases);
  };

  const result = choose.data;
  const validationError = result && !result.isOk && !result.isCanceled ? result.error : undefined;

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <h1 className="font-heading text-3xl font-semibold">Settings</h1>

      <ItemGroup className="max-w-2xl [&_[data-slot=item-description]]:line-clamp-none">
        <Item variant="outline" className="items-start">
          <ItemContent>
            <ItemTitle>Game folder</ItemTitle>
            <ItemDescription>
              The Mabinogi <code className="rounded bg-muted px-1 py-0.5 text-xs">appdata</code>{' '}
              folder Findias manages mods in.
            </ItemDescription>
            <span className="text-xs break-all text-muted-foreground">{setup.gameRootPath}</span>

            {validationError && (
              <Alert variant="destructive">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
            {choose.isError && (
              <Alert variant="destructive">
                <AlertDescription>Something went wrong opening the folder picker.</AlertDescription>
              </Alert>
            )}
          </ItemContent>

          <ItemActions>
            <Button variant="outline" onClick={() => choose.mutate()} disabled={choose.isPending}>
              {choose.isPending ? 'Opening…' : 'Change game folder'}
            </Button>
          </ItemActions>
        </Item>

        <Item variant="outline" className="items-start">
          <ItemContent>
            <ItemTitle>Appearance</ItemTitle>
            <ItemDescription>
              Choose a color theme, or follow your operating system setting.
            </ItemDescription>
          </ItemContent>

          <ItemActions>
            <Tabs
              value={theme}
              onValueChange={(next) => {
                if (isTheme(next)) setTheme(next);
              }}
            >
              <TabsList>
                {THEMES.map((value) => {
                  const Icon = THEME_ICONS[value];
                  return (
                    <TabsTrigger key={value} value={value}>
                      <Icon className="size-4" />
                      {THEME_LABELS[value]}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </ItemActions>
        </Item>

        {isPrereleasesEnabled && (
          <Item variant="outline" className="items-start">
            <ItemContent>
              <ItemTitle>Include prereleases</ItemTitle>
              <ItemDescription>
                When fetching the mod catalog from GitHub, count prerelease Uiscias builds as well
                as stable ones. New manifests are often published on prereleases first, so this is
                usually required to see the latest mods.
              </ItemDescription>
            </ItemContent>

            <ItemActions>
              <Switch
                id="include-prereleases"
                checked={shouldIncludePrereleases}
                onCheckedChange={handlePrereleaseChange}
                disabled={prerelease.isPending}
              />
            </ItemActions>
          </Item>
        )}
      </ItemGroup>
      <p className="mt-auto text-center text-xs text-muted-foreground">
        Findias v{appInfo?.appVersion ?? '…'}
      </p>
    </div>
  );
};

export default SettingsView;
