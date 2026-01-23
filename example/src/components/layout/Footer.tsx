export function Footer() {
  return (
    <footer className="bg-tempo-800 text-tempo-200 py-12">
      <div className="container-wide">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-tempo-100 flex items-center justify-center">
                <div className="w-3 h-4 bg-tempo-800" />
              </div>
              <span className="text-xl font-bold text-white">Tempo</span>
            </div>
            <p className="text-tempo-400 max-w-sm">
              Async collaboration platform for remote teams. Work together,
              on your own time.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="#roadmap" className="text-tempo-400 hover:text-white transition-colors">
                  Roadmap
                </a>
              </li>
              <li>
                <a href="#changelog" className="text-tempo-400 hover:text-white transition-colors">
                  Changelog
                </a>
              </li>
              <li>
                <a href="#" className="text-tempo-400 hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-tempo-400 hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="text-tempo-400 hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-tempo-400 hover:text-white transition-colors">
                  Careers
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-tempo-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-tempo-500 text-sm">
            &copy; {new Date().getFullYear()} Tempo. All rights reserved.
          </p>
          <p className="text-tempo-500 text-sm">
            Built with{" "}
            <a
              href="https://convex.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tempo-400 hover:text-white"
            >
              Convex
            </a>
            {" "}+{" "}
            <a
              href="https://github.com/anthropics/convex-cms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tempo-400 hover:text-white"
            >
              @convex-cms/core
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
