/**
 * Embed Header
 *
 * A simplified header for the embedded admin without router dependencies.
 */

import { ChevronLeft, Bell, HelpCircle, User, LogOut, Moon, Sun } from "lucide-react";
import { useAdminConfig, useTheme, useAuth } from "../../contexts";
import { useEmbedNavigation } from "../navigation";
import { SidebarTrigger } from "../../components/ui/sidebar";
import { Separator } from "../../components/ui/separator";

export function EmbedHeader() {
  const { goBack, canGoBack, currentRoute } = useEmbedNavigation();
  const { branding: _branding } = useAdminConfig();
  const { theme, setTheme, canToggleDarkMode } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();

  const routeTitles: Record<string, string> = {
    dashboard: "Dashboard",
    content: "Content",
    "content-types": "Content Types",
    media: "Media Library",
    taxonomies: "Taxonomies",
    settings: "Settings",
    trash: "Trash",
    entries: "Entries",
  };

  const title = routeTitles[currentRoute.route] || "Dashboard";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-3 md:px-6">
      <div className="flex items-center gap-2 md:gap-4">
        <SidebarTrigger className="md:hidden" />
        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 md:hidden" />
        {canGoBack && (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
        <h1 className="text-base font-semibold text-foreground md:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        {canToggleDarkMode && (
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        )}

        <button
          type="button"
          className="hidden items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:flex md:size-9"
          title="Notifications"
        >
          <Bell className="size-5" />
        </button>

        <button
          type="button"
          className="hidden items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:flex md:size-9"
          title="Help"
        >
          <HelpCircle className="size-5" />
        </button>

        {isAuthenticated && user && (
          <div className="ml-1 flex items-center gap-2 border-l border-border pl-2 md:ml-2 md:pl-4">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || "User"}
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <User className="size-4" />
              )}
            </div>
            {user.name && (
              <span className="hidden text-sm font-medium text-foreground md:inline">
                {user.name}
              </span>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Log out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
