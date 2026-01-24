/**
 * Embed Header
 *
 * A simplified header for the embedded admin without router dependencies.
 */

import { ChevronLeft, Bell, HelpCircle, User, LogOut, Moon, Sun } from "lucide-react";
import { useAdminConfig, useTheme, useAuth } from "../../contexts";
import { useEmbedNavigation } from "../navigation";

export function EmbedHeader() {
  const { goBack, canGoBack, currentRoute } = useEmbedNavigation();
  const { branding: _branding } = useAdminConfig();
  const { theme, setTheme } = useTheme();
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
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4">
        {canGoBack && (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
        )}
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>

        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Notifications"
        >
          <Bell className="size-5" />
        </button>

        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Help"
        >
          <HelpCircle className="size-5" />
        </button>

        {isAuthenticated && user && (
          <div className="ml-2 flex items-center gap-2 border-l border-border pl-4">
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
              <span className="text-sm font-medium text-foreground">
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
