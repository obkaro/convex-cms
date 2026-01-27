export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8">
      <div className="container-wide">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl text-white" style={{ fontFamily: "var(--font-display)" }}>
              Tempo
            </span>
          </div>

          <p className="text-sm text-center sm:text-left">
            Built with{" "}
            <a
              href="https://convex.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Convex
            </a>
            {" + "}
            <a
              href="https://github.com/anthropics/convex-cms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white transition-colors"
            >
              convex-cms
            </a>
          </p>

          <p className="text-sm">
            &copy; {new Date().getFullYear()} Tempo
          </p>
        </div>
      </div>
    </footer>
  );
}
