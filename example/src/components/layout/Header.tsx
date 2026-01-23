import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b-2 border-tempo-200">
      <div className="container-wide">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-tempo-800 flex items-center justify-center">
              <div className="w-3 h-4 bg-tempo-100" />
            </div>
            <span className="text-xl font-bold text-tempo-900">Tempo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#roadmap"
              className={`nav-link ${isActive("/#roadmap") ? "nav-link-active" : ""}`}
            >
              Roadmap
            </a>
            <a
              href="#changelog"
              className={`nav-link ${isActive("/#changelog") ? "nav-link-active" : ""}`}
            >
              Changelog
            </a>
            <Link
              to="/admin"
              className="btn btn-secondary"
            >
              Admin
            </Link>
          </nav>

          <button
            className="md:hidden btn btn-ghost p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-tempo-200">
            <div className="flex flex-col gap-2">
              <a
                href="#roadmap"
                className="nav-link py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Roadmap
              </a>
              <a
                href="#changelog"
                className="nav-link py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Changelog
              </a>
              <Link
                to="/admin"
                className="btn btn-secondary mt-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
