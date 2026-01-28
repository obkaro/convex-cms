import { useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AdminConfig } from "~/lib/admin-config";
import { AdminConfigProvider } from "./AdminConfigContext";

/**
 * Settings returned by the getSettings query.
 * This type is defined explicitly to avoid importing from convex/_generated.
 */
export interface Settings {
  features: {
    versioning: boolean;
    scheduling: boolean;
    localization: boolean;
    mediaManagement: boolean;
  };
}

type SettingsApi = {
  getSettings: FunctionReference<
    "query",
    "public",
    Record<string, never>,
    Settings | null
  >;
};

interface SettingsConfigContextValue {
  baseConfig: AdminConfig;
  settings: Settings | undefined;
}

const SettingsConfigContext = createContext<SettingsConfigContextValue | null>(
  null
);

// Component that queries settings (only rendered when api is provided)
function SettingsConfigProviderWithQuery({
  baseConfig,
  children,
  api,
}: {
  baseConfig: AdminConfig;
  children: ReactNode;
  api: SettingsApi;
}) {
  // Proper skip pattern: function ref first, args (or "skip") second
  const settings = useQuery(api.getSettings, {}) ?? undefined;

  const mergedConfig = useMemo((): AdminConfig => {
    if (!settings) return baseConfig;

    return {
      ...baseConfig,
      navigation: {
        ...baseConfig.navigation,
        showMedia:
          baseConfig.navigation.showMedia && settings.features.mediaManagement,
      },
    };
  }, [baseConfig, settings]);

  const contextValue = useMemo(
    () => ({ baseConfig, settings }),
    [baseConfig, settings]
  );

  return (
    <SettingsConfigContext.Provider value={contextValue}>
      <AdminConfigProvider config={mergedConfig}>
        {children}
      </AdminConfigProvider>
    </SettingsConfigContext.Provider>
  );
}

// Component without query (when api is not provided)
function SettingsConfigProviderWithoutQuery({
  baseConfig,
  children,
}: {
  baseConfig: AdminConfig;
  children: ReactNode;
}) {
  const contextValue = useMemo(
    () => ({ baseConfig, settings: undefined }),
    [baseConfig]
  );

  return (
    <SettingsConfigContext.Provider value={contextValue}>
      <AdminConfigProvider config={baseConfig}>{children}</AdminConfigProvider>
    </SettingsConfigContext.Provider>
  );
}

export function SettingsConfigProvider({
  baseConfig,
  children,
  api,
}: {
  baseConfig: AdminConfig;
  children: ReactNode;
  api?: SettingsApi;
}) {
  // Use component splitting to avoid calling useQuery without a valid function ref
  if (api) {
    return (
      <SettingsConfigProviderWithQuery
        baseConfig={baseConfig}
        api={api}
        children={children}
      />
    );
  }

  return (
    <SettingsConfigProviderWithoutQuery
      baseConfig={baseConfig}
      children={children}
    />
  );
}

export function useSettingsConfig(): SettingsConfigContextValue {
  const ctx = useContext(SettingsConfigContext);
  if (!ctx) {
    throw new Error(
      "useSettingsConfig must be used within SettingsConfigProvider"
    );
  }
  return ctx;
}
