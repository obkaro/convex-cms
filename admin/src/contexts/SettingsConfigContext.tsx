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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSettings: FunctionReference<"query", "public", Record<string, never>, Settings | null>;
};

interface SettingsConfigContextValue {
  baseConfig: AdminConfig;
  settings: Settings | undefined;
}

const SettingsConfigContext = createContext<SettingsConfigContextValue | null>(null);

export function SettingsConfigProvider({
  baseConfig,
  children,
  api,
}: {
  baseConfig: AdminConfig;
  children: ReactNode;
  api?: SettingsApi;
}) {
  // Use skip pattern when api is not provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryArg = api ? api.getSettings : ("skip" as any);
  const settings = useQuery(queryArg) as Settings | undefined;

  const mergedConfig = useMemo((): AdminConfig => {
    if (!settings) return baseConfig;

    return {
      ...baseConfig,
      navigation: {
        ...baseConfig.navigation,
        showMedia: baseConfig.navigation.showMedia && settings.features.mediaManagement,
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

export function useSettingsConfig(): SettingsConfigContextValue {
  const ctx = useContext(SettingsConfigContext);
  if (!ctx) {
    throw new Error("useSettingsConfig must be used within SettingsConfigProvider");
  }
  return ctx;
}
