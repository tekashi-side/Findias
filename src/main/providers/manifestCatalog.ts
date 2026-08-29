import { promises as fs } from 'node:fs';
import {
  CatalogError,
  type Catalog,
  type CatalogGroup,
  type CatalogMetadata,
  type CatalogVariant,
  type GetCatalogOptions,
  type ModCatalogProvider,
} from './catalog';
import {
  fetchLatestReleaseAssets,
  resolveReleaseOptions,
  type FetchLike,
  type GitHubReleasesOptions,
  type ReleaseAsset,
  type ResolvedReleaseOptions,
} from './githubReleases';
import {
  MANIFEST_SCHEMA_VERSION,
  manifestCatalogSchema,
  type ManifestVariant,
} from './manifestSchema';

export type { FetchLike };

/** The release asset that carries the full catalog. */
const MANIFEST_ASSET_NAME = 'manifestCatalog.json';

/** Build a normalized `CatalogVariant`, resolving its bytes from the asset map. */
const makeVariant = (
  variant: ManifestVariant,
  urlByFileName: Map<string, string>,
  fetchFn: FetchLike,
): CatalogVariant => ({
  modId: variant.modId,
  modName: variant.modName,
  fileName: variant.fileName,
  version: variant.version,
  size: variant.size,
  updatedAt: variant.updatedAt,
  updateType: variant.updateType,
  usedFiles: variant.usedFiles,
  modAuthor: variant.modAuthor,
  downloadCount: variant.downloadCount,
  modAdditionalCredits: variant.modAdditionalCredits,
  recentUpdateNotes: variant.recentUpdateNotes,
  readme: variant.readme,
  images: variant.images,
  fetchBytes: async (): Promise<ReadableStream<Uint8Array>> => {
    const url = urlByFileName.get(variant.fileName);
    if (!url) {
      throw new CatalogError(
        'parse',
        `The latest release is missing the file ${variant.fileName}.`,
      );
    }
    let response: Response;
    try {
      response = await fetchFn(url);
    } catch (cause) {
      throw new CatalogError('network', `Could not download ${variant.fileName}.`, { cause });
    }
    if (!response.ok || !response.body) {
      throw new CatalogError(
        'http',
        `Failed to download ${variant.fileName} (HTTP ${response.status}).`,
      );
    }
    return response.body;
  },
});

/**
 * Try to read a local `manifestCatalog.json`. Returns `undefined` when the file
 * does not exist (ENOENT), letting the caller fall back to the remote download.
 * Other read or parse failures throw so the dev sees what's wrong with their file.
 */
const readLocalManifestJson = async (path: string): Promise<unknown> => {
  let raw: string;
  try {
    raw = await fs.readFile(path, 'utf-8');
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw new CatalogError('parse', `Could not read the local manifest at ${path}.`, {
      cause: error,
    });
  }
  try {
    return JSON.parse(raw);
  } catch (cause) {
    throw new CatalogError('parse', 'The local mod catalog could not be parsed as JSON.', {
      cause,
    });
  }
};

/** Download the manifest JSON from the release assets. */
const downloadManifestJson = async (
  options: ResolvedReleaseOptions,
  assets: ReleaseAsset[],
): Promise<unknown> => {
  const manifestAsset = assets.find((asset) => asset.name === MANIFEST_ASSET_NAME);
  if (!manifestAsset) {
    throw new CatalogError(
      'not-found',
      'The latest release does not contain a manifestCatalog.json. It may not be published yet.',
    );
  }

  let response: Response;
  try {
    response = await options.fetchFn(manifestAsset.browser_download_url);
  } catch (cause) {
    throw new CatalogError('network', 'Could not download the mod catalog.', { cause });
  }
  if (!response.ok) {
    throw new CatalogError('http', `Failed to download the mod catalog (HTTP ${response.status}).`);
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new CatalogError('parse', 'The mod catalog could not be read.', { cause });
  }
};

/**
 * Build a normalized `Catalog` from the assets of a single release. When
 * `localManifestPath` is provided the manifest JSON is read from disk instead
 * of downloaded; if the file is missing the remote download is used as fallback.
 * The `.it` asset download URLs always come from the release regardless.
 */
const buildCatalog = async (
  options: ResolvedReleaseOptions,
  assets: ReleaseAsset[],
  localManifestPath: string | null,
): Promise<Catalog> => {
  const urlByFileName = new Map<string, string>();
  for (const asset of assets) {
    if (asset.name.toLowerCase().endsWith('.it')) {
      urlByFileName.set(asset.name, asset.browser_download_url);
    }
  }

  let json: unknown;
  if (localManifestPath) {
    json = await readLocalManifestJson(localManifestPath);
  }
  if (json === undefined) {
    json = await downloadManifestJson(options, assets);
  }

  const parsed = manifestCatalogSchema.safeParse(json);
  if (!parsed.success) {
    throw new CatalogError('parse', 'The mod catalog was not in the expected format.', {
      cause: parsed.error,
    });
  }

  if (parsed.data.metadata.schemaVersion > MANIFEST_SCHEMA_VERSION) {
    throw new CatalogError(
      'parse',
      'This mod catalog requires a newer version of Findias. Please update the app.',
    );
  }

  const metadata: CatalogMetadata = {
    schemaVersion: parsed.data.metadata.schemaVersion,
    currentGameVersion: parsed.data.metadata.currentGameVersion,
    supportedGameVersion: parsed.data.metadata.supportedGameVersion,
    generatedAt: parsed.data.metadata.generatedAt,
  };

  const groups: CatalogGroup[] = parsed.data.modList.map((group) => ({
    groupId: group.groupId,
    modName: group.modName,
    findiasTags: group.findiasTags,
    hasVariants: group.hasVariants,
    isMutuallyExclusive: group.mutuallyExclusive,
    variants: group.variants.map((variant) => makeVariant(variant, urlByFileName, options.fetchFn)),
    readme: group.readme,
    images: group.images,
  }));

  return { metadata, groups };
};

/** An in-memory cached catalog plus the release-feed `ETag` used to revalidate it. */
interface CacheEntry {
  etag: string | null;
  catalog: Catalog;
  fetchedAt: number;
}

/**
 * How long a cached catalog is served with no network call at all. Beyond this,
 * a conditional (`If-None-Match`) request revalidates — cheaply, since an
 * unchanged feed returns a rate-limit-free `304`. Purely a burst-collapsing
 * safety net; the real freshness control is the user's Refresh button (`force`).
 */
const CACHE_TTL_MS = 5 * 60_000;

/**
 * Current `ModCatalogProvider`: reads the `manifestCatalog.json` asset attached
 * to the newest eligible Uiscias release and returns its grouped catalog. The
 * manifest's grouped shape is preserved 1:1 (no flatten/regroup), and each
 * variant's `.it` download URL is resolved from the release's assets.
 *
 * The parsed catalog is cached in memory (never on disk) per `shouldIncludePrereleases`
 * and revalidated with the release feed's `ETag`, so repeated calls across IPC
 * handlers reuse one fetch: within the TTL nothing is requested; beyond it (or on
 * `force`) a conditional request either returns a free `304` (cache reused) or a
 * `200` (cache rebuilt).
 */
export const createManifestCatalogProvider = (
  options: GitHubReleasesOptions = {},
): ModCatalogProvider => {
  const resolved = resolveReleaseOptions(options);
  const cache = new Map<boolean, CacheEntry>();

  const getCatalog = async ({
    shouldIncludePrereleases,
    shouldForce = false,
    localManifestPath = null,
  }: GetCatalogOptions): Promise<Catalog> => {
    const cached = cache.get(shouldIncludePrereleases);
    if (
      cached &&
      !localManifestPath &&
      !shouldForce &&
      Date.now() - cached.fetchedAt < CACHE_TTL_MS
    ) {
      return cached.catalog;
    }

    let result;
    try {
      // When a local manifest is active, skip the ETag so we always get a full
      // 200 with assets (needed to build the `.it` URL map). The extra round
      // trip is negligible for a dev-only feature.
      result = await fetchLatestReleaseAssets(
        resolved,
        shouldIncludePrereleases,
        localManifestPath ? null : (cached?.etag ?? null),
      );
    } catch (error) {
      // Graceful degradation: a transient failure to revalidate should not drop
      // a catalog we already have. Reuse the cache on network / rate-limit errors.
      if (
        cached &&
        error instanceof CatalogError &&
        (error.code === 'network' || error.code === 'rate-limited')
      ) {
        return cached.catalog;
      }
      throw error;
    }

    if (result.status === 'not-modified') {
      // We only send If-None-Match when we hold a cached entry, so one exists.
      if (!cached) {
        throw new CatalogError('http', 'GitHub reported no change but no catalog was cached.');
      }
      cached.fetchedAt = Date.now();
      return cached.catalog;
    }

    if (!result.assets) {
      throw new CatalogError(
        'not-found',
        shouldIncludePrereleases
          ? 'No Uiscias release was found.'
          : 'No stable Uiscias release was found. Turn on "Include prereleases" to see the latest mods.',
      );
    }

    // Possible future micro-opt: skip this manifest re-download when the
    // selected release tag is unchanged (a 200 is often just download_count
    // churn); it's free CDN bandwidth, so not done here.
    const catalog = await buildCatalog(resolved, result.assets, localManifestPath);

    // Only cache when using the remote manifest — local catalogs are rebuilt
    // on every call so edits to the file are reflected without delay.
    if (!localManifestPath) {
      cache.set(shouldIncludePrereleases, { etag: result.etag, catalog, fetchedAt: Date.now() });
    }

    return catalog;
  };

  return { getCatalog };
};
