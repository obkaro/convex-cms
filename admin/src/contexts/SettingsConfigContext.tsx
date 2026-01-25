import { useQuery } from "convex/react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import type { AdminConfig } from "~/lib/admin-config";
import { AdminConfigProvider } from "./AdminConfigContext";

type Settings = NonNullable<typeof api.admin.getSettings._returnType>;

interface SettingsConfigContextValue {
  baseConfig: AdminConfig;
  settings: Settings | undefined;
}

const SettingsConfigContext = createContext<SettingsConfigContextValue | null>(null);

export function SettingsConfigProvider({
  baseConfig,
  children,
}: {
  baseConfig: AdminConfig;
  children: ReactNode;
}) {
  const settings = useQuery(api.admin.getSettings);

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
