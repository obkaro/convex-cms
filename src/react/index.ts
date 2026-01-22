/**
 * @convex-cms/core/react
 *
 * React hooks and utilities for using Convex CMS in React applications.
 * These hooks provide convenient wrappers around Convex's React hooks
 * specifically designed for CMS use cases.
 *
 * @example
 * ```tsx
 * import { useContentEntries, useContentEntry, useMediaAssets } from "@convex-cms/core/react";
 * import { api } from "../convex/_generated/api";
 *
 * function BlogList() {
 *   const { entries, isLoading, loadMore, hasMore } = useContentEntries(
 *     api.example.listBlogPosts,
 *     { status: "published" }
 *   );
 *
 *   return (
 *     <div>
 *       {entries.map(entry => <BlogCard key={entry._id} entry={entry} />)}
 *       {hasMore && <button onClick={loadMore}>Load More</button>}
 *     </div>
 *   );
 * }
 * ```
 */

// Re-export core Convex React hooks for convenience
export {
  useQuery,
  useMutation,
  useAction,
  usePaginatedQuery,
  useConvex,
  useConvexAuth,
  Authenticated,
  Unauthenticated,
  AuthLoading,
} from "convex/react";

// Re-export Convex React provider
export { ConvexProvider, ConvexProviderWithAuth } from "convex/react";

import { useMemo, useCallback, useState } from "react";
import { useQuery, usePaginatedQuery, useMutation } from "convex/react";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";
import type { PaginationResult } from "convex/server";

// =============================================================================
// Types
// =============================================================================

/**
 * Result type for useContentEntries hook
 */
export interface UseContentEntriesResult<T> {
  /** Array of content entries */
  entries: T[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether more entries are being loaded */
  isLoadingMore: boolean;
  /** Load more entries (call when user scrolls/clicks load more) */
  loadMore: (numItems?: number) => void;
  /** Whether there are more entries to load */
  hasMore: boolean;
  /** The current pagination status */
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
}

/**
 * Result type for useContentEntry hook
 */
export interface UseContentEntryResult<T> {
  /** The content entry, or undefined if loading/not found */
  entry: T | undefined;
  /** Whether the entry is loading */
  isLoading: boolean;
}

/**
 * Result type for useMediaAssets hook
 */
export interface UseMediaAssetsResult<T> {
  /** Array of media assets */
  assets: T[];
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether more assets are being loaded */
  isLoadingMore: boolean;
  /** Load more assets */
  loadMore: (numItems?: number) => void;
  /** Whether there are more assets to load */
  hasMore: boolean;
  /** The current pagination status */
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
}

/**
 * Options for CMS hooks
 */
export interface CmsHookOptions {
  /** Number of items to load per page */
  pageSize?: number;
}

// =============================================================================
// Content Entry Hooks
// =============================================================================

/**
 * Hook for fetching paginated content entries with automatic cursor management.
 *
 * @param queryFn - The Convex query function for listing entries
 * @param args - Arguments to pass to the query (excluding pagination)
 * @param options - Hook options like page size
 * @returns Paginated entries with loading state and load more function
 *
 * @example
 * ```tsx
 * const { entries, isLoading, loadMore, hasMore } = useContentEntries(
 *   api.example.listBlogPosts,
 *   { contentTypeId: blogTypeId, status: "published" },
 *   { pageSize: 10 }
 * );
 * ```
 */
export function useContentEntries<
  Query extends FunctionReference<"query">,
  Args extends FunctionArgs<Query>,
  Result extends FunctionReturnType<Query>
>(
  queryFn: Query,
  args: Omit<Args, "paginationOpts">,
  options: CmsHookOptions = {}
): UseContentEntriesResult<Result extends PaginationResult<infer T> ? T : Result extends { page: (infer T)[] } ? T : unknown> {
  const { pageSize = 20 } = options;

  const result = usePaginatedQuery(
    queryFn,
    args as Args,
    { initialNumItems: pageSize }
  );

  const entries = useMemo(() => {
    if (!result.results) return [];
    return result.results as (Result extends PaginationResult<infer T> ? T : Result extends { page: (infer T)[] } ? T : unknown)[];
  }, [result.results]);

  const loadMore = useCallback(
    (numItems?: number) => {
      result.loadMore(numItems ?? pageSize);
    },
    [result, pageSize]
  );

  return {
    entries,
    isLoading: result.status === "LoadingFirstPage",
    isLoadingMore: result.status === "LoadingMore",
    loadMore,
    hasMore: result.status === "CanLoadMore",
    status: result.status,
  };
}

/**
 * Hook for fetching a single content entry.
 *
 * @param queryFn - The Convex query function for getting an entry
 * @param args - Arguments to pass to the query (typically entry ID)
 * @returns The entry with loading state
 *
 * @example
 * ```tsx
 * const { entry, isLoading } = useContentEntry(
 *   api.example.getBlogPost,
 *   { id: postId, locale: "en-US" }
 * );
 * ```
 */
export function useContentEntry<
  Query extends FunctionReference<"query">,
  Args extends FunctionArgs<Query>,
  Result extends FunctionReturnType<Query>
>(
  queryFn: Query,
  args: Args
): UseContentEntryResult<Result> {
  const result = useQuery(queryFn, args);

  return {
    entry: result as Result | undefined,
    isLoading: result === undefined,
  };
}

// =============================================================================
// Media Asset Hooks
// =============================================================================

/**
 * Hook for fetching paginated media assets.
 *
 * @param queryFn - The Convex query function for listing media
 * @param args - Arguments to pass to the query (folder, type filters, etc.)
 * @param options - Hook options like page size
 * @returns Paginated assets with loading state and load more function
 *
 * @example
 * ```tsx
 * const { assets, isLoading, loadMore, hasMore } = useMediaAssets(
 *   api.example.listMedia,
 *   { folderId: currentFolder, type: "image" },
 *   { pageSize: 24 }
 * );
 * ```
 */
export function useMediaAssets<
  Query extends FunctionReference<"query">,
  Args extends FunctionArgs<Query>,
  Result extends FunctionReturnType<Query>
>(
  queryFn: Query,
  args: Omit<Args, "paginationOpts">,
  options: CmsHookOptions = {}
): UseMediaAssetsResult<Result extends PaginationResult<infer T> ? T : Result extends { page: (infer T)[] } ? T : unknown> {
  const { pageSize = 24 } = options;

  const result = usePaginatedQuery(
    queryFn,
    args as Args,
    { initialNumItems: pageSize }
  );

  const assets = useMemo(() => {
    if (!result.results) return [];
    return result.results as (Result extends PaginationResult<infer T> ? T : Result extends { page: (infer T)[] } ? T : unknown)[];
  }, [result.results]);

  const loadMore = useCallback(
    (numItems?: number) => {
      result.loadMore(numItems ?? pageSize);
    },
    [result, pageSize]
  );

  return {
    assets,
    isLoading: result.status === "LoadingFirstPage",
    isLoadingMore: result.status === "LoadingMore",
    loadMore,
    hasMore: result.status === "CanLoadMore",
    status: result.status,
  };
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Result type for useCmsMutation hook
 */
export interface UseCmsMutationResult<Args, Result> {
  /** Execute the mutation */
  mutate: (args: Args) => Promise<Result>;
  /** Whether the mutation is in progress */
  isPending: boolean;
  /** The last error that occurred */
  error: Error | null;
  /** Reset the error state */
  resetError: () => void;
}

/**
 * Hook for CMS mutations with loading and error state tracking.
 *
 * @param mutationFn - The Convex mutation function
 * @returns Mutation function with state tracking
 *
 * @example
 * ```tsx
 * const { mutate: createEntry, isPending, error } = useCmsMutation(
 *   api.example.createBlogPost
 * );
 *
 * const handleSubmit = async (data) => {
 *   try {
 *     await createEntry(data);
 *     toast.success("Post created!");
 *   } catch (e) {
 *     // Error is also available via the error state
 *   }
 * };
 * ```
 */
export function useCmsMutation<
  Mutation extends FunctionReference<"mutation">,
  Args extends FunctionArgs<Mutation>,
  Result extends FunctionReturnType<Mutation>
>(
  mutationFn: Mutation
): UseCmsMutationResult<Args, Awaited<Result>> {
  const mutation = useMutation(mutationFn);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (args: Args): Promise<Awaited<Result>> => {
      setIsPending(true);
      setError(null);
      try {
        const result = await mutation(args);
        return result as Awaited<Result>;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [mutation]
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    mutate,
    isPending,
    error,
    resetError,
  };
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook for uploading files to Convex storage with CMS media asset creation.
 *
 * @param getUploadUrl - Mutation to get a storage upload URL
 * @param createAsset - Mutation to create the media asset record
 * @returns Upload function with progress tracking
 *
 * @example
 * ```tsx
 * const { upload, isUploading, progress } = useMediaUpload(
 *   api.example.generateUploadUrl,
 *   api.example.createMediaAsset
 * );
 *
 * const handleDrop = async (files: File[]) => {
 *   for (const file of files) {
 *     await upload(file, { folderId: currentFolder });
 *   }
 * };
 * ```
 */
export function useMediaUpload<
  UploadMutation extends FunctionReference<"mutation">,
  CreateMutation extends FunctionReference<"mutation">,
  CreateArgs extends FunctionArgs<CreateMutation>
>(
  getUploadUrl: UploadMutation,
  createAsset: CreateMutation
): {
  upload: (file: File, metadata?: Partial<CreateArgs>) => Promise<FunctionReturnType<CreateMutation>>;
  isUploading: boolean;
  progress: number;
} {
  const generateUrl = useMutation(getUploadUrl);
  const create = useMutation(createAsset);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(
    async (file: File, metadata?: Partial<CreateArgs>): Promise<FunctionReturnType<CreateMutation>> => {
      setIsUploading(true);
      setProgress(0);

      try {
        // Get upload URL
        const uploadUrl = await generateUrl({});
        setProgress(10);

        // Upload file
        const response = await fetch(uploadUrl as string, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const { storageId } = await response.json();
        setProgress(80);

        // Determine media type from MIME type
        let mediaType: "image" | "video" | "audio" | "document" | "other" = "other";
        if (file.type.startsWith("image/")) mediaType = "image";
        else if (file.type.startsWith("video/")) mediaType = "video";
        else if (file.type.startsWith("audio/")) mediaType = "audio";
        else if (
          file.type.includes("pdf") ||
          file.type.includes("document") ||
          file.type.includes("text/")
        ) {
          mediaType = "document";
        }

        // Create asset record
        const asset = await create({
          storageId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          type: mediaType,
          ...metadata,
        } as CreateArgs);

        setProgress(100);
        return asset;
      } finally {
        setIsUploading(false);
      }
    },
    [generateUrl, create]
  );

  return {
    upload,
    isUploading,
    progress,
  };
}
