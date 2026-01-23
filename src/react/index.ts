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

import { useMemo, useCallback, useState, useRef, useReducer, useEffect } from "react";
import { useQuery, usePaginatedQuery, useMutation } from "convex/react";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";
import type { PaginationResult } from "convex/server";

// =============================================================================
// Upload Utilities
// =============================================================================

function generateUploadId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getImageDimensions(file: File, timeoutMs = 5000): Promise<{ width: number; height: number } | undefined> {
  if (!file.type.startsWith("image/")) return Promise.resolve(undefined);

  return new Promise((resolve) => {
    const img = new Image();
    let objectUrl: string | null = null;

    const timeoutId = setTimeout(() => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(undefined);
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timeoutId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(undefined);
    };

    objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
}

function uploadWithXHR(
  url: string,
  file: File,
  signal: AbortSignal,
  onProgress: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const abortHandler = () => {
      xhr.abort();
      reject(new DOMException("Upload aborted", "AbortError"));
    };
    signal.addEventListener("abort", abortHandler);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 80);
        onProgress(10 + percent);
      }
    };

    xhr.onload = () => {
      signal.removeEventListener("abort", abortHandler);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.storageId);
        } catch {
          reject(new Error("Invalid response from upload server"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText || `HTTP ${xhr.status}`}`));
      }
    };

    xhr.onerror = () => {
      signal.removeEventListener("abort", abortHandler);
      reject(new Error("Network error during upload"));
    };

    xhr.ontimeout = () => {
      signal.removeEventListener("abort", abortHandler);
      reject(new Error("Upload timed out"));
    };

    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

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
 * Result type for useMediaUpload hook
 */
export interface UseMediaUploadResult<Result> {
  /** Upload a file with optional metadata */
  upload: (file: File, metadata?: Record<string, unknown>) => Promise<Result>;
  /** Cancel the current upload */
  cancel: () => void;
  /** Whether an upload is in progress */
  isUploading: boolean;
  /** Upload progress (0-100) */
  progress: number;
  /** Last error message, null if no error */
  error: string | null;
  /** Reset the upload state */
  reset: () => void;
}

/**
 * Hook for uploading files to Convex storage with CMS media asset creation.
 * Includes real-time progress tracking, cancellation support, and error handling.
 *
 * @param getUploadUrl - Mutation to get a storage upload URL
 * @param createAsset - Mutation to create the media asset record
 * @returns Upload function with progress tracking, cancellation, and error state
 *
 * @example
 * ```tsx
 * const { upload, cancel, isUploading, progress, error } = useMediaUpload(
 *   api.example.generateUploadUrl,
 *   api.example.createMediaAsset
 * );
 *
 * const handleUpload = async (file: File) => {
 *   try {
 *     const asset = await upload(file, { parentId: folderId });
 *     console.log("Uploaded:", asset);
 *   } catch (e) {
 *     if (e.name !== "AbortError") {
 *       console.error("Upload failed:", e);
 *     }
 *   }
 * };
 *
 * // Cancel button
 * <button onClick={cancel} disabled={!isUploading}>Cancel</button>
 * ```
 */
export function useMediaUpload<
  UploadMutation extends FunctionReference<"mutation">,
  CreateMutation extends FunctionReference<"mutation">,
  CreateArgs extends FunctionArgs<CreateMutation>
>(
  getUploadUrl: UploadMutation,
  createAsset: CreateMutation
): UseMediaUploadResult<FunctionReturnType<CreateMutation>> {
  const generateUrl = useMutation(getUploadUrl);
  const create = useMutation(createAsset);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const upload = useCallback(
    async (file: File, metadata?: Record<string, unknown>): Promise<FunctionReturnType<CreateMutation>> => {
      abortControllerRef.current = new AbortController();
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        const uploadUrl = await generateUrl({});
        setProgress(5);

        const storageId = await uploadWithXHR(
          uploadUrl as string,
          file,
          abortControllerRef.current.signal,
          setProgress
        );

        setProgress(90);

        const dimensions = await getImageDimensions(file);

        const asset = await create({
          storageId,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          ...dimensions,
          ...metadata,
        } as CreateArgs);

        setProgress(100);
        return asset;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        if (err.name !== "AbortError") {
          setError(err.message);
        }
        throw err;
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [generateUrl, create]
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
    setIsUploading(false);
  }, []);

  return {
    upload,
    cancel,
    isUploading,
    progress,
    error,
    reset,
  };
}

// =============================================================================
// Multi-file Upload Queue
// =============================================================================

/**
 * Status of a file in the upload queue
 */
export type UploadQueueFileStatus = "pending" | "uploading" | "complete" | "error" | "cancelled";

/**
 * A file in the upload queue
 */
export interface UploadQueueFile {
  /** Unique ID for this upload */
  id: string;
  /** The file being uploaded */
  file: File;
  /** Current status */
  status: UploadQueueFileStatus;
  /** Upload progress (0-100) */
  progress: number;
  /** Error message if status is 'error' */
  error?: string;
  /** Result from createAsset if status is 'complete' */
  result?: unknown;
}

/**
 * Options for useMediaUploadQueue hook
 */
export interface UseMediaUploadQueueOptions<
  UploadMutation extends FunctionReference<"mutation">,
  CreateMutation extends FunctionReference<"mutation">
> {
  /** Mutation to get a storage upload URL */
  getUploadUrl: UploadMutation;
  /** Mutation to create the media asset record */
  createAsset: CreateMutation;
  /** Maximum concurrent uploads (default: 3) */
  maxConcurrent?: number;
  /** Metadata to include with each uploaded asset */
  metadata?: Record<string, unknown>;
  /** Called when all uploads complete */
  onComplete?: (results: UploadQueueFile[]) => void;
  /** Called when a file upload fails */
  onError?: (file: UploadQueueFile) => void;
}

/**
 * Result type for useMediaUploadQueue hook
 */
export interface UseMediaUploadQueueResult {
  /** Current files in the queue */
  files: UploadQueueFile[];
  /** Add files to the queue (starts uploading automatically) */
  addFiles: (files: File[]) => void;
  /** Cancel a specific file upload */
  cancelFile: (id: string) => void;
  /** Cancel all pending/uploading files */
  cancelAll: () => void;
  /** Retry a failed upload */
  retryFile: (id: string) => void;
  /** Remove completed/failed files from the queue */
  clearCompleted: () => void;
  /** Clear the entire queue */
  clearAll: () => void;
  /** Whether any uploads are in progress */
  isUploading: boolean;
  /** Overall progress (0-100) */
  overallProgress: number;
}

type QueueAction =
  | { type: "ADD_FILES"; files: File[] }
  | { type: "UPDATE_FILE"; id: string; updates: Partial<UploadQueueFile> }
  | { type: "RETRY_FILE"; id: string }
  | { type: "REMOVE_FILE"; id: string }
  | { type: "CLEAR_COMPLETED" }
  | { type: "CLEAR_ALL" }
  | { type: "CANCEL_FILE"; id: string }
  | { type: "CANCEL_ALL" };

function queueReducer(state: UploadQueueFile[], action: QueueAction): UploadQueueFile[] {
  switch (action.type) {
    case "ADD_FILES": {
      const newFiles: UploadQueueFile[] = action.files.map((file) => ({
        id: generateUploadId(),
        file,
        status: "pending",
        progress: 0,
      }));
      return [...state, ...newFiles];
    }
    case "UPDATE_FILE":
      return state.map((f) =>
        f.id === action.id ? { ...f, ...action.updates } : f
      );
    case "RETRY_FILE":
      return state.map((f) =>
        f.id === action.id
          ? { ...f, status: "pending", progress: 0, error: undefined }
          : f
      );
    case "REMOVE_FILE":
      return state.filter((f) => f.id !== action.id);
    case "CLEAR_COMPLETED":
      return state.filter(
        (f) => f.status === "pending" || f.status === "uploading"
      );
    case "CLEAR_ALL":
      return [];
    case "CANCEL_FILE":
      return state.map((f) =>
        f.id === action.id && (f.status === "pending" || f.status === "uploading")
          ? { ...f, status: "cancelled", error: "Upload cancelled" }
          : f
      );
    case "CANCEL_ALL":
      return state.map((f) =>
        f.status === "pending" || f.status === "uploading"
          ? { ...f, status: "cancelled", error: "Upload cancelled" }
          : f
      );
    default:
      return state;
  }
}

/**
 * Hook for uploading multiple files with queue management, concurrency control,
 * and progress tracking. Uses a reducer for state management to avoid closure issues.
 *
 * @param options - Configuration options
 * @returns Queue state and control functions
 *
 * @example
 * ```tsx
 * const queue = useMediaUploadQueue({
 *   getUploadUrl: api.media.generateUploadUrl,
 *   createAsset: api.media.createAsset,
 *   maxConcurrent: 3,
 *   metadata: { parentId: folderId },
 *   onComplete: (results) => console.log("All done!", results),
 * });
 *
 * // In your dropzone handler:
 * const handleDrop = (files: File[]) => {
 *   queue.addFiles(files);
 * };
 *
 * // Display progress:
 * {queue.files.map(f => (
 *   <div key={f.id}>
 *     {f.file.name}: {f.status} ({f.progress}%)
 *     {f.status === "uploading" && <button onClick={() => queue.cancelFile(f.id)}>Cancel</button>}
 *     {f.status === "error" && <button onClick={() => queue.retryFile(f.id)}>Retry</button>}
 *   </div>
 * ))}
 * ```
 */
export function useMediaUploadQueue<
  UploadMutation extends FunctionReference<"mutation">,
  CreateMutation extends FunctionReference<"mutation">
>(
  options: UseMediaUploadQueueOptions<UploadMutation, CreateMutation>
): UseMediaUploadQueueResult {
  const { maxConcurrent = 3, metadata, onComplete, onError } = options;
  const [files, dispatch] = useReducer(queueReducer, []);
  const generateUrl = useMutation(options.getUploadUrl);
  const create = useMutation(options.createAsset);

  const activeUploadsRef = useRef(0);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const processingRef = useRef(false);

  const uploadFile = useCallback(
    async (queueFile: UploadQueueFile) => {
      const abortController = new AbortController();
      abortControllersRef.current.set(queueFile.id, abortController);

      dispatch({
        type: "UPDATE_FILE",
        id: queueFile.id,
        updates: { status: "uploading", progress: 0 },
      });

      try {
        const uploadUrl = await generateUrl({});

        dispatch({
          type: "UPDATE_FILE",
          id: queueFile.id,
          updates: { progress: 5 },
        });

        const storageId = await uploadWithXHR(
          uploadUrl as string,
          queueFile.file,
          abortController.signal,
          (progress) => {
            dispatch({
              type: "UPDATE_FILE",
              id: queueFile.id,
              updates: { progress },
            });
          }
        );

        dispatch({
          type: "UPDATE_FILE",
          id: queueFile.id,
          updates: { progress: 90 },
        });

        const dimensions = await getImageDimensions(queueFile.file);

        const result = await create({
          storageId,
          name: queueFile.file.name,
          mimeType: queueFile.file.type,
          size: queueFile.file.size,
          ...dimensions,
          ...metadata,
        } as FunctionArgs<CreateMutation>);

        dispatch({
          type: "UPDATE_FILE",
          id: queueFile.id,
          updates: { status: "complete", progress: 100, result },
        });
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        if (err.name === "AbortError") {
          dispatch({
            type: "UPDATE_FILE",
            id: queueFile.id,
            updates: { status: "cancelled", error: "Upload cancelled" },
          });
        } else {
          const updatedFile = {
            ...queueFile,
            status: "error" as const,
            error: err.message,
          };
          dispatch({
            type: "UPDATE_FILE",
            id: queueFile.id,
            updates: { status: "error", error: err.message },
          });
          onError?.(updatedFile);
        }
      } finally {
        abortControllersRef.current.delete(queueFile.id);
        activeUploadsRef.current--;
      }
    },
    [generateUrl, create, metadata, onError]
  );

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    processingRef.current = true;

    const pending = files.filter((f) => f.status === "pending");

    while (activeUploadsRef.current < maxConcurrent && pending.length > 0) {
      const next = pending.shift()!;
      activeUploadsRef.current++;
      uploadFile(next);
    }

    processingRef.current = false;

    if (
      activeUploadsRef.current === 0 &&
      files.length > 0 &&
      files.every((f) => f.status !== "pending" && f.status !== "uploading")
    ) {
      onComplete?.(files);
    }
  }, [files, maxConcurrent, uploadFile, onComplete]);

  useEffect(() => {
    if (files.some((f) => f.status === "pending") && activeUploadsRef.current < maxConcurrent) {
      processQueue();
    }
  }, [files, maxConcurrent, processQueue]);

  const addFiles = useCallback((newFiles: File[]) => {
    dispatch({ type: "ADD_FILES", files: newFiles });
  }, []);

  const cancelFile = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
    }
    dispatch({ type: "CANCEL_FILE", id });
  }, []);

  const cancelAll = useCallback(() => {
    abortControllersRef.current.forEach((controller) => controller.abort());
    dispatch({ type: "CANCEL_ALL" });
  }, []);

  const retryFile = useCallback((id: string) => {
    dispatch({ type: "RETRY_FILE", id });
  }, []);

  const clearCompleted = useCallback(() => {
    dispatch({ type: "CLEAR_COMPLETED" });
  }, []);

  const clearAll = useCallback(() => {
    abortControllersRef.current.forEach((controller) => controller.abort());
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  const isUploading = files.some((f) => f.status === "uploading");
  const overallProgress =
    files.length > 0
      ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
      : 0;

  return {
    files,
    addFiles,
    cancelFile,
    cancelAll,
    retryFile,
    clearCompleted,
    clearAll,
    isUploading,
    overallProgress,
  };
}
