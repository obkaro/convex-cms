# CLI Reference

Convex CMS includes a CLI for project setup and local development.

---

## `convex-cms init`

Initializes CMS in a Convex project by generating configuration files.

### Usage

```bash
pnpm convex-cms init                       # Interactive template selection
pnpm convex-cms init --template blog       # Use specific template
pnpm convex-cms init --template blog --force  # Overwrite existing files
```

### Options

| Option | Description |
|--------|-------------|
| `--template <name>` | Skip interactive prompt, use specified template |
| `--force` | Overwrite existing files |

### Generated Files

| File | Purpose |
|------|---------|
| `convex/cms.ts` | Content type definitions (`defineContentType`) and typed helpers (`createTypedHelpers`) |
| `convex/admin.ts` | Admin API functions (`defineAdminAPI`) — powers the admin UI |
| `convex/content.ts` | Public content queries for your frontend |
| `convex/convex.config.ts` | Updated to register the CMS component (created if missing) |

### Templates

| Template | Content Types | Best For |
|----------|--------------|----------|
| `blog` | Post, Author, Category | Blogs, news sites, content marketing |
| `docs` | Page, Section, Navigation | Documentation sites, knowledge bases |
| `landing` | Page, Hero, Feature, Testimonial, FAQ, CTA | Marketing sites, product pages |
| `ecommerce` | Product, Product Category, FAQ | Online stores, product catalogs |
| `blank` | Blog Post (starter) | Custom projects, learning |

All templates use code-first `defineContentType()` definitions with:
- Slug validation patterns (`^[a-z0-9-]+$`)
- Field constraints (maxLength, min/max, placeholder)
- Proper `renderAs` hints for the admin UI
- `returns` validators on all content queries
- Index-based `getBySlug` lookups (no list-then-filter)

---

## `convex-cms admin`

Launches a pre-built admin UI for local development.

### Usage

```bash
pnpm convex-cms admin                # Default (port 3000)
pnpm convex-cms admin --port 4000    # Custom port
pnpm convex-cms admin --url <url>    # Explicit Convex URL
pnpm convex-cms admin --demo         # Demo mode with mock auth
pnpm convex-cms admin --no-open      # Don't open browser
```

### Options

| Option | Description |
|--------|-------------|
| `--port <number>` | Port to serve on (default: 3000) |
| `--url <url>` | Convex deployment URL (auto-detected from env) |
| `--demo` | Use mock authentication for quick testing |
| `--no-open` | Don't automatically open browser |

### Convex URL Detection

The CLI looks for the Convex URL in this order:
1. `--url` command line argument
2. `CONVEX_URL` environment variable
3. `VITE_CONVEX_URL` environment variable
4. `.env.local` file
5. `.env` file

---

## See Also

- [Admin UI Setup](./admin-ui-setup.md) — Detailed admin UI configuration
- [Getting Started](./getting-started.md) — Programmatic CMS usage
