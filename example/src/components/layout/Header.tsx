import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
      <div className="container-wide">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl text-slate-900" style={{ fontFamily: "var(--font-display)" }}>
              Tempo
            </span>
          </Link>

          <nav className="flex items-center gap-8">
            <a href="#roadmap" className="nav-link hidden sm:block">
              Roadmap
            </a>
            <a href="#changelog" className="nav-link hidden sm:block">
              Changelog
            </a>
            <Link to="/admin">
              <Button variant="outline" size="sm">
                Admin
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
