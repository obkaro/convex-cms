import { useQuery, type FunctionReference } from "convex/react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AdminConfig } from "~/lib/admin-config";
import { AdminConfigProvider } from "./AdminConfigContext";

type Settings = {
  features: {
    mediaManagement: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type SettingsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSettings: FunctionReference<"query", "public", any, Settings | null>;
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
  const settings = useQuery(api?.getSettings ?? "skip") as Settings | undefined;

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
